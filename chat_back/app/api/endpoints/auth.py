from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import JWTError, jwt
from app.services.auth import (
    authenticate_user, create_access_token, create_refresh_token, get_client_ip, create_access_token_for_multi
)
from app.database.base import get_db
from app.models.token import Token, TokenData, RefreshTokenRequest
from app.models.user import User, Organisation, KYCFile, DomainHandle
from app.models.forms import OAuth2PasswordRequestFormEmail, OAuth2CodeRequestFormEmail, OAuth2CodeResendRequestFormEmail, ForgotPasswordRequestFormEmail, ForgotPasswordRequestProcessFormEmail
from app.database.models import RefreshToken, AccessToken, LoginDetail, UserVerificationCode, User as DBUser
from app.services.common import get_user, generate_code, send_email, shorten_role_names
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta, timezone
from fastapi.responses import JSONResponse
from app.tasks import send_email_task
import os

load_dotenv()

ACCESS_TOKEN_SECRET_KEY = os.getenv('ACCESS_TOKEN_SECRET_KEY')
REFRESH_TOKEN_SECRET_KEY = os.getenv('REFRESH_TOKEN_SECRET_KEY')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES'))
REFRESH_TOKEN_EXPIRE_HOURS = int(os.getenv('REFRESH_TOKEN_EXPIRE_HOURS'))

router = APIRouter()


@router.post("/refresh_access_token")
async def refresh_access_token(request: Request, response: Response, body: RefreshTokenRequest, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get('refresh_token')
    admin_refresh_token = request.cookies.get('admin_refresh_token')
    if not refresh_token:
        if admin_refresh_token:
            try:
                payload = jwt.decode(admin_refresh_token, REFRESH_TOKEN_SECRET_KEY, algorithms=[JWT_ALGORITHM])
                user_id: str = payload.get("sub")
                if user_id is None:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
                token_data = TokenData(user_id=user_id)
                user = get_user(db, user_id=token_data.user_id)
                if not user:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
                if not user.is_active:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not active")
                device_fingerprint = body.device_fingerprint
                stored_refresh_token = db.query(RefreshToken).filter_by(token=admin_refresh_token, user_uuid=user.uuid).first()
                if not stored_refresh_token or stored_refresh_token.revoked:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

                if stored_refresh_token.device_fingerprint != device_fingerprint:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device fingerprint mismatch")

                stored_refresh_token.revoked = True
                db.commit()
                db.refresh(stored_refresh_token)

                access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                roles_list = shorten_role_names(user)
                access_token, access_token_expire = create_access_token(
                    data={"sub": user.uuid, "roles": roles_list}, expires_delta=access_token_expires
                )
                refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_HOURS)
                refresh_token, refresh_token_expire = await create_refresh_token(
                    data={"sub": user.uuid, "roles": roles_list}, expires_delta=refresh_token_expires
                )
                client_ip = get_client_ip(request)
                new_refresh_token = RefreshToken(
                    token=refresh_token,
                    user_uuid=user.uuid,
                    expires_at=refresh_token_expire,
                    device_fingerprint=device_fingerprint,
                    client_ip=client_ip
                )
                db.add(new_refresh_token)
                db.commit()
                db.refresh(new_refresh_token)

                new_access_token = AccessToken(
                    token=access_token,
                    user_uuid=user.uuid,
                    expires_at=access_token_expire,
                    device_fingerprint=device_fingerprint,
                    client_ip=client_ip
                )
                db.add(new_access_token)
                db.commit()
                db.refresh(new_access_token)

                response.set_cookie(
                    key="admin_token",
                    value=access_token,
                    max_age=600,
                    httponly=True,
                    secure=True,
                    samesite="None",
                    domain=os.getenv('COOKIE_DOMAIN'),
                    path="/",
                )
                response.set_cookie(
                    key="admin_refresh_token",
                    value=refresh_token,
                    max_age=REFRESH_TOKEN_EXPIRE_HOURS * 60 * 60,
                    httponly=True,
                    secure=True,
                    samesite="None",
                    domain=os.getenv('COOKIE_DOMAIN'),
                    path="/",
                )
                
                return {"access_token": access_token, "token_type": "bearer"}

            except JWTError:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found")

    try:
        payload = jwt.decode(refresh_token, REFRESH_TOKEN_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        token_data = TokenData(user_id=user_id)
        user = get_user(db, user_id=token_data.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not active")
        device_fingerprint = body.device_fingerprint
        stored_refresh_token = db.query(RefreshToken).filter_by(token=refresh_token, user_uuid=user.uuid).first()
        if not stored_refresh_token or stored_refresh_token.revoked:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

        if stored_refresh_token.device_fingerprint != device_fingerprint:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device fingerprint mismatch")

        stored_refresh_token.revoked = True
        db.commit()
        db.refresh(stored_refresh_token)

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        roles_list = shorten_role_names(user)
        if payload.get("for_admin_use") is True:
            access_token, access_token_expire = create_access_token(
                data={"sub": user.uuid, "roles": roles_list, "for_admin_use": True}, expires_delta=access_token_expires
            )
            print(len(access_token))
            refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_HOURS)
            refresh_token, refresh_token_expire = await create_refresh_token(
                data={"sub": user.uuid, "roles": roles_list, "for_admin_use": True}, expires_delta=refresh_token_expires
            )
        else:
            access_token, access_token_expire = create_access_token(
                data={"sub": user.uuid, "roles": roles_list}, expires_delta=access_token_expires
            )
            refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_HOURS)
            refresh_token, refresh_token_expire = await create_refresh_token(
                data={"sub": user.uuid, "roles": roles_list}, expires_delta=refresh_token_expires
            )
        client_ip = get_client_ip(request)
        new_refresh_token = RefreshToken(
            token=refresh_token,
            user_uuid=user.uuid,
            expires_at=refresh_token_expire,
            device_fingerprint=device_fingerprint,
            client_ip=client_ip
        )
        db.add(new_refresh_token)
        db.commit()
        db.refresh(new_refresh_token)

        new_access_token = AccessToken(
            token=access_token,
            user_uuid=user.uuid,
            expires_at=access_token_expire,
            device_fingerprint=device_fingerprint,
            client_ip=client_ip
        )
        db.add(new_access_token)
        db.commit()
        db.refresh(new_access_token)

        response.set_cookie(
            key="token",
            value=access_token,
            max_age=600,
            httponly=True,
            secure=True,
            samesite="None",
            domain=os.getenv('COOKIE_DOMAIN'),
            path="/",
        )
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=REFRESH_TOKEN_EXPIRE_HOURS * 60 * 60,
            httponly=True,
            secure=True,
            samesite="None",
            domain=os.getenv('COOKIE_DOMAIN'),
            path="/",
        )
        
        return {"access_token": access_token, "token_type": "bearer"}

    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

