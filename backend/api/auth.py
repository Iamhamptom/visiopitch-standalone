"""Auth routes — register, login, me."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from hashlib import sha256
from jose import jwt
from datetime import datetime, timedelta, timezone

from backend.db import get_db, User

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = "visiopitch-local-dev-secret"
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return sha256(password.encode()).hexdigest()


def create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=30)
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
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=req.email,
        name=req.name,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "token": create_token(user.id),
        "user": {"id": user.id, "email": user.email, "name": user.name},
    }


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or user.password_hash != hash_password(req.password):
        raise HTTPException(401, "Invalid credentials")

    return {
        "token": create_token(user.id),
        "user": {"id": user.id, "email": user.email, "name": user.name},
    }


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    authorization: str | None = None,
) -> User:
    """Extract user from Authorization header."""
    from fastapi import Request

    # This will be overridden with proper header extraction in the dependency
    raise HTTPException(401, "Not authenticated")


# Proper dependency that reads the header
from fastapi import Request


async def require_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization header")

    token = auth[7:]
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(401, "Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found")

    return user


@router.get("/me")
async def me(user: User = Depends(require_user)):
    return {"id": user.id, "email": user.email, "name": user.name}
