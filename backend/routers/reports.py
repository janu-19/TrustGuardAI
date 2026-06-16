from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, Transaction, Investigation
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/summary")
async def get_report_summary(db: Session = Depends(get_db)):
    """Get fraud report summary"""
    
    # Get statistics
    total_transactions = db.query(Transaction).count()
    high_risk = db.query(Transaction).filter(Transaction.risk_score > 70).count()
    fraud_count = db.query(Transaction).filter(Transaction.is_fraud == True).count()
    
    # Get transactions in last 24 hours
    since = datetime.utcnow() - timedelta(hours=24)
    recent = db.query(Transaction).filter(Transaction.timestamp > since).count()
    
    # Average risk score
    from sqlalchemy import func
    avg_risk = db.query(func.avg(Transaction.risk_score)).scalar() or 0
    
    return {
        'total_transactions': total_transactions,
        'high_risk_count': high_risk,
        'fraud_count': fraud_count,
        'recent_24h': recent,
        'average_risk_score': float(avg_risk),
        'high_risk_percentage': (high_risk / total_transactions * 100) if total_transactions > 0 else 0
    }

@router.get("/by-user/{user_id}")
async def get_user_report(user_id: str, db: Session = Depends(get_db)):
    """Get report for specific user"""
    
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.timestamp.desc()).all()
    
    if not transactions:
        raise HTTPException(status_code=404, detail="No transactions found for user")
    
    high_risk_count = len([t for t in transactions if t.risk_score > 70])
    fraud_count = len([t for t in transactions if t.is_fraud])
    
    return {
        'user_id': user_id,
        'transaction_count': len(transactions),
        'high_risk_count': high_risk_count,
        'fraud_count': fraud_count,
        'average_risk_score': sum(t.risk_score for t in transactions) / len(transactions),
        'recent_transactions': transactions[:10]
    }

@router.get("/investigations")
async def get_investigations(db: Session = Depends(get_db), limit: int = 50):
    """Get recent investigations"""
    
    investigations = db.query(Investigation).order_by(
        Investigation.created_at.desc()
    ).limit(limit).all()
    
    return investigations