@router.post('/logout')
async def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    access_token = request.cookies.get('token')
    refresh_token = request.cookies.get('refresh_token')
    stored_access_token = db.query(AccessToken).filter_by(token=access_token).first()
    stored_refresh_token = db.query(RefreshToken).filter_by(token=refresh_token).first()
    if stored_access_token:
        stored_access_token.revoked = True
        db.commit()
        db.refresh(stored_access_token)
    if stored_refresh_token:
        stored_refresh_token.revoked = True
        db.commit()
        db.refresh(stored_refresh_token)
    response.delete_cookie(key="token", domain=os.getenv('COOKIE_DOMAIN'), path="/")
    response.delete_cookie(key="refresh_token", domain=os.getenv('COOKIE_DOMAIN'), path="/")
    response.delete_cookie(key="reset_password_token", domain=os.getenv('COOKIE_DOMAIN'), path="/")
    return {"success"}

@router.post('/admin_logout')
async def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    admin_access_token = request.cookies.get('admin_token')
    admin_refresh_token = request.cookies.get('admin_refresh_token')
    stored_access_token = db.query(AccessToken).filter_by(token=admin_access_token).first()
    stored_refresh_token = db.query(RefreshToken).filter_by(token=admin_refresh_token).first()
    if stored_access_token:
        stored_access_token.revoked = True
        db.commit()
        db.refresh(stored_access_token)
    if stored_refresh_token:
        stored_refresh_token.revoked = True
        db.commit()
        db.refresh(stored_refresh_token)
    response.delete_cookie(key="admin_token", domain=os.getenv('COOKIE_DOMAIN'), path="/")
    response.delete_cookie(key="admin_refresh_token", domain=os.getenv('COOKIE_DOMAIN'), path="/")
    return {"success"}


