"""
Designs router — CRUD for furniture designs
"""
from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional
import uuid
import secrets
from models.design import DesignCreate, DesignResponse
from services.supabase import get_supabase
from services.physics import validate_design

router = APIRouter()


def get_user_id(authorization: str) -> str:
    """Extract user_id from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.replace("Bearer ", "")
    supabase = get_supabase()
    try:
        user = supabase.auth.get_user(token)
        if not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/", response_model=List[DesignResponse])
async def list_designs(
    page: int = 1,
    limit: int = 20,
    authorization: str = Header(None)
):
    """List all designs for the current user."""
    user_id = get_user_id(authorization)
    supabase = get_supabase()
    
    offset = (page - 1) * limit
    resp = supabase.table("designs") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    
    return resp.data or []


@router.post("/", response_model=DesignResponse)
async def create_design(
    body: DesignCreate,
    authorization: str = Header(None)
):
    """Create a new design."""
    user_id = get_user_id(authorization)
    supabase = get_supabase()
    
    # Run physics validation
    physics = validate_design([p.dict() for p in body.parts])
    
    design_data = {
        "user_id": user_id,
        "name": body.name,
        "parts": [p.dict() for p in body.parts],
        "is_stable": physics["stable"],
        "stability_score": physics["score"],
        "total_weight": body.total_weight,
        "total_cost": body.total_cost,
        "height_cm": body.height_cm,
        "is_public": False,
    }
    
    resp = supabase.table("designs").insert(design_data).execute()
    
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save design")
    
    # Update profile designs count
    supabase.rpc("increment_designs_count", {"user_id_input": user_id}).execute()
    
    return resp.data[0]


@router.get("/{design_id}")
async def get_design(
    design_id: str,
    authorization: str = Header(None)
):
    """Get a single design."""
    supabase = get_supabase()
    resp = supabase.table("designs").select("*").eq("id", design_id).single().execute()
    
    if not resp.data:
        raise HTTPException(status_code=404, detail="Design not found")
    
    design = resp.data
    
    # Check access (public designs are visible to all)
    if not design["is_public"] and authorization:
        user_id = get_user_id(authorization)
        if design["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif not design["is_public"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return design


@router.put("/{design_id}")
async def update_design(
    design_id: str,
    body: DesignCreate,
    authorization: str = Header(None)
):
    """Update a design."""
    user_id = get_user_id(authorization)
    supabase = get_supabase()
    
    # Verify ownership
    existing = supabase.table("designs").select("user_id").eq("id", design_id).single().execute()
    if not existing.data or existing.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    physics = validate_design([p.dict() for p in body.parts])
    
    updates = {
        "name": body.name,
        "parts": [p.dict() for p in body.parts],
        "is_stable": physics["stable"],
        "stability_score": physics["score"],
        "total_weight": body.total_weight,
        "total_cost": body.total_cost,
        "height_cm": body.height_cm,
    }
    
    resp = supabase.table("designs").update(updates).eq("id", design_id).execute()
    return resp.data[0]


@router.delete("/{design_id}")
async def delete_design(
    design_id: str,
    authorization: str = Header(None)
):
    """Delete a design."""
    user_id = get_user_id(authorization)
    supabase = get_supabase()
    
    existing = supabase.table("designs").select("user_id").eq("id", design_id).single().execute()
    if not existing.data or existing.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    supabase.table("designs").delete().eq("id", design_id).execute()
    return {"success": True}


@router.post("/{design_id}/share")
async def share_design(
    design_id: str,
    authorization: str = Header(None)
):
    """Generate a public share link."""
    user_id = get_user_id(authorization)
    supabase = get_supabase()
    
    existing = supabase.table("designs").select("user_id,share_token").eq("id", design_id).single().execute()
    if not existing.data or existing.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    token = existing.data.get("share_token") or secrets.token_urlsafe(16)
    
    supabase.table("designs").update({
        "is_public": True,
        "share_token": token,
    }).eq("id", design_id).execute()
    
    return {
        "share_token": token,
        "share_url": f"https://forma.app/share/{token}",
    }


@router.get("/shared/{token}")
async def get_shared_design(token: str):
    """Get a publicly shared design by token."""
    supabase = get_supabase()
    resp = supabase.table("designs").select("*").eq("share_token", token).single().execute()
    
    if not resp.data:
        raise HTTPException(status_code=404, detail="Design not found")
    
    return resp.data
