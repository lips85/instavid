import os
from moviepy.config import change_settings
import subprocess

def find_magick_binary():
    # 실제 설치된 ImageMagick 경로
    installed_path = r"C:\Program Files\ImageMagick-7.1.1-Q16-HDRI\magick.exe"
    
    if os.path.exists(installed_path):
        return installed_path
    
    # 백업 경로들
    possible_paths = [
        r"C:\Program Files\ImageMagick-7.1.1-Q16\magick.exe",
        r"C:\Program Files (x86)\ImageMagick-7.1.1-Q16-HDRI\magick.exe",
        r"C:\Program Files (x86)\ImageMagick-7.1.1-Q16\magick.exe"
    ]
    
    # 환경 변수에서 경로 찾기
    try:
        result = subprocess.run(['where', 'magick'], capture_output=True, text=True)
        if result.returncode == 0:
            path = result.stdout.strip().split('\n')[0]
            if os.path.exists(path):
                return path
    except:
        pass

    # 가능한 경로들 확인
    for path in possible_paths:
        if os.path.exists(path):
            return path

    return None

# ImageMagick 바이너리 찾기
IMAGEMAGICK_BINARY = find_magick_binary()

if not IMAGEMAGICK_BINARY:
    raise Exception(
        "ImageMagick not found. Please install ImageMagick and make sure it's in your system PATH.\n"
        "Download from: https://imagemagick.org/script/download.php#windows"
    )

# MoviePy 설정
change_settings({
    "IMAGEMAGICK_BINARY": IMAGEMAGICK_BINARY
})

print(f"ImageMagick binary found at: {IMAGEMAGICK_BINARY}") 