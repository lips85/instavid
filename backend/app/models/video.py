from typing import List
from pydantic import BaseModel


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
