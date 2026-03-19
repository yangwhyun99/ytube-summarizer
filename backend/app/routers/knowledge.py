"""지식 병합 API 라우터 (종합본 CRUD + 병합 워크플로우)"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.knowledge import KnowledgeBase, KnowledgeSection, MergeHistory
from app.models.summary import Summary
from app.models.knowledge_schemas import (
    CreateKnowledgeBaseRequest,
    MergeRequest,
    MergeReviewAction,
)
from app.services.knowledge_merge import generate_merge_diffs

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


# ─── 종합본 CRUD ───


@router.post("")
async def create_knowledge_base(
    request: CreateKnowledgeBaseRequest,
    db: AsyncSession = Depends(get_db),
):
    """새 종합본 생성"""
    kb = KnowledgeBase(title=request.title, description=request.description)
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return {
        "id": kb.id,
        "title": kb.title,
        "description": kb.description,
        "created_at": kb.created_at.isoformat(),
    }


@router.get("")
async def list_knowledge_bases(
    db: AsyncSession = Depends(get_db),
):
    """종합본 목록 조회"""
    result = await db.execute(
        select(KnowledgeBase)
        .options(selectinload(KnowledgeBase.sections))
        .order_by(desc(KnowledgeBase.updated_at))
    )
    bases = result.scalars().all()
    return [
        {
            "id": kb.id,
            "title": kb.title,
            "description": kb.description,
            "section_count": len(kb.sections),
            "source_count": len(kb.source_summary_ids),
            "created_at": kb.created_at.isoformat(),
            "updated_at": kb.updated_at.isoformat(),
        }
        for kb in bases
    ]


@router.get("/{kb_id}")
async def get_knowledge_base(
    kb_id: str,
    db: AsyncSession = Depends(get_db),
):
    """종합본 상세 조회 (섹션 포함)"""
    result = await db.execute(
        select(KnowledgeBase)
        .options(selectinload(KnowledgeBase.sections))
        .where(KnowledgeBase.id == kb_id)
    )
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="종합본을 찾을 수 없습니다.")

    return {
        "id": kb.id,
        "title": kb.title,
        "description": kb.description,
        "sections": [
            {
                "id": s.id,
                "section_title": s.section_title,
                "section_order": s.section_order,
                "content": s.content,
                "source_video_ids": s.source_video_ids,
                "updated_at": s.updated_at.isoformat(),
            }
            for s in kb.sections
        ],
        "source_summary_ids": kb.source_summary_ids,
        "created_at": kb.created_at.isoformat(),
        "updated_at": kb.updated_at.isoformat(),
    }


@router.delete("/{kb_id}")
async def delete_knowledge_base(
    kb_id: str,
    db: AsyncSession = Depends(get_db),
):
    """종합본 삭제"""
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == kb_id)
    )
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="종합본을 찾을 수 없습니다.")

    await db.delete(kb)
    await db.commit()
    return {"message": "삭제되었습니다."}


# ─── 병합 워크플로우 ───


@router.post("/{kb_id}/merge")
async def start_merge(
    kb_id: str,
    request: MergeRequest,
    db: AsyncSession = Depends(get_db),
):
    """요약을 종합본에 병합 (diff 생성 → pending 상태로 저장)"""
    # 종합본 조회
    kb_result = await db.execute(
        select(KnowledgeBase)
        .options(selectinload(KnowledgeBase.sections))
        .where(KnowledgeBase.id == kb_id)
    )
    kb = kb_result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="종합본을 찾을 수 없습니다.")

    # 요약 조회
    summary_result = await db.execute(
        select(Summary).where(Summary.id == request.summary_id)
    )
    summary = summary_result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")

    # 이미 병합된 요약인지 확인
    if summary.id in kb.source_summary_ids:
        raise HTTPException(status_code=400, detail="이미 병합된 요약입니다.")

    # 기존 섹션 정보
    existing_sections = [
        {"section_title": s.section_title, "content": s.content}
        for s in kb.sections
    ]

    # AI로 diff 생성
    try:
        diffs = await generate_merge_diffs(
            existing_sections=existing_sections,
            new_summary_sections=summary.sections,
            video_title=summary.title,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"병합 분석 실패: {e}")

    # MergeHistory 저장 (pending)
    changes_diff = [
        {
            "section_title": d.section_title,
            "action": d.action,
            "before": d.before,
            "after": d.after,
        }
        for d in diffs
    ]

    merge_history = MergeHistory(
        knowledge_base_id=kb.id,
        video_summary_id=summary.id,
        video_title=summary.title,
        changes_diff=changes_diff,
        status="pending",
    )
    db.add(merge_history)
    await db.commit()
    await db.refresh(merge_history)

    return {
        "id": merge_history.id,
        "knowledge_base_id": kb.id,
        "video_summary_id": summary.id,
        "video_title": summary.title,
        "changes_diff": changes_diff,
        "status": "pending",
        "created_at": merge_history.created_at.isoformat(),
    }


@router.get("/{kb_id}/merges")
async def list_merge_histories(
    kb_id: str,
    db: AsyncSession = Depends(get_db),
):
    """병합 이력 목록"""
    result = await db.execute(
        select(MergeHistory)
        .where(MergeHistory.knowledge_base_id == kb_id)
        .order_by(desc(MergeHistory.created_at))
    )
    histories = result.scalars().all()
    return [
        {
            "id": h.id,
            "knowledge_base_id": h.knowledge_base_id,
            "video_summary_id": h.video_summary_id,
            "video_title": h.video_title,
            "changes_diff": h.changes_diff,
            "status": h.status,
            "created_at": h.created_at.isoformat(),
        }
        for h in histories
    ]


@router.post("/{kb_id}/merges/{merge_id}/review")
async def review_merge(
    kb_id: str,
    merge_id: str,
    action: MergeReviewAction,
    db: AsyncSession = Depends(get_db),
):
    """병합 승인 또는 거부"""
    if action.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status는 approved 또는 rejected여야 합니다.")

    # MergeHistory 조회
    result = await db.execute(
        select(MergeHistory).where(
            MergeHistory.id == merge_id,
            MergeHistory.knowledge_base_id == kb_id,
        )
    )
    merge = result.scalar_one_or_none()
    if not merge:
        raise HTTPException(status_code=404, detail="병합 이력을 찾을 수 없습니다.")

    if merge.status != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 병합입니다.")

    if action.status == "rejected":
        merge.status = "rejected"
        await db.commit()
        return {"message": "병합이 거부되었습니다.", "status": "rejected"}

    # 승인: 실제 종합본에 변경사항 적용
    kb_result = await db.execute(
        select(KnowledgeBase)
        .options(selectinload(KnowledgeBase.sections))
        .where(KnowledgeBase.id == kb_id)
    )
    kb = kb_result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="종합본을 찾을 수 없습니다.")

    # 섹션 맵 생성
    section_map = {s.section_title: s for s in kb.sections}
    max_order = max((s.section_order for s in kb.sections), default=-1)

    for diff in merge.changes_diff:
        section_title = diff["section_title"]
        if diff["action"] == "update" and section_title in section_map:
            # 기존 섹션 업데이트
            section = section_map[section_title]
            section.content = diff["after"]
            section.updated_at = datetime.now(timezone.utc)
            # 출처 영상 추가
            video_ids = list(section.source_video_ids)
            summary_result = await db.execute(
                select(Summary).where(Summary.id == merge.video_summary_id)
            )
            summary = summary_result.scalar_one_or_none()
            if summary and summary.video_id not in video_ids:
                video_ids.append(summary.video_id)
                section.source_video_ids = video_ids
        elif diff["action"] == "new_section":
            # 새 섹션 추가
            max_order += 1
            summary_result = await db.execute(
                select(Summary).where(Summary.id == merge.video_summary_id)
            )
            summary = summary_result.scalar_one_or_none()
            video_id = summary.video_id if summary else ""

            new_section = KnowledgeSection(
                knowledge_base_id=kb.id,
                section_title=section_title,
                section_order=max_order,
                content=diff["after"],
                source_video_ids=[video_id] if video_id else [],
            )
            db.add(new_section)

    # 종합본 메타 업데이트
    source_ids = list(kb.source_summary_ids)
    if merge.video_summary_id not in source_ids:
        source_ids.append(merge.video_summary_id)
        kb.source_summary_ids = source_ids
    kb.updated_at = datetime.now(timezone.utc)

    merge.status = "approved"
    await db.commit()

    return {"message": "병합이 승인되었습니다.", "status": "approved"}
