"""저장된 요약 관리 API (목록, 상세, 삭제, 태그, 검색, 공유)"""

import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.summary import Summary

router = APIRouter(prefix="/api/summaries", tags=["summaries"])


@router.get("")
async def list_summaries(
    skip: int = 0,
    limit: int = 20,
    tag: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """저장된 요약 목록 조회 (태그 필터 지원)"""
    query = select(Summary).order_by(desc(Summary.created_at))

    result = await db.execute(query.offset(skip).limit(limit))
    summaries = result.scalars().all()

    # 태그 필터 (JSON 배열 내 검색 — SQLite는 JSON 함수 제한적이므로 Python에서 필터)
    if tag:
        summaries = [s for s in summaries if tag in (s.tags or [])]

    return [
        {
            "id": s.id,
            "title": s.title,
            "video_url": s.video_url,
            "video_id": s.video_id,
            "engine_used": s.engine_used,
            "detail_level": s.detail_level,
            "language": s.language,
            "tags": s.tags or [],
            "created_at": s.created_at.isoformat(),
        }
        for s in summaries
    ]


@router.get("/search")
async def search_summaries(
    q: str = Query(..., min_length=1, description="검색 키워드"),
    db: AsyncSession = Depends(get_db),
):
    """요약 전체 검색 (제목 + 본문)"""
    pattern = f"%{q}%"
    result = await db.execute(
        select(Summary)
        .where(
            or_(
                Summary.title.ilike(pattern),
                Summary.full_text.ilike(pattern),
            )
        )
        .order_by(desc(Summary.created_at))
        .limit(50)
    )
    summaries = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "video_url": s.video_url,
            "video_id": s.video_id,
            "engine_used": s.engine_used,
            "tags": s.tags or [],
            "created_at": s.created_at.isoformat(),
        }
        for s in summaries
    ]


@router.get("/tags")
async def list_all_tags(
    db: AsyncSession = Depends(get_db),
):
    """모든 태그 목록 (중복 제거)"""
    result = await db.execute(select(Summary))
    summaries = result.scalars().all()
    tag_set: set[str] = set()
    for s in summaries:
        for t in (s.tags or []):
            tag_set.add(t)
    return sorted(tag_set)


@router.get("/shared/{share_id}")
async def get_shared_summary(
    share_id: str,
    db: AsyncSession = Depends(get_db),
):
    """공유 링크로 요약 조회"""
    result = await db.execute(
        select(Summary).where(Summary.share_id == share_id)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="공유된 요약을 찾을 수 없습니다.")

    return {
        "id": summary.id,
        "title": summary.title,
        "sections": summary.sections,
        "full_text": summary.full_text,
        "engine_used": summary.engine_used,
        "video_duration": summary.video_duration,
        "keyframe_count": summary.keyframe_count,
        "tags": summary.tags or [],
        "created_at": summary.created_at.isoformat(),
    }


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
        "tags": summary.tags or [],
        "share_id": summary.share_id,
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


@router.patch("/{summary_id}/tags")
async def update_tags(
    summary_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """요약 태그 수정"""
    result = await db.execute(select(Summary).where(Summary.id == summary_id))
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")

    tags = body.get("tags", [])
    if not isinstance(tags, list):
        raise HTTPException(status_code=400, detail="tags는 배열이어야 합니다.")

    summary.tags = tags
    await db.commit()
    return {"tags": summary.tags}


@router.post("/{summary_id}/share")
async def create_share_link(
    summary_id: str,
    db: AsyncSession = Depends(get_db),
):
    """공유 링크 생성"""
    result = await db.execute(select(Summary).where(Summary.id == summary_id))
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")

    if not summary.share_id:
        summary.share_id = secrets.token_urlsafe(8)
        await db.commit()

    return {"share_id": summary.share_id}


@router.delete("/{summary_id}/share")
async def delete_share_link(
    summary_id: str,
    db: AsyncSession = Depends(get_db),
):
    """공유 링크 삭제"""
    result = await db.execute(select(Summary).where(Summary.id == summary_id))
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")

    summary.share_id = None
    await db.commit()
    return {"message": "공유가 해제되었습니다."}
