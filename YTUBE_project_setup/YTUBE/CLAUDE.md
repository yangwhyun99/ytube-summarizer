# YTSummarizer - YouTube Video Summarizer

## WHAT
YouTube 영상을 트랜스크립트 + scene detection 키프레임으로 종합 분석하여 요약하고,
같은 주제 영상들을 누적 병합하여 개인 지식 베이스를 구축하는 웹앱.

## Stack
- Frontend: Next.js 16 (App Router) + TypeScript strict + Tailwind CSS v4
- Backend: Python FastAPI (async, SQLAlchemy + aiosqlite)
- AI: Gemini 2.5 Flash (기본, 무료) / Claude Sonnet (프리미엄 옵션, 유료)
- Tools: yt-dlp, ffmpeg, youtube-transcript-api v1.2+, faster-whisper (fallback)
- DB: SQLite (개발) → PostgreSQL (프로덕션 예정)
- Auth: JWT (pyjwt + bcrypt)

## Project Structure
- `frontend/` - Next.js 앱 (port 3000)
- `backend/` - FastAPI 서버 (port 8000)
- `docs/` - PRD, 설계 문서
- `plan.md` - 개발 로드맵 (항상 참조)

## HOW - Commands
- Frontend dev: `cd frontend && pnpm dev`
- Backend dev: `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Frontend typecheck: `cd frontend && pnpm typecheck`
- Frontend test: `cd frontend && pnpm test`
- Backend test: `cd backend && pytest`
- Lint: `cd frontend && pnpm lint`

## Code Style
- TypeScript: strict mode, ES modules, functional components with hooks
- Python: type hints 필수, async/await 패턴
- 비즈니스 로직 주석은 한국어, 기술적 주석은 영어
- 컴포넌트 파일명: PascalCase, 유틸리티: camelCase

## IMPORTANT
- 코드 변경 후 반드시 typecheck 실행
- API 키는 절대 하드코딩하지 않을 것 (.env 사용)
- 커밋 전 테스트 통과 확인
- 새 기능은 feature 브랜치에서 작업
- 복잡한 작업 전 Plan Mode로 설계 먼저

## Known Issues & Workarounds
- Windows에서 yt-dlp PATH 문제: `sys.executable -m yt_dlp`로 호출
- youtube-transcript-api v1.2+: 인스턴스 메서드 사용 (`YouTubeTranscriptApi().list()`)
- Tailwind v4 @theme inline: `var()` 참조 불가, 직접 hex 값 사용
- uvicorn reload=True: Windows multiprocessing 이슈로 비활성화
- Gemini 모델: `gemini-2.5-flash` 사용 (preview 모델은 삭제될 수 있음)

## Architecture Decisions
- 영상 처리는 Python이 적합 (ffmpeg, yt-dlp 생태계)
- 프론트엔드는 Next.js SSR로 SEO + 빠른 초기 로딩
- 기본 AI 엔진: Gemini 2.5 Flash (무료, 하루 250건, 멀티모달 지원)
- 프리미엄 AI 엔진: Claude Sonnet (유료, 더 정교한 요약)
- 키프레임은 scene detection 방식 (고정 간격 X)
- 지식 병합은 섹션별 분리 관리 (전체 재처리 방지)
- AI 엔진은 인터페이스로 추상화하여 교체 용이하게 설계
- 다크 테마 디자인 시스템: ui-design-system 스킬 참조

## Reference
- PRD: @docs/PRD.md
- 개발 로드맵: @plan.md
- UI 디자인: @.claude/skills/ui-design-system/SKILL.md
