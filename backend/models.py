from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.database import Base
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"
    UNDER_REVIEW = "under_review"

class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class InvestigationStatus(str, Enum):
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ESCALATED = "escalated"

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="organization", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True, default=lambda: f"user_{uuid.uuid4().hex[:12]}")
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    email = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, default="analyst")  # 'admin' or 'analyst'
    organization_id = Column(String, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="users")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    amount = Column(Float)
    merchant = Column(String)
    merchant_category = Column(String, default="retail")
    payment_method = Column(String, default="credit_card")
    city = Column(String, default="New York")
    country = Column(String, default="US")
    device_id = Column(String, default="device_unknown")
    ip_address = Column(String, default="127.0.0.1")
    location = Column(String)
    device = Column(String)
    
    risk_score = Column(Float, default=0.0)
    risk_status = Column(String, default="low")  # low, medium, high
    is_fraud = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    explanation = Column(JSON, nullable=True)  # SHAP explanation
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    trust_score_before = Column(Float, nullable=True)
    trust_score_after = Column(Float, nullable=True)
    organization_id = Column(String, ForeignKey("organizations.id"), default="org_trustguard")
    
    # Analyst resolution
    decision = Column(String, default="PENDING")  # PENDING, APPROVED, BLOCKED
    decision_by = Column(String, nullable=True)
    decision_at = Column(DateTime, nullable=True)
    
    organization = relationship("Organization", back_populates="transactions")

    @property
    def transaction_id(self) -> str:
        return self.id

    @property
    def status(self) -> str:
        if self.risk_status == "high":
            return "HIGH_RISK"
        elif self.risk_status == "medium":
            return "MEDIUM_RISK"
        return "TRUSTED"

    @property
    def shap_explanation(self) -> dict:
        if not self.explanation:
            return {}
        if 'shap_values' in self.explanation:
            vals = self.explanation['shap_values']
            features = ['Amount', 'V1', 'V2', 'V3', 'V4', 'V5']
            return {features[i]: float(vals[i] * 100) for i in range(min(len(features), len(vals)))}
        return {k: float(v) for k, v in self.explanation.items() if k not in ['note', 'risk_probability', 'error'] and isinstance(v, (int, float))}

class Investigation(Base):
    __tablename__ = "investigations"
    
    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, index=True)
    user_id = Column(String, index=True)
    findings = Column(JSON, nullable=True)
    recommendation = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    report = Column(String, nullable=True)  # AI-generated report
    organization_id = Column(String, default="org_trustguard")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, index=True)
    user_id = Column(String, index=True)
    severity = Column(String, default="medium")  # low, medium, high, critical
    message = Column(String)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    organization_id = Column(String, default="org_trustguard")

class TrustScoreHistory(Base):
    __tablename__ = "trust_score_history"
    
    id = Column(String, primary_key=True, index=True, default=lambda: f"tsh_{uuid.uuid4().hex[:12]}")
    user_id = Column(String, index=True)
    old_score = Column(Float)
    new_score = Column(Float)
    reason = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    organization_id = Column(String, default="org_trustguard")
