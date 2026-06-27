import time
import uuid
import random
import threading
from datetime import datetime
import asyncio
from typing import Dict, Set
from fastapi import WebSocket
from sqlalchemy.orm import Session
from backend.ml_engine import score_transaction
from backend.trust_engine import calculate_user_trust_score
from backend.investigation import run_investigation
from backend.database import SessionLocal
from backend.models import Transaction, Alert, Organization, TrustScoreHistory
import logging

logger = logging.getLogger("trustguard.simulator")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, org_id: str):
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = set()
        self.active_connections[org_id].add(websocket)
        logger.info(f"WebSocket client connected to organization: {org_id}")
    
    def disconnect(self, websocket: WebSocket, org_id: str):
        if org_id in self.active_connections:
            self.active_connections[org_id].discard(websocket)
            logger.info(f"WebSocket client disconnected from organization: {org_id}")
    
    async def broadcast(self, org_id: str, message: dict):
        logger.info(f"Broadcasting transaction to org: {org_id}. Active connection count: {len(self.active_connections.get(org_id, set()))}")
        if org_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[org_id]:
                try:
                    await connection.send_json(message)
                    logger.info(f"Successfully sent message to websocket in org: {org_id}")
                except Exception as e:
                    logger.warning(f"Failed to send message: {e}")
                    disconnected.add(connection)
            self.active_connections[org_id] -= disconnected

# Global instances
ws_manager = ConnectionManager()

# Predefined merchant pools and cities for realistic simulator telemetry
MERCHANTS = [
    {"name": "TrustGuard Payments", "category": "financial"},
    {"name": "Uber Trips", "category": "transportation"},
    {"name": "Target Corp", "category": "retail"},
    {"name": "Amazon Retail", "category": "retail"},
    {"name": "Netflix Inc", "category": "entertainment"},
    {"name": "Shell Gas", "category": "fuel"},
    {"name": "Walmart Super", "category": "retail"}
]

SIMULATED_USERS = [
    {"user_id": "user_john", "base_city": "New York, US", "devices": ["MacBook Pro", "iPhone 15"]},
    {"user_id": "user_priya", "base_city": "Bengaluru, IN", "devices": ["Lenovo ThinkPad", "OnePlus 11"]},
    {"user_id": "user_ram", "base_city": "Mumbai, IN", "devices": ["iPad Air", "Samsung S23"]},
    {"user_id": "user_akira", "base_city": "Tokyo, JP", "devices": ["iPhone 14 Pro", "Web Chrome"]},
    {"user_id": "user_sarah", "base_city": "London, GB", "devices": ["MacBook Air", "Google Pixel 8"]}
]