@router.post("/login")
async def login_for_access_token(request: Request, response: Response,
    form_data: OAuth2PasswordRequestFormEmail = Depends(OAuth2PasswordRequestFormEmail.as_form),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account is not active! Please contact your admin.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.is_admin and not user.email.endswith("@primecrown.com"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email is not authorised to access admin page",
            headers={"WWW-Authenticate": "Bearer"},
        )
    client_ip = get_client_ip(request)

    last_login = db.query(LoginDetail).filter_by(user_id=user.uuid).order_by(LoginDetail.login_time_stamp.desc()).first()

    if not last_login or last_login.client_ip != client_ip or user.email_verified == False or last_login.device_fingerprint != form_data.device_fingerprint:
        # db.query(UserVerificationCode).filter_by(user_id=user.uuid).delete() # only use this if needed
        # Generate 6-digit code
        verification_code = generate_code()
        # Send the code via email
        send_email_task.delay(form_data.email, verification_code)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        access_token_multi_expires = timedelta(minutes=15)
        access_token_multi, access_token_multi_expire = create_access_token_for_multi(
            data={"sub": user.uuid}, expires_delta=access_token_multi_expires
        )
        new_verification_code = UserVerificationCode(
            user_id=user.uuid,
            verification_code=verification_code,
            type="multi_factor",
            auth_token=access_token_multi,
            attempt_counter=0,
            resend_counter=0,
            expires_at=expires_at
        )
        db.add(new_verification_code)
        db.commit()  # Commit the transaction to save the new verification code
        db.refresh(new_verification_code)
        response.set_cookie(
            key="access_token_multi",
            value=access_token_multi,
            max_age=15*60,
            httponly=True,
            secure=True,
            samesite="None",
            domain=os.getenv('COOKIE_DOMAIN'),
            path="/",
        )
        return {"prompt_verification_code_input": 1}
    
    if user.is_admin:
        roles_list = shorten_role_names(user)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token, access_token_expire = create_access_token(
            data={"sub": user.uuid, "roles": roles_list}, expires_delta=access_token_expires
        )
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_HOURS)
        refresh_token, refresh_token_expire = await create_refresh_token(
            data={"sub": user.uuid, "roles": roles_list}, expires_delta=refresh_token_expires
        )
        device_fingerprint = form_data.device_fingerprint
        client_ip = get_client_ip(request)
        new_refresh_token = RefreshToken(
            token=refresh_token,
            user_uuid=user.uuid,
            expires_at=refresh_token_expire,
            device_fingerprint=device_fingerprint,
            client_ip=client_ip
        )
        db.add(new_refresh_token)
        db.commit()
        db.refresh(new_refresh_token)

        new_access_token = AccessToken(
            token=access_token,
            user_uuid=user.uuid,
            expires_at=access_token_expire,
            device_fingerprint=device_fingerprint,
            client_ip=client_ip
        )
        db.add(new_access_token)
        db.commit()
        db.refresh(new_access_token)
        response.set_cookie(
            key="admin_token",
            value=access_token,
            max_age=600,
            httponly=True,
            secure=True,
            samesite="None",
            domain=os.getenv('COOKIE_DOMAIN'),
            path="/",
        )
        response.set_cookie(
            key="admin_refresh_token",
            value=refresh_token,
            max_age=REFRESH_TOKEN_EXPIRE_HOURS * 60 * 60,
            httponly=True,
            secure=True,
            samesite="None",
            domain=os.getenv('COOKIE_DOMAIN'),
            path="/",
        )
        new_login_detail = LoginDetail(user_id=user.uuid, organisation_id=user.organisation_id, client_ip=client_ip, device_fingerprint=form_data.device_fingerprint, verified_device=True)
        db.add(new_login_detail)
        db.commit()
        db.refresh(new_login_detail)
        is_first_login = True
        login_detail = db.query(LoginDetail).filter_by(user_id=user.uuid).all()
        if len(login_detail) > 1:
            is_first_login = False
        organisation_data = Organisation.from_orm(user.organisation).dict() if user.organisation else None
        kyc_files_data = [KYCFile.from_orm(kyc_file).dict() for kyc_file in user.kyc_files] if user.kyc_files else None
        domain_handles_data = [DomainHandle.from_orm(domain_handle).dict() for domain_handle in user.organisation.domain_handles] if user.organisation.domain_handles else None

        # Manually map SQLAlchemy model to Pydantic model
        user_data = {
            "uuid": user.uuid,
            "organisation_id": user.organisation_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "telephone_number": user.telephone_number,
            "email": user.email,
            "password_provider": user.password_provider,
            "is_group_admin": user.is_group_admin,
            "organisation": organisation_data,
            "kyc_files": kyc_files_data,
            "domain_handles": domain_handles_data,
            "is_first_login": is_first_login,
            "is_admin": user.is_admin,
            "is_active": user.is_active
        }
        return User(**user_data)


    roles_list = shorten_role_names(user)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token, access_token_expire = create_access_token(
        data={"sub": user.uuid, "roles": roles_list}, expires_delta=access_token_expires
    )
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_HOURS)
    refresh_token, refresh_token_expire = await create_refresh_token(
        data={"sub": user.uuid, "roles": roles_list}, expires_delta=refresh_token_expires
    )

    device_fingerprint = form_data.device_fingerprint
    client_ip = get_client_ip(request)
    new_refresh_token = RefreshToken(
        token=refresh_token,
        user_uuid=user.uuid,
        expires_at=refresh_token_expire,
        device_fingerprint=device_fingerprint,
        client_ip=client_ip
    )
    db.add(new_refresh_token)
    db.commit()
    db.refresh(new_refresh_token)

    new_access_token = AccessToken(
        token=access_token,
        user_uuid=user.uuid,
        expires_at=access_token_expire,
        device_fingerprint=device_fingerprint,
        client_ip=client_ip
    )
    db.add(new_access_token)
    db.commit()
    db.refresh(new_access_token)

    response.set_cookie(
        key="token",
        value=access_token,
        max_age=600,
        httponly=True,
        secure=True,
        samesite="None",
        domain=os.getenv('COOKIE_DOMAIN'),
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_HOURS * 60 * 60,
        httponly=True,
        secure=True,
        samesite="None",
        domain=os.getenv('COOKIE_DOMAIN'),
        path="/",
    )
    new_login_detail = LoginDetail(user_id=user.uuid, organisation_id=user.organisation_id, client_ip=client_ip, device_fingerprint=form_data.device_fingerprint, verified_device=True)
    db.add(new_login_detail)
    db.commit()
    db.refresh(new_login_detail)
    is_first_login = True
    login_detail = db.query(LoginDetail).filter_by(user_id=user.uuid).all()
    if len(login_detail) > 1:
        is_first_login = False

    organisation_data = Organisation.from_orm(user.organisation).dict() if user.organisation else None
    kyc_files_data = [KYCFile.from_orm(kyc_file).dict() for kyc_file in user.kyc_files] if user.kyc_files else None
    domain_handles_data = [DomainHandle.from_orm(domain_handle).dict() for domain_handle in user.organisation.domain_handles] if user.organisation.domain_handles else None

    # Manually map SQLAlchemy model to Pydantic model
    user_data = {
        "uuid": user.uuid,
        "organisation_id": user.organisation_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "telephone_number": user.telephone_number,
        "email": user.email,
        "password_provider": user.password_provider,
        "is_group_admin": user.is_group_admin,
        "organisation": organisation_data,
        "kyc_files": kyc_files_data,
        "domain_handles": domain_handles_data,
        "is_first_login": is_first_login,
        "is_admin": user.is_admin,
        "is_active": user.is_active
    }
    return User(**user_data)


