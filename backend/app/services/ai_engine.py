"""AI 엔진 추상화 인터페이스 및 Gemini/Claude 구현체"""

import base64
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum


class DetailLevel(str, Enum):
    BRIEF = "brief"  # 핵심만 1분 요약
    DETAILED = "detailed"  # 강의 노트 수준 상세 요약


class SummaryLanguage(str, Enum):
    KOREAN = "ko"
    ENGLISH = "en"


@dataclass
class SummarySection:
    title: str
    content: str
    timestamp_start: float | None = None  # 초
    timestamp_end: float | None = None


@dataclass
class SummaryResult:
    title: str
    sections: list[SummarySection]
    full_text: str
    engine_used: str
    detail_level: DetailLevel
    language: SummaryLanguage


def _build_prompt(
    transcript: str,
    detail_level: DetailLevel,
    language: SummaryLanguage,
    num_images: int,
) -> str:
    """요약 생성을 위한 프롬프트 구성"""
    lang_name = "한국어" if language == SummaryLanguage.KOREAN else "English"
    detail_instruction = (
        "핵심 내용만 간결하게 1분 안에 읽을 수 있는 분량으로 요약하세요."
        if detail_level == DetailLevel.BRIEF
        else "강의 노트 수준으로 상세하게 요약하세요. 중요한 개념, 예시, 코드가 있으면 모두 포함하세요."
    )

    return f"""당신은 YouTube 영상 요약 전문가입니다.

## 작업
아래 트랜스크립트와 {num_images}장의 키프레임 이미지를 분석하여 영상을 종합적으로 요약하세요.

## 요약 지침
- {detail_instruction}
- 응답 언어: {lang_name}
- 이미지에 슬라이드, 코드, 차트, 다이어그램이 보이면 해당 내용을 요약에 반영하세요.
- 섹션별로 나누어 정리하세요.
- 각 섹션에 해당하는 영상 시간대를 [MM:SS] 형식으로 표시하세요.

## 응답 형식 (JSON)
```json
{{
  "title": "영상 제목 또는 핵심 주제",
  "sections": [
    {{
      "title": "섹션 제목",
      "content": "섹션 내용",
      "timestamp_start": 0,
      "timestamp_end": 120
    }}
  ]
}}
```

## 트랜스크립트
{transcript}
"""


def _load_image_as_base64(image_path: str) -> str:
    """이미지 파일을 base64로 인코딩"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


class SummaryEngine(ABC):
    """AI 요약 엔진 추상 인터페이스"""

    @abstractmethod
    async def summarize(
        self,
        transcript: str,
        image_paths: list[str],
        detail_level: DetailLevel = DetailLevel.DETAILED,
        language: SummaryLanguage = SummaryLanguage.KOREAN,
    ) -> SummaryResult:
        """트랜스크립트 + 이미지로 요약 생성"""
        ...

    @abstractmethod
    def name(self) -> str:
        """엔진 이름"""
        ...


class GeminiEngine(SummaryEngine):
    """Google Gemini 2.5 Flash 엔진 (무료)"""

    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.")

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")

    def name(self) -> str:
        return "gemini"

    async def summarize(
        self,
        transcript: str,
        image_paths: list[str],
        detail_level: DetailLevel = DetailLevel.DETAILED,
        language: SummaryLanguage = SummaryLanguage.KOREAN,
    ) -> SummaryResult:
        import google.generativeai as genai
        from PIL import Image

        prompt = _build_prompt(transcript, detail_level, language, len(image_paths))

        # 멀티모달 콘텐츠 구성
        contents: list = [prompt]
        for path in image_paths:
            img = Image.open(path)
            contents.append(img)

        response = self._model.generate_content(
            contents,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

        return self._parse_response(response.text, detail_level, language)

    def _parse_response(
        self, text: str, detail_level: DetailLevel, language: SummaryLanguage
    ) -> SummaryResult:
        import json
        data = json.loads(text)
        sections = [
            SummarySection(
                title=s["title"],
                content=s["content"],
                timestamp_start=s.get("timestamp_start"),
                timestamp_end=s.get("timestamp_end"),
            )
            for s in data.get("sections", [])
        ]
        full_text = "\n\n".join(
            f"## {s.title}\n{s.content}" for s in sections
        )
        return SummaryResult(
            title=data.get("title", ""),
            sections=sections,
            full_text=full_text,
            engine_used=self.name(),
            detail_level=detail_level,
            language=language,
        )


class ClaudeEngine(SummaryEngine):
    """Anthropic Claude Sonnet 엔진 (프리미엄, 유료)"""

    def __init__(self) -> None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.")

        import anthropic
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    def name(self) -> str:
        return "claude"

    async def summarize(
        self,
        transcript: str,
        image_paths: list[str],
        detail_level: DetailLevel = DetailLevel.DETAILED,
        language: SummaryLanguage = SummaryLanguage.KOREAN,
    ) -> SummaryResult:
        prompt = _build_prompt(transcript, detail_level, language, len(image_paths))

        # 멀티모달 콘텐츠 구성
        content: list[dict] = []

        # 이미지 추가
        for path in image_paths:
            img_b64 = _load_image_as_base64(path)
            media_type = "image/jpeg" if path.lower().endswith(".jpg") else "image/png"
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": img_b64,
                },
            })

        # 텍스트 프롬프트
        content.append({"type": "text", "text": prompt})

        response = await self._client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,
            messages=[{"role": "user", "content": content}],
        )

        response_text = response.content[0].text
        return self._parse_response(response_text, detail_level, language)

    def _parse_response(
        self, text: str, detail_level: DetailLevel, language: SummaryLanguage
    ) -> SummaryResult:
        import json
        import re

        # JSON 블록 추출
        json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        json_str = json_match.group(1) if json_match else text

        data = json.loads(json_str)
        sections = [
            SummarySection(
                title=s["title"],
                content=s["content"],
                timestamp_start=s.get("timestamp_start"),
                timestamp_end=s.get("timestamp_end"),
            )
            for s in data.get("sections", [])
        ]
        full_text = "\n\n".join(
            f"## {s.title}\n{s.content}" for s in sections
        )
        return SummaryResult(
            title=data.get("title", ""),
            sections=sections,
            full_text=full_text,
            engine_used=self.name(),
            detail_level=detail_level,
            language=language,
        )


def get_engine(engine_name: str | None = None) -> SummaryEngine:
    """엔진 이름으로 엔진 인스턴스 생성

    기본값은 환경 변수 AI_ENGINE, 없으면 gemini
    """
    if engine_name is None:
        engine_name = os.getenv("AI_ENGINE", "gemini")

    if engine_name == "gemini":
        return GeminiEngine()
    elif engine_name == "claude":
        return ClaudeEngine()
    else:
        raise ValueError(f"지원하지 않는 엔진: {engine_name}")
