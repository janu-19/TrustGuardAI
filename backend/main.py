import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError

from backend.config import settings
from backend.database import engine, Base
from backend.models import Organization
from backend.database import SessionLocal
from backend.routers import auth, transactions, users, reports, admin
from backend.routers.admin import seed_initial_data
from backend.ml_engine import load_model, train_model_on_csv
import threading
from backend.simulator import ws_manager, simulator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trustguard.main")

# Initialize database schemas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-Time Fraud Detection & Investigation Platform",
    version="1.0.0"
)

# Configure CORS for React frontend (Vite defaults to 5173, fallback to standard ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # development convenience: allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(transactions.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    logger.info("Initializing system startup hooks...")
    
    # 1. Seed default organization "org_trustguard" if database is empty
    db = SessionLocal()
    try:
        default_org = db.query(Organization).filter(Organization.id == "org_trustguard").first()
        if not default_org:
            logger.info("Seeding default organization: org_trustguard")
            org = Organization(id="org_trustguard", name="TrustGuard Payments")
            db.add(org)
            db.commit()
        try:
            logger.info("Ensuring default admin and analyst users exist...")
            seed_initial_data(db=db)
        except Exception as e:
            logger.error(f"Error seeding default users on startup: {e}")
            db.rollback()
    except Exception as e:
        logger.error(f"Error seeding default organization on startup: {e}")
        db.rollback()
    finally:
        db.close()
        
    # 2. Try loading ML model or trigger auto-training on startup if creditcard.csv exists
    model, _, _, _ = load_model()
    if model is None:
        csv_path = "creditcard.csv"
        if os.path.exists(csv_path):
            logger.info(f"ML model not found. Found '{csv_path}' on disk. Initiating auto-training in background thread...")
            def background_train():
                try:
                    metrics = train_model_on_csv(
                        csv_path=csv_path,
                        model_save_path=settings.ML_MODEL_PATH,
                        explainer_save_path=settings.EXPLAINER_PATH
                    )
                    logger.info(f"Background auto-training completed successfully: {metrics}")
                except Exception as e:
                    logger.error(f"Auto-training failed in background: {e}")

            t = threading.Thread(target=background_train, daemon=True)
            t.start()
        else:
            logger.warning("No ML model found and 'creditcard.csv' not found. Backend will operate in heuristic-fallback mode.")
            
    # 3. Auto-start the simulator for live data streaming
    logger.info("Starting live transaction simulator...")
    simulator.start()

@app.on_event("shutdown")
def shutdown_event():
    logger.info("Executing system shutdown hooks...")
    simulator.stop()

# WebSocket feed endpoint
# Expects a token in the query parameters to identify the client's tenant organization
@app.websocket("/ws/transactions")
async def websocket_transactions(websocket: WebSocket, token: str = Query(...)):
    org_id = "org_trustguard"  # fallback default
    
    # Verify token
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        org_id = payload.get("org", "org_trustguard")
    except JWTError:
        logger.warning("WebSocket client failed JWT authentication. Refusing connection.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    # Connect
    await ws_manager.connect(websocket, org_id)
    try:
        while True:
            # Keep connection alive, listen for any messages
            data = await websocket.receive_text()
            # If client sends a custom query/ping, reply
            await websocket.send_json({"type": "PONG", "received": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, org_id)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket, org_id)

@app.websocket("/testws")
async def test_websocket(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("hello")
    await websocket.close()

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": "development"
    }
