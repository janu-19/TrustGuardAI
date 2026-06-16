from fastapi import APIRouter, HTTPException, Depends
from datetime import timedelta
from sqlalchemy.orm import Session
from backend.schemas import LoginRequest, Token
from backend.auth import create_access_token, verify_password, get_password_hash
from backend.config import settings
from backend.database import get_db, User

router = APIRouter()

@router.post("/login_json", response_model=Token)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint returning JSON token"""
    
    # Demo authentication (in production, use database)
    if request.username == settings.DEMO_USERNAME and request.password == settings.DEMO_PASSWORD:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": request.username},
            expires_delta=access_token_expires
        )
        return {"access_token": access_token}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/login")
async def login_form(username: str, password: str, db: Session = Depends(get_db)):
    """Login endpoint for form data"""
    
    if username == settings.DEMO_USERNAME and password == settings.DEMO_PASSWORD:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": username},
            expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/register")
async def register(request: LoginRequest, db: Session = Depends(get_db)):
    """Register new user"""
    
    # Check if user exists
    user = db.query(User).filter(User.username == request.username).first()
    if user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    hashed_password = get_password_hash(request.password)
    new_user = User(
        id=f"user_{request.username}",
        username=request.username,
        password_hash=hashed_password,
        email=f"{request.username}@trustguard.ai"
    )
    db.add(new_user)
    db.commit()
    
    access_token = create_access_token(data={"sub": request.username})
    return {"access_token": access_token, "token_type": "bearer"}
