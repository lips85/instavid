from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import requests
import boto3
from dotenv import load_dotenv
# config 파일 임포트 추가
import config
import moviepy.editor as mp
import random
from typing import Tuple, List
from PIL import Image
import numpy as np
import cv2

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

class Subtitle(BaseModel):
    text: str
    start: float
    end: float
    index: int

class VideoRequest(BaseModel):
    images: List[str]
    audio: str
    subtitles: List[Subtitle]
    backgroundMusic: str
    projectId: str

def create_animation_effect(clip: mp.ImageClip, effect_type: str, duration: float) -> mp.ImageClip:
    w, h = clip.size
    
    if effect_type == "zoom_in":
        # 줌인 효과 (1.0 -> 1.3)
        def make_frame(t):
            progress = t / duration
            scale = 1.0 + (0.3 * progress)
            frame = clip.get_frame(t)
            
            # OpenCV로 리사이징
            new_h = int(h * scale)
            new_w = int(w * scale)
            resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
            
            # 중앙 부분 크롭
            y_start = (new_h - h) // 2
            x_start = (new_w - w) // 2
            cropped = resized[y_start:y_start+h, x_start:x_start+w]
            
            return cropped
        
        return mp.VideoClip(make_frame, duration=duration)
    
    elif effect_type == "zoom_out":
        # 줌아웃 효과 (1.3 -> 1.0)
        def make_frame(t):
            progress = t / duration
            scale = 1.3 - (0.3 * progress)
            frame = clip.get_frame(t)
            
            new_h = int(h * scale)
            new_w = int(w * scale)
            resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
            
            y_start = (new_h - h) // 2
            x_start = (new_w - w) // 2
            cropped = resized[y_start:y_start+h, x_start:x_start+w]
            
            return cropped
        
        return mp.VideoClip(make_frame, duration=duration)
    
    elif effect_type == "pan_right":
        # 오른쪽으로 패닝 - 새로운 방식
        enlarged_w = int(w * 1.4)  # 40% 더 큰 이미지
        enlarged_frame = cv2.resize(clip.get_frame(0), (enlarged_w, h), interpolation=cv2.INTER_LANCZOS4)
        
        def make_frame(t):
            progress = t / duration
            # 부드러운 이동을 위해 easing 함수 적용
            smooth_progress = np.sin(progress * np.pi / 2)  # easing 효과
            x_offset = int((enlarged_w - w) * smooth_progress)
            return enlarged_frame[:, x_offset:x_offset + w]
        
        return mp.VideoClip(make_frame, duration=duration)
    
    elif effect_type == "pan_left":
        # 왼쪽으로 패닝 - 새로운 방식
        enlarged_w = int(w * 1.4)  # 40% 더 큰 이미지
        enlarged_frame = cv2.resize(clip.get_frame(0), (enlarged_w, h), interpolation=cv2.INTER_LANCZOS4)
        
        def make_frame(t):
            progress = t / duration
            # 부드러운 이동을 위해 easing 함수 적용
            smooth_progress = np.sin(progress * np.pi / 2)  # easing 효과
            x_offset = int((enlarged_w - w) * (1 - smooth_progress))
            return enlarged_frame[:, x_offset:x_offset + w]
        
        return mp.VideoClip(make_frame, duration=duration)
    
    return clip.set_duration(duration)

def split_subtitle(text: str) -> List[str]:
    """자막 텍스트를 3단어씩 강제 분할"""
    words = text.split()
    result = []
    
    # 3단어 이하면 그대로 반환
    if len(words) <= 3:
        return [' '.join(words)]
    
    # 3단어씩 강제 분할
    for i in range(0, len(words), 3):
        if i + 3 <= len(words):
            # 정확히 3단어로 분할
            chunk = ' '.join(words[i:i + 3])
            result.append(chunk)
        else:
            # 마지막 남은 단어들 처리
            remaining = ' '.join(words[i:])
            # 마지막 청크가 1단어면 이전 청크에 합치기
            if len(words[i:]) == 1 and result:
                result[-1] = result[-1] + ' ' + remaining
            else:
                result.append(remaining)
    
    return result

def capitalize_words(text: str) -> str:
    """모든 단어를 대문자로 시작하도록 변환"""
    return ' '.join(word.capitalize() for word in text.split())

