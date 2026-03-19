"""YouTube 트랜스크립트 추출 서비스 (Whisper fallback 포함)"""

import asyncio
import os
import re
import shutil
import tempfile
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


async def _whisper_transcribe(video_url: str) -> TranscriptResult:
    """Whisper를 사용한 음성 인식 fallback

    yt-dlp로 오디오를 추출하고 faster-whisper로 STT를 수행한다.
    """
    if not shutil.which("yt-dlp"):
        raise RuntimeError("yt-dlp가 설치되어 있지 않습니다.")

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise RuntimeError("faster-whisper가 설치되어 있지 않습니다.")

    temp_dir = tempfile.mkdtemp(prefix="yt_whisper_")
    audio_path = os.path.join(temp_dir, "audio.mp3")

    try:
        # 1. yt-dlp로 오디오만 추출
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp",
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "5",
            "-o", audio_path,
            video_url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"오디오 추출 실패: {stderr.decode()}")

        # 실제 파일명 확인 (yt-dlp가 확장자를 변경할 수 있음)
        actual_path = audio_path
        if not os.path.exists(audio_path):
            for f in os.listdir(temp_dir):
                if f.startswith("audio"):
                    actual_path = os.path.join(temp_dir, f)
                    break

        # 2. Whisper로 음성 인식 (small 모델 — 속도/정확도 균형)
        model = WhisperModel("small", device="cpu", compute_type="int8")
        whisper_segments, info = model.transcribe(
            actual_path,
            beam_size=5,
            language=None,  # 자동 감지
        )

        segments = []
        for seg in whisper_segments:
            segments.append(TranscriptSegment(
                text=seg.text.strip(),
                start=seg.start,
                duration=seg.end - seg.start,
            ))

        detected_lang = info.language if info.language else "unknown"
        full_text = " ".join(seg.text for seg in segments)

        return TranscriptResult(
            segments=segments,
            language=f"{detected_lang} (whisper)",
            full_text=full_text,
        )

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


async def get_transcript(video_url: str) -> TranscriptResult:
    """YouTube 영상의 트랜스크립트를 추출한다.

    한국어 > 영어 > 자동생성 순으로 시도하고,
    모두 실패하면 Whisper fallback을 사용한다.
    """
    video_id = extract_video_id(video_url)

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    except (TranscriptsDisabled, VideoUnavailable):
        # 자막 비활성화 → Whisper fallback
        return await _whisper_transcribe(video_url)

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
            # 모든 자막 실패 → Whisper fallback
            return await _whisper_transcribe(video_url)

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
