from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List

# Auth schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    organization_id: str

class TokenData(BaseModel):
    username: Optional[str] = None
    org: Optional[str] = None
    role: Optional[str] = None

# Organization schemas
class OrganizationCreate(BaseModel):
    id: str
    name: str

class OrganizationResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseModel):
    username: str
    role: str = "analyst"
    organization_id: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Transaction schemas
class TransactionCreate(BaseModel):
    user_id: str
    amount: float
    merchant: str
    location: str
    device: str

class TransactionResponse(BaseModel):
    id: str
    transaction_id: str
    user_id: str
    amount: float
    merchant: str
    merchant_category: str
    payment_method: str
    city: str
    country: str
    device_id: str
    ip_address: str
    location: str
    device: str
    risk_score: float
    risk_status: str
    status: str
    is_fraud: bool
    is_flagged: bool
    explanation: Optional[Dict[str, Any]]
    shap_explanation: Optional[Dict[str, Any]]
    timestamp: datetime
    trust_score_before: Optional[float]
    trust_score_after: Optional[float]
    decision: str
    decision_by: Optional[str] = None
    decision_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Investigation schemas
class InvestigationResponse(BaseModel):
    id: str
    transaction_id: str
    user_id: str
    findings: Dict[str, Any]
    recommendation: str
    report: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ScoringRequest(BaseModel):
    user_id: str
    amount: float
    merchant: str = "Unknown"
    location: str = "Unknown"
    device: str = "Unknown"

class ScoringResponse(BaseModel):
    risk_score: float
    status: str
    explanation: Dict[str, Any]

# Report schemas
class ReportResponse(BaseModel):
    id: str
    transaction_id: str
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True
