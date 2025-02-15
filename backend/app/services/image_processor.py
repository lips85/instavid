import cv2
from moviepy import editor as mp

from ..core.config import VIDEO_WIDTH, VIDEO_HEIGHT
from ..utils.gpu import to_gpu_mat, from_gpu_mat, try_gpu_operation


def resize_with_padding_optimized(img_gpu, target_w=VIDEO_WIDTH, target_h=VIDEO_HEIGHT):
    """최적화된 리사이징 함수"""
    img_cpu = from_gpu_mat(img_gpu)
    h, w = img_cpu.shape[:2]
    aspect_ratio = w / h
    target_ratio = target_w / target_h

    if aspect_ratio > target_ratio:
        new_w = target_w
        new_h = int(target_w / aspect_ratio)
    else:
        new_h = target_h
        new_w = int(target_h * aspect_ratio)

    def gpu_resize():
        resized = cv2.resize(img_gpu, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        return from_gpu_mat(resized)

    def cpu_resize():
        return cv2.resize(img_cpu, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    resized_cpu = try_gpu_operation(gpu_resize, cpu_resize)

    # MoviePy 클립으로 변환
    resized_clip = mp.ImageClip(resized_cpu)
    bg_clip = mp.ColorClip(size=(target_w, target_h), color=(0, 0, 0))

    x_center = (target_w - new_w) // 2
    y_center = (target_h - new_h) // 2

    return bg_clip, resized_clip, (x_center, y_center)


def process_single_image(img_data):
    """단일 이미지 처리를 위한 함수"""
    i, img_path, clip_duration, temp_dir = img_data

    print(f"Processing image {i}: {img_path}")

    # 이미지 로드
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f"Failed to load image: {img_path}")

    # GPU 메모리로 전송
    img_gpu = to_gpu_mat(img)

    # 리사이징 및 패딩
    bg_clip, resized_clip, (x_offset, y_offset) = resize_with_padding_optimized(img_gpu)

    # 클립 생성
    bg_clip = bg_clip.set_duration(clip_duration)
    clip = mp.CompositeVideoClip(
        [bg_clip, resized_clip.set_position((x_offset, y_offset))]
    )

    return clip
