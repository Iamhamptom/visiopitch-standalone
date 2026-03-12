"""Auth routes — register, login, me (Supabase backend)."""

import os
import bcrypt
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from jose import jwt
from datetime import datetime, timedelta, timezone

from backend.db.supabase import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.environ.get("JWT_SECRET", "")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET environment variable is required")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": user_id, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    sb = get_supabase()

    # Check if email exists
    existing = sb.table("vp_users").select("id").eq("email", req.email).execute()
    if existing.data:
        raise HTTPException(400, "Email already registered")

    result = sb.table("vp_users").insert({
        "email": req.email,
        "name": req.name,
        "password_hash": hash_password(req.password),
    }).execute()

    user = result.data[0]
    return {
        "token": create_token(user["id"]),
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]},
    }


@router.post("/login")
async def login(req: LoginRequest):
    sb = get_supabase()

    result = sb.table("vp_users").select("*").eq("email", req.email).execute()
    if not result.data:
        raise HTTPException(401, "Invalid credentials")

    user = result.data[0]
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")

    return {
        "token": create_token(user["id"]),
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]},
    }


async def require_user(request: Request) -> dict:
    """Extract and validate user from Authorization header."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization header")

    token = auth[7:]
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    sb = get_supabase()
    result = sb.table("vp_users").select("id, email, name").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(401, "User not found")

    return result.data[0]


@router.get("/me")
async def me(request: Request):
    user = await require_user(request)
    return user
