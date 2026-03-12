"""Simple in-memory rate limiter for FastAPI."""

import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

# Store: {key: [(timestamp, ...),]}
_buckets: dict[str, list[float]] = defaultdict(list)


def _cleanup(key: str, window: float):
    """Remove expired entries."""
    now = time.monotonic()
    _buckets[key] = [t for t in _buckets[key] if now - t < window]


def check_rate_limit(key: str, max_requests: int, window_seconds: float):
    """Check and record a request. Raises HTTPException(429) if over limit."""
    _cleanup(key, window_seconds)
    if len(_buckets[key]) >= max_requests:
        raise HTTPException(429, "Too many requests. Please try again later.")
    _buckets[key].append(time.monotonic())


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Global rate limiter — different limits for different path prefixes."""

    # Path prefix → (max_requests, window_seconds)
    LIMITS = {
        "/api/auth": (10, 60),           # 10 auth requests per minute
        "/api/pitches": (60, 60),         # 60 pitch ops per minute
        "/api/pitches/*/chat": (20, 60),  # 20 AI chats per minute
    }
    DEFAULT_LIMIT = (120, 60)  # 120 requests/min for everything else

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Find matching limit
        max_req, window = self.DEFAULT_LIMIT
        for prefix, limit in self.LIMITS.items():
            if "*" in prefix:
                parts = prefix.split("*")
                if path.startswith(parts[0]) and path.endswith(parts[1].lstrip("/")):
                    max_req, window = limit
                    break
            elif path.startswith(prefix):
                max_req, window = limit
                break

        key = f"{client_ip}:{path.split('/')[2] if len(path.split('/')) > 2 else 'root'}"

        try:
            check_rate_limit(key, max_req, window)
        except HTTPException:
            raise

        return await call_next(request)
