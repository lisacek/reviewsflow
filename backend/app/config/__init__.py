from pydantic_settings import BaseSettings
from typing import Optional, List, Dict, Any
import os
import pathlib
try:
    import yaml  # type: ignore
except Exception:
    yaml = None

class Settings(BaseSettings):
    # Direct SQLAlchemy async URL (preferred if set)
    DATABASE_URL: str = "sqlite+aiosqlite:///./reviews.db"

    # Optional discrete DB settings to compose DATABASE_URL when not provided
    DB_DIALECT: Optional[str] = None   # e.g., "mysql", "postgresql", "sqlite"
    DB_DRIVER: Optional[str] = None    # e.g., "aiomysql" or "asyncmy" for MySQL; "asyncpg" for Postgres; "aiosqlite" for SQLite
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[int] = None
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_NAME: Optional[str] = None
    HEADLESS: bool = True
    MIN_RATING: float = 4.0
    CACHE_TTL_MINUTES: int = 1440
    MONITOR_POLL_SECONDS: int = 60
    WORKER_COUNT: int = 1
    DEFAULT_LOCALES: Optional[List[str]] = None
    CONFIG_FILE: Optional[str] = None
    MAX_PLAYWRIGHT_INSTANCES: int = 2
    # Auth and multi-tenant
    ALLOW_REGISTRATIONS: bool = True
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_PASSWORD: Optional[str] = None
    JWT_SECRET: str = "devsecret-change-me"
    JWT_EXPIRE_MINUTES: int = 60 * 24


def _load_yaml_file() -> Dict[str, Any]:
    """Load overrides from YAML config if available.
    
    Priority:
    - env var `CONFIG_FILE` path if set and exists
    - `config.yaml` or `config.yml` in CWD
    Returns uppercase keys mapping to Settings fields.
    """
    candidates: list[str] = []
    env_path = os.getenv("CONFIG_FILE")
    if env_path:
        candidates.append(env_path)
    candidates.append("config.yaml")
    candidates.append("config.yml")

    path: Optional[pathlib.Path] = None
    for c in candidates:
        p = pathlib.Path(c)
        if p.exists() and p.is_file():
            path = p
            break

    if path is None:
        return {}

    if yaml is None:
        return {}

    try:
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    except Exception:
        return {}

    # Allow nested under "app" or flat
    if isinstance(data, dict) and "app" in data and isinstance(data["app"], dict):
        data = data["app"]

    if not isinstance(data, dict):
        return {}

    out: Dict[str, Any] = {}
    for k, v in data.items():
        out[str(k).upper()] = v
    return out


# Build settings with YAML overrides applied after env/defaults.
_env_first = Settings()
_yaml_overrides = _load_yaml_file()
settings = Settings(**{**_env_first.model_dump(), **_yaml_overrides})

# Compose DATABASE_URL from discrete DB_* fields if not provided
if not (settings.DATABASE_URL and str(settings.DATABASE_URL).strip()):
    d = (settings.DB_DIALECT or '').lower()
    driver = (settings.DB_DRIVER or '').lower()
    host = settings.DB_HOST or ''
    port = settings.DB_PORT
    user = settings.DB_USER or ''
    password = settings.DB_PASSWORD or ''
    name = settings.DB_NAME or ''

    if d in ("mysql", "mariadb"):
        # default driver/port
        if not driver:
            driver = "aiomysql"
        if port is None:
            port = 3306
        auth = f"{user}:{password}@" if user or password else ""
        settings.DATABASE_URL = f"{d}+{driver}://{auth}{host}:{port}/{name}?charset=utf8mb4"
    elif d in ("postgresql", "postgres"):
        if not driver:
            driver = "asyncpg"
        if port is None:
            port = 5432
        auth = f"{user}:{password}@" if user or password else ""
        settings.DATABASE_URL = f"postgresql+{driver}://{auth}{host}:{port}/{name}"
    elif d == "sqlite":
        if not driver:
            driver = "aiosqlite"
        # For sqlite, host/port/user/password are ignored; name can be file path
        db_path = name or "./reviews.db"
        if not db_path.startswith("/") and not db_path.startswith("./"):
            db_path = f"./{db_path}"
        settings.DATABASE_URL = f"sqlite+{driver}:///{db_path}"
    # else: leave as default
