"""
FastAPI 기반의 비디오 생성 서버.
이미지, 오디오, 자막을 결합하여 동영상을 생성하는 API를 제공합니다.
"""

import os
import shutil
from typing import List, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from moviepy import editor as mp
from dotenv import load_dotenv

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

# 정적 파일 제공을 위한 디렉토리 설정
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Next.js public 폴더 경로 설정
NEXTJS_PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")


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


def create_animation_effect(
    clip: mp.VideoClip, effect_type: str, duration: float
) -> mp.VideoClip:
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
            resized = cv2.resize(
                frame, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4
            )

            # 중앙 부분 크롭
            y_start = (new_h - h) // 2
            x_start = (new_w - w) // 2
            cropped = resized[y_start : y_start + h, x_start : x_start + w]

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
            resized = cv2.resize(
                frame, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4
            )

            y_start = (new_h - h) // 2
            x_start = (new_w - w) // 2
            cropped = resized[y_start : y_start + h, x_start : x_start + w]

            return cropped

        return mp.VideoClip(make_frame, duration=duration)

    elif effect_type == "pan_right":
        # 오른쪽으로 패닝 - 새로운 방식
        enlarged_w = int(w * 1.4)  # 40% 더 큰 이미지
        enlarged_frame = cv2.resize(
            clip.get_frame(0), (enlarged_w, h), interpolation=cv2.INTER_LANCZOS4
        )

        def make_frame(t):
            progress = t / duration
            # 부드러운 이동을 위해 easing 함수 적용
            smooth_progress = np.sin(progress * np.pi / 2)  # easing 효과
            x_offset = int((enlarged_w - w) * smooth_progress)
            return enlarged_frame[:, x_offset : x_offset + w]

        return mp.VideoClip(make_frame, duration=duration)

    elif effect_type == "pan_left":
        # 왼쪽으로 패닝 - 새로운 방식
        enlarged_w = int(w * 1.4)  # 40% 더 큰 이미지
        enlarged_frame = cv2.resize(
            clip.get_frame(0), (enlarged_w, h), interpolation=cv2.INTER_LANCZOS4
        )

        def make_frame(t):
            progress = t / duration
            # 부드러운 이동을 위해 easing 함수 적용
            smooth_progress = np.sin(progress * np.pi / 2)  # easing 효과
            x_offset = int((enlarged_w - w) * (1 - smooth_progress))
            return enlarged_frame[:, x_offset : x_offset + w]

        return mp.VideoClip(make_frame, duration=duration)

    return clip.set_duration(duration)


def split_subtitle(text: str) -> List[str]:
    """자막 텍스트를 3단어씩 강제 분할"""
    words = text.split()
    result = []

    # 3단어 이하면 그대로 반환
    if len(words) <= 3:
        return [" ".join(words)]

    # 3단어씩 강제 분할
    for i in range(0, len(words), 3):
        if i + 3 <= len(words):
            # 정확히 3단어로 분할
            chunk = " ".join(words[i : i + 3])
            result.append(chunk)
        else:
            # 마지막 남은 단어들 처리
            remaining = " ".join(words[i:])
            # 마지막 청크가 1단어면 이전 청크에 합치기
            if len(words[i:]) == 1 and result:
                result[-1] = result[-1] + " " + remaining
            else:
                result.append(remaining)

    return result


def capitalize_words(text: str) -> str:
    """모든 단어를 대문자로 시작하도록 변환"""
    return " ".join(word.capitalize() for word in text.split())


def create_styled_text_clip(
    chunk: str,
    video_size: Tuple[int, int],
    start: float,
    duration: float,
    next_start: float = None,
):
    """스타일이 적용된 텍스트 클립 생성"""

    # 모든 단어 대문자로 시작하도록 변환
    chunk = capitalize_words(chunk)

    # 기본 스타일 설정
    base_fontsize = 80  # 폰트 크기 축소
    base_stroke_width = 3  # 외곽선 두께 축소

    def create_text_clip(fontsize: int, is_shadow: bool = False):
        stroke_width = int((fontsize / base_fontsize) * base_stroke_width)
        return mp.TextClip(
            chunk,
            fontsize=fontsize,
            color="white" if not is_shadow else "black",
            font="Liberation-Sans-Bold",
            size=(int(video_size[0] * 0.9), None),  # 너비를 90%로 제한
            method="caption",
            align="center",
            stroke_color="black",
            stroke_width=stroke_width if not is_shadow else 0,
        )

    # 초기 텍스트 클립 생성
    txt_clip = create_text_clip(base_fontsize)

    # 크기 조정 (한 줄로 제한)
    if txt_clip.h > video_size[1] * 0.15:  # 높이 제한을 15%로 변경
        scale_factor = (video_size[1] * 0.15) / txt_clip.h
        new_fontsize = int(base_fontsize * scale_factor)
        txt_clip = create_text_clip(new_fontsize)
        shadow_clips = []
        for i in range(2):
            shadow_clip = create_text_clip(new_fontsize, is_shadow=True)
            shadow_clip = shadow_clip.set_opacity(0.3)
            shadow_clips.append(shadow_clip)
    else:
        shadow_clips = []
        for i in range(2):
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
    for i, clip in enumerate(shadow_clips + [txt_clip]):
        # 그림자 효과를 위한 오프셋 계산
        y_offset = 4 if i < 2 else 0  # 첫 두 클립은 그림자

        # 화면 하단에서 85% 위치에 배치하고 그림자 오프셋 적용
        clip = clip.set_position(("center", video_size[1] * 0.85 + y_offset))
        clip = clip.set_start(start)

        # 스케일 애니메이션 적용
        clip = clip.resize(lambda t: scale_animation(t))
        clips_to_composite.append(clip)

    final_clip = mp.CompositeVideoClip(clips_to_composite, size=video_size)

    # 페이드아웃 시간 및 클립 길이 조정
    fadeout_duration = 0.15  # 페이드아웃 시간
    actual_duration = duration  # 실제 클립 길이

    if next_start is not None:
        time_gap = next_start - start
        if time_gap < duration:  # 겹치는 경우
            actual_duration = time_gap - 0.05  # 겹침 간격 최소화
            fadeout_duration = min(0.15, actual_duration * 0.2)

    # 최종 효과 적용
    return (
        final_clip.set_duration(actual_duration)
        .crossfadein(0.1)
        .crossfadeout(fadeout_duration)
    )


