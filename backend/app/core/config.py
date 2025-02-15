import os

# 기본 디렉토리 설정
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Next.js public 폴더 경로 설정
NEXTJS_PUBLIC_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "public",
)

# Metal 가속 설정
os.environ["OPENCV_OPENCL_RUNTIME"] = "opencl"
os.environ["OPENCV_OPENCL_DEVICE"] = ":GPU:0"

# 비디오 설정
VIDEO_WIDTH = 1080
VIDEO_HEIGHT = 1920
VIDEO_FPS = 24

# 자막 설정
SUBTITLE_BASE_FONTSIZE = 70
SUBTITLE_BASE_STROKE_WIDTH = 4.0
SUBTITLE_FONT = "Helvetica-Bold"
