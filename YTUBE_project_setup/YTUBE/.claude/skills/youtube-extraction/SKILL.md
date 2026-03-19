---
name: youtube-extraction
description: YouTube 영상에서 트랜스크립트와 키프레임을 추출하는 방법. 영상 다운로드, 자막 추출, scene detection, 프레임 캡처 관련 작업 시 참조.
---

# YouTube Extraction Skill

## 트랜스크립트 추출

### 방법 1: youtube-transcript-api (자막 있는 영상)
```python
from youtube_transcript_api import YouTubeTranscriptApi

# 자동/수동 자막 추출 (타임스탬프 포함)
transcript = YouTubeTranscriptApi.get_transcript("VIDEO_ID", languages=['ko', 'en'])
# 결과: [{'text': '...', 'start': 0.0, 'duration': 3.5}, ...]
```

### 방법 2: yt-dlp + Whisper (자막 없는 영상)
```bash
# 음성만 추출
yt-dlp -x --audio-format mp3 -o "audio.mp3" "VIDEO_URL"
```
```python
import whisper
model = whisper.load_model("base")
result = model.transcribe("audio.mp3", language="ko")
```

## 키프레임 추출 (Scene Detection)

### 핵심: 고정 간격이 아닌 장면 변화 감지
```bash
# scene detection으로 변화 시점만 캡처
ffmpeg -i video.mp4 -vf "select='gt(scene,0.3)'" -vsync vfr frame_%04d.jpg

# threshold 조절: 0.3 = 보통, 0.2 = 민감, 0.4 = 둔감
```

### 하이브리드 전략 (권장)
```bash
# 1. scene detection 캡처
ffmpeg -i video.mp4 -vf "select='gt(scene,0.3)'" -vsync vfr scene_%04d.jpg

# 2. 최소 10초 간격 보장 캡처 (변화 없는 구간 보완)
ffmpeg -i video.mp4 -vf "fps=1/10" interval_%04d.jpg

# 3. Python으로 중복 제거 (이미지 해시 비교)
```

### 중복 제거
```python
from PIL import Image
import imagehash

def remove_duplicates(image_paths, threshold=5):
    unique = []
    hashes = []
    for path in image_paths:
        h = imagehash.average_hash(Image.open(path))
        if not any(abs(h - existing) < threshold for existing in hashes):
            unique.append(path)
            hashes.append(h)
    return unique
```

## 영상 다운로드
```bash
# 최적 품질 다운로드 (720p 이하로 제한하여 처리 속도 확보)
yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" -o "video.mp4" "VIDEO_URL"

# 영상 길이 확인
ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4
```

## 주의사항
- scene detection threshold는 영상 유형에 따라 조절 (강의: 0.3, 빠른 편집: 0.4)
- 키프레임은 30~50장 범위로 제한 (API 비용 관리)
- 20분 영상 기준 전체 파이프라인: 1~3분
