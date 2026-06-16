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

class TokenData(BaseModel):
    username: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    username: str
    email: str

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
    user_id: str
    amount: float
    merchant: str
    location: str
    device: str
    risk_score: float
    risk_status: str
    is_fraud: bool
    explanation: Optional[Dict[str, Any]]
    timestamp: datetime
    trust_score_before: Optional[float]
    trust_score_after: Optional[float]
    
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
    risk_status: str
    explanation: Dict[str, Any]

# Report schemas
class ReportResponse(BaseModel):
    id: str
    transaction_id: str
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True
