from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
import httpx
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Proxy endpoints for htnguonsong.com API to handle CORS
@api_router.get("/proxy/songs")
async def proxy_songs(
    page: int = 1,
    per_page: int = 20,
    search: str = None,
    sort_by: str = None,
    sort_order: str = "asc",
    sort_by_2: str = None,
    sort_order_2: str = "asc"
):
    try:
        params = {
            "page": page,
            "per_page": per_page
        }
        
        if search:
            params["search"] = search
        if sort_by:
            params["sort_by"] = sort_by
            params["sort_order"] = sort_order
        if sort_by_2:
            params["sort_by_2"] = sort_by_2
            params["sort_order_2"] = sort_order_2
            
        async with httpx.AsyncClient() as client:
            response = await client.get("https://htnguonsong.com/api/songs", params=params)
            return response.json()
    except Exception as e:
        logger.error(f"Error proxying songs API: {e}")
        return {"success": False, "error": str(e)}

@api_router.get("/proxy/songs/view/{song_id}")
async def proxy_song_detail(song_id: int):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://htnguonsong.com/api/songs/view/{song_id}")
            return response.json()
    except Exception as e:
        logger.error(f"Error proxying song detail API: {e}")
        return {"success": False, "error": str(e)}

@api_router.get("/proxy/songs/types")
async def proxy_song_types():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("https://htnguonsong.com/api/songs/types")
            return response.json()
    except Exception as e:
        logger.error(f"Error proxying song types API: {e}")
        return {"success": False, "error": str(e)}

@api_router.get("/proxy/songs/topics")
async def proxy_song_topics():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("https://htnguonsong.com/api/songs/topics")
            return response.json()
    except Exception as e:
        logger.error(f"Error proxying song topics API: {e}")
        return {"success": False, "error": str(e)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
