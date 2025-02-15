import os
import shutil
from moviepy import editor as mp
import cv2
import numpy as np

from ..core.config import NEXTJS_PUBLIC_DIR, VIDEO_FPS
from .subtitle_processor import create_styled_text_clip, split_subtitle

# Metal 가속 설정
os.environ["OPENCV_OPENCL_RUNTIME"] = "opencl"
os.environ["OPENCV_OPENCL_DEVICE"] = ":GPU:0"
cv2.ocl.setUseOpenCL(True)


class VideoGenerator:
    def __init__(self, request, temp_dir="temp"):
        self.request = request
        self.temp_dir = temp_dir
        os.makedirs(temp_dir, exist_ok=True)

    def generate(self):
        """비디오 생성 프로세스 실행"""
        try:
            # 내레이션 처리
            narration = self._process_narration()
            narration_duration = narration.duration
            clip_duration = narration_duration / len(self.request.images)

            # 이미지 처리
            image_clips = self._process_images(clip_duration)
            if not image_clips:
                raise ValueError("No valid image clips were generated")

            # 비디오 생성
            video = mp.concatenate_videoclips(image_clips, method="compose")

            # 자막 처리
            text_clips = self._process_subtitles(video)

            # 최종 비디오 합성
            final_video = self._compose_final_video(
                video, text_clips, narration, narration_duration
            )

            # 비디오 저장
            return self._save_video(final_video)

        except Exception as e:
            print(f"Error in video generation: {str(e)}")
            self._cleanup()
            raise

    def _process_narration(self):
        """내레이션 오디오 처리"""
        try:
            narration_path = os.path.join(
                NEXTJS_PUBLIC_DIR, self.request.audio.lstrip("/")
            )
            if not os.path.exists(narration_path):
                raise FileNotFoundError(f"Narration file not found: {narration_path}")

            temp_narration_path = os.path.join(self.temp_dir, "narration.mp3")
            shutil.copy2(narration_path, temp_narration_path)
            return mp.AudioFileClip(temp_narration_path)
        except Exception as e:
            raise ValueError(f"Failed to process narration: {str(e)}")

    def _process_images(self, clip_duration):
        """이미지 병렬 처리"""
        try:
            image_clips = []
            for i, img_path in enumerate(self.request.images):
                print(f"Processing image {i}: {img_path}")
                src_path = os.path.join(NEXTJS_PUBLIC_DIR, img_path.lstrip("/"))
                if not os.path.exists(src_path):
                    print(f"Warning: Image file not found: {src_path}")
                    continue

                # 이미지 로드 및 GPU 메모리로 전송
                img = cv2.imread(src_path)
                if img is None:
                    print(f"Warning: Failed to load image: {src_path}")
                    continue

                try:
                    img_gpu = cv2.UMat(img)
                except Exception as e:
                    print(
                        f"Warning: GPU acceleration failed, falling back to CPU: {str(e)}"
                    )
                    img_gpu = img

                # 9:16 비율로 조정
                clip = self._create_video_clip(img_gpu, clip_duration)
                if clip is None:
                    continue

                # 효과 적용
                effects = ["zoom_in", "pan_right", "zoom_out", "pan_left"]
                effect_type = effects[i % len(effects)]
                clip = self._apply_effect(clip, effect_type, clip_duration)

                image_clips.append(clip)

            return image_clips
        except Exception as e:
            raise ValueError(f"Failed to process images: {str(e)}")

    def _create_video_clip(self, img_gpu, duration):
        """9:16 비율의 비디오 클립 생성"""
        try:
            h, w = (
                img_gpu.get().shape[:2]
                if isinstance(img_gpu, cv2.UMat)
                else img_gpu.shape[:2]
            )
            target_ratio = 9 / 16
            current_ratio = w / h

            if current_ratio > target_ratio:
                new_w = int(h * target_ratio)
                bg_w = new_w
                bg_h = h
                x_offset = 0
                y_offset = 0
            else:
                new_h = int(w / target_ratio)
                bg_w = w
                bg_h = new_h
                x_offset = 0
                y_offset = (new_h - h) // 2 if new_h > h else 0

            # GPU에서 이미지 처리
            try:
                if isinstance(img_gpu, cv2.UMat):
                    result = img_gpu.get()
                else:
                    result = img_gpu
            except Exception as e:
                print(f"Warning: GPU processing failed: {str(e)}")
                result = img_gpu

            # MoviePy 클립 생성
            clip = mp.ImageClip(result)
            bg_clip = mp.ColorClip(size=(bg_w, bg_h), color=(0, 0, 0))

            # 클립 합성
            clip = clip.set_position((x_offset, y_offset))
            final_clip = mp.CompositeVideoClip([bg_clip, clip])
            return final_clip.set_duration(duration)

        except Exception as e:
            print(f"Error creating video clip: {str(e)}")
            return None

    def _apply_effect(self, clip, effect_type, duration):
        """최적화된 효과 적용"""
        w, h = clip.size

        if effect_type in ["zoom_in", "zoom_out"]:
            # 미리 스케일 값 계산
            scales = []
            for t in np.linspace(0, duration, int(duration * 24)):
                progress = t / duration
                if effect_type == "zoom_in":
                    scale = 1.0 + (0.3 * progress)
                else:
                    scale = 1.3 - (0.3 * progress)
                scales.append(scale)

            frames = []
            frame = clip.get_frame(0)
            frame_gpu = cv2.UMat(frame)

            for scale in scales:
                new_h = int(h * scale)
                new_w = int(w * scale)
                try:
                    resized = cv2.resize(
                        frame_gpu, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4
                    )
                    result = resized.get()
                except Exception as e:
                    print(f"Warning: GPU resize failed: {str(e)}")
                    result = cv2.resize(
                        frame, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4
                    )

                y_start = (new_h - h) // 2
                x_start = (new_w - w) // 2
                cropped = result[y_start : y_start + h, x_start : x_start + w]
                frames.append(cropped)

            def make_frame(t):
                frame_idx = min(int(t * 24), len(frames) - 1)
                return frames[frame_idx]

            return mp.VideoClip(make_frame, duration=duration)

        elif effect_type in ["pan_right", "pan_left"]:
            enlarged_w = int(w * 1.4)
            frame = clip.get_frame(0)
            try:
                frame_gpu = cv2.UMat(frame)
                enlarged_frame = cv2.resize(
                    frame_gpu, (enlarged_w, h), interpolation=cv2.INTER_LANCZOS4
                )
                enlarged_frame = enlarged_frame.get()
            except Exception as e:
                print(f"Warning: GPU processing failed: {str(e)}")
                enlarged_frame = cv2.resize(
                    frame, (enlarged_w, h), interpolation=cv2.INTER_LANCZOS4
                )

            def make_frame(t):
                progress = t / duration
                smooth_progress = np.sin(progress * np.pi / 2)
                if effect_type == "pan_right":
                    x_offset = int((enlarged_w - w) * smooth_progress)
                else:
                    x_offset = int((enlarged_w - w) * (1 - smooth_progress))
                return enlarged_frame[:, x_offset : x_offset + w]

            return mp.VideoClip(make_frame, duration=duration)

        return clip.set_duration(duration)

    def _process_subtitles(self, video):
        """자막 처리"""
        try:
            text_clips = []
            for subtitle in self.request.subtitles:
                chunks = split_subtitle(subtitle.text)
                chunk_duration = (subtitle.end - subtitle.start) / len(chunks)

                for i, chunk in enumerate(chunks):
                    start_time = subtitle.start + (i * chunk_duration)
                    try:
                        txt_clip = create_styled_text_clip(
                            chunk, (video.w, video.h), start_time, chunk_duration
                        )
                        if txt_clip is not None:
                            text_clips.append(txt_clip)
                    except Exception as e:
                        print(f"Error creating subtitle clip: {str(e)}")
                        continue

            return text_clips
        except Exception as e:
            print(f"Warning: Failed to process some subtitles: {str(e)}")
            return []

    def _compose_final_video(self, video, text_clips, narration, narration_duration):
        """최종 비디오 합성"""
        try:
            final_video = mp.CompositeVideoClip([video] + text_clips)

            # 배경음악 처리
            bgm_path = os.path.join(
                NEXTJS_PUBLIC_DIR, self.request.backgroundMusic.lstrip("/")
            )
            if not os.path.exists(bgm_path):
                print("Warning: Background music file not found")
                return final_video.set_audio(narration)

            try:
                background_music = (
                    mp.AudioFileClip(bgm_path)
                    .set_duration(narration_duration)
                    .volumex(0.2)
                )
                final_audio = mp.CompositeAudioClip([narration, background_music])
                return final_video.set_audio(final_audio)
            except Exception as e:
                print(f"Warning: Failed to process background music: {str(e)}")
                return final_video.set_audio(narration)

        except Exception as e:
            raise ValueError(f"Failed to compose final video: {str(e)}")

    def _save_video(self, final_video):
        """비디오 파일 저장"""
        try:
            output_filename = f"{self.request.projectId}_final_video.mp4"
            output_dir = os.path.join(
                NEXTJS_PUBLIC_DIR, "outputs", self.request.projectId, "video"
            )
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, output_filename)

            final_video.write_videofile(
                output_path,
                fps=VIDEO_FPS,
                codec="h264_videotoolbox",
                audio_codec="aac",
                preset="faster",
                threads=8,
            )

            return {
                "videoUrl": f"/outputs/{self.request.projectId}/video/{output_filename}"
            }
        except Exception as e:
            raise ValueError(f"Failed to save video: {str(e)}")

    def _cleanup(self):
        """임시 파일 정리"""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            print(f"Warning: Failed to cleanup temporary files: {str(e)}")
