import cv2
from moviepy import editor as mp
import numpy as np

from ..utils.gpu import to_gpu_mat, from_gpu_mat, try_gpu_operation


def create_animation_effect_optimized(clip, effect_type, duration):
    """최적화된 애니메이션 효과 함수"""
    w, h = clip.size

    if effect_type == "zoom_in" or effect_type == "zoom_out":
        return create_zoom_effect(clip, effect_type, duration, w, h)
    elif effect_type in ["pan_right", "pan_left"]:
        return create_pan_effect(clip, effect_type, duration, w, h)

    return clip.set_duration(duration)


def create_zoom_effect(clip, effect_type, duration, w, h):
    """줌 효과 생성"""
    # 미리 스케일 값 계산
    scales = calculate_zoom_scales(effect_type, duration)

    # 첫 프레임을 GPU로 전송
    frame = clip.get_frame(0)
    frame_gpu = to_gpu_mat(frame)

    frames = []
    for scale in scales:
        new_h = int(h * scale)
        new_w = int(w * scale)

        def gpu_resize():
            resized = cv2.resize(
                frame_gpu, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4
            )
            return from_gpu_mat(resized)

        def cpu_resize():
            return cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

        result = try_gpu_operation(gpu_resize, cpu_resize)

        y_start = (new_h - h) // 2
        x_start = (new_w - w) // 2
        cropped = result[y_start : y_start + h, x_start : x_start + w]
        frames.append(cropped)

    def make_frame(t):
        frame_idx = min(int(t * 24), len(frames) - 1)
        return frames[frame_idx]

    return mp.VideoClip(make_frame, duration=duration)


def create_pan_effect(clip, effect_type, duration, w, h):
    """패닝 효과 생성"""
    enlarged_w = int(w * 1.4)
    frame = clip.get_frame(0)
    frame_gpu = to_gpu_mat(frame)

    def gpu_resize():
        resized = cv2.resize(
            frame_gpu, (enlarged_w, h), interpolation=cv2.INTER_LANCZOS4
        )
        return from_gpu_mat(resized)

    def cpu_resize():
        return cv2.resize(frame, (enlarged_w, h), interpolation=cv2.INTER_LANCZOS4)

    enlarged_frame = try_gpu_operation(gpu_resize, cpu_resize)

    # 미리 오프셋 계산
    offsets = calculate_pan_offsets(effect_type, duration, enlarged_w, w)
    frames = [enlarged_frame[:, offset : offset + w] for offset in offsets]

    def make_frame(t):
        frame_idx = min(int(t * 24), len(frames) - 1)
        return frames[frame_idx]

    return mp.VideoClip(make_frame, duration=duration)


def calculate_zoom_scales(effect_type, duration):
    """줌 효과의 스케일 값 계산"""
    if effect_type == "zoom_in":
        return [
            1.0 + (0.3 * t / duration)
            for t in np.linspace(0, duration, int(duration * 24))
        ]
    else:  # zoom_out
        return [
            1.3 - (0.3 * t / duration)
            for t in np.linspace(0, duration, int(duration * 24))
        ]


def calculate_pan_offsets(effect_type, duration, enlarged_w, w):
    """패닝 효과의 오프셋 값 계산"""
    offsets = []
    for t in np.linspace(0, duration, int(duration * 24)):
        progress = t / duration
        smooth_progress = np.sin(progress * np.pi / 2)
        if effect_type == "pan_right":
            x_offset = int((enlarged_w - w) * smooth_progress)
        else:
            x_offset = int((enlarged_w - w) * (1 - smooth_progress))
        offsets.append(x_offset)
    return offsets
