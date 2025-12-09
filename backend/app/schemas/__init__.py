from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Literal
from datetime import datetime

class Review(BaseModel):
    reviewId: str
    name: str
    date: str
    stars: float
    text: str
    avatar: str
    profileLink: str

class ReviewsResponse(BaseModel):
    success: bool
    locale: str
    count: int
    averageRating: float
    reviews: List[Review]

class ScrapeRequest(BaseModel):
    place_url: HttpUrl
    locales: Optional[List[str]] = None
    force_refresh: bool = False

    min_rating: float = 1.0      
    max_reviews: int = 200     
    sort: Literal["newest", "oldest", "best", "worst"] = "newest" 


class CacheEntry(BaseModel):
    place_url: str
    locale: str
    avg_rating: float
    updated_at: Optional[datetime]
    count: int


class CacheQuery(BaseModel):
    place_url: Optional[HttpUrl] = None
    locales: Optional[List[str]] = None


class CacheDeleteRequest(BaseModel):
    place_url: HttpUrl
    locales: Optional[List[str]] = None


class RefreshRequest(BaseModel):
    place_url: HttpUrl
    locales: Optional[List[str]] = None
    background: bool = True


class MonitorCreate(BaseModel):
    place_url: HttpUrl
    locales: Optional[List[str]] = None
    interval_minutes: int = 60
    min_rating: float = 1.0
    max_reviews: int = 200
    sort: Literal["newest", "oldest", "best", "worst"] = "newest"


class Monitor(BaseModel):
    id: int
    place_url: str
    locales: List[str]
    interval_minutes: int
    min_rating: float
    max_reviews: int
    sort: str
    last_run: Optional[datetime]


class StatsResponse(BaseModel):
    success: bool
    place_url: str
    locales: List[str]
    totalCount: int
    averageRating: float
    threshold: Optional[float] = None
    filteredCount: Optional[int] = None
    filteredAverage: Optional[float] = None


# Auth and multi-tenant
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    is_admin: bool


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class DomainCreate(BaseModel):
    host: str


class DomainOut(BaseModel):
    id: int
    host: str
    active: bool


class InstanceCreate(BaseModel):
    place_url: HttpUrl
    locales: Optional[List[str]] = None
    interval_minutes: int = 60
    min_rating: float = 1.0
    max_reviews: int = 200
    sort: Literal["newest", "oldest", "best", "worst"] = "newest"
    domain_id: Optional[int] = None


class InstanceUpdate(BaseModel):
    locales: Optional[List[str]] = None
    interval_minutes: Optional[int] = None
    min_rating: Optional[float] = None
    max_reviews: Optional[int] = None
    sort: Optional[Literal["newest", "oldest", "best", "worst"]] = None
    domain_id: Optional[int] = None
    active: Optional[bool] = None


class InstanceOut(BaseModel):
    id: int
    public_key: str
    place_url: str
    locales: List[str]
    interval_minutes: int
    min_rating: float
    max_reviews: int
    sort: str
    active: bool
    domain_id: Optional[int]

