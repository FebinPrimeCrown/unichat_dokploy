from fastapi import Depends, HTTPException, Response, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from app.models.user import User, UserCreate, UserAdd, UserEdit, UserStatusSwitch, UserUpdate, UserOrganisationUpdate, ChangePassword, Fund, AssociatedProductSchema, ProductListSchema, HostingListSchema, ReinstallDetailsSchema, ForgotPasswordForm, HostingDetailsSchema, EmailListSchema, TransactionFund, VMPriceSchema, CreateDomainHandleFormData, ClientStatusTransferSchema, DomainNameServerUpdateSchema, DomainPrivacyUpdateSchema, ManagedDatabaseListSchema, CreateAssociatedDNSManageRecordsSchema, UpdateAssociatedDNSManageRecordsSchema, DeleteAssociatedDNSManageRecordsSchema
from app.models.token import TokenData
from app.database.models import User as DBUser, Role, Organisation, AccessToken
from app.database.base import get_db
from jose import JWTError, jwt
from typing import List
import os
from passlib.context import CryptContext
from app.services.common import get_password_hash, get_user, verify_password, virtualizor_api_requester
from datetime import datetime, timezone, timedelta
import requests
import xml.etree.ElementTree as ET
import re
from app.services.auth import get_client_ip, get_currency_by_ip
import json
from requests.exceptions import RequestException
from time import sleep
from datetime import datetime, date
from fastapi.responses import JSONResponse
from sqlalchemy.orm import joinedload
from sqlalchemy import or_
import socket
import re
from typing import List, Tuple, Dict, Union
import country_converter as coco
import httpx
import logging
from sqlalchemy import and_
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


ACCESS_TOKEN_SECRET_KEY = os.getenv('ACCESS_TOKEN_SECRET_KEY')
REFRESH_TOKEN_SECRET_KEY = os.getenv('REFRESH_TOKEN_SECRET_KEY')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM')

RTR_API_URL = os.getenv('RTR_API_URL')
RTR_API_CUSTOMER = os.getenv("RTR_API_CUSTOMER")
DHC_API_URL = os.getenv('DHC_API_URL')
OTE_API_KEY = os.getenv('OTE_API_KEY')
DHC1_API_KEY = os.getenv('DHC1_API_KEY')
DHC1_AUTH_USER_ID = os.getenv('DHC1_AUTH_USER_ID')
DHC2_API_KEY = os.getenv('DHC2_API_KEY')
DHC2_AUTH_USER_ID = os.getenv('DHC2_AUTH_USER_ID')
DHC3_API_KEY = os.getenv('DHC3_API_KEY')
DHC3_AUTH_USER_ID = os.getenv('DHC3_AUTH_USER_ID')
DHC4_API_KEY = os.getenv('DHC4_API_KEY')
DHC4_AUTH_USER_ID = os.getenv('DHC4_AUTH_USER_ID')
DHC5_API_KEY = os.getenv('DHC5_API_KEY')
DHC5_AUTH_USER_ID = os.getenv('DHC5_AUTH_USER_ID')


def country_name_to_code(country_name):
    return coco.convert(names=country_name, to='ISO2')


def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("token")
    if not token:
        token = request.cookies.get('reset_password_token')
    if not token and not request.cookies.get('refresh_token'):
        token = request.cookies.get('admin_token')
    print("token is", token)
    print("here")
    device_fingerprint = request.headers.get("X-device_fingerprint")
    if not device_fingerprint:
        device_fingerprint = request.query_params.get('device_fingerprint')
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if not device_fingerprint:
        raise HTTPException(status_code=401, detail="Device fingerprint not found")

    stored_access_token = db.query(AccessToken).filter(AccessToken.token == token).first()

    if not stored_access_token or stored_access_token.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    if stored_access_token.device_fingerprint != device_fingerprint:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device fingerprint mismatch")

    try:
        payload = jwt.decode(token, ACCESS_TOKEN_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        token_data = TokenData(user_id=user_id)
        user = get_user(db, user_id=token_data.user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_active_user(current_user: DBUser = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

async def create_user(request: Request, user: UserCreate, db: Session):
    hashed_password = get_password_hash(user.password)
    existing_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )
    db_user = DBUser(email=user.email, hashed_password=hashed_password, first_name=user.first_name, last_name=user.last_name, disabled=user.disabled)
    db_user.full_name = user.first_name + " " +  user.last_name
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    for role_name in user.roles:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            db_user.roles.append(role)
    
    if 'group_admin' in user.roles:
        db_user.is_group_admin = True

    db.commit()
    db.refresh(db_user)

    if user.organisation_id:
        org = db.query(Organisation).filter(Organisation.id == user.organisation_id).first()
        if org:
            db_user.organisation = org
        else:
            raise ValueError("Organization not found with provided ID")
    else:
        # Create a new organization and associate the user with it
        new_org = Organisation(organization_name=user.organisation_name)
        client_ip = get_client_ip(request)
        new_org.currency = await get_currency_by_ip(client_ip)
        db.add(new_org)
        db.commit()
        db.refresh(new_org)
        db_user.organisation = new_org

    db.commit()
    db.refresh(db_user)
    return db_user

async def add_user(request: Request, user: UserAdd, db: Session, current_user: DBUser):
    if not current_user.is_group_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="unauthorized operation",
        )
    hashed_password = get_password_hash(user.password)
    existing_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )
    db_user = DBUser(email=user.email, hashed_password=hashed_password, first_name=user.first_name, last_name=user.last_name, disabled=user.disabled)
    db_user.full_name = user.first_name + " " +  user.last_name
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    for role_name in user.roles:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            db_user.roles.append(role)
    
    db.commit()
    db.refresh(db_user)

    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if org:
        db_user.organisation = org
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organisation not found",
        )
    
    db.commit()
    db.refresh(db_user)

