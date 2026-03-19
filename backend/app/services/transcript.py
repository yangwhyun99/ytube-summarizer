"""YouTube 트랜스크립트 추출 서비스"""

import re
from dataclasses import dataclass

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)


@dataclass
class TranscriptSegment:
    text: str
    start: float  # 시작 시간 (초)
    duration: float  # 지속 시간 (초)


@dataclass
class TranscriptResult:
    segments: list[TranscriptSegment]
    language: str
    full_text: str


def extract_video_id(url: str) -> str:
    """YouTube URL에서 video ID 추출"""
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:embed/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"유효하지 않은 YouTube URL: {url}")


async def get_transcript(video_url: str) -> TranscriptResult:
    """YouTube 영상의 트랜스크립트를 추출한다.

    한국어 > 영어 > 자동생성 순으로 시도한다.
    """
    video_id = extract_video_id(video_url)

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    except (TranscriptsDisabled, VideoUnavailable) as e:
        raise RuntimeError(f"트랜스크립트를 가져올 수 없습니다: {e}")

    # 수동 자막 우선, 자동 생성 자막 fallback
    transcript = None
    language = ""

    # 1) 한국어 수동 자막
    try:
        transcript = transcript_list.find_transcript(["ko"])
        language = "ko"
    except NoTranscriptFound:
        pass

    # 2) 영어 수동 자막
    if transcript is None:
        try:
            transcript = transcript_list.find_transcript(["en"])
            language = "en"
        except NoTranscriptFound:
            pass

    # 3) 자동 생성 자막 (한국어 > 영어)
    if transcript is None:
        try:
            generated = transcript_list.find_generated_transcript(["ko", "en"])
            transcript = generated
            language = generated.language_code
        except NoTranscriptFound:
            raise RuntimeError(
                "사용 가능한 자막이 없습니다. Whisper fallback이 필요합니다."
            )

    fetched = transcript.fetch()
    segments = [
        TranscriptSegment(
            text=entry.text,
            start=entry.start,
            duration=entry.duration,
        )
        for entry in fetched
    ]

    full_text = " ".join(seg.text for seg in segments)

    return TranscriptResult(
        segments=segments,
        language=language,
        full_text=full_text,
    )
