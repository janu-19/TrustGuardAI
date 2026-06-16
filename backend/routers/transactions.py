from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from datetime import datetime
from backend.schemas import ScoringRequest, ScoringResponse, TransactionResponse
from backend.database import get_db, Transaction
from backend.ml_engine import score_transaction
from backend.trust_engine import calculate_user_trust_score
from backend.investigation import run_investigation

router = APIRouter()

@router.post("/score-transaction", response_model=ScoringResponse)
async def score_new_transaction(request: ScoringRequest, db: Session = Depends(get_db)):
    """Score a new transaction for fraud risk"""
    
    # Score the transaction
    scoring_result = score_transaction({
        'user_id': request.user_id,
        'amount': request.amount,
        'merchant': request.merchant,
        'location': request.location,
        'device': request.device
    })
    
    # Get trust score before
    trust_before = calculate_user_trust_score(db, request.user_id)
    
    # Save transaction to database
    tx = Transaction(
        id=str(uuid.uuid4()),
        user_id=request.user_id,
        amount=request.amount,
        merchant=request.merchant,
        location=request.location,
        device=request.device,
        risk_score=scoring_result['risk_score'],
        risk_status=scoring_result['status'],
        explanation=scoring_result.get('explanation'),
        trust_score_before=trust_before
    )
    
    db.add(tx)
    db.commit()
    
    # Calculate trust after
    trust_after = calculate_user_trust_score(db, request.user_id)
    tx.trust_score_after = trust_after
    db.commit()
    
    return ScoringResponse(
        risk_score=scoring_result['risk_score'],
        risk_status=scoring_result['status'],
        explanation=scoring_result.get('explanation', {})
    )

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Get transaction details"""
    
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return tx

@router.post("/investigate")
async def investigate_transaction(
    transaction_id: str = None,
    user_id: str = None,
    db: Session = Depends(get_db)
):
    """Generate AI investigation report for a transaction"""
    
    # Get transaction
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Run investigation
    report = run_investigation({
        'transaction_id': tx.id,
        'user_id': tx.user_id,
        'amount': tx.amount,
        'merchant': tx.merchant,
        'location': tx.location,
        'device': tx.device,
        'risk_score': tx.risk_score,
        'risk_factors': tx.explanation or {}
    })
    
    return {
        'transaction_id': tx.id,
        'report': report,
        'timestamp': datetime.utcnow()
    }

@router.get("/")
async def list_transactions(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    """List recent transactions"""
    
    transactions = db.query(Transaction).order_by(
        Transaction.timestamp.desc()
    ).offset(skip).limit(limit).all()
    
    return transactions
