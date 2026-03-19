"""YouTube 재생목록에서 영상 URL 추출"""

import asyncio
import json
import re
import sys


def extract_playlist_id(url: str) -> str:
    """재생목록 URL에서 playlist ID 추출"""
    match = re.search(r"[?&]list=([a-zA-Z0-9_-]+)", url)
    if not match:
        raise ValueError("유효한 재생목록 URL이 아닙니다.")
    return match.group(1)


async def get_playlist_videos(playlist_url: str) -> list[dict]:
    """yt-dlp로 재생목록의 영상 목록 추출 (다운로드 없이)"""
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        raise RuntimeError("yt-dlp가 설치되어 있지 않습니다.")

    playlist_id = extract_playlist_id(playlist_url)

    proc = await asyncio.create_subprocess_exec(
        sys.executable, "-m", "yt_dlp",
        "--flat-playlist",
        "--dump-json",
        f"https://www.youtube.com/playlist?list={playlist_id}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"재생목록 정보 가져오기 실패: {stderr.decode()}")

    videos = []
    for line in stdout.decode().strip().split("\n"):
        if not line.strip():
            continue
        data = json.loads(line)
        videos.append({
            "video_id": data.get("id", ""),
            "title": data.get("title", ""),
            "url": f"https://www.youtube.com/watch?v={data.get('id', '')}",
            "duration": data.get("duration"),
        })

    return videos
