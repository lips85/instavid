from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import Subtitle, VideoRequest
import os
import requests
import boto3
import moviepy.editor as mp
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# S3 클라이언트 설정
s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

@app.post("/generate-video")
async def generate_video(request: VideoRequest):
    try:
        # ... 기존 코드 유지 ...
        pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 