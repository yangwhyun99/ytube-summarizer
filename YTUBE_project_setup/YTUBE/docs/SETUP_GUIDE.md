# YTSummarizer - 초기 세팅 가이드

> 이 문서를 따라하면 VS Code에서 에이전트 코딩을 바로 시작할 수 있습니다.

---

## 📋 사전 준비 (체크리스트)

- [ ] VS Code 최신 버전 설치
- [ ] Node.js v18+ 설치 (`node -v`로 확인)
- [ ] Python 3.10+ 설치 (`python --version`으로 확인)
- [ ] Git 설치
- [ ] GitHub 계정 + Personal Access Token 생성
- [ ] Gemini API 키 발급 (https://aistudio.google.com, 무료, 신용카드 불필요)
- [ ] (선택) Claude API 키 발급 (https://console.anthropic.com, 유료)
- [ ] GitHub Copilot 구독 (에이전트 모드용)

---

## Setting: 환경 설정

### S-1. VS Code 확장 프로그램 설치

VS Code에서 아래 확장 프로그램을 설치하세요:

```
필수:
- GitHub Copilot (에이전트 모드)
- GitHub Copilot Chat
- Python (ms-python)
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- ESLint

선택 (권장):
- Thunder Client (API 테스트)
- GitLens (Git 이력 시각화)
```

### S-2. 환경 변수 설정

터미널에서 (Mac/Linux):
```bash
# ~/.zshrc 또는 ~/.bashrc에 추가

# 필수 (무료)
export GITHUB_TOKEN="your_github_personal_access_token"
export GEMINI_API_KEY="your_gemini_api_key"

# 선택 (프리미엄 엔진 사용 시에만)
# export ANTHROPIC_API_KEY="your_claude_api_key"
```

Windows PowerShell:
```powershell
# 시스템 환경 변수에 추가 (필수, 무료)
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token", "User")
[System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "your_key", "User")

# 선택 (프리미엄 엔진 사용 시에만)
# [System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your_key", "User")
```

#### Gemini API 키 발급 (무료, 신용카드 불필요)
1. https://aistudio.google.com 접속
2. Google 계정 로그인
3. 좌측 메뉴 "Get API Key" 클릭
4. "Create API Key" → 프로젝트 선택 → 키 생성
5. 위 환경 변수에 붙여넣기

### S-3. 에이전트 모드 활성화

VS Code에서:
1. `Ctrl+Shift+P` → `Settings (JSON)` 열기
2. 아래 설정이 있는지 확인 (없으면 추가):
```json
{
  "chat.agent.enabled": true,
  "chat.mcp.discovery.enabled": true
}
```
3. VS Code 재시작
4. Chat 패널에서 "Agent" 모드 선택 가능한지 확인

---

## Step 1: 프로젝트 초기화

### 1-1. YTUBE 폴더에서 VS Code 열기

```bash
# YTUBE 폴더로 이동 (이미 만들었으므로)
cd YTUBE

# VS Code 열기
code .
```

### 1-2. Git 초기화

VS Code 터미널에서:
```bash
git init
```

### 1-3. .gitignore 생성

VS Code 터미널에서:
```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/
__pycache__/
*.pyc
.venv/
venv/

# Environment
.env
.env.local
.env.production

# Build
.next/
out/
dist/
build/

# IDE
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project specific
*.mp4
*.mp3
keyframes/
temp/
EOF
```

### 1-4. .env.example 생성

```bash
cat > .env.example << 'EOF'
# AI Engine (필수, 무료)
GEMINI_API_KEY=your_gemini_api_key_here
AI_ENGINE=gemini  # gemini 또는 claude

# AI Engine (선택, 유료 - 프리미엄 엔진 사용 시)
# ANTHROPIC_API_KEY=your_claude_api_key_here

# Database (Phase 3에서 설정)
DATABASE_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
EOF
```

### 1-5. 첫 커밋

```bash
git add .
git commit -m "init: 프로젝트 초기 세팅 (CLAUDE.md, plan.md, MCP, Skills)"
```

---

## Step 2: Frontend 프로젝트 생성

### 2-1. 에이전트에게 요청 (Agent 모드에서)

VS Code Chat 패널을 열고 Agent 모드로 전환한 뒤 다음을 입력:

```
plan.md와 CLAUDE.md를 읽고, frontend/ 디렉토리에 Next.js 프로젝트를 생성해줘.

요구사항:
- pnpm 사용
- TypeScript strict mode
- Tailwind CSS
- App Router
- src/ 디렉토리 구조
- 기본 레이아웃: 상단 헤더 + 중앙에 YouTube URL 입력창 + 하단 요약 결과 영역
- 모바일 반응형
```

### 2-2. 수동으로 하는 경우

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --use-pnpm

cd frontend
pnpm add lucide-react
```

### 2-3. 커밋

```bash
cd ..
git add .
git commit -m "feat: Next.js frontend 프로젝트 생성"
```

---

## Step 3: Backend 프로젝트 생성

### 3-1. 에이전트에게 요청 (Agent 모드에서)

```
plan.md를 읽고, backend/ 디렉토리에 FastAPI 프로젝트를 생성해줘.

요구사항:
- Python 가상환경 (venv)
- FastAPI + uvicorn
- 의존성: google-generativeai, anthropic(선택), yt-dlp, youtube-transcript-api, Pillow, imagehash
- 기본 구조: app/main.py, app/routers/, app/services/, app/models/
- /api/summarize 엔드포인트 스텁
- CORS 설정 (localhost:3000 허용)
- requirements.txt 생성
```

### 3-2. 수동으로 하는 경우

```bash
mkdir -p backend/app/routers backend/app/services backend/app/models

# 가상환경
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
cat > requirements.txt << 'EOF'
fastapi==0.115.0
uvicorn[standard]==0.30.0
google-generativeai==0.8.0
anthropic==0.40.0
yt-dlp==2024.12.0
youtube-transcript-api==0.6.3
Pillow==10.4.0
imagehash==4.3.1
python-dotenv==1.0.1
python-multipart==0.0.9
EOF

pip install -r requirements.txt

# 기본 앱 파일
cat > app/main.py << 'PYEOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="YTSummarizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/summarize")
async def summarize(url: str):
    # TODO: Phase 2에서 구현
    return {"message": "요약 기능 구현 예정", "url": url}
PYEOF
```

### 3-3. 커밋

```bash
cd ..
git add .
git commit -m "feat: FastAPI backend 프로젝트 생성"
```

---

## 다음 단계

위 3단계까지 완료하면 기본 프로젝트 구조가 갖춰집니다.
이후 개발은 **plan.md의 Phase 2**부터 에이전트와 함께 진행하면 됩니다.

### 에이전트 코딩 팁

1. **항상 Plan Mode 먼저**: 복잡한 기능은 Shift+Tab 두 번 → 설계 확인 → 승인 후 코딩
2. **기능별 브랜치**: `git checkout -b feat/transcript-extraction`
3. **컨텍스트 관리**: 작업 전환 시 /clear로 리셋
4. **plan.md 업데이트**: 기능 완료 시마다 체크박스 체크
5. **작은 단위로 커밋**: 하나의 기능 = 하나의 커밋
