from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from backend.config import settings

# Database setup
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    amount = Column(Float)
    merchant = Column(String)
    location = Column(String)
    device = Column(String)
    risk_score = Column(Float, default=0.0)
    risk_status = Column(String, default="low")  # low, medium, high
    is_fraud = Column(Boolean, default=False)
    explanation = Column(JSON)  # SHAP explanation
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    trust_score_before = Column(Float)
    trust_score_after = Column(Float)

class Investigation(Base):
    __tablename__ = "investigations"
    
    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, index=True)
    user_id = Column(String, index=True)
    findings = Column(JSON)
    recommendation = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    report = Column(String)  # AI-generated report

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, index=True)
    user_id = Column(String, index=True)
    severity = Column(String)  # low, medium, high
    message = Column(String)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