@router.post('/verify-code')
async def verify_auth_code(request: Request, response: Response,
    form_data: OAuth2CodeRequestFormEmail = Depends(OAuth2CodeRequestFormEmail.as_form), db: Session = Depends(get_db)):
    access_token_multi = request.cookies.get("access_token_multi")
    if not access_token_multi:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session expired",
        )

    email = form_data.email
    token = form_data.verification_code

    # Step 1: Retrieve the user by email
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if not user:
        response = JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "User not found"},
        )
        response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
        return response

    # Step 2: Fetch the latest verification code for the user
    verification_code_entry = db.query(UserVerificationCode).filter_by(user_id=user.uuid, auth_token=access_token_multi).order_by(UserVerificationCode.expires_at.desc()).first()

    if not verification_code_entry:
        response = JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "No verification code found for this user"},
        )
        response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
        return response

    # Step 3: Check if the code matches and hasn't expired
    current_time = datetime.now(timezone.utc)

    if verification_code_entry.expires_at.tzinfo is None:
        verification_code_entry.expires_at = verification_code_entry.expires_at.replace(tzinfo=timezone.utc)

    if verification_code_entry.verification_code != token:
        verification_code_entry.attempt_counter += 1
        db.commit()
        db.refresh(verification_code_entry)
        if verification_code_entry.attempt_counter == 3:
            response = JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"detail": "3 invalid attempts"},
            )
            response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
            return response
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    if verification_code_entry.expires_at < current_time:
        response = JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"detail": "Verification code has expired"},
            )
        response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
        return response
    
    
    # Step 4: Mark the user's email as verified
    user.email_verified = True
    db.commit()
    db.refresh(user)
    response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")

    if user.is_admin:
        roles_list = shorten_role_names(user)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token, access_token_expire = create_access_token(
            data={"sub": user.uuid, "roles": roles_list}, expires_delta=access_token_expires
        )
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_HOURS)
        refresh_token, refresh_token_expire = await create_refresh_token(
            data={"sub": user.uuid, "roles": roles_list}, expires_delta=refresh_token_expires
        )
        print("sdsddddddddddddddddddddddddddddddddddddddddddddddddddd", len(refresh_token))
        device_fingerprint = form_data.device_fingerprint
        client_ip = get_client_ip(request)
        new_refresh_token = RefreshToken(
            token=refresh_token,
            user_uuid=user.uuid,
            expires_at=refresh_token_expire,
            device_fingerprint=device_fingerprint,
            client_ip=client_ip
        )
        db.add(new_refresh_token)
        db.commit()
        db.refresh(new_refresh_token)

        new_access_token = AccessToken(
            token=access_token,
            user_uuid=user.uuid,
            expires_at=access_token_expire,
            device_fingerprint=device_fingerprint,
            client_ip=client_ip
        )
        db.add(new_access_token)
        db.commit()
        db.refresh(new_access_token)
        response.set_cookie(
            key="admin_token",
            value=access_token,
            max_age=600,
            httponly=True,
            secure=True,
            samesite="None",
            domain=os.getenv('COOKIE_DOMAIN'),
            path="/",
        )
        response.set_cookie(
            key="admin_refresh_token",
            value=refresh_token,
            max_age=REFRESH_TOKEN_EXPIRE_HOURS * 60 * 60,
            httponly=True,
            secure=True,
            samesite="None",
            domain=os.getenv('COOKIE_DOMAIN'),
            path="/",
        )
        new_login_detail = LoginDetail(user_id=user.uuid, organisation_id=user.organisation_id, client_ip=client_ip, device_fingerprint=form_data.device_fingerprint, verified_device=True)
        db.add(new_login_detail)
        db.commit()
        db.refresh(new_login_detail)
        is_first_login = True
        login_detail = db.query(LoginDetail).filter_by(user_id=user.uuid).all()
        if len(login_detail) > 1:
            is_first_login = False
        organisation_data = Organisation.from_orm(user.organisation).dict() if user.organisation else None
        kyc_files_data = [KYCFile.from_orm(kyc_file).dict() for kyc_file in user.kyc_files] if user.kyc_files else None
        domain_handles_data = domain_handles_data = [DomainHandle.from_orm(domain_handle).dict() for domain_handle in user.organisation.domain_handles] if user.organisation.domain_handles else None

        # Manually map SQLAlchemy model to Pydantic model
        user_data = {
            "uuid": user.uuid,
            "organisation_id": user.organisation_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "telephone_number": user.telephone_number,
            "email": user.email,
            "password_provider": user.password_provider,
            "is_group_admin": user.is_group_admin,
            "organisation": organisation_data,
            "kyc_files": kyc_files_data,
            "domain_handles": domain_handles_data,
            "is_first_login": is_first_login,
            "is_admin": user.is_admin,
            "is_active": user.is_active
        }
        return User(**user_data)

    roles_list = shorten_role_names(user)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token, access_token_expire = create_access_token(
        data={"sub": user.uuid, "roles": roles_list}, expires_delta=access_token_expires
    )
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_HOURS)
    refresh_token, refresh_token_expire = await create_refresh_token(
        data={"sub": user.uuid, "roles": roles_list}, expires_delta=refresh_token_expires
    )
    print("sddddddddddddddddddddd", len(refresh_token))
    device_fingerprint = form_data.device_fingerprint
    client_ip = get_client_ip(request)
    new_refresh_token = RefreshToken(
        token=refresh_token,
        user_uuid=user.uuid,
        expires_at=refresh_token_expire,
        device_fingerprint=device_fingerprint,
        client_ip=client_ip
    )
    db.add(new_refresh_token)
    db.commit()
    db.refresh(new_refresh_token)

    new_access_token = AccessToken(
        token=access_token,
        user_uuid=user.uuid,
        expires_at=access_token_expire,
        device_fingerprint=device_fingerprint,
        client_ip=client_ip
    )
    db.add(new_access_token)
    db.commit()
    db.refresh(new_access_token)

    response.set_cookie(
        key="token",
        value=access_token,
        max_age=600,
        httponly=True,
        secure=True,
        samesite="None",
        domain=os.getenv('COOKIE_DOMAIN'),
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_HOURS * 60 * 60,
        httponly=True,
        secure=True,
        samesite="None",
        domain=os.getenv('COOKIE_DOMAIN'),
        path="/",
    )
    new_login_detail = LoginDetail(user_id=user.uuid, organisation_id=user.organisation_id, client_ip=client_ip, device_fingerprint=form_data.device_fingerprint, verified_device=True)
    db.add(new_login_detail)
    db.commit()
    db.refresh(new_login_detail)
    is_first_login = True
    login_detail = db.query(LoginDetail).filter_by(user_id=user.uuid).all()
    if len(login_detail) > 1:
        is_first_login = False

    organisation_data = Organisation.from_orm(user.organisation).dict() if user.organisation else None
    kyc_files_data = [KYCFile.from_orm(kyc_file).dict() for kyc_file in user.kyc_files] if user.kyc_files else None
    domain_handles_data = domain_handles_data = [DomainHandle.from_orm(domain_handle).dict() for domain_handle in user.organisation.domain_handles] if user.organisation.domain_handles else None

    # Manually map SQLAlchemy model to Pydantic model
    user_data = {
        "uuid": user.uuid,
        "organisation_id": user.organisation_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "telephone_number": user.telephone_number,
        "email": user.email,
        "password_provider": user.password_provider,
        "is_group_admin": user.is_group_admin,
        "organisation": organisation_data,
        "kyc_files": kyc_files_data,
        "domain_handles": domain_handles_data,
        "is_first_login": is_first_login,
        "is_admin": user.is_admin,
        "is_active": user.is_active
    }
    return User(**user_data)


