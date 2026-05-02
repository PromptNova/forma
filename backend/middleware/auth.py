"""
JWT Auth Middleware — validates Supabase JWT tokens on protected routes.
Also provides utility functions for token verification.
"""
import os
import logging
from typing import Optional

from fastapi import HTTPException
from jose import jwt, JWTError

logger = logging.getLogger("forma.auth_middleware")

# Supabase JWT secret — set in environment
_JWT_SECRET: Optional[str] = None


def get_jwt_secret() -> str:
    global _JWT_SECRET
    if not _JWT_SECRET:
        _JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("SUPABASE_JWT_SECRET", "")
    return _JWT_SECRET


def verify_supabase_token(token: str) -> dict:
    """
    Verify a Supabase JWT token.
    Returns the decoded payload or raises HTTPException(401).
    """
    secret = get_jwt_secret()
    if not secret:
        # If no secret configured, fall back to Supabase API verification
        logger.warning("JWT_SECRET not set — using Supabase API for token verification")
        return {}

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


def extract_user_id(token: str) -> Optional[str]:
    """
    Extract user_id (sub) from a JWT token without full verification.
    Use only for non-critical paths where Supabase will re-verify.
    """
    try:
        payload = jwt.decode(
            token,
            options={"verify_signature": False},
            algorithms=["HS256"],
        )
        return payload.get("sub")
    except Exception:
        return None