def create_styled_text_clip(chunk: str, video_size: Tuple[int, int], start: float, duration: float, next_start: float = None):
    """스타일이 적용된 텍스트 클립 생성"""
    
    # 모든 단어 대문자로 시작하도록 변환
    chunk = capitalize_words(chunk)
    
    # 기본 스타일 설정
    base_fontsize = 160
    base_stroke_width = 5
    
    def create_text_clip(fontsize: int, is_shadow: bool = False):
        stroke_width = int((fontsize / base_fontsize) * base_stroke_width)
        return mp.TextClip(
            chunk,
            fontsize=fontsize,
            color='black' if is_shadow else '#FFFFFF',
            font='Impact',
            size=(int(video_size[0] * 0.95), None),
            method='label',
            align='center',
            stroke_color='#000000',
            stroke_width=stroke_width
        )
    
    # 초기 텍스트 클립 생성
    txt_clip = create_text_clip(base_fontsize)
    
    # 크기 조정 (한 줄로 제한)
    if txt_clip.h > video_size[1] * 0.25:
        scale_factor = (video_size[1] * 0.25) / txt_clip.h
        new_fontsize = int(base_fontsize * scale_factor)
        txt_clip = create_text_clip(new_fontsize)
        shadow_clips = []
        for _ in range(2):
            shadow_clip = create_text_clip(new_fontsize, is_shadow=True)
            shadow_clip = shadow_clip.set_opacity(0.3)
            shadow_clips.append(shadow_clip)
    else:
        shadow_clips = []
        for _ in range(2):
            shadow_clip = create_text_clip(base_fontsize, is_shadow=True)
            shadow_clip = shadow_clip.set_opacity(0.3)
            shadow_clips.append(shadow_clip)
    
    # 팝업 효과를 위한 스케일 애니메이션 함수
    def scale_animation(t):
        if t < 0.15:  # 시작 0.15초 동안
            # 0.8에서 1.1까지 빠르게 확대
            scale = 0.8 + (0.3 * (t / 0.15))
        elif t < 0.3:  # 다음 0.15초 동안
            # 1.1에서 1.0으로 부드럽게 축소
            scale = 1.1 - (0.1 * ((t - 0.15) / 0.15))
        else:
            scale = 1.0
        return scale

    # 모든 클립에 스케일 애니메이션 적용
    clips_to_composite = []
    for clip in shadow_clips + [txt_clip]:
        animated_clip = clip.set_position(('center', 'center'))
        animated_clip = animated_clip.set_start(start)
        
        # 스케일 애니메이션 적용
        animated_clip = animated_clip.resize(lambda t: scale_animation(t))
        clips_to_composite.append(animated_clip)
    
    final_clip = mp.CompositeVideoClip(clips_to_composite)
    
    # 페이드아웃 시간 및 클립 길이 조정
    fadeout_duration = 0.05  # 기본 페이드아웃 시간
    actual_duration = duration  # 실제 클립 길이
    
    if next_start is not None:
        time_gap = next_start - start
        if time_gap < duration:  # 겹치는 경우
            overlap = duration - time_gap
            actual_duration = time_gap - 0.15
            fadeout_duration = min(0.15, actual_duration * 0.3)
            if actual_duration < 0.3:
                fadeout_duration = actual_duration * 0.5
    
    # 최종 효과 적용
    return (final_clip
            .set_position(('center', 'center'))
            .set_duration(actual_duration)
            .crossfadein(0.05)
            .crossfadeout(fadeout_duration))

