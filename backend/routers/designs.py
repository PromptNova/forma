"""
Designs router - CRUD for furniture designs
POST /{id}/certificate - generate stability certificate ID
"""

import logging
import random
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from pydantic import BaseModel
from routers.auth import get_current_user, get_current_user_optional
from services.supabase import get_supabase
from services.physics import validate_design

logger = logging.getLogger("forma.designs")
router = APIRouter()


class PartIn(BaseModel):
    id: str
    type: str
    x: float
    y: float
    z: float
    rotation_y: float = 0.0
    color: Optional[str] = None

class DesignIn(BaseModel):
    name: str = "Ontwerp"
    parts: List[PartIn] = []
    theme: str = "dark"

class DesignResponse(BaseModel):
    id: str
    user_id: str
    name: str
    parts: list
    theme: str
    is_stable: Optional[bool] = None
    stability_score: Optional[int] = None
    stability_grade: Optional[str] = None
    total_weight_kg: Optional[float] = None
    total_cost_eur: Optional[float] = None
    height_cm: Optional[int] = None
    width_cm: Optional[int] = None
    is_public: bool = False
    share_token: Optional[str] = None
    view_count: int = 0
    created_at: str
    updated_at: str

class CertificateResponse(BaseModel):
    certificate_id: str
    share_url: str
    generated_at: str


def _compute_stats(parts_dicts: list) -> dict:
    from services.physics import PARTS as PART_DEFS
    total_weight = 0.0
    total_cost = 0.0
    max_y = 0.0
    PRICES = {
        "seat": 12, "tabletop": 45, "shelf": 18, "leg-short": 8, "leg-long": 12,
        "crossbar": 9, "backrest": 22, "armrest": 15, "panel": 35,
        "prod-oak-top": 220, "prod-walnut-top": 310, "prod-pine-desk": 95,
        "prod-bamboo-shelf": 24, "prod-dining-seat": 12, "prod-cushion": 18,
        "prod-hairpin": 14, "prod-scandi-leg": 9, "prod-u-leg": 55,
        "prod-tall-panel": 45, "prod-door": 68,
    }
    for p in parts_dicts:
        ptype = p.get("type", "")
        defn = PART_DEFS.get(ptype, {})
        total_weight += defn.get("kg", 0)
        total_cost += PRICES.get(ptype, 0)
        top_y = p.get("y", 0) + defn.get("h", 0) / 2
        if top_y > max_y:
            max_y = top_y
    return {
        "total_weight_kg": round(total_weight, 2),
        "total_cost_eur": round(total_cost, 2),
        "height_cm": round(max_y * 100),
        "width_cm": 0,
    }


def _generate_certificate_id() -> str:
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return 'FORMA-' + ''.join(random.choices(chars, k=4)) + '-' + ''.join(random.choices(chars, k=4))


@router.get("/", response_class=Response)
async def list_designs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    resp = (
        supabase.table("designs")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("updated_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    count_resp = (
        supabase.table("designs")
        .select("id", count="exact")
        .eq("user_id", current_user["id"])
        .execute()
    )
    total = count_resp.count or 0
    import json
    return Response(
        content=json.dumps(resp.data or []),
        media_type="application/json",
        headers={"X-Total-Count": str(total)},
    )


@router.post("/", status_code=201)
async def create_design(body: DesignIn, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    parts_dicts = [p.model_dump() for p in body.parts]
    physics = validate_design(parts_dicts)
    stats = _compute_stats(parts_dicts)
    design_data = {
        "user_id": current_user["id"],
        "name": body.name,
        "parts": parts_dicts,
        "theme": body.theme,
        "is_stable": physics["stable"],
        "stability_score": physics["score"],
        "stability_grade": physics.get("grade", "D"),
        **stats,
        "is_public": False,
    }
    resp = supabase.table("designs").insert(design_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save design")
    return resp.data[0]


@router.get("/shared/{token}")
async def get_shared_design(token: str):
    supabase = get_supabase()
    resp = (
        supabase.table("designs")
        .select("*")
        .eq("share_token", token)
        .eq("is_public", True)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Design not found")
    try:
        supabase.rpc("increment_view_count", {"design_id": resp.data["id"]}).execute()
    except Exception:
        pass
    return resp.data


@router.get("/{design_id}")
async def get_design(
    design_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    supabase = get_supabase()
    resp = (
        supabase.table("designs")
        .select("*")
        .eq("id", design_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Design not found")
    design = resp.data
    if not design["is_public"]:
        if not current_user or design["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    return design


@router.put("/{design_id}")
async def update_design(
    design_id: str,
    body: DesignIn,
    current_user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    existing = (
        supabase.table("designs").select("user_id").eq("id", design_id).single().execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Design not found")
    if existing.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    parts_dicts = [p.model_dump() for p in body.parts]
    physics = validate_design(parts_dicts)
    stats = _compute_stats(parts_dicts)
    updates = {
        "name": body.name,
        "parts": parts_dicts,
        "theme": body.theme,
        "is_stable": physics["stable"],
        "stability_score": physics["score"],
        "stability_grade": physics.get("grade", "D"),
        **stats,
    }
    resp = supabase.table("designs").update(updates).eq("id", design_id).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Update failed")
    return resp.data[0]


@router.delete("/{design_id}", status_code=204)
async def delete_design(design_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    existing = (
        supabase.table("designs").select("user_id").eq("id", design_id).single().execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Design not found")
    if existing.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    supabase.table("designs").delete().eq("id", design_id).execute()
    return None


@router.post("/{design_id}/share")
async def share_design(design_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    existing = (
        supabase.table("designs")
        .select("user_id, share_token")
        .eq("id", design_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Design not found")
    if existing.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    token = existing.data.get("share_token") or secrets.token_hex(16)
    supabase.table("designs").update({
        "is_public": True,
        "share_token": token,
    }).eq("id", design_id).execute()
    return {
        "share_token": token,
        "share_url": f"https://forma-71ny.vercel.app/share/{token}",
        "is_public": True,
    }


@router.post("/{design_id}/certificate", response_model=CertificateResponse)
async def generate_certificate(
    design_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate a unique Stability Certificate ID for a design."""
    supabase = get_supabase()
    existing = (
        supabase.table("designs")
        .select("user_id, certificate_id, certificate_downloads")
        .eq("id", design_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Design not found")
    if existing.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    cert_id = existing.data.get("certificate_id") or _generate_certificate_id()
    downloads = (existing.data.get("certificate_downloads") or 0) + 1
    generated_at = datetime.now(timezone.utc).isoformat()

    try:
        supabase.table("designs").update({
            "certificate_id": cert_id,
            "certificate_generated_at": generated_at,
            "certificate_downloads": downloads,
        }).eq("id", design_id).execute()
    except Exception as e:
        logger.warning(f"Could not save certificate to DB (migration pending?): {e}")

    try:
        from routers.analytics import _store_event
        import asyncio
        asyncio.create_task(_store_event({
            "event_type": "certificate_downloaded",
            "design_id": design_id,
            "user_id": current_user["id"],
            "timestamp": generated_at,
        }))
    except Exception:
        pass

    return CertificateResponse(
        certificate_id=cert_id,
        share_url=f"https://forma-71ny.vercel.app/share/certificate/{cert_id}",
        generated_at=generated_at,
    )
