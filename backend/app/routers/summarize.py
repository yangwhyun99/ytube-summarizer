"""요약 API 라우터"""

import shutil

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import SummarizeRequest, SummarizeResponse, SectionResponse
from app.models.summary import Summary
from app.services.ai_engine import (
    DetailLevel,
    SummaryLanguage,
    get_engine,
)
from app.services.keyframe import extract_keyframes
from app.services.transcript import get_transcript, extract_video_id

router = APIRouter(prefix="/api", tags=["summarize"])


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    request: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
) -> SummarizeResponse:
    """YouTube 영상을 요약하고 DB에 저장한다."""
    temp_dir = None

    try:
        # 1. 트랜스크립트 추출
        try:
            transcript_result = await get_transcript(request.url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"트랜스크립트 추출 실패: {e}")

        # 2. 키프레임 추출 (ffmpeg가 없으면 텍스트만으로 요약)
        image_paths: list[str] = []
        video_duration: float | None = None

        try:
            keyframe_result = await extract_keyframes(request.url)
            image_paths = [kf.path for kf in keyframe_result.keyframes]
            video_duration = keyframe_result.video_duration
            temp_dir = keyframe_result.temp_dir
        except RuntimeError:
            pass

        # 3. AI 엔진으로 요약
        try:
            detail_level = DetailLevel(request.detail_level)
            language = SummaryLanguage(request.language)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="잘못된 detail_level 또는 language 값입니다.",
            )

        try:
            engine = get_engine(request.engine)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        try:
            summary = await engine.summarize(
                transcript=transcript_result.full_text,
                image_paths=image_paths,
                detail_level=detail_level,
                language=language,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"요약 생성 실패: {e}")

        # 4. DB에 저장
        sections_data = [
            {
                "title": s.title,
                "content": s.content,
                "timestamp_start": s.timestamp_start,
                "timestamp_end": s.timestamp_end,
            }
            for s in summary.sections
        ]

        video_id = extract_video_id(request.url)
        db_summary = Summary(
            video_url=request.url,
            video_id=video_id,
            title=summary.title,
            sections=sections_data,
            full_text=summary.full_text,
            engine_used=summary.engine_used,
            detail_level=summary.detail_level.value,
            language=summary.language.value,
            video_duration=video_duration,
            keyframe_count=len(image_paths),
            transcript_language=transcript_result.language,
        )
        db.add(db_summary)
        await db.commit()
        await db.refresh(db_summary)

        response = SummarizeResponse(
            title=summary.title,
            sections=[
                SectionResponse(**s) for s in sections_data
            ],
            full_text=summary.full_text,
            engine_used=summary.engine_used,
            detail_level=summary.detail_level.value,
            language=summary.language.value,
            video_duration=video_duration,
            keyframe_count=len(image_paths),
            transcript_language=transcript_result.language,
        )
        response.id = db_summary.id  # type: ignore[attr-defined]
        return response

    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)
