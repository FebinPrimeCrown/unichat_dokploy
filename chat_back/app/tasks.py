from celery_app import celery_app
from sqlalchemy.orm import Session
from app.database.base import SessionLocal
import requests
import time
import xml.etree.ElementTree as ET
import os
import re
from sqlalchemy.exc import OperationalError, SQLAlchemyError
import redis
import json
from datetime import datetime, timezone
from app.services.common import decrypt_api_pass
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import razorpay
from sqlalchemy import func
from dateutil.relativedelta import relativedelta
import pytz
from sqlalchemy import or_
from collections import defaultdict

load_dotenv()  # Load environment variables from .env file

SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = os.getenv('SMTP_PORT')
SMTP_USERNAME = os.getenv('SMTP_USERNAME')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')

RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

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
ENVIRONMENT = os.getenv('ENVIRONMENT')



redis_pool = redis.ConnectionPool(host='127.0.0.1', port=6379, db=0)
redis_client = redis.Redis(connection_pool=redis_pool)
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


@celery_app.task
def send_notification(id):
    print(f"notification id {id} sent")


@celery_app.task
def print_start():
    print("start")


@celery_app.task
def send_email_task(to_email: str, code: str):
    try:
        # Create the email object with multipart/alternative to handle both plain text and HTML
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Your PrimeCrown Account Verification Code is {code}'
        from_name = "PrimeCrown Technologies"
        from_email = SMTP_USERNAME
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = to_email

        # Plain text version as a fallback
        text = f"Your verification code is {code}\nIf you didn't request this, please change your password."

        # HTML version with your template
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <body style="font-family: 'Trebuchet MS', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
            <div style="background: #fff; max-width: 500px; margin: 30px auto; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); text-align: center;">
                <h2 style="font-size: 22px; color: #333; margin-bottom: 20px;">
                    Log in to PrimeCrown
                </h2>
                <p style="font-size: 16px; color: #555;">
                    Welcome back! Enter this <strong>code</strong> within the next 5 minutes to log in:
                </p>
                <div style="display: inline-block; background: #e6f7ff; color: #007bff; font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 10px 20px; border-radius: 8px; margin: 20px 0;">
                    {code}
                </div>
                <p style="font-size: 14px; color: #555;">
                    If you didn't try to log in recently, we recommend you change your account password at the earliest.
                </p>
                <footer style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px;">
                    You’re receiving this email because you have a PrimeCrown account.
                    <br>© {datetime.now().year} PrimeCrown Technologies Pvt. Ltd. All rights reserved.
                </footer>
            </div>
        </body>
        </html>
        """

        # Attach both plain text and HTML to the message
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')

        msg.attach(part1)
        msg.attach(part2)

        # Send the email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, to_email, msg.as_string())
        print("Email sent successfully")
        server.quit()

    except Exception as e:
        print(f"Failed to send email: {e}")


@celery_app.task
def send_email_task_for_general_matter(to_email: str, subject: str, text: str):
    try:
        # Create the email object with multipart/alternative to handle both plain text and HTML
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        from_name = "PrimeCrown Technologies"
        from_email = SMTP_USERNAME
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = to_email

        # Plain text version as a fallback
        text = text

        

        # Attach both plain text and HTML to the message
        part1 = MIMEText(text, 'plain')

        msg.attach(part1)

        # Send the email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, to_email, msg.as_string())
        print("Email sent successfully")
        server.quit()

    except Exception as e:
        print(f"Failed to send email: {e}")

