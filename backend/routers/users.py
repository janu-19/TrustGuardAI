from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, User, Transaction
from backend.trust_engine import calculate_user_trust_score

router = APIRouter()

@router.get("/{user_id}")
async def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """Get user profile and statistics"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get transaction statistics
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    trust_score = calculate_user_trust_score(db, user_id)
    
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'created_at': user.created_at,
        'trust_score': trust_score,
        'transaction_count': len(transactions),
        'high_risk_transactions': len([t for t in transactions if t.risk_score > 70]),
        'fraud_count': len([t for t in transactions if t.is_fraud])
    }

@router.get("/")
async def list_users(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    """List users"""
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.put("/{user_id}")
async def update_user_profile(user_id: str, updates: dict, db: Session = Depends(get_db)):
    """Update user profile"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in updates.items():
        if key in ['email']:
            setattr(user, key, value)
    
    db.commit()
    return user