@app.post("/generate-video")
async def generate_video(request: VideoRequest):
    try:
        print("Received request:", request)

        # 임시 디렉토리 생성
        temp_dir = "temp"
        os.makedirs(temp_dir, exist_ok=True)

        # 먼저 내레이션을 다운로드하여 전체 길이 계산
        try:
            print(f"Downloading narration: {request.audio}")
            response = requests.get(request.audio)
            response.raise_for_status()
            narration_path = f"{temp_dir}/narration.mp3"
            with open(narration_path, "wb") as f:
                f.write(response.content)
            print("Loading narration with MoviePy")
            narration = mp.AudioFileClip(narration_path)
            
            # 전체 길이 계산
            narration_duration = narration.duration
            clip_duration = narration_duration / len(request.images)
            print(f"Each clip duration will be: {clip_duration} seconds")
            
        except Exception as e:
            print(f"Error in narration processing: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error processing narration: {str(e)}")

        # 이미지 다운로드 및 클립 생성
        image_clips = []
        try:
            for i, img_url in enumerate(request.images):
                print(f"Downloading image {i}: {img_url}")
                response = requests.get(img_url)
                response.raise_for_status()
                img_path = f"{temp_dir}/image_{i}.png"
                with open(img_path, "wb") as f:
                    f.write(response.content)
                print(f"Loading image {i} with MoviePy")
                
                # 이미지를 9:16 비율로 조정
                original_clip = mp.ImageClip(img_path)
                w, h = original_clip.size
                
                # 목표 비율 계산 (9:16)
                target_ratio = 9/16
                current_ratio = w/h
                
                if current_ratio > target_ratio:  # 너무 넓은 경우
                    new_w = int(h * target_ratio)
                    x_center = (w - new_w) // 2
                    clip = original_clip.crop(x1=x_center, y1=0, x2=x_center+new_w, y2=h)
                else:  # 너무 좁은 경우
                    new_h = int(w / target_ratio)
                    y_center = (h - new_h) // 2
                    clip = original_clip.crop(x1=0, y1=y_center, x2=w, y2=y_center+new_h)
                
                # 효과 적용 (순차적으로)
                effects = ["zoom_in", "pan_right", "zoom_out", "pan_left"]
                effect_type = effects[i % len(effects)]
                print(f"Applying effect {effect_type} to image {i}")
                clip = create_animation_effect(clip, effect_type, clip_duration)
                clip = clip.set_duration(clip_duration)
                
                image_clips.append(clip)
                
        except Exception as e:
            print(f"Error in image processing: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error processing images: {str(e)}")

        try:
            # 배경음악 다운로드
            print(f"Downloading background music: {request.backgroundMusic}")
            response = requests.get(request.backgroundMusic)
            response.raise_for_status()
            bgm_path = f"{temp_dir}/background.mp3"
            with open(bgm_path, "wb") as f:
                f.write(response.content)
            print("Loading background music with MoviePy")
            background_music = mp.AudioFileClip(bgm_path)
            # 배경음악을 내레이션 길이에 맞추고 볼륨을 20%로 낮춤
            background_music = background_music.set_duration(narration_duration).volumex(0.2)
            
        except Exception as e:
            print(f"Error in background music processing: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error processing background music: {str(e)}")

        try:
            # 비디오 클립 생성
            print("Creating video clip")
            video = mp.concatenate_videoclips(image_clips, method="compose")
            print("Video clip created successfully")

            # 자막 추가
            text_clips = []
            for subtitle_idx, subtitle in enumerate(request.subtitles):
                try:
                    subtitle_chunks = split_subtitle(subtitle.text)
                    chunk_duration = (subtitle.end - subtitle.start) / len(subtitle_chunks)
                    
                    for i, chunk in enumerate(subtitle_chunks):
                        chunk_start = subtitle.start + (i * chunk_duration)
                        
                        # 다음 자막 청크의 시작 시간 계산
                        next_start = None
                        if i < len(subtitle_chunks) - 1:
                            # 같은 자막 내의 다음 청크
                            next_start = subtitle.start + ((i + 1) * chunk_duration)
                        elif subtitle_idx < len(request.subtitles) - 1:
                            # 다음 자막의 첫 번째 청크
                            next_subtitle = request.subtitles[subtitle_idx + 1]
                            next_chunks = split_subtitle(next_subtitle.text)
                            if next_chunks:
                                next_start = next_subtitle.start
                        
                        print(f"Creating text clip for chunk: {chunk}")
                        txt_clip = create_styled_text_clip(
                            chunk, 
                            (video.w, video.h),
                            chunk_start,
                            chunk_duration,
                            next_start
                        )
                        
                        text_clips.append(txt_clip)
                        print(f"Text clip created successfully for chunk: {chunk}")
                except Exception as e:
                    print(f"Error creating text clip: {str(e)}")
                    import traceback
                    print(traceback.format_exc())
                    raise

            # 자막을 비디오에 합성
            print("Compositing video with text clips")
            video = mp.CompositeVideoClip([video] + text_clips)
            print("Video composited with text clips successfully")

            # 오디오 합성
            print("Creating final audio")
            final_audio = mp.CompositeAudioClip([narration, background_music])
            video = video.set_audio(final_audio)
            print("Audio added to video successfully")

        except Exception as e:
            print(f"Error in video composition: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error compositing video: {str(e)}")

        try:
            # 최종 비디오 파일 생성
            print("Writing video file")
            output_path = f"{temp_dir}/final_video.mp4"
            video.write_videofile(
                output_path,
                fps=24,
                codec="libx264",
                audio_codec="aac"
            )
            print("Video file written successfully")

            # S3에 업로드
            print("Uploading to S3")
            s3_key = f"{request.projectId}/video/final_video.mp4"
            s3.upload_file(
                output_path,
                os.getenv("AWS_BUCKET_NAME"),
                s3_key,
                ExtraArgs={'ContentType': 'video/mp4'}
            )
            print("Upload to S3 completed")

        except Exception as e:
            print(f"Error in file operations: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error saving/uploading video: {str(e)}")

        # 임시 파일 정리
        try:
            for file in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, file))
            os.rmdir(temp_dir)
        except Exception as e:
            print(f"Warning: Error cleaning up temp files: {str(e)}")

        # S3 URL 반환
        video_url = f"https://{os.getenv('AWS_BUCKET_NAME')}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{s3_key}"
        return {"videoUrl": video_url}

    except Exception as e:
        print(f"Error in generate_video: {str(e)}")
        import traceback
        print(traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)  # 포트를 8000으로 변경 