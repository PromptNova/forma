"""
Forma API — FastAPI backend for 3D furniture physics SaaS
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import auth, designs, physics, export, embed, analytics
from middleware.ratelimit import RateLimitMiddleware

app = FastAPI(
    title="Forma API",
    description="3D Furniture Physics Studio — Backend API",
    version="1.0.0",
)

# ── CORS ────────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
origins.extend([
    "https://forma.app",
    "https://*.forma.app",
    "http://localhost:3000",
    "http://localhost:3001",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limiting ────────────────────────────────────────────────
app.add_middleware(RateLimitMiddleware)

# ── Routers ─────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(designs.router, prefix="/designs", tags=["designs"])
app.include_router(physics.router, prefix="/physics", tags=["physics"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(embed.router, prefix="/embed", tags=["embed"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

@app.get("/")
async def root():
    return {
        "name": "Forma API",
        "version": "1.0.0",
        "status": "ok",
        "docs": "/docs",
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
