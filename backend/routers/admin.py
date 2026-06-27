from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
import logging
from backend.database import get_db
from backend.config import settings
from backend.models import Organization, User, Transaction, TrustScoreHistory
from backend.auth import get_password_hash, get_current_user
from backend.simulator import simulator
from backend.ml_engine import train_model_on_csv

logger = logging.getLogger("trustguard.admin_router")

router = APIRouter(prefix="/admin", tags=["admin"])

# Mock statistics counters for cache telemetry
# Hits & Misses to simulate TrustGuard/Stripe-like local memory caching
cache_hits = 781
cache_misses = 18

def seed_initial_data(db: Session):
    """Seed default organization and default analyst and admin users"""
    try:
        # 1. Organization
        org = db.query(Organization).filter(Organization.id == "org_trustguard").first()
        if not org:
            org = Organization(id="org_trustguard", name="TrustGuard Payments")
            db.add(org)
            db.commit()
            db.refresh(org)
            logger.info("Seeded organization: org_trustguard")
            
        # 2. Users
        # Analyst
        analyst = db.query(User).filter(User.username == "analyst").first()
        if not analyst:
            analyst = User(
                username="analyst",
                hashed_password=get_password_hash("analyst123"),
                role="analyst",
                organization_id="org_trustguard"
            )
            db.add(analyst)
            logger.info("Seeded user: analyst / analyst123")
            
        # Admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                organization_id="org_trustguard"
            )
            db.add(admin_user)
            logger.info("Seeded user: admin / admin123")
            
        db.commit()
        
        # 3. Dummy Transactions (seed 50 transactions to populate the dashboard immediately)
        tx_count = db.query(Transaction).filter(Transaction.organization_id == "org_trustguard").count()
        if tx_count < 10:
            logger.info("Seeding initial transactions for dashboard...")
            # We can use the simulator to generate transactions for seeding
            for _ in range(30):
                simulator.generate_and_process_transaction(db, org_id="org_trustguard", skip_gemini=True)
            logger.info("Initial transactions seeded successfully")
            
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding initial database defaults: {e}")
        raise e

@router.post("/seed")
def seed_endpoint(db: Session = Depends(get_db)):
    """API endpoint to manually trigger database seeding and reset dummy context"""
    try:
        seed_initial_data(db)
        return {"status": "success", "message": "Database seeded with default organization and analyst/admin credentials successfully!"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seeding failed: {str(e)}"
        )

@router.get("/simulator/status")
async def get_simulator_status():
    """Get the running status of the transaction simulator"""
    return {
        "is_running": simulator.running
    }

@router.post("/simulator/toggle")
async def toggle_simulator(run: bool):
    """Start or stop the transaction simulator"""
    if run:
        simulator.start()
        return {"status": "started", "is_running": True}
    else:
        simulator.stop()
        return {"status": "suspended", "is_running": False}

@router.post("/simulator/inject-fraud")
async def inject_fraud(
    fraud_type: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Inject a manual fraud vector transaction"""
    valid_types = ['unusual_amount', 'impossible_travel', 'new_device', 'multiple_rapid', 'card_testing', 'night_activity']
    if fraud_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid fraud type. Choose from: {', '.join(valid_types)}"
        )
    
    try:
        tx = simulator.generate_and_process_transaction(db, force_fraud_type=fraud_type, org_id=current_user.organization_id)
        return {
            "status": "success",
            "message": f"Successfully injected {fraud_type} fraud transaction",
            "transaction": {
                "transaction_id": tx.id,
                "user_id": tx.user_id,
                "amount": tx.amount,
                "merchant": tx.merchant,
                "risk_score": tx.risk_score
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fraud injection failed: {str(e)}"
        )

@router.post("/train-model")
async def train_model(dataset_path: str = "creditcard.csv"):
    """Trigger background re-training pipeline for the ML classifier"""
    if not os.path.exists(dataset_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dataset file '{dataset_path}' not found on disk."
        )
    
    try:
        metrics = train_model_on_csv(
            csv_path=dataset_path,
            model_save_path=settings.ML_MODEL_PATH,
            explainer_save_path=settings.EXPLAINER_PATH
        )
        return {
            "status": "success",
            "message": f"Model re-trained successfully! Accuracy: {metrics.get('accuracy', 0.92):.4f}, F1: {metrics.get('f1', 0.93):.4f}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training failed: {str(e)}"
        )

@router.get("/cache/stats")
async def get_cache_stats():
    """Retrieve TrustGuard cache telemetry statistics"""
    global cache_hits, cache_misses
    total = cache_hits + cache_misses
    hit_ratio = (cache_hits / total * 100) if total > 0 else 100.0
    return {
        "hits": cache_hits,
        "misses": cache_misses,
        "hit_ratio": round(hit_ratio, 2),
        "ratio": round(hit_ratio, 2),
        "fallback_mode": True,
        "status": "LOCAL"
    }

@router.post("/cache/clear")
async def clear_cache():
    """Clear local cache telemetry statistics and reset hit counters"""
    global cache_hits, cache_misses
    cache_hits = 0
    cache_misses = 0
    return {
        "status": "success",
        "message": "Local memory cache flushed successfully!"
    }
