from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

# Global simulator reference
_simulator = None

def set_simulator(sim):
    global _simulator
    _simulator = sim

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    
    return {
        "status": "healthy",
        "simulator_running": _simulator is not None and _simulator.running if _simulator else False,
        "timestamp": "2024-01-01T00:00:00Z"
    }

@router.post("/simulator/start")
async def start_simulator():
    """Start the transaction simulator"""
    
    if not _simulator:
        raise HTTPException(status_code=400, detail="Simulator not initialized")
    
    if _simulator.running:
        raise HTTPException(status_code=400, detail="Simulator already running")
    
    _simulator.running = True
    logger.info("✅ Simulator started")
    
    return {"status": "started", "message": "Transaction simulator started"}

@router.post("/simulator/stop")
async def stop_simulator():
    """Stop the transaction simulator"""
    
    if not _simulator:
        raise HTTPException(status_code=400, detail="Simulator not initialized")
    
    if not _simulator.running:
        raise HTTPException(status_code=400, detail="Simulator not running")
    
    _simulator.running = False
    logger.info("⛔ Simulator stopped")
    
    return {"status": "stopped", "message": "Transaction simulator stopped"}

@router.get("/config")
async def get_configuration():
    """Get application configuration"""
    
    return {
        "database_url": "sqlite:///trustguard.db",  # Don't expose real DB in response
        "simulation_interval": settings.SIMULATION_INTERVAL_SECONDS,
        "fraud_rate": settings.FRAUD_RATE,
        "gemini_enabled": bool(settings.GEMINI_API_KEY)
    }

@router.post("/cache/clear")
async def clear_cache():
    """Clear application cache"""
    
    from backend.cache import cache_clear
    cache_clear()
    
    return {"status": "cleared", "message": "Cache cleared"}

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get application statistics"""
    
    from backend.database import Transaction
    from sqlalchemy import func
    
    total_transactions = db.query(Transaction).count()
    high_risk = db.query(Transaction).filter(Transaction.risk_score > 70).count()
    fraud_count = db.query(Transaction).filter(Transaction.is_fraud == True).count()
    avg_risk = db.query(func.avg(Transaction.risk_score)).scalar() or 0
    
    return {
        "total_transactions": total_transactions,
        "high_risk_count": high_risk,
        "fraud_count": fraud_count,
        "average_risk_score": float(avg_risk),
        "simulator_running": _simulator.running if _simulator else False
    }
