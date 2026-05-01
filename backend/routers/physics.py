"""
Physics router — Server-side physics validation
"""
from fastapi import APIRouter
from models.design import PhysicsValidateRequest, PhysicsValidateResponse
from services.physics import validate_design
from services.cache import cache_get, cache_set
import hashlib, json

router = APIRouter()


@router.post("/validate", response_model=PhysicsValidateResponse)
async def validate_physics(body: PhysicsValidateRequest):
    """Validate design physics server-side with caching."""
    # Create cache key from parts hash
    parts_json = json.dumps([p.dict() for p in body.parts], sort_keys=True)
    cache_key = "physics:" + hashlib.md5(parts_json.encode()).hexdigest()
    
    # Check cache
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    # Validate
    result = validate_design([p.dict() for p in body.parts])
    
    # Cache for 5 minutes
    await cache_set(cache_key, result, ttl=300)
    
    return result
