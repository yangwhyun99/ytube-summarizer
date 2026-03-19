---
name: ai-engine-vision
description: AI 엔진(Gemini/Claude)에 텍스트와 이미지를 함께 보내서 종합 요약을 생성하는 패턴. 멀티모달 API 호출, 프롬프트 설계, 엔진 추상화 관련 작업 시 참조.
---

# AI Engine Vision Skill (Dual Engine)

## 엔진 추상화 인터페이스

```python
from abc import ABC, abstractmethod

class SummaryEngine(ABC):
    """AI 요약 엔진 추상 인터페이스"""

    @abstractmethod
    async def summarize(
        self,
        transcript: str,
        keyframe_paths: list[str],
        detail_level: str = "detailed",
        output_language: str = "ko"
    ) -> str:
        pass

    @abstractmethod
    async def merge_sections(
        self,
        existing_section: str,
        new_content: str,
        section_name: str
    ) -> str:
        pass
```

## Gemini 2.5 Flash 구현 (기본, 무료)

```python
import google.generativeai as genai
from PIL import Image

class GeminiEngine(SummaryEngine):

    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    async def summarize(self, transcript, keyframe_paths, detail_level="detailed", output_language="ko"):
        images = [Image.open(path) for path in keyframe_paths]

        prompt = f"""
아래는 YouTube 영상의 트랜스크립트와 키프레임 이미지입니다.
이 두 소스를 종합하여 영상 내용을 요약해주세요.

## 요약 수준
{DETAIL_INSTRUCTIONS[detail_level]}

## 언어
{LANG_INSTRUCTIONS[output_language]}

## 요약 형식
- 섹션별로 구분하여 정리
- 각 섹션에 해당 타임스탬프 표시 [MM:SS]
- 화면에 보이는 코드, 명령어, 설정은 정확히 포함
- 슬라이드/차트의 핵심 데이터 포함

## 트랜스크립트
{transcript}

## 키프레임 이미지 (시간순)
아래 이미지들은 영상에서 장면이 변화한 시점의 캡처입니다.
"""
        # Gemini: content 리스트에 텍스트+이미지를 함께 전달
        content = [prompt] + images
        response = self.model.generate_content(content)
        return response.text
```

### Gemini API 키 발급 (무료, 신용카드 불필요)
1. https://aistudio.google.com 접속
2. Google 계정 로그인
3. 좌측 메뉴 "Get API Key" 클릭
4. "Create API Key" → 프로젝트 선택 → 키 생성
5. .env에 GEMINI_API_KEY=발급받은키 저장

### Gemini 무료 한도 (2026년 3월 기준)
- Gemini 2.5 Flash: 10 RPM, 250 RPD, 250,000 TPM
- 컨텍스트 윈도우: 1,000,000 토큰
- 무료/유료 간 모델 품질 동일 (처리량만 차이)

## Claude Sonnet 구현 (프리미엄, 유료)

```python
import anthropic
import base64

class ClaudeEngine(SummaryEngine):

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    async def summarize(self, transcript, keyframe_paths, detail_level="detailed", output_language="ko"):
        image_contents = []
        for path in keyframe_paths:
            with open(path, "rb") as f:
                data = base64.standard_b64encode(f.read()).decode("utf-8")
            image_contents.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg", "data": data}
            })

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [{"type": "text", "text": prompt}, *image_contents]
            }]
        )
        return message.content[0].text
```

## 엔진 팩토리

```python
def get_engine(engine_type: str = "gemini") -> SummaryEngine:
    if engine_type == "gemini":
        return GeminiEngine()
    elif engine_type == "claude":
        return ClaudeEngine()
    else:
        raise ValueError(f"Unknown engine: {engine_type}")
```

## 이미지 최적화 (공통)

```python
from PIL import Image

def optimize_keyframe(path: str, max_width: int = 1024) -> str:
    img = Image.open(path)
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, int(img.height * ratio)))
    optimized_path = path.replace(".jpg", "_opt.jpg")
    img.save(optimized_path, "JPEG", quality=80)
    return optimized_path
```

## 주의사항
- 이미지는 1024px 이하로 리사이즈하여 토큰 절약
- 30~50장 범위 유지
- Gemini는 PIL Image 객체를 직접 전달, Claude는 base64 인코딩 필요
- 엔진 선택은 .env의 AI_ENGINE=gemini 또는 AI_ENGINE=claude로 관리
