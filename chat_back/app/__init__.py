from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.database.base import Base, engine

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://stage.panel.domainhostingcafe.com",
    "https://my.primecrown.com",
    "http://my.primecrown.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all tables defined in SQLAlchemy models
# Base.metadata.create_all(bind=engine)

app.include_router(api_router)