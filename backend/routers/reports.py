from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Transaction, Investigation, User
from backend.investigation import run_investigation
from backend.auth import get_current_user
import uuid
import logging
from datetime import datetime

logger = logging.getLogger("trustguard.reports_router")

router = APIRouter(prefix="/reports", tags=["reports"])

def build_investigation_response(inv: Investigation, tx: Transaction):
    """Format investigation object to match InvestigationPortal.jsx requirements"""
    # Build analyst analysis payload
    analyst_analysis = {
        "node": "Risk Analyst",
        "action": inv.recommendation or "REVIEW",
        "decision": inv.recommendation or "REVIEW",
        "status": "COMPLETED",
        "timestamp": inv.created_at.isoformat() if inv.created_at else datetime.utcnow().isoformat(),
        "final_score": tx.risk_score,
        "classification": tx.risk_status,
        "reviewer": "AI Risk Agent",
        "agreement": "High"
    }
    
    # Build investigator analysis payload
    investigator_analysis = {
        "node": "Investigator Agent",
        "findings": inv.findings or {},
        "transaction_telemetry": {
            "id": tx.id,
            "user_id": tx.user_id,
            "amount": tx.amount,
            "merchant": tx.merchant,
            "location": tx.location,
            "device": tx.device,
            "risk_score": tx.risk_score,
            "timestamp": tx.timestamp.isoformat()
        }
    }
    
    return {
        "transaction_id": tx.id,
        "report_summary": inv.report,
        "investigator_analysis": investigator_analysis,
        "analyst_analysis": analyst_analysis
    }

@router.get("/{transaction_id}")
async def get_investigation_report(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve or generate agentic AI investigation report for a transaction"""
    
    # Verify transaction exists and belongs to organization
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.organization_id == current_user.organization_id
    ).first()
    
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found or unauthorized access"
        )
        
    # Look for existing report
    inv = db.query(Investigation).filter(Investigation.transaction_id == transaction_id).first()
    
    if not inv:
        # Generate on-the-fly if it wasn't saved before
        logger.info(f"Report for TX {transaction_id} not found in database. Initiating on-the-fly generation...")
        try:
            report_str = run_investigation({
                'transaction_id': tx.id,
                'user_id': tx.user_id,
                'amount': tx.amount,
                'merchant': tx.merchant,
                'location': tx.location,
                'device': tx.device,
                'risk_score': tx.risk_score,
                'risk_factors': tx.explanation or {}
            })
            
            findings = {
                "device_fingerprint": tx.device,
                "location_deviation": tx.location != "New York, US",
                "rules_matched": tx.explanation or {}
            }
            
            inv = Investigation(
                id=f"inv_{uuid.uuid4().hex[:12]}",
                transaction_id=tx.id,
                user_id=tx.user_id,
                findings=findings,
                recommendation="DECLINE" if tx.risk_score > 85 else "REQUIRE REVIEW",
                report=report_str,
                organization_id=current_user.organization_id
            )
            db.add(inv)
            db.commit()
            db.refresh(inv)
        except Exception as e:
            logger.error(f"Failed to generate report on-the-fly: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate report: {str(e)}"
            )
            
    return build_investigation_response(inv, tx)

@router.post("/{transaction_id}/reinvestigate")
async def reinvestigate_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Force rerun AI agent node investigation pipeline for transaction"""
    
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.organization_id == current_user.organization_id
    ).first()
    
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found or unauthorized access"
        )
        
    try:
        # Rerun investigation
        logger.info(f"Re-running AI agents for TX {transaction_id}...")
        report_str = run_investigation({
            'transaction_id': tx.id,
            'user_id': tx.user_id,
            'amount': tx.amount,
            'merchant': tx.merchant,
            'location': tx.location,
            'device': tx.device,
            'risk_score': tx.risk_score,
            'risk_factors': tx.explanation or {}
        })
        
        # Look for existing report to update, or create a new one
        inv = db.query(Investigation).filter(Investigation.transaction_id == transaction_id).first()
        
        findings = {
            "device_fingerprint": tx.device,
            "location_deviation": tx.location != "New York, US",
            "rules_matched": tx.explanation or {},
            "reinvestigated_at": datetime.utcnow().isoformat()
        }
        
        if inv:
            inv.report = report_str
            inv.findings = findings
            inv.recommendation = "DECLINE" if tx.risk_score > 85 else "REQUIRE REVIEW"
            inv.created_at = datetime.utcnow()
        else:
            inv = Investigation(
                id=f"inv_{uuid.uuid4().hex[:12]}",
                transaction_id=tx.id,
                user_id=tx.user_id,
                findings=findings,
                recommendation="DECLINE" if tx.risk_score > 85 else "REQUIRE REVIEW",
                report=report_str,
                organization_id=current_user.organization_id
            )
            db.add(inv)
            
        db.commit()
        db.refresh(inv)
        
        return build_investigation_response(inv, tx)
    except Exception as e:
        logger.error(f"Reinvestigation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reinvestigation failed: {str(e)}"
        )
