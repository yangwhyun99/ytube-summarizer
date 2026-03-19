"""지식 병합 DB 모델 (종합본, 섹션, 병합 이력)"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class KnowledgeBase(Base):
    """종합본 (예: 'Claude Code 종합 가이드')"""
    __tablename__ = "knowledge_bases"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text, default="")
    source_summary_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    sections: Mapped[list["KnowledgeSection"]] = relationship(
        back_populates="knowledge_base",
        cascade="all, delete-orphan",
        order_by="KnowledgeSection.section_order",
    )
    merge_histories: Mapped[list["MergeHistory"]] = relationship(
        back_populates="knowledge_base",
        cascade="all, delete-orphan",
    )


class KnowledgeSection(Base):
    """종합본의 개별 섹션"""
    __tablename__ = "knowledge_sections"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    knowledge_base_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("knowledge_bases.id"), index=True
    )
    section_title: Mapped[str] = mapped_column(String(500))
    section_order: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text, default="")
    source_video_ids: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    knowledge_base: Mapped["KnowledgeBase"] = relationship(
        back_populates="sections"
    )


class MergeHistory(Base):
    """병합 이력 (diff 리뷰용)"""
    __tablename__ = "merge_histories"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    knowledge_base_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("knowledge_bases.id"), index=True
    )
    video_summary_id: Mapped[str] = mapped_column(String(36), index=True)
    video_title: Mapped[str] = mapped_column(String(500), default="")
    changes_diff: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(
        String(20), default="pending"  # pending / approved / rejected
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    knowledge_base: Mapped["KnowledgeBase"] = relationship(
        back_populates="merge_histories"
    )
