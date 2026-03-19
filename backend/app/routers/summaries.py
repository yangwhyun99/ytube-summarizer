"""저장된 요약 관리 API (목록, 상세, 삭제)"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.summary import Summary
from app.models.schemas import SummarizeResponse, SectionResponse

router = APIRouter(prefix="/api/summaries", tags=["summaries"])


@router.get("")
async def list_summaries(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """저장된 요약 목록 조회"""
    result = await db.execute(
        select(Summary)
        .order_by(desc(Summary.created_at))
        .offset(skip)
        .limit(limit)
    )
    summaries = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "video_url": s.video_url,
            "video_id": s.video_id,
            "engine_used": s.engine_used,
            "detail_level": s.detail_level,
            "language": s.language,
            "created_at": s.created_at.isoformat(),
        }
        for s in summaries
    ]


@router.get("/{summary_id}")
async def get_summary(
    summary_id: str,
    db: AsyncSession = Depends(get_db),
):
    """저장된 요약 상세 조회"""
    result = await db.execute(select(Summary).where(Summary.id == summary_id))
    summary = result.scalar_one_or_none()

    if not summary:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")

    return {
        "id": summary.id,
        "video_url": summary.video_url,
        "video_id": summary.video_id,
        "title": summary.title,
        "sections": summary.sections,
        "full_text": summary.full_text,
        "engine_used": summary.engine_used,
        "detail_level": summary.detail_level,
        "language": summary.language,
        "video_duration": summary.video_duration,
        "keyframe_count": summary.keyframe_count,
        "transcript_language": summary.transcript_language,
        "created_at": summary.created_at.isoformat(),
    }


@router.delete("/{summary_id}")
async def delete_summary(
    summary_id: str,
    db: AsyncSession = Depends(get_db),
):
    """저장된 요약 삭제"""
    result = await db.execute(select(Summary).where(Summary.id == summary_id))
    summary = result.scalar_one_or_none()

    if not summary:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")

    await db.delete(summary)
    await db.commit()
    return {"message": "삭제되었습니다."}
