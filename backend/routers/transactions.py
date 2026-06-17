from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime
from typing import List
from backend.schemas import ScoringRequest, ScoringResponse, TransactionResponse
from backend.database import get_db
from backend.models import Transaction, User
from backend.ml_engine import score_transaction
from backend.trust_engine import calculate_user_trust_score
from backend.investigation import run_investigation
from backend.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/score-transaction", response_model=ScoringResponse)
async def score_new_transaction(
    request: ScoringRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Score a new transaction for fraud risk and save to organization partition"""
    
    # Score the transaction
    scoring_result = score_transaction({
        'user_id': request.user_id,
        'amount': request.amount,
        'merchant': request.merchant,
        'location': request.location,
        'device': request.device,
        'failed_attempts': 0
    })
    
    # Get trust score before
    trust_before = calculate_user_trust_score(db, request.user_id)
    
    # Parse location
    location_parts = request.location.split(', ')
    city = location_parts[0] if len(location_parts) > 0 else "New York"
    country = location_parts[1] if len(location_parts) > 1 else "US"
    
    import random
    payment_method = random.choice(['credit_card', 'debit_card', 'upi', 'net_banking'])
    
    # Try to extract merchant category from name or map it
    merchant_category = "retail"
    merchant_lower = request.merchant.lower()
    if "uber" in merchant_lower or "trip" in merchant_lower or "travel" in merchant_lower:
        merchant_category = "transportation"
    elif "shell" in merchant_lower or "gas" in merchant_lower or "fuel" in merchant_lower:
        merchant_category = "fuel"
    elif "netflix" in merchant_lower or "entertainment" in merchant_lower or "show" in merchant_lower:
        merchant_category = "entertainment"
    elif "trustguard" in merchant_lower or "pay" in merchant_lower or "finance" in merchant_lower:
        merchant_category = "financial"
        
    device_id = f"dev_{uuid.uuid4().hex[:8]}"
    ip_address = f"192.168.1.{random.randint(10, 254)}"
    
    risk_score = scoring_result['risk_score']
    risk_status = scoring_result['status']
    is_flagged = True if risk_score > 70 else False
    decision = "PENDING" if is_flagged else "APPROVED"
    
    # Save transaction to database
    tx = Transaction(
        id=f"tx_{uuid.uuid4().hex[:12]}",
        user_id=request.user_id,
        amount=request.amount,
        merchant=request.merchant,
        merchant_category=merchant_category,
        payment_method=payment_method,
        city=city,
        country=country,
        device_id=device_id,
        ip_address=ip_address,
        location=request.location,
        device=request.device,
        risk_score=risk_score,
        risk_status=risk_status,
        is_fraud=False,
        is_flagged=is_flagged,
        explanation=scoring_result.get('explanation'),
        trust_score_before=trust_before,
        organization_id=current_user.organization_id,
        decision=decision
    )
    
    db.add(tx)
    db.commit()
    
    # Calculate trust after
    trust_after = calculate_user_trust_score(db, request.user_id)
    tx.trust_score_after = trust_after
    db.commit()
    
    status_str = "HIGH_RISK" if risk_status == "high" else "MEDIUM_RISK" if risk_status == "medium" else "TRUSTED"
    
    return ScoringResponse(
        risk_score=risk_score,
        status=status_str,
        explanation=scoring_result.get('explanation', {})
    )

@router.get("/stats")
async def get_transaction_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve aggregate transaction statistics for the user's organization"""
    try:
        org_id = current_user.organization_id
        total = db.query(Transaction).filter(Transaction.organization_id == org_id).count()
        flagged = db.query(Transaction).filter(
            Transaction.organization_id == org_id,
            Transaction.is_flagged == True
        ).count()
        pending = db.query(Transaction).filter(
            Transaction.organization_id == org_id,
            Transaction.is_flagged == True,
            Transaction.decision == "PENDING"
        ).count()
        
        fraud_rate = round((flagged / total * 100), 1) if total > 0 else 0.0
        
        return {
            "total_transactions": total,
            "flagged_transactions": flagged,
            "pending_reviews": pending,
            "fraud_rate": fraud_rate
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate stats: {str(e)}"
        )

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get transaction details (secured by tenant)"""
    
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.organization_id == current_user.organization_id
    ).first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return tx

@router.post("/investigate")
async def investigate_transaction(
    transaction_id: str = None,
    user_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI investigation report for a transaction"""
    
    # Get transaction
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.organization_id == current_user.organization_id
    ).first()
    
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

@router.get("/", response_model=List[TransactionResponse])
async def list_transactions(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user),
    skip: int = 0, 
    limit: int = 100
):
    """List recent transactions filtered by the user's organization"""
    
    transactions = db.query(Transaction).filter(
        Transaction.organization_id == current_user.organization_id
    ).order_by(
        Transaction.timestamp.desc()
    ).offset(skip).limit(limit).all()
    
    return transactions

from pydantic import BaseModel

class DecisionRequest(BaseModel):
    decision: str  # APPROVED or BLOCKED

@router.post("/{transaction_id}/decision", response_model=TransactionResponse)
async def update_transaction_decision(
    transaction_id: str,
    request: DecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resolve a flagged transaction (secured by tenant)"""
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.organization_id == current_user.organization_id
    ).first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    tx.decision = request.decision
    tx.decision_by = current_user.username
    tx.decision_at = datetime.utcnow()
    
    # If blocked, mark as fraud
    if request.decision == "BLOCKED":
        tx.is_fraud = True
    else:
        tx.is_fraud = False
        
    # Re-calculate trust score after decision
    trust_before = tx.trust_score_after or calculate_user_trust_score(db, tx.user_id)
    db.commit() # Save is_fraud change
    
    trust_after = calculate_user_trust_score(db, tx.user_id)
    tx.trust_score_after = trust_after
    db.commit()
    
    # Add to history if changed
    if abs(trust_after - trust_before) > 0.01:
        from backend.models import TrustScoreHistory
        import uuid
        history_entry = TrustScoreHistory(
            id=f"hist_{uuid.uuid4().hex[:12]}",
            user_id=tx.user_id,
            old_score=trust_before,
            new_score=trust_after,
            reason=f"Analyst resolution: {request.decision}",
            organization_id=current_user.organization_id
        )
        db.add(history_entry)
        db.commit()
        
    return tx
