from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Organization
from backend.schemas import UserCreate, UserResponse, Token, OrganizationCreate, OrganizationResponse
from backend.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/organization", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(org: OrganizationCreate, db: Session = Depends(get_db)):
    db_org = db.query(Organization).filter(Organization.id == org.id).first()
    if db_org:
        return db_org
    new_org = Organization(id=org.id, name=org.name)
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Verify organization exists
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    if not org:
        # Create organization on-the-fly for simple user signups if not exists
        org = Organization(id=user.organization_id, name=user.organization_id.replace("org_", "").capitalize())
        db.add(org)
        db.commit()
        db.refresh(org)
        
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    try:
        hashed_pwd = get_password_hash(user.password)
        new_user = User(
            username=user.username,
            hashed_password=hashed_pwd,
            role=user.role,
            organization_id=user.organization_id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(
        data={"sub": user.username, "org": user.organization_id, "role": user.role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "organization_id": user.organization_id
    }


@router.post("/login_json", response_model=Token)
def login_json(payload: dict, db: Session = Depends(get_db)):
    """Alternate login endpoint that accepts JSON payloads for simple fetch usage."""
    username = payload.get("username")
    password = payload.get("password")
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "org": user.organization_id, "role": user.role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "organization_id": user.organization_id
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
