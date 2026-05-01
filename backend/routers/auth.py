"""
Auth router — Register, Login, JWT, Profile
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from services.supabase import get_supabase

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    email: str


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    """Register new user via Supabase Auth."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
        })
        if not resp.user:
            raise HTTPException(status_code=400, detail="Registration failed")
        
        # Create profile
        if body.username:
            supabase.table("profiles").upsert({
                "id": resp.user.id,
                "username": body.username,
                "plan": "free",
            }).execute()
        
        return TokenResponse(
            access_token=resp.session.access_token,
            refresh_token=resp.session.refresh_token,
            user_id=resp.user.id,
            email=resp.user.email,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """Login via Supabase Auth."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
        if not resp.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return TokenResponse(
            access_token=resp.session.access_token,
            refresh_token=resp.session.refresh_token,
            user_id=resp.user.id,
            email=resp.user.email,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh JWT token."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.refresh_session(refresh_token)
        return {
            "access_token": resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me")
async def get_me(authorization: str = ""):
    """Get current user profile."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.replace("Bearer ", "")
    supabase = get_supabase()
    
    try:
        user = supabase.auth.get_user(token)
        if not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        profile = supabase.table("profiles").select("*").eq("id", user.user.id).single().execute()
        
        return {
            "id": user.user.id,
            "email": user.user.email,
            "profile": profile.data,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Unauthorized")