class TransactionSimulator:
    def __init__(self, interval: float = 2.0):
        self.interval = interval
        self.running = False
        self.thread = None
        self._loop = None
    
    def start(self):
        """Start the transaction simulator in a background thread"""
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()
        logger.info("📡 Live Transaction Simulator Started")
    
    def stop(self):
        """Stop the simulator"""
        self.running = False
        logger.info("⛔ Live Transaction Simulator Suspended")
        
    def run(self):
        # Setup event loop for this thread to handle async broadcasts
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        
        while self.running:
            try:
                db = SessionLocal()
                # Query all active organizations from the DB to support multi-tenancy live streams
                orgs = db.query(Organization).all()
                if orgs:
                    for org in orgs:
                        self.generate_and_process_transaction(db, org_id=org.id)
                else:
                    self.generate_and_process_transaction(db, org_id="org_trustguard")
                db.close()
                time.sleep(self.interval)
            except Exception as e:
                logger.error(f"Simulator loop error: {e}")
                time.sleep(self.interval)
                
    def generate_and_process_transaction(self, db: Session, force_fraud_type: str = None, org_id: str = "org_trustguard", skip_gemini: bool = False):
        """Generates, scores, logs, and broadcasts a transaction"""
        # Pick random user config
        user = random.choice(SIMULATED_USERS)
        user_id = user["user_id"]
        
        amount = round(random.uniform(5.00, 300.00), 2)
        merchant_cfg = random.choice(MERCHANTS)
        merchant = f"{merchant_cfg['name']} ({merchant_cfg['category']})"
        location = user["base_city"]
        device = random.choice(user["devices"])
        
        # Decide if we inject a fraud pattern
        is_fraud = False
        fraud_type = force_fraud_type
        
        # 15% random fraud rate if not forced
        if not fraud_type and random.random() < 0.15:
            fraud_type = random.choice(['unusual_amount', 'impossible_travel', 'new_device', 'multiple_rapid', 'card_testing', 'night_activity'])
            
        if fraud_type:
            is_fraud = True
            if fraud_type == 'unusual_amount':
                amount = round(random.uniform(1200.00, 5000.00), 2)
            elif fraud_type == 'impossible_travel':
                # Pick location from alternate city
                location = "London, GB" if "US" in location or "IN" in location else "New York, US"
            elif fraud_type == 'new_device':
                device = f"Linux Debian (unrecognized-{random.randint(100, 999)})"
            elif fraud_type == 'multiple_rapid':
                amount = round(random.uniform(10.00, 50.00), 2)
            elif fraud_type == 'card_testing':
                amount = round(random.uniform(1.00, 5.00), 2)
            elif fraud_type == 'night_activity':
                amount = round(random.uniform(50.00, 200.00), 2)
                
        # ML engine input data
        # Mapping features like in ml_engine.py
        input_data = {
            'user_id': user_id,
            'amount': amount,
            'merchant': merchant,
            'location': location,
            'device': device,
            'failed_attempts': random.randint(1, 3) if (is_fraud and fraud_type in ['card_testing', 'new_device']) else 0,
            'device_change': 1 if (fraud_type == 'new_device') else 0,
            'location_deviation': 1 if (fraud_type == 'impossible_travel') else 0,
            'transaction_frequency': 5 if (fraud_type == 'multiple_rapid') else 1
        }
        
        # Score the transaction
        scoring_result = score_transaction(input_data)
        risk_score = scoring_result['risk_score']
        risk_status = scoring_result['status']
        
        # Trust score before
        trust_before = calculate_user_trust_score(db, user_id)
        
        # Parse location
        location_parts = location.split(', ')
        city = location_parts[0] if len(location_parts) > 0 else "Vijayawada"
        country = location_parts[1] if len(location_parts) > 1 else "India"
        payment_method = random.choice(['credit_card', 'debit_card', 'upi', 'net_banking'])
        merchant_category = merchant_cfg['category']
        device_id = f"dev_{uuid.uuid4().hex[:8]}"
        ip_address = f"192.168.1.{random.randint(10, 254)}"
        is_flagged = True if risk_score > 70 else False
        decision = "PENDING" if is_flagged else "APPROVED"
        
        # Create and save transaction model
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        tx = Transaction(
            id=tx_id,
            user_id=user_id,
            amount=amount,
            merchant=merchant,
            merchant_category=merchant_category,
            payment_method=payment_method,
            city=city,
            country=country,
            device_id=device_id,
            ip_address=ip_address,
            location=location,
            device=device,
            risk_score=risk_score,
            risk_status=risk_status,
            is_fraud=is_fraud,
            is_flagged=is_flagged,
            explanation=scoring_result.get('explanation'),
            trust_score_before=trust_before,
            organization_id=org_id,
            decision=decision
        )
        db.add(tx)
        db.commit()
        
        # Calculate trust after and log score changes
        trust_after = calculate_user_trust_score(db, user_id)
        tx.trust_score_after = trust_after
        db.commit()
        
        if abs(trust_after - trust_before) > 0.01:
            reason = f"Score adjusted due to transaction activity"
            if fraud_type:
                reason = f"Simulated fraud event: {fraud_type.replace('_', ' ').title()}"
            history_entry = TrustScoreHistory(
                id=f"hist_{uuid.uuid4().hex[:12]}",
                user_id=user_id,
                old_score=trust_before,
                new_score=trust_after,
                reason=reason,
                organization_id=org_id
            )
            db.add(history_entry)
            db.commit()
            
        # Create alert if high risk
        if risk_score > 70:
            alert = Alert(
                id=f"alert_{uuid.uuid4().hex[:12]}",
                transaction_id=tx_id,
                user_id=user_id,
                severity='high' if risk_score > 85 else 'medium',
                message=f"High-risk transaction: ${amount:.2f} at {merchant} via {device}",
                organization_id=org_id
            )
            db.add(alert)
            db.commit()
            
            # Start asynchronous investigation and save report
            try:
                from backend.models import Investigation
                if skip_gemini:
                    from backend.investigation import _run_simulated_investigation
                    report_str = _run_simulated_investigation({
                        'transaction_id': tx_id,
                        'user_id': user_id,
                        'amount': amount,
                        'merchant': merchant,
                        'location': location,
                        'device': device,
                        'risk_score': risk_score,
                        'risk_factors': scoring_result.get('explanation') or {}
                    })
                else:
                    report_str = run_investigation({
                        'transaction_id': tx_id,
                        'user_id': user_id,
                        'amount': amount,
                        'merchant': merchant,
                        'location': location,
                        'device': device,
                        'risk_score': risk_score,
                        'risk_factors': scoring_result.get('explanation') or {}
                    })
                
                findings = {
                    "device_fingerprint": device,
                    "location_deviation": location != user["base_city"],
                    "rules_matched": scoring_result.get('explanation') or {}
                }
                
                inv = Investigation(
                    id=f"inv_{uuid.uuid4().hex[:12]}",
                    transaction_id=tx_id,
                    user_id=user_id,
                    findings=findings,
                    recommendation="DECLINE" if risk_score > 85 else "REQUIRE REVIEW",
                    report=report_str,
                    organization_id=org_id
                )
                db.add(inv)
                db.commit()
                logger.info(f"🔍 AI Agent investigation saved for TX {tx_id}")
            except Exception as e:
                logger.error(f"Failed to generate and save auto AI investigation: {e}")
                
        # Broadcast via WebSockets
        if ws_manager:
            tx_dict = {
                'id': tx.id,
                'transaction_id': tx.id,
                'user_id': tx.user_id,
                'amount': tx.amount,
                'merchant': tx.merchant,
                'merchant_category': tx.merchant_category,
                'payment_method': tx.payment_method,
                'city': tx.city,
                'country': tx.country,
                'device_id': tx.device_id,
                'ip_address': tx.ip_address,
                'location': tx.location,
                'device': tx.device,
                'risk_score': tx.risk_score,
                'risk_status': tx.risk_status,
                'status': tx.status,
                'is_fraud': tx.is_fraud,
                'is_flagged': tx.is_flagged,
                'explanation': tx.explanation,
                'shap_explanation': tx.shap_explanation,
                'timestamp': tx.timestamp.isoformat(),
                'trust_score_before': tx.trust_score_before,
                'trust_score_after': tx.trust_score_after,
                'decision': tx.decision,
                'decision_by': tx.decision_by,
                'decision_at': tx.decision_at.isoformat() if tx.decision_at else None
            }
            message = {
                'type': 'NEW_TRANSACTION',
                'data': tx_dict,
                'transaction': tx_dict
            }
            if self._loop:
                asyncio.run_coroutine_threadsafe(ws_manager.broadcast(org_id, message), self._loop)
                
        return tx

# Global simulator instance
simulator = TransactionSimulator()
