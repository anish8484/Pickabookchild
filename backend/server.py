from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
import cv2
import numpy as np
from PIL import Image
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

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
class PhotoUploadResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    uploaded_at: str
    has_face: bool
    message: str

class PersonalizedImage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    original_photo_id: str
    personalized_image: str
    template_used: str
    created_at: str
    prompt_used: str

class GenerateRequest(BaseModel):
    photo_id: str
    prompt: Optional[str] = "Transform this child into a whimsical illustrated character with big expressive eyes, soft features, wearing a floral dress with a pink flower headband, in a cute cartoon style with pastel colors and a warm, playful atmosphere"

# Helper function to detect face using OpenCV
def detect_face(image_bytes: bytes) -> bool:
    """Detect if image contains a face"""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        return len(faces) > 0
    except Exception as e:
        logging.error(f"Face detection error: {e}")
        return True  # Assume true to allow processing

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Photo Personalization API", "status": "active"}

@api_router.post("/upload", response_model=PhotoUploadResponse)
async def upload_photo(file: UploadFile = File(...)):
    """Upload a child's photo"""
    try:
        # Read file contents
        contents = await file.read()
        
        # Validate file is an image
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Detect face
        has_face = detect_face(contents)
        
        # Convert to base64 for storage
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # Create photo record
        photo_id = str(uuid.uuid4())
        photo_doc = {
            "id": photo_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "image_data": base64_image,
            "has_face": has_face,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.photos.insert_one(photo_doc)
        
        return PhotoUploadResponse(
            id=photo_id,
            uploaded_at=photo_doc["uploaded_at"],
            has_face=has_face,
            message="Photo uploaded successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/generate", response_model=PersonalizedImage)
async def generate_personalized_image(request: GenerateRequest):
    """Generate personalized illustration using Gemini Nano Banana"""
    try:
        # Fetch original photo
        photo_doc = await db.photos.find_one({"id": request.photo_id}, {"_id": 0})
        if not photo_doc:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # Get API key
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        # Initialize Gemini Nano Banana chat
        session_id = f"personalize-{uuid.uuid4()}"
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message="You are an expert at creating whimsical, child-friendly illustrated characters."
        )
        
        chat.with_model("gemini", "gemini-2.5-flash-image-preview").with_params(
            modalities=["image", "text"]
        )
        
        # Prepare message with reference image
        msg = UserMessage(
            text=request.prompt,
            file_contents=[ImageContent(photo_doc["image_data"])]
        )
        
        # Generate personalized image
        text_response, images = await chat.send_message_multimodal_response(msg)
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="No image generated")
        
        # Get the first generated image
        generated_image = images[0]
        personalized_id = str(uuid.uuid4())
        
        # Store personalized image
        personalized_doc = {
            "id": personalized_id,
            "original_photo_id": request.photo_id,
            "personalized_image": generated_image['data'],
            "mime_type": generated_image['mime_type'],
            "template_used": "gemini-nano-banana",
            "prompt_used": request.prompt,
            "text_response": text_response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.personalized_images.insert_one(personalized_doc)
        
        return PersonalizedImage(
            id=personalized_id,
            original_photo_id=request.photo_id,
            personalized_image=generated_image['data'],
            template_used="gemini-nano-banana",
            created_at=personalized_doc["created_at"],
            prompt_used=request.prompt
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/gallery", response_model=List[PersonalizedImage])
async def get_gallery():
    """Get all personalized images"""
    try:
        images = await db.personalized_images.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return images
    except Exception as e:
        logging.error(f"Gallery error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/personalized/{image_id}", response_model=PersonalizedImage)
async def get_personalized_image(image_id: str):
    """Get specific personalized image"""
    try:
        image_doc = await db.personalized_images.find_one({"id": image_id}, {"_id": 0})
        if not image_doc:
            raise HTTPException(status_code=404, detail="Image not found")
        return image_doc
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
