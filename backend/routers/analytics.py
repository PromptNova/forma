from fastapi import APIRouter, BackgroundTasks
from ..models.design import AnalyticsEvent
from datetime import datetime
from typing import List, Dict, Any

router = APIRouter(prefix="/analytics", tags=["analytics"])

# In-memory store for development; use Supabase in production
_events: List[Dict[str, Any]] = []


@router.post("/event")
async def track_event(event: AnalyticsEvent, background_tasks: BackgroundTasks):
    """Track a user analytics event."""
    event_data = event.model_dump()
    event_data["timestamp"] = event_data.get("timestamp") or datetime.utcnow().isoformat()
    background_tasks.add_task(_store_event, event_data)
    return {"status": "ok"}


async def _store_event(event_data: Dict[str, Any]):
    """Store event in background (use Supabase in production)."""
    _events.append(event_data)
    # Keep last 10000 events in memory
    if len(_events) > 10000:
        _events.pop(0)


@router.get("/summary")
async def get_summary():
    """Get analytics summary (admin only in production)."""
    total = len(_events)
    event_types = {}
    for e in _events:
        t = e.get("event_type", "unknown")
        event_types[t] = event_types.get(t, 0) + 1
    return {
        "total_events": total,
        "by_type": event_types,
        "recent": _events[-10:] if _events else [],
    }


@router.get("/designs/{design_id}/views")
async def get_design_views(design_id: str):
    """Get view count for a design."""
    views = sum(
        1 for e in _events
        if e.get("design_id") == design_id and e.get("event_type") == "design_viewed"
    )
    return {"design_id": design_id, "views": views}
