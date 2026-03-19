"""요약 API 라우터"""

import shutil
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import SummarizeRequest, SummarizeResponse, SectionResponse
from app.models.summary import Summary
from app.models.user import User
from app.services.ai_engine import (
    DetailLevel,
    SummaryLanguage,
    get_engine,
)
from app.services.keyframe import extract_keyframes
from app.services.transcript import get_transcript, extract_video_id
from app.services.playlist import get_playlist_videos
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["summarize"])

FREE_DAILY_LIMIT = 5


async def _check_usage(user: User | None, db: AsyncSession) -> None:
    """무료 사용자 일일 사용량 확인 및 증가"""
    if user is None:
        return  # 비로그인 사용자는 제한 없음 (로그인 강제 전까지)
    if user.plan == "premium":
        return  # 프리미엄은 무제한

    today = date.today().isoformat()
    if user.last_usage_date != today:
        user.daily_usage = 0
        user.last_usage_date = today

    if user.daily_usage >= FREE_DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"무료 플랜 일일 한도({FREE_DAILY_LIMIT}건)를 초과했습니다. 프리미엄으로 업그레이드하세요.",
        )

    user.daily_usage += 1
    await db.commit()


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    request: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
) -> SummarizeResponse:
    """YouTube 영상을 요약하고 DB에 저장한다."""
    # 사용량 확인
    await _check_usage(current_user, db)

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


class PlaylistRequest(BaseModel):
    url: str = Field(..., description="YouTube 재생목록 URL")


@router.post("/playlist/videos")
async def list_playlist_videos(request: PlaylistRequest):
    """재생목록의 영상 목록을 조회"""
    try:
        videos = await get_playlist_videos(request.url)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"videos": videos, "count": len(videos)}


class BatchSummarizeRequest(BaseModel):
    urls: list[str] = Field(..., description="요약할 YouTube URL 목록")
    engine: str = Field(default="gemini")
    detail_level: str = Field(default="detailed")
    language: str = Field(default="ko")


@router.post("/batch-summarize")
async def batch_summarize(
    request: BatchSummarizeRequest,
    db: AsyncSession = Depends(get_db),
):
    """여러 영상을 순차적으로 요약 (배치 처리)"""
    results: list[dict] = []

    for url in request.urls:
        try:
            single_req = SummarizeRequest(
                url=url,
                engine=request.engine,
                detail_level=request.detail_level,
                language=request.language,
            )
            response = await summarize(single_req, db)
            results.append({
                "url": url,
                "status": "success",
                "id": response.id,
                "title": response.title,
            })
        except Exception as e:
            results.append({
                "url": url,
                "status": "error",
                "error": str(e),
            })

    success_count = sum(1 for r in results if r["status"] == "success")
    return {
        "results": results,
        "total": len(results),
        "success": success_count,
        "failed": len(results) - success_count,
    }
