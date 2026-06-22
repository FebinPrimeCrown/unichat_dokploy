from pydantic import BaseModel
from fastapi import Depends, Form

class OAuth2PasswordRequestFormEmail(BaseModel):
    email: str
    password: str
    device_fingerprint: str

    @classmethod
    def as_form(
        cls,
        email: str = Form(...),
        password: str = Form(...),
        device_fingerprint: str = Form(...),
    ) -> "OAuth2PasswordRequestFormEmail":
        return cls(email=email, password=password, device_fingerprint=device_fingerprint)


class OAuth2CodeRequestFormEmail(BaseModel):
    email: str
    verification_code: str
    device_fingerprint: str

    @classmethod
    def as_form(
        cls,
        email: str = Form(...),
        verification_code: str = Form(...),
        device_fingerprint: str = Form(...)
    ) -> "OAuth2PasswordRequestFormEmail":
        return cls(email=email, verification_code=verification_code, device_fingerprint=device_fingerprint)


class OAuth2CodeResendRequestFormEmail(BaseModel):
    email: str

    @classmethod
    def as_form(
        cls,
        email: str = Form(...)
    ) -> "OAuth2PasswordRequestFormEmail":
        return cls(email=email)


class ForgotPasswordRequestFormEmail(BaseModel):
    email: str
    device_fingerprint: str

    @classmethod
    def as_form(
        cls,
        email: str = Form(...),
        device_fingerprint: str = Form(...),
    ) -> "OAuth2PasswordRequestFormEmail":
        return cls(email=email, device_fingerprint=device_fingerprint)


class ForgotPasswordRequestProcessFormEmail(BaseModel):
    email: str
    verification_code: str
    device_fingerprint: str

    @classmethod
    def as_form(
        cls,
        email: str = Form(...),
        verification_code: str = Form(...),
        device_fingerprint: str = Form(...),
    ) -> "OAuth2PasswordRequestFormEmail":
        return cls(email=email, verification_code=verification_code, device_fingerprint=device_fingerprint)