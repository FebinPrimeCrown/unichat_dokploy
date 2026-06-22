from datetime import datetime, timedelta
from jose import JWTError, jwt
from app.database.models import User
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status, Request
from datetime import datetime, timezone
import os
from app.services.common import verify_password
import requests
import httpx

ACCESS_TOKEN_SECRET_KEY = os.getenv('ACCESS_TOKEN_SECRET_KEY')
REFRESH_TOKEN_SECRET_KEY = os.getenv('REFRESH_TOKEN_SECRET_KEY')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM')


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        access_token_expire = datetime.now(timezone.utc) + expires_delta
    else:
        access_token_expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": access_token_expire})
    encoded_jwt = jwt.encode(to_encode, ACCESS_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt, access_token_expire

async def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        refresh_token_expire = datetime.now(timezone.utc) + expires_delta
    else:
        refresh_token_expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": refresh_token_expire})
    encoded_jwt = jwt.encode(to_encode, REFRESH_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt, refresh_token_expire

def get_client_ip(request: Request):
    x_forwarded_for = request.headers.get('X-Forwarded-For')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.client.host if request.client else None

async def get_currency_by_ip(ip: str) -> str:
    url = f"https://ipinfo.io/{ip}/json"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
            country_code = data.get("country")  # ipinfo uses 'country' for country code
        
        # Simple mapping of country codes to currencies
        if country_code == "IN":
            return "INR"
        elif country_code == "US":
            return "USD"
        elif country_code in ["FR", "DE", "ES", "IT"]:  # Example countries in Europe
            return "EUR"
        else:
            return "USD"  # Default currency if country code is not matched
    except Exception as e:
        # Handle errors and fallback to USD
        return "USD"


def create_access_token_for_multi(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        access_token_expire = datetime.now(timezone.utc) + expires_delta
    else:
        access_token_expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": access_token_expire})
    encoded_jwt = jwt.encode(to_encode, ACCESS_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt, access_token_expire