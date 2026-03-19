"""요약 DB 모델"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    video_url: Mapped[str] = mapped_column(String(500))
    video_id: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(500))
    sections: Mapped[dict] = mapped_column(JSON)  # list[SectionResponse]
    full_text: Mapped[str] = mapped_column(Text)
    engine_used: Mapped[str] = mapped_column(String(20))
    detail_level: Mapped[str] = mapped_column(String(20))
    language: Mapped[str] = mapped_column(String(10))
    video_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    keyframe_count: Mapped[int] = mapped_column(Integer, default=0)
    transcript_language: Mapped[str] = mapped_column(String(10), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
