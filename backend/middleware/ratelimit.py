import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter. Replace with Redis for production."""

    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self._requests: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean old requests
        self._requests[client_ip] = [
            t for t in self._requests[client_ip]
            if now - t < self.period
        ]

        # Check limit
        if len(self._requests[client_ip]) >= self.calls:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "retry_after": self.period,
                }
            )

        self._requests[client_ip].append(now)
        response = await call_next(request)
        return response
