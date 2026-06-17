import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "TrustGuard AI"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///trustguard.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    ML_MODEL_PATH: str = "backend/models/fraud_detector.joblib"
    EXPLAINER_PATH: str = "backend/models/shap_explainer.joblib"
    
    SIMULATION_INTERVAL_SECONDS: float = float(os.getenv("SIMULATION_INTERVAL_SECONDS", "2.0"))
    FRAUD_RATE: float = 0.15
    
    # Admin credentials for demo
    DEMO_USERNAME: str = "admin"
    DEMO_PASSWORD: str = "password"

settings = Settings()