@app.post("/generate-video")
async def generate_video(request: VideoRequest):
    try:
        print("Received request:", request)

        # 임시 디렉토리 생성
        temp_dir = "temp"
        os.makedirs(temp_dir, exist_ok=True)

        # 내레이션 파일 복사
        try:
            print(f"Loading narration: {request.audio}")
            narration_path = os.path.join(NEXTJS_PUBLIC_DIR, request.audio.lstrip("/"))
            temp_narration_path = os.path.join(temp_dir, "narration.mp3")

            # 파일 복사
            shutil.copy2(narration_path, temp_narration_path)

            print("Loading narration with MoviePy")
            narration = mp.AudioFileClip(temp_narration_path)

            # 전체 길이 계산
            narration_duration = narration.duration
            clip_duration = narration_duration / len(request.images)
            print(f"Each clip duration will be: {clip_duration} seconds")

        except Exception as e:
            print(f"Error in narration processing: {str(e)}")
            import traceback

            print(traceback.format_exc())
            raise HTTPException(
                status_code=500, detail=f"Error processing narration: {str(e)}"
            )

        # 이미지 파일 복사 및 클립 생성
        try:
            image_clips = []
            for i, img_path in enumerate(request.images):
                print(f"Loading image {i}: {img_path}")
                src_path = os.path.join(NEXTJS_PUBLIC_DIR, img_path.lstrip("/"))
                dst_path = os.path.join(temp_dir, f"image_{i}.png")

                # 파일 복사
                shutil.copy2(src_path, dst_path)
                print(f"Loading image {i} with MoviePy")

                # 이미지를 9:16 비율로 조정
                original_clip = mp.ImageClip(dst_path)
                w, h = original_clip.size

                # 목표 비율 계산 (9:16)
                target_ratio = 9 / 16
                current_ratio = w / h

                # 새로운 크기 계산
                if current_ratio > target_ratio:  # 너무 넓은 경우
                    new_w = int(h * target_ratio)
                    # 검은색 배경 생성
                    bg_w = new_w
                    bg_h = h
                    x_offset = 0
                    y_offset = 0
                else:  # 너무 좁은 경우
                    new_h = int(w / target_ratio)
                    # 검은색 배경 생성
                    bg_w = w
                    bg_h = new_h
                    x_offset = 0
                    y_offset = (new_h - h) // 2 if new_h > h else 0

                # 검은색 배경 클립 생성
                bg_clip = mp.ColorClip(size=(bg_w, bg_h), color=(0, 0, 0))
                bg_clip = bg_clip.set_duration(clip_duration)

                # 원본 이미지를 배경 중앙에 배치
                clip = original_clip.set_position((x_offset, y_offset))
                clip = mp.CompositeVideoClip([bg_clip, clip])

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
            raise HTTPException(
                status_code=500, detail=f"Error processing images: {str(e)}"
            )

        try:
            # 배경음악 파일 복사
            print(f"Loading background music: {request.backgroundMusic}")
            bgm_src_path = os.path.join(
                NEXTJS_PUBLIC_DIR, request.backgroundMusic.lstrip("/")
            )
            bgm_dst_path = os.path.join(temp_dir, "background.mp3")

            # 파일 복사
            shutil.copy2(bgm_src_path, bgm_dst_path)

            print("Loading background music with MoviePy")
            background_music = mp.AudioFileClip(bgm_dst_path)
            # 배경음악을 내레이션 길이에 맞추고 볼륨을 20%로 낮춤
            background_music = background_music.set_duration(
                narration_duration
            ).volumex(0.2)

        except Exception as e:
            print(f"Error in background music processing: {str(e)}")
            import traceback

            print(traceback.format_exc())
            raise HTTPException(
                status_code=500, detail=f"Error processing background music: {str(e)}"
            )

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
                    chunk_duration = (subtitle.end - subtitle.start) / len(
                        subtitle_chunks
                    )

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
                            next_start,
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
            raise HTTPException(
                status_code=500, detail=f"Error compositing video: {str(e)}"
            )

        try:
            # 최종 비디오 파일 생성
            print("Writing video file")
            output_filename = f"{request.projectId}_final_video.mp4"

            # Next.js public 디렉토리 내의 outputs 폴더에 저장
            output_dir = os.path.join(
                NEXTJS_PUBLIC_DIR, "outputs", request.projectId, "video"
            )
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, output_filename)

            video.write_videofile(
                output_path, fps=24, codec="libx264", audio_codec="aac"
            )
            print("Video file written successfully")

            # URL 경로 생성 (public 폴더 기준)
            video_url = f"/outputs/{request.projectId}/video/{output_filename}"
            print(f"Video saved at: {video_url}")

        except Exception as e:
            print(f"Error in file operations: {str(e)}")
            import traceback

            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error saving video: {str(e)}")

        # 임시 파일 정리
        try:
            for file in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, file))
            os.rmdir(temp_dir)
        except Exception as e:
            print(f"Warning: Error cleaning up temp files: {str(e)}")

        return {"videoUrl": video_url}

    except Exception as e:
        print(f"Error in generate_video: {str(e)}")
        import traceback

        print(traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
