"""
Forma API — Production-ready FastAPI backend
Stack: FastAPI + Supabase + Redis
"""
import os
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from dotenv import load_dotenv
load_dotenv()

from routers import auth, designs, physics, export, embed, analytics, photo_to_3d
from middleware.ratelimit import RateLimitMiddleware

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("forma")


# ── Lifespan (startup / shutdown) ─────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Forma API starting up...")
    # Verify required env vars
    required = ["SUPABASE_URL", "SUPABASE_KEY"]
    optional = ["FAL_KEY", "SUPABASE_SERVICE_KEY"]
    missing_optional = [k for k in optional if not os.getenv(k)]
    if missing_optional:
        logger.info(f"Optional env vars not set: {missing_optional} — AI features may be limited")
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        logger.warning(f"Missing env vars: {missing} — some features will be disabled")
    logger.info("Forma API ready ✓")
    yield
    logger.info("Forma API shutting down...")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Forma API",
    description=(
        "3D Furniture Physics Studio — Production API\n\n"
        "Build, validate, and ship furniture designs with real-time physics simulation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ── CORS ──────────────────────────────────────────────────────
_cors_env = os.getenv("CORS_ORIGINS", "")
origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
origins += [
    "https://forma-71ny.vercel.app",
    "https://forma.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]
# Deduplicate
origins = list(dict.fromkeys(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)


# ── Rate limiting ─────────────────────────────────────────────
app.add_middleware(RateLimitMiddleware, calls=200, period=60)


# ── Request logging middleware ────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        f"{request.method} {request.url.path} "
        f"→ {response.status_code} ({duration*1000:.0f}ms)"
    )
    return response


# ── Global exception handler ──────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(designs.router, prefix="/designs", tags=["designs"])
app.include_router(physics.router, prefix="/physics", tags=["physics"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(embed.router, prefix="/embed", tags=["embed"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(photo_to_3d.router, prefix="/ai", tags=["ai"])


# ── Root & Health ─────────────────────────────────────────────
@app.get("/", tags=["meta"])
async def root():
    """API root — returns version and status."""
    return {
        "name": "Forma API",
        "version": "1.0.0",
        "status": "ok",
        "docs": "/docs",
        "github": "https://github.com/PromptNova/forma",
    }


@app.get("/health", tags=["meta"])
async def health():
    """Health check endpoint for Render/load balancers."""
    checks = {}

    # Check Supabase env
    checks["supabase_url"] = bool(os.getenv("SUPABASE_URL"))
    checks["supabase_key"] = bool(os.getenv("SUPABASE_KEY"))

    all_ok = all(checks.values())
    return {
        "status": "ok" if all_ok else "degraded",
        "checks": checks,
        "timestamp": time.time(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV", "production") == "development",
        log_level="info",
    )
