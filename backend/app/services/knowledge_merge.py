"""지식 병합 서비스: AI 기반 섹션 매칭 + 병합"""

import json
import os
from dataclasses import dataclass


@dataclass
class SectionMatch:
    """새 요약 내용이 기존 어느 섹션에 매칭되는지"""
    content: str
    target_section: str  # 기존 섹션명 또는 "NEW_SECTION"
    action: str  # "update" | "add"
    new_section_title: str | None = None  # NEW_SECTION일 때 제목


@dataclass
class MergeDiff:
    """병합 전후 변경 내용"""
    section_title: str
    action: str  # "update" | "new_section"
    before: str | None  # 기존 내용 (update일 때)
    after: str  # 병합 후 내용


SECTION_MATCH_PROMPT = """아래는 기존 종합본의 섹션 목차와, 새로 추가된 영상 요약입니다.

## 기존 종합본 섹션 목차
{section_list}

## 새 영상 요약
{new_summary}

## 지시사항
1. 새 요약의 각 내용이 기존 어느 섹션에 해당하는지 판별하세요.
2. 기존 섹션에 해당하지 않는 새로운 내용이 있으면 "NEW_SECTION"으로 표시하고 적절한 제목을 제안하세요.
3. 하나의 내용이 여러 섹션에 걸칠 수 있으면, 가장 관련성 높은 섹션 하나를 선택하세요.

JSON 형식으로만 응답:
{{"matches": [
  {{"content": "새 요약에서 추출한 관련 내용 전문", "target_section": "기존 섹션명 또는 NEW_SECTION", "action": "update 또는 add", "new_section_title": "NEW_SECTION일 때만 제목"}},
  ...
]}}
"""

MERGE_PROMPT = """아래는 기존 섹션 내용과, 새로 추가할 내용입니다.
두 내용을 병합하여 하나의 완성된 섹션으로 만들어주세요.

## 규칙
- 중복되는 내용은 하나만 남기세요
- 기존 내용이 부족했던 부분은 새 내용으로 보완하세요
- 상충하는 정보가 있으면 최신 정보를 우선하세요
- 원래 섹션의 구조와 톤을 유지하세요
- 마크다운 형식으로 작성하세요

## 기존 섹션: {section_name}
{existing_content}

## 새로 추가할 내용
{new_content}

## 출처
새 내용의 출처 영상: {video_title}

병합된 섹션 내용만 출력하세요 (다른 설명 없이):
"""


async def _call_ai(prompt: str) -> str:
    """AI 엔진 호출 (Gemini 우선, Claude fallback)"""
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.2),
        )
        return response.text

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=anthropic_key)
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    raise RuntimeError("GEMINI_API_KEY 또는 ANTHROPIC_API_KEY가 필요합니다.")


async def match_sections(
    existing_sections: list[dict],
    new_summary_text: str,
) -> list[SectionMatch]:
    """새 요약의 내용을 기존 종합본 섹션에 매칭"""
    if not existing_sections:
        # 섹션이 없으면 전체를 NEW_SECTION으로
        return [SectionMatch(
            content=new_summary_text,
            target_section="NEW_SECTION",
            action="add",
            new_section_title="종합 요약",
        )]

    section_list = "\n".join(
        f"- {s['section_title']}" for s in existing_sections
    )

    prompt = SECTION_MATCH_PROMPT.format(
        section_list=section_list,
        new_summary=new_summary_text,
    )

    response = await _call_ai(prompt)

    # JSON 파싱
    import re
    json_match = re.search(r"\{[\s\S]*\}", response)
    if not json_match:
        # 파싱 실패 시 전체를 새 섹션으로
        return [SectionMatch(
            content=new_summary_text,
            target_section="NEW_SECTION",
            action="add",
            new_section_title="추가 내용",
        )]

    data = json.loads(json_match.group())
    return [
        SectionMatch(
            content=m["content"],
            target_section=m["target_section"],
            action=m["action"],
            new_section_title=m.get("new_section_title"),
        )
        for m in data.get("matches", [])
    ]


async def merge_section_content(
    section_name: str,
    existing_content: str,
    new_content: str,
    video_title: str,
) -> str:
    """기존 섹션과 새 내용을 AI로 병합"""
    prompt = MERGE_PROMPT.format(
        section_name=section_name,
        existing_content=existing_content,
        new_content=new_content,
        video_title=video_title,
    )
    return await _call_ai(prompt)


async def generate_merge_diffs(
    existing_sections: list[dict],
    new_summary_sections: list[dict],
    video_title: str,
) -> list[MergeDiff]:
    """새 요약을 기존 종합본에 병합할 때의 변경 diff 목록 생성

    Args:
        existing_sections: [{"section_title": ..., "content": ...}, ...]
        new_summary_sections: [{"title": ..., "content": ...}, ...]
        video_title: 출처 영상 제목
    """
    # 새 요약 텍스트 조합
    new_summary_text = "\n\n".join(
        f"### {s['title']}\n{s['content']}"
        for s in new_summary_sections
    )

    # 1단계: 섹션 매칭
    section_dicts = [
        {"section_title": s["section_title"], "content": s["content"]}
        for s in existing_sections
    ]
    matches = await match_sections(section_dicts, new_summary_text)

    # 기존 섹션을 dict로 변환
    section_map = {s["section_title"]: s["content"] for s in existing_sections}

    diffs: list[MergeDiff] = []

    for match in matches:
        if match.target_section == "NEW_SECTION":
            # 새 섹션 추가
            title = match.new_section_title or "새 섹션"
            diffs.append(MergeDiff(
                section_title=title,
                action="new_section",
                before=None,
                after=match.content,
            ))
        elif match.target_section in section_map:
            # 기존 섹션 업데이트
            existing = section_map[match.target_section]
            merged = await merge_section_content(
                section_name=match.target_section,
                existing_content=existing,
                new_content=match.content,
                video_title=video_title,
            )
            diffs.append(MergeDiff(
                section_title=match.target_section,
                action="update",
                before=existing,
                after=merged,
            ))

    return diffs
