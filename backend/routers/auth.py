"""
Auth router — Register, Login, JWT, Profile
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /auth/me
POST /auth/logout
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional

from services.supabase import get_supabase

logger = logging.getLogger("forma.auth")
router = APIRouter()
security = HTTPBearer(auto_error=False)


# ── Request / Response models ─────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    plan: str = "free"
    designs_count: int = 0


# ── Dependency: get current user from JWT ─────────────────────
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Extract and verify user from Bearer token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    supabase = get_supabase()
    try:
        resp = supabase.auth.get_user(token)
        if not resp.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": resp.user.id, "email": resp.user.email, "token": token}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Unauthorized")


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Optional auth — returns None if not authenticated."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# ── Endpoints ─────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    """Register a new user. Creates Supabase Auth user + profile."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {
                    "full_name": body.full_name or "",
                    "username": body.username or body.email.split("@")[0],
                }
            }
        })
        if not resp.user:
            raise HTTPException(status_code=400, detail="Registration failed")

        # Ensure profile exists (trigger also handles this, belt-and-suspenders)
        profile_data = {
            "id": resp.user.id,
            "username": body.username or body.email.split("@")[0],
            "full_name": body.full_name,
            "plan": "free",
        }
        supabase.table("profiles").upsert(profile_data).execute()

        if not resp.session:
            # Email confirmation required
            return TokenResponse(
                access_token="",
                refresh_token="",
                user_id=resp.user.id,
                email=resp.user.email,
            )

        return TokenResponse(
            access_token=resp.session.access_token,
            refresh_token=resp.session.refresh_token,
            user_id=resp.user.id,
            email=resp.user.email,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Register error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """Login with email/password. Returns JWT tokens."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
        if not resp.user or not resp.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return TokenResponse(
            access_token=resp.session.access_token,
            refresh_token=resp.session.refresh_token,
            user_id=resp.user.id,
            email=resp.user.email,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Login failed for {body.email}: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token."""
    supabase = get_supabase()
    try:
        resp = supabase.auth.refresh_session(refresh_token)
        return {
            "access_token": resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
            "token_type": "bearer",
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile and plan."""
    supabase = get_supabase()
    try:
        profile_resp = (
            supabase.table("profiles")
            .select("*")
            .eq("id", current_user["id"])
            .single()
            .execute()
        )
        profile = profile_resp.data or {}
        return UserResponse(
            id=current_user["id"],
            email=current_user["email"],
            username=profile.get("username"),
            full_name=profile.get("full_name"),
            plan=profile.get("plan", "free"),
            designs_count=profile.get("designs_count", 0),
        )
    except Exception as e:
        logger.error(f"Get me error: {e}")
        # Return minimal profile if DB fetch fails
        return UserResponse(id=current_user["id"], email=current_user["email"])


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Sign out (invalidate session on Supabase side)."""
    supabase = get_supabase()
    try:
        supabase.auth.sign_out()
    except Exception:
        pass  # Best-effort
    return {"success": True}
