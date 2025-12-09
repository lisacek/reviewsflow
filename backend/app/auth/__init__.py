import hashlib
import base64
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.db import get_db
from app.models import User

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    """
    Hashes a password using bcrypt. 
    To bypass the 72-byte limit of bcrypt, we first hash the password 
    with SHA256 and base64 encode it.
    """
    # 1. SHA256 Hash (Reduces any length input to 32 bytes)
    sha_hash = hashlib.sha256(password.encode('utf-8')).digest()
    
    # 2. Base64 Encode (Converts bytes to safe string for bcrypt)
    b64_hash = base64.b64encode(sha_hash)
    
    # 3. Bcrypt Hash
    # bcrypt.hashpw returns bytes, so we decode to utf-8 for storage
    return bcrypt.hashpw(b64_hash, bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a password against the stored hash.
    Applies the same SHA256->Base64 transformation before checking.
    """
    try:
        # 1. SHA256 Hash
        sha_hash = hashlib.sha256(plain_password.encode('utf-8')).digest()
        
        # 2. Base64 Encode
        b64_hash = base64.b64encode(sha_hash)
        
        # 3. Verify
        # hashed_password comes from DB as str, bcrypt needs bytes
        return bcrypt.checkpw(b64_hash, hashed_password.encode('utf-8'))
    except Exception:
        return False


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    res = await db.execute(select(User).where(User.email == sub))
    user = res.scalars().first()
    if not user:
        raise credentials_exception
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin required")
    return user

