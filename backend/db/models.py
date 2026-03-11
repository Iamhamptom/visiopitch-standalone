"""SQLAlchemy models for VisioPitch standalone."""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, JSON, Boolean, Integer, Float,
    DateTime, ForeignKey, Enum as SQLEnum,
)
from sqlalchemy.orm import DeclarativeBase, relationship
import enum
import uuid


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ── Enums ──

class PitchStatus(str, enum.Enum):
    draft = "draft"
    review = "review"
    sent = "sent"
    won = "won"
    lost = "lost"


class PitchIndustry(str, enum.Enum):
    music = "music"
    tech = "tech"
    agency = "agency"
    fashion = "fashion"
    real_estate = "real-estate"
    food = "food"
    education = "education"
    healthcare = "healthcare"
    finance = "finance"
    general = "general"


class BlockType(str, enum.Enum):
    hero = "hero"
    story = "story"
    timeline = "timeline"
    deliverables = "deliverables"
    proof = "proof"
    gallery = "gallery"
    budget = "budget"
    team = "team"
    terms = "terms"
    footer = "footer"
    cta = "cta"
    text = "text"


# ── Models ──

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=new_id)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    pitches = relationship("Pitch", back_populates="user")


class Pitch(Base):
    __tablename__ = "pitches"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False, default="Untitled Pitch")
    description = Column(Text, nullable=True)
    industry = Column(String, default="general")
    status = Column(String, default="draft")
    client_name = Column(String, nullable=True)
    client_company = Column(String, nullable=True)
    accent_color = Column(String, default="#3B82F6")
    blocks = Column(JSON, default=list)
    brand_config = Column(JSON, default=dict)
    facts = Column(JSON, default=list)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="pitches")
    shares = relationship("PitchShare", back_populates="pitch")
    views = relationship("PitchView", back_populates="pitch")
    conversations = relationship("Conversation", back_populates="pitch")


class PitchShare(Base):
    __tablename__ = "pitch_shares"

    id = Column(String, primary_key=True, default=new_id)
    pitch_id = Column(String, ForeignKey("pitches.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    pitch = relationship("Pitch", back_populates="shares")


class PitchView(Base):
    __tablename__ = "pitch_views"

    id = Column(String, primary_key=True, default=new_id)
    pitch_id = Column(String, ForeignKey("pitches.id"), nullable=False)
    share_id = Column(String, nullable=True)
    viewer_email = Column(String, nullable=True)
    viewer_name = Column(String, nullable=True)
    duration_seconds = Column(Integer, default=0)
    device_type = Column(String, default="desktop")
    viewed_at = Column(DateTime, default=utcnow)

    pitch = relationship("Pitch", back_populates="views")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=new_id)
    pitch_id = Column(String, ForeignKey("pitches.id"), nullable=False)
    messages = Column(JSON, default=list)  # [{role, content, timestamp}]
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    pitch = relationship("Pitch", back_populates="conversations")
