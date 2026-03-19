"""API 요청/응답 스키마"""

from pydantic import BaseModel, Field


class SummarizeRequest(BaseModel):
    url: str = Field(..., description="YouTube 영상 URL")
    engine: str = Field(default="gemini", description="AI 엔진 (gemini 또는 claude)")
    detail_level: str = Field(default="detailed", description="요약 상세도 (brief 또는 detailed)")
    language: str = Field(default="ko", description="요약 언어 (ko 또는 en)")


class SectionResponse(BaseModel):
    title: str
    content: str
    timestamp_start: float | None = None
    timestamp_end: float | None = None


class SummarizeResponse(BaseModel):
    id: str = ""
    title: str
    sections: list[SectionResponse]
    full_text: str
    engine_used: str
    detail_level: str
    language: str
    video_duration: float | None = None
    keyframe_count: int = 0
    transcript_language: str = ""


class HealthResponse(BaseModel):
    status: str


class ErrorResponse(BaseModel):
    detail: str
