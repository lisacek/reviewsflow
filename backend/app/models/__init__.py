from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, ForeignKey, UniqueConstraint, Index, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class ReviewCache(Base):
    __tablename__ = "review_cache"

    id = Column(Integer, primary_key=True)
    place_url = Column(String(1024), index=True)
    locale = Column(String(10), index=True)
    payload = Column(JSON)
    avg_rating = Column(Float)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MonitoredPlace(Base):
    __tablename__ = "monitored_places"

    id = Column(Integer, primary_key=True)
    place_url = Column(String(1024), index=True)
    locales = Column(JSON)  # list of locale strings
    interval_minutes = Column(Integer, default=60)
    min_rating = Column(Float, default=1.0)
    max_reviews = Column(Integer, default=200)
    sort = Column(String(10), default="newest")
    last_run = Column(DateTime(timezone=True), server_default=None, onupdate=func.now())


# New multi-tenant models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Domain(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    host = Column(String(255), index=True, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ReviewInstance(Base):
    __tablename__ = "review_instances"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    public_key = Column(String(64), unique=True, index=True, nullable=False)
    place_url = Column(String(1024), index=True, nullable=False)
    locales = Column(JSON)  # list of locales
    interval_minutes = Column(Integer, default=60)
    min_rating = Column(Float, default=1.0)
    max_reviews = Column(Integer, default=200)
    sort = Column(String(10), default="newest")
    active = Column(Boolean, default=True)
    last_run = Column(DateTime(timezone=True), server_default=None, onupdate=func.now())


# New table to persist individual reviews per (place_url, locale)
class ReviewEntry(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    place_url = Column(String(1024), index=True, nullable=False)
    locale = Column(String(10), index=True, nullable=False)
    review_id = Column(String(128), nullable=False)
    name = Column(String(255), default="")
    date = Column(String(64), default="")  # raw date string as scraped
    stars = Column(Float, default=0.0)
    text = Column(Text, default="")
    avatar = Column(String(1024), default="")
    profile_link = Column(String(1024), default="")
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())
    hidden = Column(Boolean, default=False, index=True)

    __table_args__ = (
        UniqueConstraint("place_url", "locale", "review_id", name="uq_review_place_locale_id"),
        Index("ix_reviews_place_locale", "place_url", "locale"),
    )

