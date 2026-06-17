from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models import User, Transaction, TrustScoreHistory
from backend.trust_engine import calculate_user_trust_score
import logging

logger = logging.getLogger("trustguard.users_router")

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
async def list_users(db: Session = Depends(get_db)):
    """List all users ranked by trust score (lowest score/riskiest first)"""
    try:
        users = db.query(User).all()
        rankings = []
        for u in users:
            # Get transaction statistics for user
            txs = db.query(Transaction).filter(Transaction.user_id == u.username).all()
            total_txs = len(txs)
            blocked_txs = len([t for t in txs if t.is_fraud])
            trust_score = calculate_user_trust_score(db, u.username)
            
            rankings.append({
                "user_id": u.username,
                "total_transactions": total_txs,
                "blocked_transactions": blocked_txs,
                "trust_score": round(trust_score, 0)
            })
            
        # Sort rankings ascending by trust score (riskiest/lowest score first)
        rankings.sort(key=lambda x: x["trust_score"])
        return rankings
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load user rankings: {str(e)}"
        )

@router.get("/{user_id}/score")
async def get_user_score_details(user_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed risk audit metrics for a user"""
    try:
        # Check if user exists
        user = db.query(User).filter(User.username == user_id).first()
        if not user:
            # Fallback for dynamic users not pre-seeded but having transactions
            pass

        trust_score = calculate_user_trust_score(db, user_id)
        
        # Calculate dynamic risk factors
        txs = db.query(Transaction).filter(Transaction.user_id == user_id).all()
        failed_attempts = len([t for t in txs if t.risk_score > 70])
        unique_devices = len(set(t.device for t in txs if t.device))
        fraud_events = len([t for t in txs if t.is_fraud])
        
        # Category classification
        if trust_score <= 30:
            category = "High Risk"
        elif trust_score <= 60:
            category = "Medium Risk"
        else:
            category = "Trusted"
            
        # Compile readable audit factors string
        factors_list = []
        factors_list.append(f"{failed_attempts} Failed Attempt(s)")
        factors_list.append(f"{unique_devices} Devices Used")
        if fraud_events > 0:
            factors_list.append(f"{fraud_events} Fraud Flagged")
        else:
            factors_list.append("Good Transaction History")
            
        factors_str = ", ".join(factors_list)
        
        return {
            "user_id": user_id,
            "trust_score": round(trust_score, 0),
            "category": category,
            "factors": factors_str
        }
    except Exception as e:
        logger.error(f"Error getting score details for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get score details: {str(e)}"
        )

@router.get("/{user_id}/trust-history")
async def get_user_trust_history(user_id: str, db: Session = Depends(get_db)):
    """Get chronological trust score adjustment logs for a user"""
    try:
        history = db.query(TrustScoreHistory).filter(
            TrustScoreHistory.user_id == user_id
        ).order_by(TrustScoreHistory.timestamp.desc()).all()
        
        # If history is empty, seed initial baseline
        if not history:
            history = [{
                "id": "init",
                "user_id": user_id,
                "old_score": 100.0,
                "new_score": 100.0,
                "reason": "Periodic Update / Initial Base",
                "timestamp": datetime.utcnow().isoformat()
            }]
            
        return history
    except Exception as e:
        logger.error(f"Error fetching trust history for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trust history: {str(e)}"
        )