async def edit_user(request: Request, user: UserEdit, db: Session, current_user: DBUser):
    if not current_user.is_group_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="unauthorized operation",
        )
    db_user = db.query(DBUser).filter_by(email=user.email).first()
    db_user.first_name = user.first_name
    db_user.last_name = user.last_name
    db_user.full_name = user.first_name + " " +  user.last_name

    db_user.roles.clear()

    for role_name in user.roles:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            db_user.roles.append(role)
    db.commit()
    db.refresh(db_user)

async def switch_user_active_status(request: Request, user: UserStatusSwitch, db: Session, current_user: DBUser):
    if not current_user.is_group_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="unauthorized operation",
        )
    db_user = db.query(DBUser).filter_by(email=user.email).first()
    db_user.is_active = user.is_active
    db.commit()
    db.refresh(db_user)


def get_all_users(request: Request, db: Session):
    token = request.cookies.get("token")
    print(token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return db.query(DBUser).all()

def update_user_organisation(request: Request, user: UserOrganisationUpdate, db: Session):
    token = request.cookies.get("token")
    device_fingerprint = request.headers.get("X-device_fingerprint")

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if not device_fingerprint:
        raise HTTPException(status_code=401, detail="Device fingerprint not found")
    
    stored_access_token = db.query(AccessToken).filter(AccessToken.token == token).first()

    if not stored_access_token or stored_access_token.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    if stored_access_token.device_fingerprint != device_fingerprint:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device fingerprint mismatch")

    try:
        payload = jwt.decode(token, ACCESS_TOKEN_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        token_data = TokenData(user_id=user_id)
        db_user: DBUser  = get_user(db, user_id=token_data.user_id)
        if db_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    if not db_user.organisation.type:
        db_user.organisation.type = user.type


    if user.organisation_name and user.type.value == 'business' and not db_user.organisation.organization_name:
        db_user.organisation.organization_name = user.organisation_name

    if user.vat_or_gst_in and user.type.value == 'business' and not db_user.organisation.vat_or_gst_in:
        db_user.organisation.vat_or_gst_in = user.vat_or_gst_in

    if not db_user.organisation.country:
        db_user.organisation.country = user.country
    
    if not db_user.organisation.state:
        db_user.organisation.state = user.state
    
    db_user.organisation.street_address = user.street_address
    db_user.organisation.city = user.city
    db_user.organisation.postal_code = user.postal_code
    db_user.organisation.address_line_2 = user.address_line_2

    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(request: Request, user: UserUpdate, db: Session):
    token = request.cookies.get("token")
    device_fingerprint = request.headers.get("X-device_fingerprint")
    print(user.telephone_number)

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if not device_fingerprint:
        raise HTTPException(status_code=401, detail="Device fingerprint not found")
    
    stored_access_token = db.query(AccessToken).filter(AccessToken.token == token).first()

    if not stored_access_token or stored_access_token.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    if stored_access_token.device_fingerprint != device_fingerprint:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device fingerprint mismatch")

    try:
        payload = jwt.decode(token, ACCESS_TOKEN_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        token_data = TokenData(user_id=user_id)
        db_user: DBUser  = get_user(db, user_id=token_data.user_id)
        if db_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    db_user.first_name = user.first_name
    db_user.last_name = user.last_name
    db_user.telephone_number = user.telephone_number

    db.commit()
    db.refresh(db_user)
    return db_user


def change_user_password(request: Request, password: ChangePassword, db: Session, current_user: DBUser):
    if not verify_password(password.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current Password is incorrect")
    hashed_password = get_password_hash(password.new_password)
    current_user.hashed_password = hashed_password
    db.commit()
    db.refresh(current_user)
    return {"detail": "Password Changed Successfully"}

def reset_user_password(request: Request, response: Response, form_data: ForgotPasswordForm, db: Session, current_user: DBUser):
    password = form_data.new_password
    hashed_password = get_password_hash(password)
    current_user.hashed_password = hashed_password
    db.commit()
    db.refresh(current_user)
    # response.delete_cookie(key="token", domain=os.getenv('COOKIE_DOMAIN'), path="/")
    return {"success": 1}

def get_current_user_details(request: Request, db: Session):
    user = get_current_user(request, db)
    is_group_admin = False
    for role in user.roles:
        if role.name == 'group_admin':
            is_group_admin = True
            break
    user_details = {
        "email": user.email,
        "full_name": user.full_name,
        "uuid": user.uuid,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "telephone_number": user.telephone_number,
        "password_provider": user.password_provider,
        "organisation_id": user.organisation_id,
        "organisation": {
            "id": user.organisation.id,
            "organization_name": user.organisation.organization_name,
            "street_address": user.organisation.street_address,
            "address_line_2": user.organisation.address_line_2,
            "city": user.organisation.city,
            "country": user.organisation.country,
            "state": user.organisation.state,
            "postal_code": user.organisation.postal_code,
            "type": user.organisation.type,
            "vat_or_gst_in": user.organisation.vat_or_gst_in
        },
        "kyc_files": user.kyc_files,
        "is_group_admin": is_group_admin
    }
    return user_details

def fetch_dashboard_boxes_data(request: Request, db: Session, current_user: DBUser):
    today = datetime.now(timezone.utc)
    seven_days_ago = today - timedelta(days=7)
    next_14_days = today + timedelta(days=14)

    

    return {
        "total_number_of_users": 11,
        "total_products": 21,
        "new_orders_count": 3,
        "expiring_soon_orders_count": 4,
        "account_balance": str(5),
        "currency": current_user.organisation.currency
    }



class IsProxy:
    def __init__(self, apikey: str, host: str = "is.yoursrs.com", port: int = 2001):
        self.apikey = apikey
        self.host = host
        self.port = port
        self.fp = None

    def close(self) -> None:
        self.write("CLOSE")
        if self.fp:
            self.fp.close()
            self.fp = None

    def connect(self) -> bool:
        try:
            self.fp = socket.create_connection((self.host, self.port), timeout=10)
            return self.login()
        except (socket.error, socket.timeout) as e:
            print(f"Connection error: {e}")
            return False
        
    def enable(self, function):
        return self.write(f'ENABLE {function}') and "100 OK" in self.read()

    def check(self, domainname: str, tlds: Union[str, List[str]], enable_functions=[]) -> None:
        if isinstance(tlds, str):
            tlds = [tlds]
        for function in enable_functions:
            if not self.enable(function):
                print(f"Failed to enable function: {function}")
        # Send individual queries for each TLD
        self.responses = []
        for tld in tlds:
            self.write(f"IS {domainname}.{tld}")
            response = self.read()
            self.responses.append(response)

    def result(self) -> List[Dict[str, str]]:
        results = []
        for response in self.responses:
            match = re.match(r"^([\-\w.]+)\s(available|not\savailable|invalid\sdomain|error)", response)
            if match:
                results.append({"domain": match.group(1), "result": match.group(2)})
            else:
                results.append({"domain": "-", "result": "error"})
        return results

    def is_connected(self) -> bool:
        return self.fp is not None

    def login(self) -> bool:
        if not self.write(f"LOGIN {self.apikey}"):
            return False
        response = self.read()
        if re.match(r"^400\sLogin\sfailed", response):
            return False
        return bool(re.match(r"^100\sLogin\sok", response))

    def read(self) -> str:
        if not self.is_connected():
            self.connect()
        try:
            response = self.fp.recv(1024).decode('utf-8').strip()
            return response
        except (socket.error, socket.timeout):
            return ""

    def write(self, message: str) -> bool:
        if not self.is_connected():
            self.connect()
        try:
            self.fp.sendall(f"{message}\r\n".encode('utf-8'))
            return True
        except (socket.error, socket.timeout):
            return False
