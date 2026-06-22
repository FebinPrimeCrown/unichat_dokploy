from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database.models import User
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import random
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr
import hashlib
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import joinedload
import requests

load_dotenv()  # Load environment variables from .env file

SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = os.getenv('PORT')
SMTP_USERNAME = os.getenv('SMTP_USERNAME')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')

encryption_key = os.getenv("CLUSTER_SECRET_PASS_ENCRYPTION_KEY").encode('utf-8')
cipher_suite = Fernet(encryption_key)

def get_password_hash(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_user(db: Session, user_id: str):
    user = db.query(User).options(joinedload(User.organisation)).filter(User.uuid == user_id).first()
    return user

def verify_password(plain_password, hashed_password):
    hashed_input_password = hashlib.sha256(plain_password.encode()).hexdigest()
    # Compare the hashed input password with the stored hashed password
    print(hashed_input_password==hashed_password)
    print(hashed_input_password)
    print(hashed_password)
    return hashed_input_password == hashed_password

def decrypt_api_pass(cipher_text: str) -> str:
    plain_text = cipher_suite.decrypt(cipher_text.encode('utf-8'))
    return plain_text.decode('utf-8')

def generate_code():
    return random.randint(100000, 999999)

def send_email(to_email: str, code: str):
    try:
        # Create the email content
        msg = MIMEText(f'Your verification code is {code}', 'plain')
        msg['Subject'] = f'Your Login Verification Code is {code}'
        from_name = "PrimeCrown Technologies"
        from_email = SMTP_USERNAME
        msg['From'] = formataddr((from_name, from_email))

        msg['To'] = to_email

        # Connect to SMTP server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        
        # Disable TLS or SSL (no starttls)
        # server.starttls()
        # server.ehlo()  # Identifies ourselves to the server
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, to_email, msg.as_string())

        print("Email sent successfully")
        server.quit()
    except Exception as e:
        print(f"Failed to send email: {e}")




def shorten_role_names(user: User):
    roles_list = []
    for role in user.roles:
        if role.name == "group_admin":
            roles_list.append("ga")
        elif role.name == "viewer":
            roles_list.append("vw")
        elif role.name == "vm_viewer":
            roles_list.append("vm_vw")
        elif role.name == "vm_editor":
            roles_list.append("vm_ed")
        elif role.name == "hosting_viewer":
            roles_list.append("ht_vw")
        elif role.name == "hosting_editor":
            roles_list.append("ht_ed")
        elif role.name == "md_viewer":
            roles_list.append("md_vw")
        elif role.name == "md_editor":
            roles_list.append("md_ed")
        elif role.name == "bms_viewer":
            roles_list.append("bms_vw")
        elif role.name == "bms_editor":
            roles_list.append("bms_ed")
        elif role.name == "domain_viewer":
            roles_list.append("dm_vw")
        elif role.name == "domain_editor":
            roles_list.append("dm_ed")
        elif role.name == "email_viewer":
            roles_list.append("em_vw")
        elif role.name == "email_editor":
            roles_list.append("em_ed")
        elif role.name == "billing_viewer":
            roles_list.append("bng_vw")
        elif role.name == "billing_editor":
            roles_list.append("bng_ed")
        elif role.name == "wb_viewer":
            roles_list.append("wb_vw")
        elif role.name == "wb_editor":
            roles_list.append("wb_ed")
    return roles_list

def virtualizor_api_requester(url, method="get", timeout=10, data={}):
    ssl_check = False
    if method == "get":
        response = requests.get(url, timeout=timeout, verify=ssl_check)
        return response
    elif method == "post":
        response = requests.post(url, data=data, timeout=timeout, verify=ssl_check)
        return response