@router.post('/resend-code')
async def resend_code(request: Request, response: Response,
    form_data: OAuth2CodeResendRequestFormEmail = Depends(OAuth2CodeResendRequestFormEmail.as_form), db: Session = Depends(get_db)):

    access_token_multi = request.cookies.get("access_token_multi")
    if not access_token_multi:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session expired",
        )
    email = form_data.email
    user = db.query(DBUser).filter(DBUser.email == email).first()

    verification_code_entry = db.query(UserVerificationCode).filter_by(user_id=user.uuid, auth_token=access_token_multi).order_by(UserVerificationCode.expires_at.desc()).first()
    verification_code_entry.resend_counter += 1
    # Generate 6-digit code
    verification_code = verification_code_entry.verification_code
    # Send the code via email
    send_email_task.delay(form_data.email, verification_code)
    verification_code_entry.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    db.commit()  # Commit the transaction to save the new verification code
    db.refresh(verification_code_entry)
    if verification_code_entry.resend_counter == 3:
        return {"prompt_verification_code_input": 1, "last_resend": 1}
    return {"prompt_verification_code_input": 1}


@router.post('/forgot-password')
async def forgot_password(request: Request, response: Response,
    form_data: ForgotPasswordRequestFormEmail = Depends(ForgotPasswordRequestFormEmail.as_form), db: Session = Depends(get_db)):
    email = form_data.email
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if not user:
        return {"success": 1}
    verification_code = generate_code()
    # Send the code via email
    send_email_task.delay(form_data.email, verification_code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    access_token_multi_expires = timedelta(minutes=15)
    access_token_multi, access_token_multi_expire = create_access_token_for_multi(
        data={"sub": user.uuid}, expires_delta=access_token_multi_expires
    )
    new_verification_code = UserVerificationCode(
        user_id=user.uuid,
        verification_code=verification_code,
        type="forgot_password",
        auth_token=access_token_multi,
        attempt_counter=0,
        resend_counter=0,
        expires_at=expires_at
    )
    db.add(new_verification_code)
    db.commit()  # Commit the transaction to save the new verification code
    db.refresh(new_verification_code)
    response.set_cookie(
        key="access_token_multi",
        value=access_token_multi,
        max_age=15*60,
        httponly=True,
        secure=True,
        samesite="None",
        domain=os.getenv('COOKIE_DOMAIN'),
        path="/",
    )
    return {"success": 1}


@router.post('/forgot-password-verify-code')
async def forgot_password_verify_code(request: Request, response: Response,
    form_data: ForgotPasswordRequestProcessFormEmail = Depends(ForgotPasswordRequestProcessFormEmail.as_form), db: Session = Depends(get_db)):
    access_token_multi = request.cookies.get("access_token_multi")
    if not access_token_multi:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session expired",
        )
    email = form_data.email
    token = form_data.verification_code
    device_fingerprint = form_data.device_fingerprint

    # Step 1: Retrieve the user by email
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if not user:
        response = JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "User not found"},
        )
        response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
        return response

    # Step 2: Fetch the latest verification code for the user
    verification_code_entry = db.query(UserVerificationCode).filter_by(user_id=user.uuid, auth_token=access_token_multi, type="forgot_password").order_by(UserVerificationCode.expires_at.desc()).first()

    if not verification_code_entry:
        response = JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "No verification code found for this user"},
        )
        response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
        return response

    # Step 3: Check if the code matches and hasn't expired
    current_time = datetime.now(timezone.utc)

    if verification_code_entry.expires_at.tzinfo is None:
        verification_code_entry.expires_at = verification_code_entry.expires_at.replace(tzinfo=timezone.utc)

    if verification_code_entry.verification_code != token:
        response = JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "Incorrect OTP Code"},
        )
        response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
        return response


    if verification_code_entry.expires_at < current_time:
        response = JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"detail": "Verification code has expired"},
            )
        response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
        return response
    
    access_token_multi_expires = timedelta(minutes=15)
    access_token_multi, access_token_multi_expire = create_access_token_for_multi(
        data={"sub": user.uuid}, expires_delta=access_token_multi_expires
    )
    client_ip = get_client_ip(request)
    new_access_token = AccessToken(
        token=access_token_multi,
        user_uuid=user.uuid,
        expires_at=access_token_multi_expire,
        device_fingerprint=device_fingerprint,
        client_ip=client_ip
    )
    db.add(new_access_token)
    db.commit()
    db.refresh(new_access_token)
    response.delete_cookie(key="access_token_multi", domain=os.getenv('COOKIE_DOMAIN'), path="/")
    response.set_cookie(
        key="reset_password_token",
        value=access_token_multi,
        max_age=600,
        httponly=True,
        secure=True,
        samesite="None",
        domain=os.getenv('COOKIE_DOMAIN'),
        path="/",
    )
    return {"success": 1}