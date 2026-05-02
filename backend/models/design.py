from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class PartModel(BaseModel):
    id: str
    type: str
    x: float
    y: float
    z: float
    rotation_y: float = 0.0
    color: Optional[str] = None


class DesignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    parts: List[PartModel]
    theme: str = "dark"
    thumbnail: Optional[str] = None


class DesignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    parts: Optional[List[PartModel]] = None
    theme: Optional[str] = None
    thumbnail: Optional[str] = None


class DesignResponse(BaseModel):
    id: str
    name: str
    parts: List[PartModel]
    theme: str
    thumbnail: Optional[str] = None
    user_id: str
    created_at: datetime
    updated_at: datetime
    physics_score: Optional[int] = None
    is_public: bool = False


class PhysicsValidateRequest(BaseModel):
    parts: List[PartModel]


class PhysicsValidateResponse(BaseModel):
    stable: bool
    score: int
    grade: str
    reasons: List[str]
    com: Dict[str, float]
    leg_count: int
    surface_count: int
    per_part_status: Dict[str, str]


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    plan: str = "free"
    design_count: int = 0
    created_at: datetime


class EmbedConfig(BaseModel):
    design_id: str
    width: int = 800
    height: int = 600
    theme: str = "dark"
    show_hud: bool = True
    auto_rotate: bool = False
    background_color: Optional[str] = None


class AnalyticsEvent(BaseModel):
    event_type: str
    design_id: Optional[str] = None
    user_id: Optional[str] = None
    properties: Dict[str, Any] = {}
    timestamp: Optional[datetime] = None
