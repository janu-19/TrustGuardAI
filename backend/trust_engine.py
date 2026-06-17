from sqlalchemy.orm import Session
from backend.models import Transaction
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def calculate_user_trust_score(db: Session, user_id: str) -> float:
    """Calculate user trust score based on transaction history"""
    
    # Get all transactions for user
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    
    if not transactions:
        return 100.0  # New user gets full trust
    
    # Base score
    trust_score = 100.0
    
    # Account age factor
    if transactions:
        first_tx = min(transactions, key=lambda t: t.timestamp)
        account_age = (datetime.utcnow() - first_tx.timestamp).days
        
        if account_age < 7:
            trust_score -= 15  # New account is riskier
        elif account_age < 30:
            trust_score -= 10
    
    # Transaction volume
    tx_count = len(transactions)
    if tx_count < 5:
        trust_score -= 20  # Low transaction history
    elif tx_count < 20:
        trust_score -= 5
    
    # Fraud history
    fraud_count = len([t for t in transactions if t.is_fraud])
    if fraud_count > 0:
        trust_score -= fraud_count * 15
    
    # Recent transaction quality
    recent_high_risk = len([
        t for t in transactions 
        if t.risk_score > 70 and 
        (datetime.utcnow() - t.timestamp) < timedelta(days=7)
    ])
    if recent_high_risk > 2:
        trust_score -= recent_high_risk * 5
    
    # Failed transaction history
    failed_attempts = sum(1 for t in transactions if t.risk_status == 'high')
    if failed_attempts > 5:
        trust_score -= min(failed_attempts - 5, 20)
    
    # Device diversity (some diversity is good)
    unique_devices = len(set(t.device for t in transactions if t.device))
    if unique_devices == 1:
        trust_score -= 5  # Too rigid
    
    # Return score clamped to 0-100
    return max(0.0, min(100.0, trust_score))
