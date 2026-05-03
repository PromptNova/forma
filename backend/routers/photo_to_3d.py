"""
Photo-to-3D pipeline router
POST /ai/photo-to-3d   — Upload image → fal.ai Tripo3D v2.5 → GLB model
GET  /ai/conversions   — List conversions for current user/shop
GET  /ai/quota         — Quota check for current user
"""
import os
import io
import uuid
import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from services.supabase import get_supabase_client
from routers.auth import get_current_user

logger = logging.getLogger("forma.photo_to_3d")
router = APIRouter()

FAL_KEY = os.getenv("FAL_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

BUCKET_IMAGES = os.getenv("SUPABASE_STORAGE_BUCKET_IMAGES", "part-images")
BUCKET_MODELS = os.getenv("SUPABASE_STORAGE_BUCKET_MODELS", "part-models")

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}

QUOTA_LIMITS = {
    "free": 3,
    "pro": 25,
    "business": -1,  # unlimited
}

# ── Pydantic models ──────────────────────────────────────────

class ConversionOut(BaseModel):
    id: str
    part_name: str
    part_kind: str
    status: str
    original_image_url: Optional[str] = None
    model_url: Optional[str] = None
    preview_url: Optional[str] = None
    fal_request_id: Optional[str] = None
    error_message: Optional[str] = None
    processing_time_ms: Optional[int] = None
    cost_usd: Optional[float] = None
    created_at: str
    completed_at: Optional[str] = None


class QuotaOut(BaseModel):
    plan: str
    conversions_used: int
    conversions_limit: int
    resets_at: str
    month_year: str


class PhotoTo3DOut(BaseModel):
    part_id: str
    conversion_id: str
    model_url: Optional[str] = None
    preview_image_url: Optional[str] = None
    status: str


# ── Helpers ──────────────────────────────────────────────────

def _current_month_year() -> str:
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m")


def _month_reset_date() -> str:
    now = datetime.now(timezone.utc)
    if now.month == 12:
        reset = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        reset = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    return reset.isoformat()


async def _get_user_plan(user_id: str) -> str:
    try:
        sb = get_supabase_client()
        result = sb.table("profiles").select("plan").eq("id", user_id).single().execute()
        if result.data and result.data.get("plan"):
            return result.data["plan"]
    except Exception:
        pass
    return "free"


async def _check_and_increment_quota(user_id: str, plan: str) -> tuple[int, int]:
    sb = get_supabase_client()
    month_year = _current_month_year()
    limit = QUOTA_LIMITS.get(plan, 3)

    try:
        existing = (
            sb.table("conversion_quota")
            .select("*")
            .eq("user_id", user_id)
            .eq("month_year", month_year)
            .execute()
        )
        if existing.data:
            row = existing.data[0]
            used = row["conversions_used"]
            db_limit = row["conversions_limit"]
        else:
            row_data = {
                "user_id": user_id,
                "month_year": month_year,
                "conversions_used": 0,
                "conversions_limit": limit if limit >= 0 else 999999,
            }
            sb.table("conversion_quota").insert(row_data).execute()
            used = 0
            db_limit = row_data["conversions_limit"]

        if limit != -1 and used >= db_limit:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "quota_exceeded",
                    "message": f"Monthly quota exhausted ({used}/{db_limit}). Upgrade to continue.",
                    "conversions_used": used,
                    "conversions_limit": db_limit,
                    "resets_at": _month_reset_date(),
                },
            )

        sb.table("conversion_quota").update({"conversions_used": used + 1}).eq(
            "user_id", user_id
        ).eq("month_year", month_year).execute()
        return used + 1, db_limit

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Quota check failed: {exc}")
        return 0, limit if limit >= 0 else -1


async def _upload_to_storage(bucket: str, path: str, data: bytes, content_type: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}",
            headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": content_type,
                "x-upsert": "true",
            },
            content=data,
            timeout=60.0,
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(500, f"Storage upload failed: {resp.text[:200]}")
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"


