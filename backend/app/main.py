from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import UPLOAD_DIR
from .models.video import VideoRequest
from .services.video_generator import VideoGenerator

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 제공을 위한 디렉토리 설정
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.post("/generate-video")
async def generate_video(request: VideoRequest):
    """비디오 생성 엔드포인트"""
    try:
        generator = VideoGenerator(request)
        return generator.generate()
    except Exception as e:
        print(f"Error in generate_video: {str(e)}")
        import traceback

        print(traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "ok"}


def run_server():
    """Poetry 스크립트를 위한 서버 실행 함수"""
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
