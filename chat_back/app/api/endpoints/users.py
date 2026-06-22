from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile, Form, Response
import requests.cookies
from sqlalchemy.orm import Session
from app.services.user import get_current_user, add_user, edit_user, switch_user_active_status, get_all_users, create_user, update_user_organisation, update_user, change_user_password,  fetch_dashboard_boxes_data, reset_user_password
from app.database.base import get_db
from app.models.user import User, UserCreate, UserEdit, UserStatusSwitch, UserUpdate, UserOrganisationUpdate, ChangePassword, UserDetails, Fund, FundSummary, TransactionResponse, VirtualMachineSchema, ProductListSchema, ProductDetailsSchema, HostingListSchema, ReinstallDetailsSchema, ForgotPasswordForm, HostingDetailsSchema, EmailListSchema, EmailDetailsSchema, TransactionFund, VMPriceSchema, CreateDomainHandleFormData, ClientStatusTransferSchema, DomainNameServerUpdateSchema, DomainPrivacyUpdateSchema, BareMetalServerSchema, ManagedDatabaseListSchema, Organisation, KYCFile, DomainHandle as DomainHandlePyModel, UserAdd, CreateAssociatedDNSManageRecordsSchema, AssociatedDNSManageRecords, UpdateAssociatedDNSManageRecordsSchema, DeleteAssociatedDNSManageRecordsSchema
from typing import List
import os
import shortuuid
import requests
from fastapi.responses import StreamingResponse
import asyncio
import json
import aioredis
import razorpay
from app.database.models import User as DBUser, RefreshToken, AccessToken, LoginDetail
import hmac
import hashlib
from datetime import datetime, timezone
import httpx
from sqlalchemy import and_
from dotenv import load_dotenv
import os
import logging
from fastapi.responses import JSONResponse
from app.services.auth import (
    authenticate_user, create_access_token, create_refresh_token, get_client_ip, create_access_token_for_multi
)
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.models.token import TokenData
from app.services.common import get_password_hash, get_user, verify_password, shorten_role_names
from typing import Optional
from fastapi import Query


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

load_dotenv()

router = APIRouter()

RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')
RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET')
RTR_API_URL = os.getenv('RTR_API_URL')
RTR_API_CUSTOMER = os.getenv('RTR_API_CUSTOMER')
DHC_API_URL = os.getenv('DHC_API_URL')
OTE_API_KEY = os.getenv('OTE_API_KEY')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES'))
REFRESH_TOKEN_EXPIRE_HOURS = int(os.getenv('REFRESH_TOKEN_EXPIRE_HOURS'))
ACCESS_TOKEN_SECRET_KEY = os.getenv('ACCESS_TOKEN_SECRET_KEY')
REFRESH_TOKEN_SECRET_KEY = os.getenv('REFRESH_TOKEN_SECRET_KEY')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM')
ENVIRONMENT = os.getenv('ENVIRONMENT')

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

@router.get("/me/", response_model=User)
async def read_users_me(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    return User.from_orm_with_org_domain_handles(user)  # Return user with org domain handles

@router.post("/", response_model=User)
async def create_user_endpoint(request:Request, user: UserCreate, db: Session = Depends(get_db)):
    return await create_user(request, user, db)

@router.post("/add_user/")
async def add_user_endpoint(request:Request, user: UserAdd, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    await add_user(request, user, db, current_user)

@router.post("/edit_user/")
async def edit_user_endpoint(request:Request, user: UserEdit, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    await edit_user(request, user, db, current_user)

@router.post("/switch_user_active_status/")
async def switch_user_active_status_endpoint(request:Request, user: UserStatusSwitch, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    await switch_user_active_status(request, user, db, current_user)

@router.get("/", response_model=List[User])
async def get_users(request: Request, db: Session = Depends(get_db)):
    return get_all_users(request, db)

@router.post("/org_update/", response_model=User)
async def update_user_endpoint(request: Request, user: UserOrganisationUpdate, db: Session = Depends(get_db)):
    user = update_user_organisation(request, user, db)
    return User.from_orm_with_org_domain_handles(user)

@router.post("/user_update/", response_model=User)
async def update_user_endpoint(request: Request, user: UserUpdate, db: Session = Depends(get_db)):
    user = update_user(request, user, db)
    return User.from_orm_with_org_domain_handles(user)


@router.post("/change_password/")
async def change_password(request: Request, password: ChangePassword, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return change_user_password(request, password, db, current_user)

@router.post("/reset_password/")
async def change_password(request: Request, response: Response, form_data: ForgotPasswordForm, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return reset_user_password(request, response, form_data, db, current_user)


async def redis_listener():
    redis = await aioredis.from_url("redis://127.0.0.1:6379")
    pubsub = redis.pubsub()
    await pubsub.subscribe("vm_status_updates")
    return pubsub


def verify_signature(payload: str, signature: str, secret: str) -> bool:
    generated_signature = hmac.new(
        key=secret.encode('utf-8'),
        msg=payload.encode('utf-8'),
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(generated_signature, signature)


@router.get('/dashboard_boxes_data/')
async def dashboard_boxes_data_endpoint(request: Request, db: Session=Depends(get_db), current_user: User = Depends(get_current_user)):
    return fetch_dashboard_boxes_data(request, db, current_user)


@router.get('/fetch_sub_users/')
async def fetch_sub_users_endpoint(request: Request, response: Response, db: Session=Depends(get_db), current_user: User = Depends(get_current_user)):
    # Query all users in the same org who are not group admins
    users = db.query(DBUser).filter(
        DBUser.organisation_id == current_user.organisation_id,
        DBUser.is_group_admin == False
    ).all()

    result = []
    for user in users:
        roles = [role.name for role in user.roles]
        result.append({
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "email": user.email,
            "is_active": "Active" if user.is_active else "Inactive",
            "roles": roles
        })

    return result