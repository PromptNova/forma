"""
Physics router — Server-side physics validation with Redis caching
POST /physics/validate  - validate parts list
GET  /physics/parts     - get all part definitions
"""
import hashlib
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services.physics import validate_design, PARTS as PART_DEFS
from services.cache import cache_get, cache_set
from routers.auth import get_current_user_optional

logger = logging.getLogger("forma.physics")
router = APIRouter()


# ── Request / Response models ─────────────────────────────────
class PartIn(BaseModel):
    id: str
    type: str
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    rotation_y: float = 0.0
    color: Optional[str] = None


class ValidateRequest(BaseModel):
    parts: List[PartIn]


class ValidateResponse(BaseModel):
    stable: bool
    score: int
    grade: str
    reasons: List[str]
    com: dict
    leg_count: int
    surface_count: int
    per_part_status: dict


# ── Endpoints ─────────────────────────────────────────────────
@router.post("/validate", response_model=ValidateResponse)
async def validate_physics(
    body: ValidateRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Validate furniture design physics server-side.
    Results are cached in Redis for 5 minutes.
    Auth is optional — unauthenticated users can validate too.
    """
    parts_list = [p.model_dump() for p in body.parts]

    # Build deterministic cache key from parts
    cache_key = "phys:" + hashlib.md5(
        json.dumps(parts_list, sort_keys=True, default=str).encode()
    ).hexdigest()

    # Check cache
    cached = await cache_get(cache_key)
    if cached:
        logger.debug(f"Physics cache hit: {cache_key[:16]}...")
        return cached

    # Validate
    result = validate_design(parts_list)
    logger.info(
        f"Physics validation: {len(parts_list)} parts → "
        f"score={result['score']} grade={result['grade']} "
        f"stable={result['stable']}"
    )

    # Cache for 5 minutes
    await cache_set(cache_key, result, ttl=300)

    return result


@router.get("/parts")
async def get_part_definitions():
    """Return all available part definitions (for frontend reference)."""
    return {
        part_id: {
            "kind": defn["kind"],
            "w": defn["w"],
            "h": defn["h"],
            "d": defn["d"],
            "kg": defn["kg"],
        }
        for part_id, defn in PART_DEFS.items()
    }