async def convert_image_to_3d(image_url: str) -> dict:
    if not FAL_KEY:
        raise HTTPException(500, "FAL_KEY not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://queue.fal.run/tripo3d/tripo/v2.5/image-to-3d",
            headers={
                "Authorization": f"Key {FAL_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "image_url": image_url,
                "texture": "standard",
                "texture_alignment": "original_image",
                "orientation": "default",
            },
            timeout=30.0,
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(502, f"fal.ai submit failed: {resp.text[:200]}")
        job = resp.json()
        request_id = job.get("request_id")
        if not request_id:
            raise HTTPException(502, f"No request_id in fal.ai response: {job}")

    logger.info(f"Tripo3D job submitted: {request_id}")

    for attempt in range(40):
        await asyncio.sleep(3)
        async with httpx.AsyncClient() as client:
            status_resp = await client.get(
                f"https://queue.fal.run/tripo3d/tripo/v2.5/image-to-3d/requests/{request_id}/status",
                headers={"Authorization": f"Key {FAL_KEY}"},
                timeout=15.0,
            )
            status = status_resp.json()
            job_status = status.get("status", "")
            logger.debug(f"Tripo3D poll {attempt + 1}/40: {job_status}")

            if job_status == "COMPLETED":
                result_resp = await client.get(
                    f"https://queue.fal.run/tripo3d/tripo/v2.5/image-to-3d/requests/{request_id}",
                    headers={"Authorization": f"Key {FAL_KEY}"},
                    timeout=15.0,
                )
                return {"request_id": request_id, **result_resp.json()}

            elif job_status == "FAILED":
                error_detail = status.get("error", "Unknown error")
                raise HTTPException(502, f"Tripo3D conversion failed: {error_detail}")

    raise HTTPException(504, "Tripo3D conversion timed out after 120s")


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/photo-to-3d", response_model=PhotoTo3DOut)
async def photo_to_3d(
    image: UploadFile = File(..., description="Product photo (JPG/PNG/WEBP, max 10MB)"),
    part_name: str = Form(..., min_length=1, max_length=120),
    part_kind: str = Form(..., description="surface|leg|support|back|panel"),
    estimated_height_cm: float = Form(..., gt=0, le=500),
    estimated_width_cm: float = Form(..., gt=0, le=500),
    current_user: dict = Depends(get_current_user),
):
    start_ts = time.time()
    user_id = current_user["id"]
    shop_id = current_user.get("shop_id")

    # 1. Validate file
    if image.content_type not in ALLOWED_MIME:
        raise HTTPException(415, f"Unsupported type '{image.content_type}'. Use JPG, PNG or WEBP.")

    raw = await image.read()
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(413, f"File too large ({len(raw) // 1024}KB). Max 10MB.")

    # 2. Check quota
    plan = await _get_user_plan(user_id)
    await _check_and_increment_quota(user_id, plan)

    # 3. Upload original image
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map.get(image.content_type, "jpg")
    image_key = f"{user_id}/{uuid.uuid4()}.{ext}"
    image_url = await _upload_to_storage(BUCKET_IMAGES, image_key, raw, image.content_type)

    # 4. Create pending conversion record
    sb = get_supabase_client()
    conv_data = {
        "user_id": user_id,
        "shop_id": shop_id,
        "status": "processing",
        "original_image_url": image_url,
        "part_name": part_name,
        "part_kind": part_kind,
        "estimated_height_cm": estimated_height_cm,
        "estimated_width_cm": estimated_width_cm,
        "cost_usd": 0.30,
    }
    conv_result = sb.table("ai_conversions").insert(conv_data).execute()
    if not conv_result.data:
        raise HTTPException(500, "Failed to create conversion record")
    conversion_id = conv_result.data[0]["id"]

    # 5. Call Tripo3D via fal.ai
    try:
        fal_result = await convert_image_to_3d(image_url)
    except HTTPException as exc:
        sb.table("ai_conversions").update({
            "status": "failed",
            "error_message": str(exc.detail),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", conversion_id).execute()
        raise

    request_id = fal_result.get("request_id", "")
    glb_url: Optional[str] = None
    preview_url_remote: Optional[str] = None

    output = fal_result.get("output") or fal_result
    if isinstance(output, dict):
        for key in ("model_mesh", "model", "glb"):
            obj = output.get(key)
            if isinstance(obj, dict):
                glb_url = obj.get("url") or obj.get("file_url")
                break
            elif isinstance(obj, str) and obj.startswith("http"):
                glb_url = obj
                break
        for key in ("rendered_image", "preview", "thumbnail"):
            obj = output.get(key)
            if isinstance(obj, dict):
                preview_url_remote = obj.get("url") or obj.get("file_url")
                break
            elif isinstance(obj, str) and obj.startswith("http"):
                preview_url_remote = obj
                break

    if not glb_url:
        sb.table("ai_conversions").update({
            "status": "failed",
            "error_message": "No GLB URL in fal.ai response",
            "fal_request_id": request_id,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", conversion_id).execute()
        raise HTTPException(502, "Tripo3D returned no 3D model URL")

    # 6. Download GLB and upload to storage
    async with httpx.AsyncClient() as client:
        glb_resp = await client.get(glb_url, timeout=60.0)
        if glb_resp.status_code != 200:
            raise HTTPException(502, f"Failed to download GLB: {glb_resp.status_code}")
        glb_bytes = glb_resp.content

    glb_key = f"{user_id}/{uuid.uuid4()}.glb"
    model_storage_url = await _upload_to_storage(BUCKET_MODELS, glb_key, glb_bytes, "model/gltf-binary")

    preview_storage_url: Optional[str] = None
    if preview_url_remote:
        try:
            async with httpx.AsyncClient() as client:
                prev_resp = await client.get(preview_url_remote, timeout=30.0)
            if prev_resp.status_code == 200:
                prev_key = f"{user_id}/{uuid.uuid4()}_preview.png"
                preview_storage_url = await _upload_to_storage(
                    BUCKET_IMAGES, prev_key, prev_resp.content, "image/png"
                )
        except Exception as e:
            logger.warning(f"Preview download failed (non-fatal): {e}")

    processing_ms = int((time.time() - start_ts) * 1000)

    # 7. Update conversion record
    sb.table("ai_conversions").update({
        "status": "completed",
        "model_url": model_storage_url,
        "preview_url": preview_storage_url or image_url,
        "fal_request_id": request_id,
        "processing_time_ms": processing_ms,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", conversion_id).execute()

    # 8. Create shop_parts entry
    part_data = {
        "user_id": user_id,
        "shop_id": shop_id,
        "label": part_name,
        "kind": part_kind,
        "width_m": round(estimated_width_cm / 100, 4),
        "height_m": round(estimated_height_cm / 100, 4),
        "depth_m": round(estimated_width_cm / 100, 4),
        "model_glb_url": model_storage_url,
        "preview_image_url": preview_storage_url or image_url,
        "source": "ai_converted",
        "conversion_id": conversion_id,
    }
    part_result = sb.table("shop_parts").insert(part_data).execute()
    part_id = part_result.data[0]["id"] if part_result.data else str(uuid.uuid4())

    logger.info(f"Conversion complete: user={user_id} part={part_id} time={processing_ms}ms")

    return PhotoTo3DOut(
        part_id=part_id,
        conversion_id=conversion_id,
        model_url=model_storage_url,
        preview_image_url=preview_storage_url or image_url,
        status="completed",
    )


@router.get("/conversions", response_model=list[ConversionOut])
async def list_conversions(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    sb = get_supabase_client()
    result = (
        sb.table("ai_conversions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    rows = result.data or []
    return [
        ConversionOut(
            id=row["id"],
            part_name=row["part_name"],
            part_kind=row["part_kind"],
            status=row["status"],
            original_image_url=row.get("original_image_url"),
            model_url=row.get("model_url"),
            preview_url=row.get("preview_url"),
            fal_request_id=row.get("fal_request_id"),
            error_message=row.get("error_message"),
            processing_time_ms=row.get("processing_time_ms"),
            cost_usd=row.get("cost_usd"),
            created_at=str(row["created_at"]),
            completed_at=str(row["completed_at"]) if row.get("completed_at") else None,
        )
        for row in rows
    ]


@router.get("/quota", response_model=QuotaOut)
async def get_quota(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    plan = await _get_user_plan(user_id)
    month_year = _current_month_year()
    limit = QUOTA_LIMITS.get(plan, 3)

    sb = get_supabase_client()
    result = (
        sb.table("conversion_quota")
        .select("*")
        .eq("user_id", user_id)
        .eq("month_year", month_year)
        .execute()
    )

    if result.data:
        used = result.data[0]["conversions_used"]
        db_limit = result.data[0]["conversions_limit"]
    else:
        used = 0
        db_limit = limit if limit >= 0 else 999999

    return QuotaOut(
        plan=plan,
        conversions_used=used,
        conversions_limit=limit,
        resets_at=_month_reset_date(),
        month_year=month_year,
    )
