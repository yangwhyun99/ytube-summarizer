"""내보내기 API 라우터 (PDF / DOCX)"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.summary import Summary
from app.services.export import ExportSection, export_pdf, export_docx

router = APIRouter(prefix="/api/export", tags=["export"])


async def _get_summary_or_404(summary_id: str, db: AsyncSession) -> Summary:
    result = await db.execute(select(Summary).where(Summary.id == summary_id))
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")
    return summary


def _to_export_sections(sections_data: list[dict]) -> list[ExportSection]:
    return [
        ExportSection(
            title=s["title"],
            content=s["content"],
            timestamp_start=s.get("timestamp_start"),
            timestamp_end=s.get("timestamp_end"),
        )
        for s in sections_data
    ]


@router.get("/{summary_id}/pdf")
async def export_summary_pdf(
    summary_id: str,
    db: AsyncSession = Depends(get_db),
):
    """저장된 요약을 PDF로 내보내기"""
    summary = await _get_summary_or_404(summary_id, db)
    sections = _to_export_sections(summary.sections)
    pdf_bytes = export_pdf(summary.title, sections)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="summary_{summary_id[:8]}.pdf"'
        },
    )


@router.get("/{summary_id}/docx")
async def export_summary_docx(
    summary_id: str,
    db: AsyncSession = Depends(get_db),
):
    """저장된 요약을 DOCX로 내보내기"""
    summary = await _get_summary_or_404(summary_id, db)
    sections = _to_export_sections(summary.sections)
    docx_bytes = export_docx(summary.title, sections)

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="summary_{summary_id[:8]}.docx"'
        },
    )
