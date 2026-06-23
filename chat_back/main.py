from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.database.base import Base, engine
from celery_app import celery_app
import time
from app.tasks import send_notification
from dotenv import load_dotenv
import os
from app.mqtt.client import start_mqtt


load_dotenv()

app = FastAPI(
    docs_url=None if os.getenv("ENVIRONMENT") == "production" else "/docs",
    redoc_url=None if os.getenv("ENVIRONMENT") == "production" else "/redoc",
    openapi_url=None if os.getenv("ENVIRONMENT") == "production" else "/openapi.json"
)

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:3001",
    "https://demochat.domainhostingcafe.com",
    "http://demochat.domainhostingcafe.com",
    "http://localhost:3002",
    "https://stage.panel.domainhostingcafe.com",
    "https://my.primecrown.com",
    "http://my.primecrown.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get('/celery_test/{id}')
async def notify(id: int):
    send_notification.delay(id)
    return {"ok"}
# Create all tables defined in SQLAlchemy models
# Base.metadata.create_all(bind=engine)


@app.on_event("startup")
async def startup_event():
    start_mqtt()

app.include_router(api_router)