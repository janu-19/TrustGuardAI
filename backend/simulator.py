import time
import uuid
import random
import threading
from datetime import datetime
from backend.ml_engine import score_transaction
from backend.trust_engine import calculate_user_trust_score
from backend.investigation import run_investigation
from backend.database import SessionLocal, Transaction, Alert
import logging

logger = logging.getLogger(__name__)

# Import main.py's ws_manager (avoid circular import)
_ws_manager = None

def set_ws_manager(manager):
    global _ws_manager
    _ws_manager = manager

class TransactionSimulator:
    def __init__(self, interval: float = 2.0):
        self.interval = interval
        self.running = False
        self.thread = None
    
    def run(self):
        """Main simulator loop"""
        self.running = True
        logger.info(f"🎲 Simulator running (interval: {self.interval}s)")
        
        while self.running:
            try:
                self.generate_and_process_transaction()
                time.sleep(self.interval)
            except Exception as e:
                logger.error(f"Simulator error: {e}")
    
    def stop(self):
        """Stop the simulator"""
        self.running = False
        logger.info("⛔ Simulator stopped")
    
    def generate_and_process_transaction(self):
        """Generate a synthetic transaction and score it"""
        # Generate random transaction
        user_id = f"user_{random.randint(1, 50)}"
        amount = random.uniform(10, 5000)
        merchant = random.choice(["Amazon", "Walmart", "Target", "Best Buy", "Apple", "Starbucks"])
        location = random.choice(["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"])
        device = random.choice(["iPhone", "Android", "Web", "ATM"])
        
        # Inject fraud patterns (15% of transactions)
        is_simulated_fraud = random.random() < 0.15
        fraud_patterns = {}
        
        if is_simulated_fraud:
            pattern = random.choice([
                'unusual_amount',
                'impossible_travel',
                'new_device',
                'multiple_rapid',
                'card_testing',
                'night_activity'
            ])
            
            if pattern == 'unusual_amount':
                amount = random.uniform(2000, 5000)
            elif pattern == 'impossible_travel':
                fraud_patterns['impossible_travel'] = True
            elif pattern == 'new_device':
                device = "NewDevice_" + str(random.randint(1, 1000))
                fraud_patterns['new_device'] = True
            elif pattern == 'multiple_rapid':
                fraud_patterns['high_frequency'] = True
            elif pattern == 'night_activity':
                fraud_patterns['night_activity'] = True
            
            logger.info(f"🚨 Fraud pattern: {pattern}")
        
        # Score transaction
        transaction_data = {
            'user_id': user_id,
            'amount': amount,
            'merchant': merchant,
            'location': location,
            'device': device,
            'failed_attempts': random.randint(0, 3) if is_simulated_fraud else 0,
            **fraud_patterns
        }
        
        scoring_result = score_transaction(transaction_data)
        risk_score = scoring_result['risk_score']
        risk_status = scoring_result['status']
        
        # Calculate trust before
        db = SessionLocal()
        try:
            trust_before = calculate_user_trust_score(db, user_id)
            
            # Save transaction
            tx_id = str(uuid.uuid4())
            tx = Transaction(
                id=tx_id,
                user_id=user_id,
                amount=amount,
                merchant=merchant,
                location=location,
                device=device,
                risk_score=risk_score,
                risk_status=risk_status,
                is_fraud=is_simulated_fraud,
                explanation=scoring_result.get('explanation'),
                trust_score_before=trust_before
            )
            db.add(tx)
            db.commit()
            
            # Calculate trust after
            trust_after = calculate_user_trust_score(db, user_id)
            tx.trust_score_after = trust_after
            db.commit()
            
            # Create alert if high risk
            if risk_score > 70:
                alert = Alert(
                    id=str(uuid.uuid4()),
                    transaction_id=tx_id,
                    user_id=user_id,
                    severity='high' if risk_score > 85 else 'medium',
                    message=f"High-risk transaction: ${amount:.2f} at {merchant}"
                )
                db.add(alert)
                db.commit()
                
                # Run investigation for high-risk transactions
                logger.info(f"🔍 Starting investigation for TX {tx_id}")
                investigation_report = run_investigation({
                    'transaction_id': tx_id,
                    'user_id': user_id,
                    'amount': amount,
                    'merchant': merchant,
                    'location': location,
                    'device': device,
                    'risk_score': risk_score,
                    'risk_factors': fraud_patterns
                })
            
            # Broadcast to WebSocket
            if _ws_manager:
                tx_dict = {
                    'id': tx.id,
                    'user_id': tx.user_id,
                    'amount': tx.amount,
                    'merchant': tx.merchant,
                    'location': tx.location,
                    'device': tx.device,
                    'risk_score': tx.risk_score,
                    'risk_status': tx.risk_status,
                    'is_fraud': tx.is_fraud,
                    'timestamp': tx.timestamp.isoformat()
                }
                
                # Async broadcast (simplified)
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                loop.create_task(_ws_manager.broadcast(
                    'default',
                    {'type': 'NEW_TRANSACTION', 'transaction': tx_dict}
                ))
            
            logger.info(f"✅ TX {tx_id[:8]}: {user_id} | ${amount:.2f} | Risk: {risk_score:.1f}%")
        
        finally:
            db.close()
