"""영상 다운로드 + ffmpeg scene detection 키프레임 추출 서비스"""

import asyncio
import hashlib
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import imagehash
from PIL import Image


@dataclass
class Keyframe:
    path: str  # 이미지 파일 경로
    timestamp: float  # 영상 내 시간 (초)


@dataclass
class KeyframeResult:
    keyframes: list[Keyframe]
    video_duration: float  # 영상 전체 길이 (초)
    temp_dir: str  # 임시 디렉토리 (사용 후 정리 필요)


def _check_ffmpeg() -> None:
    """ffmpeg 설치 확인"""
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "ffmpeg가 설치되어 있지 않습니다. "
            "https://ffmpeg.org/download.html 에서 설치하세요."
        )


async def download_video(video_url: str, output_dir: str) -> str:
    """yt-dlp로 영상 다운로드 (720p 이하)"""
    output_path = os.path.join(output_dir, "video.mp4")

    cmd = [
        "yt-dlp",
        "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best",
        "--merge-output-format", "mp4",
        "-o", output_path,
        "--no-playlist",
        video_url,
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()

    if process.returncode != 0:
        raise RuntimeError(f"영상 다운로드 실패: {stderr.decode()}")

    return output_path


def _get_video_duration(video_path: str) -> float:
    """ffprobe로 영상 길이 가져오기"""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"영상 정보 추출 실패: {result.stderr}")
    return float(result.stdout.strip())


def _extract_scene_keyframes(video_path: str, output_dir: str) -> list[Keyframe]:
    """ffmpeg scene detection으로 키프레임 추출

    scene 변화 감지 (threshold 0.3) + 최소 10초 간격 보장 캡처 병행
    """
    scene_dir = os.path.join(output_dir, "scenes")
    interval_dir = os.path.join(output_dir, "intervals")
    os.makedirs(scene_dir, exist_ok=True)
    os.makedirs(interval_dir, exist_ok=True)

    # 1) Scene detection 기반 캡처
    scene_cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", "select='gt(scene,0.3)',showinfo",
        "-vsync", "vfr",
        "-frame_pts", "1",
        os.path.join(scene_dir, "scene_%04d.jpg"),
        "-y",
    ]
    result = subprocess.run(scene_cmd, capture_output=True, text=True)

    # 2) 10초 간격 보장 캡처 (scene이 없는 구간 보완)
    interval_cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", "fps=1/10",
        os.path.join(interval_dir, "interval_%04d.jpg"),
        "-y",
    ]
    subprocess.run(interval_cmd, capture_output=True, text=True)

    # 키프레임 수집
    keyframes: list[Keyframe] = []

    # scene detection 결과에서 타임스탬프 추출
    for f in sorted(Path(scene_dir).glob("scene_*.jpg")):
        # pts 기반 타임스탬프 추정 (파일 순서 기반)
        idx = int(f.stem.split("_")[1])
        # showinfo에서 정확한 시간을 파싱하면 좋지만, 간단히 처리
        keyframes.append(Keyframe(path=str(f), timestamp=0.0))

    # 10초 간격 결과
    for f in sorted(Path(interval_dir).glob("interval_*.jpg")):
        idx = int(f.stem.split("_")[1])
        timestamp = (idx - 1) * 10.0
        keyframes.append(Keyframe(path=str(f), timestamp=timestamp))

    # showinfo 로그에서 정확한 타임스탬프 파싱
    if result.stderr:
        import re
        times = re.findall(r"pts_time:(\d+\.?\d*)", result.stderr)
        scene_files = sorted(Path(scene_dir).glob("scene_*.jpg"))
        for i, (sf, t) in enumerate(zip(scene_files, times)):
            # 기존 키프레임의 타임스탬프 업데이트
            for kf in keyframes:
                if kf.path == str(sf):
                    kf.timestamp = float(t)
                    break

    return keyframes


def _remove_duplicates(keyframes: list[Keyframe], hash_threshold: int = 8) -> list[Keyframe]:
    """perceptual hash로 중복/유사 프레임 제거"""
    if not keyframes:
        return []

    unique: list[Keyframe] = []
    seen_hashes: list[imagehash.ImageHash] = []

    # 타임스탬프 기준 정렬
    keyframes.sort(key=lambda k: k.timestamp)

    for kf in keyframes:
        try:
            img = Image.open(kf.path)
            h = imagehash.phash(img)
        except Exception:
            continue

        # 기존 해시와 비교
        is_duplicate = False
        for seen in seen_hashes:
            if abs(h - seen) < hash_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            unique.append(kf)
            seen_hashes.append(h)

    return unique


async def extract_keyframes(
    video_url: str,
    max_frames: int = 50,
) -> KeyframeResult:
    """영상에서 키프레임을 추출하는 전체 파이프라인

    1. 영상 다운로드
    2. scene detection + 간격 캡처
    3. 중복 제거
    4. max_frames 제한
    """
    _check_ffmpeg()

    temp_dir = tempfile.mkdtemp(prefix="ytsummarizer_")

    try:
        # 1. 영상 다운로드
        video_path = await download_video(video_url, temp_dir)

        # 2. 영상 길이
        duration = _get_video_duration(video_path)

        # 3. 키프레임 추출
        keyframes = _extract_scene_keyframes(video_path, temp_dir)

        # 4. 중복 제거
        keyframes = _remove_duplicates(keyframes)

        # 5. max_frames 제한 (균등 샘플링)
        if len(keyframes) > max_frames:
            step = len(keyframes) / max_frames
            keyframes = [keyframes[int(i * step)] for i in range(max_frames)]

        # 6. 다운로드된 영상 삭제 (디스크 절약)
        if os.path.exists(video_path):
            os.remove(video_path)

        return KeyframeResult(
            keyframes=keyframes,
            video_duration=duration,
            temp_dir=temp_dir,
        )
    except Exception:
        # 에러 시 임시 디렉토리 정리
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
