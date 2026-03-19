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
class TimestampRef:
    time: float
    label: str = ""


@dataclass
class SummarySection:
    title: str
    content: str  # Markdown 포맷
    timestamps: list[TimestampRef] = field(default_factory=list)


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
        "핵심만 간결하게 정리하세요. 각 섹션은 5줄 이내로 압축하세요."
        if detail_level == DetailLevel.BRIEF
        else "상세하게 정리하세요. 중요한 개념, 예시, 코드, 비교 내용을 모두 포함하세요."
    )

    return f"""당신은 전문 기술 문서 작성자입니다. YouTube 영상의 트랜스크립트를 분석하여 체계적인 지식 문서로 변환합니다.

## 핵심 규칙

### 1. 주제/개념 단위로 구성
- 시간 순서가 아닌 **주제/개념 단위**로 섹션을 구성하세요
- 영상 전체에 흩어진 관련 내용을 하나의 섹션으로 통합하세요
- 각 섹션에 관련 영상 시점(초 단위)을 timestamps 배열로 첨부하세요

### 2. 전문적 문체
- 구어체 금지 ("~입니다", "~것입니다", "~하게 됩니다" 등 사용 금지)
- **명사형 종결** 또는 **개조식** 사용 ("~함", "~방식", "~구조")
- **볼드 라벨** 사용: `**역할:**`, `**장점:**`, `**예시:**` 등

### 3. Markdown 구조화
- 불릿 포인트(`-`)로 핵심 사항 나열
- 비교가 있으면 Markdown 표(`| 항목 | A | B |`) 사용
- 코드/명령어는 코드 블록(```)으로 감싸기
- 프로세스나 구조를 설명할 때 Mermaid 다이어그램 포함:

````
```mermaid
flowchart LR
    A[입력] --> B[처리] --> C[출력]
```
````

### 4. 상세도
- {detail_instruction}

### 5. 언어
- 응답 언어: {lang_name}

## 응답 형식 (JSON)

```json
{{{{
  "title": "핵심 주제를 나타내는 제목",
  "sections": [
    {{{{
      "title": "개념/주제 이름",
      "content": "Markdown 포맷의 본문 (불릿, 표, Mermaid 포함 가능)",
      "timestamps": [
        {{{{"time": 45, "label": "개념 설명"}}}},
        {{{{"time": 320, "label": "실전 예시"}}}}
      ]
    }}}}
  ]
}}}}
```

## 좋은 예시

```json
{{{{
  "title": "바이브 코딩 완벽 가이드",
  "sections": [
    {{{{
      "title": "바이브 코딩의 정의와 핵심 철학",
      "content": "**정의:** LLM이 코드 생성을 전담하고, 개발자는 자연어로 의도를 전달하는 개발 방식\\n\\n**핵심 철학:**\\n- 프로그래밍 구문이 아닌 '무엇을 만들고 싶은지'에 집중\\n- AI와 대화하듯 소통하며 기능 완성\\n- 코드 작성보다 **설계와 의도 전달**이 핵심 역량\\n\\n**용어 유래:** 테슬라 AI 디렉터 안드레 카파시가 대중화",
      "timestamps": [{{{{"time": 46, "label": "정의 설명"}}}}, {{{{"time": 180, "label": "철학 상세"}}}}]
    }}}},
    {{{{
      "title": "전통적 코딩 vs 바이브 코딩",
      "content": "| 항목 | 전통적 코딩 | 바이브 코딩 |\\n|------|-----------|-----------|\\n| **주요 역할** | 코드 직접 작성 | AI에게 설계/의도 전달 |\\n| **생산 도구** | IDE, 라이브러리, Stack Overflow | AI 에디터(Cursor, Claude Code) |\\n| **디버깅** | 에러 로그 분석 후 직접 수정 | AI에게 에러 전달, 함께 수정 |\\n| **필요 역량** | 프로그래밍 언어 숙련도 | 그 것에 더해, 프롬프트 및 디자인 능력 |",
      "timestamps": [{{{{"time": 200, "label": "비교 시작"}}}}]
    }}}}
  ]
}}}}
```

## 트랜스크립트
{transcript}
"""


def _load_image_as_base64(image_path: str) -> str:
    """이미지 파일을 base64로 인코딩"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _parse_sections(data: dict) -> list[SummarySection]:
    """AI 응답 JSON에서 섹션 리스트 파싱 (신/구 포맷 모두 지원)"""
    sections = []
    for s in data.get("sections", []):
        # 새 포맷: timestamps 배열
        timestamps_raw = s.get("timestamps", [])
        timestamps = [
            TimestampRef(time=t["time"], label=t.get("label", ""))
            for t in timestamps_raw
            if isinstance(t, dict) and "time" in t
        ]
        # 구 포맷 fallback
        if not timestamps and s.get("timestamp_start") is not None:
            timestamps = [TimestampRef(time=s["timestamp_start"], label="시작")]
            if s.get("timestamp_end") is not None:
                timestamps.append(TimestampRef(time=s["timestamp_end"], label="종료"))

        sections.append(SummarySection(
            title=s.get("title", ""),
            content=s.get("content", ""),
            timestamps=timestamps,
        ))
    return sections


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
        self._model = genai.GenerativeModel("gemini-2.5-flash")

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
        sections = _parse_sections(data)
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
        sections = _parse_sections(data)
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
