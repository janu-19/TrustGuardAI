from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZIPMiddleware
from contextlib import asynccontextmanager
import logging
import threading
from dotenv import load_dotenv

from backend.config import settings
from backend.database import init_db
from backend.simulator import TransactionSimulator
from backend.ml_engine import train_model_on_csv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Global simulator instance
simulator = None
simulator_thread = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    global simulator, simulator_thread
    
    # Startup
    logger.info("🚀 Starting TrustGuard backend...")
    
    # Initialize database
    init_db()
    logger.info("✅ Database initialized")
    
    # Train ML model on startup
    logger.info("🤖 Training fraud detection model...")
    try:
        train_model_on_csv("creditcard.csv")
        logger.info("✅ Model trained successfully")
    except Exception as e:
        logger.warning(f"⚠️  Model training failed: {e}. Will use fallback scoring.")
    
    # Start transaction simulator in background
    logger.info("📡 Starting transaction simulator...")
    simulator = TransactionSimulator()
    simulator_thread = threading.Thread(target=simulator.run, daemon=True)
    simulator_thread.start()
    logger.info("✅ Simulator started")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down TrustGuard backend...")
    if simulator:
        simulator.stop()
    logger.info("✅ Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="TrustGuard AI",
    description="Real-time fraud detection and investigation platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZIP compression middleware
app.add_middleware(GZIPMiddleware, minimum_size=1000)

# Import routers
from backend.routers import auth, transactions, reports, users, admin

# Register routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])

# WebSocket connection manager
from fastapi import WebSocket
import json
from typing import Dict, Set

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, org_id: str):
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = set()
        self.active_connections[org_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, org_id: str):
        if org_id in self.active_connections:
            self.active_connections[org_id].discard(websocket)
    
    async def broadcast(self, org_id: str, message: dict):
        if org_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[org_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send message: {e}")
                    disconnected.add(connection)
            self.active_connections[org_id] -= disconnected

ws_manager = ConnectionManager()

@app.websocket("/ws/transactions")
async def websocket_endpoint(websocket: WebSocket):
    org_id = "default"  # Default organization
    await ws_manager.connect(websocket, org_id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        ws_manager.disconnect(websocket, org_id)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "simulator_running": simulator is not None and simulator.running,
        "model_loaded": True
    }

@app.get("/")
async def root():
    return {
        "message": "TrustGuard AI - Real-time Fraud Detection Platform",
        "docs": "/docs",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
