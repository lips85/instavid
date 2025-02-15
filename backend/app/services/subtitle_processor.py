from moviepy import editor as mp
from ..core.config import (
    SUBTITLE_BASE_FONTSIZE,
    SUBTITLE_BASE_STROKE_WIDTH,
    SUBTITLE_FONT,
)


def create_styled_text_clip(
    chunk: str,
    video_size: tuple,
    start_time: float,
    duration: float,
):
    """스타일이 적용된 텍스트 클립 생성"""
    # 모든 단어 대문자로 시작하도록 변환
    chunk = capitalize_words(chunk)

    # 초기 텍스트 클립 생성
    txt_clip = create_text_clip(chunk, video_size, SUBTITLE_BASE_FONTSIZE)

    # 크기 조정 (한 줄로 제한)
    if txt_clip.h > video_size[1] * 0.2:  # 높이 제한을 20%로 변경
        scale_factor = (video_size[1] * 0.2) / txt_clip.h
        new_fontsize = int(SUBTITLE_BASE_FONTSIZE * scale_factor)
        txt_clip = create_text_clip(chunk, video_size, new_fontsize)
        shadow_clips = create_shadow_clips(chunk, video_size, new_fontsize)
    else:
        shadow_clips = create_shadow_clips(chunk, video_size, SUBTITLE_BASE_FONTSIZE)

    # 부드러운 등장/퇴장을 위한 페이드 지속 시간
    fade_duration = min(0.3, duration * 0.25)

    # 클립 합성
    clips_to_composite = []
    for i, clip in enumerate(shadow_clips + [txt_clip]):
        y_offset = 4 if i < 2 else 0
        clip = position_and_time_clip(
            clip, video_size, start_time, duration, y_offset, fade_duration
        )
        clips_to_composite.append(clip)

    return mp.CompositeVideoClip(clips_to_composite, size=video_size)


def create_text_clip(
    text: str, video_size: tuple, fontsize: int, is_shadow: bool = False
):
    """텍스트 클립 생성"""
    stroke_width = int((fontsize / SUBTITLE_BASE_FONTSIZE) * SUBTITLE_BASE_STROKE_WIDTH)
    return mp.TextClip(
        text,
        fontsize=fontsize,
        color="white" if not is_shadow else "black",
        font=SUBTITLE_FONT,
        size=(int(video_size[0] * 0.85), None),
        method="caption",
        align="center",
        stroke_color="black",
        stroke_width=stroke_width if not is_shadow else 0,
    )


def create_shadow_clips(text: str, video_size: tuple, fontsize: int):
    """그림자 효과를 위한 클립 생성"""
    shadow_clips = []
    for _ in range(2):
        shadow_clip = create_text_clip(text, video_size, fontsize, is_shadow=True)
        shadow_clip = shadow_clip.set_opacity(0.4)
        shadow_clips.append(shadow_clip)
    return shadow_clips


def position_and_time_clip(
    clip,
    video_size: tuple,
    start_time: float,
    duration: float,
    y_offset: int,
    fade_duration: float,
):
    """클립의 위치와 시간 설정"""
    clip = clip.set_position(("center", video_size[1] * 0.8 + y_offset))
    clip = clip.set_start(start_time)
    clip = clip.set_duration(duration)

    if duration >= 0.6:  # 충분한 길이일 때만 페이드 적용
        clip = clip.crossfadein(fade_duration)
        clip = clip.crossfadeout(fade_duration)

    return clip


def capitalize_words(text: str) -> str:
    """모든 단어를 대문자로 시작하도록 변환"""
    return " ".join(word.capitalize() for word in text.split())


def split_subtitle(text: str) -> list:
    """자막 텍스트를 매 3단어씩 분할"""
    words = text.split()
    chunks = []
    for i in range(0, len(words), 3):
        chunk = words[i : i + 3]
        chunks.append(" ".join(chunk))
    return chunks
