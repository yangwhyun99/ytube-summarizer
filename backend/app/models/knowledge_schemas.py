"""지식 병합 API 요청/응답 스키마"""

from pydantic import BaseModel, Field


class CreateKnowledgeBaseRequest(BaseModel):
    title: str = Field(..., description="종합본 제목")
    description: str = Field(default="", description="종합본 설명")


class MergeRequest(BaseModel):
    summary_id: str = Field(..., description="병합할 요약 ID")


class MergeReviewAction(BaseModel):
    status: str = Field(..., description="승인(approved) 또는 거부(rejected)")


class KnowledgeSectionResponse(BaseModel):
    id: str
    section_title: str
    section_order: int
    content: str
    source_video_ids: list[str]
    updated_at: str


class KnowledgeBaseListItem(BaseModel):
    id: str
    title: str
    description: str
    section_count: int
    source_count: int
    created_at: str
    updated_at: str


class KnowledgeBaseDetail(BaseModel):
    id: str
    title: str
    description: str
    sections: list[KnowledgeSectionResponse]
    source_summary_ids: list[str]
    created_at: str
    updated_at: str


class DiffItem(BaseModel):
    section_title: str
    action: str  # "update" | "add" | "new_section"
    before: str | None = None  # 기존 내용 (update 시)
    after: str  # 병합 후 내용


class MergeHistoryResponse(BaseModel):
    id: str
    knowledge_base_id: str
    video_summary_id: str
    video_title: str
    changes_diff: list[DiffItem]
    status: str
    created_at: str
