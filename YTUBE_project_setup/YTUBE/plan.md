# YTSummarizer - Development Plan

## Current Phase: 전체 구현 완료 — 안정화 & 고도화

## Phase 1: 기반 세팅 ✅
- [x] 프로젝트 구조 생성
- [x] CLAUDE.md, plan.md 작성
- [x] MCP 서버 설정 (.vscode/mcp.json)
- [x] Skills 파일 작성
- [x] PRD 문서 완성
- [x] Git 초기화 + .gitignore
- [x] Next.js 프로젝트 생성 (frontend/)
- [x] FastAPI 프로젝트 생성 (backend/)
- [x] 기본 UI 레이아웃 (URL 입력 + 결과 표시 영역)
- [x] 환경 변수 설정 (.env)

## Phase 2: 핵심 파이프라인 ✅
- [x] 트랜스크립트 추출 모듈 (youtube-transcript-api)
- [x] Whisper fallback (자막 없는 영상용)
- [x] yt-dlp 영상 다운로드 모듈
- [x] ffmpeg scene detection 키프레임 추출 모듈
- [x] 중복/유사 프레임 제거 로직
- [x] AI 엔진 추상화 인터페이스 설계 (SummaryEngine ABC)
- [x] Gemini 2.5 Flash 연동 (기본 엔진, 무료)
- [x] Claude Sonnet 연동 (프리미엄 옵션, 유료)
- [x] 요약 생성 로직 (상세도 조절: 간략/상세)
- [x] 요약 결과 프론트엔드 표시
- [x] 타임스탬프 매핑 (요약 섹션 ↔ 영상 시간)

## Phase 3: 저장 + 내보내기 ✅
- [x] DB 연동 (SQLite + aiosqlite, async)
- [x] 요약 영구 저장 API
- [x] PDF 내보내기
- [x] DOCX 내보내기
- [x] 사용자 인증 (JWT 기반 로그인/회원가입)
- [x] 모바일 반응형 최적화

## Phase 4: 지식 병합 (Knowledge Merge) ✅
- [x] 종합본 섹션별 분리 관리 DB 구조
- [x] AI 기반 섹션 매칭 로직
- [x] 섹션 병합 로직 (중복 제거/보완/신설)
- [x] 변경 diff 리뷰 UI
- [x] 사용자 승인/수정 워크플로우
- [x] 종합본 관리 페이지

## Phase 5: 고도화 ✅
- [x] 태그/폴더 분류 시스템
- [x] 전체 검색 기능
- [x] 다국어 요약 옵션 (영어→한국어 번역 요약)
- [x] 재생목록 배치 처리
- [x] 공유 기능 (고유 URL)
- [x] 무료/유료 구분 로직 (일일 5건 제한)

## Phase 6: 안정화 & UI 고도화 (진행 중)
- [x] 다크 테마 + 애니메이션 UI 전면 적용
- [x] Gemini 모델명 업데이트 (gemini-2.5-flash)
- [x] youtube-transcript-api v1.2.4 API 변경 대응
- [x] yt-dlp PATH 문제 해결 (sys.executable -m yt_dlp)
- [x] batch-summarize 의존성 주입 버그 수정
- [x] 전체 API 통합 테스트 통과
- [ ] ffmpeg 설치 및 키프레임 추출 테스트
- [ ] 프로덕션 배포 (Vercel + Railway/Render)
- [ ] 환경 변수 분리 (.env.production)

---

## 기술 결정 로그

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-03-19 | scene detection 방식 채택 | 고정 간격보다 적은 프레임으로 더 많은 정보 캡처 |
| 2026-03-19 | 원본 키프레임 사용 (AI 이미지 생성 X) | 교육 콘텐츠에서 원본이 더 정확하고 비용 절감 |
| 2026-03-19 | 지식 병합은 섹션별 처리 | 전체 재처리 시 토큰 폭증 방지 |
| 2026-03-19 | Gemini 2.5 Flash를 기본 엔진으로 | 무료(하루 250건), 멀티모달 지원, 100만 토큰 컨텍스트 |
| 2026-03-19 | Claude Sonnet은 프리미엄 옵션 | 유료지만 더 정교한 요약, 사용자 선택 가능 |
| 2026-03-19 | AI 엔진 추상화 인터페이스 설계 | 엔진 교체/추가 용이, 향후 다른 모델도 연결 가능 |
| 2026-03-19 | SQLite + aiosqlite 사용 | 개발/프로토타입 단계에서 가볍고 설정 불필요 |
| 2026-03-19 | yt-dlp를 python -m yt_dlp로 호출 | Windows PATH 문제 회피, pip 설치만으로 동작 보장 |
| 2026-03-19 | 다크 테마 + 애니메이션 UI | NexusDev 스타일 참고, 모던하고 감각적인 UX |

## 메모
- 대상 영상: 경제학 강의, AI 활용 팁, 코딩 튜토리얼 (복잡한 영화 X)
- Gemini 기본 사용 시 비용: **$0 (무료)**
- Claude 프리미엄 사용 시 영상당: 약 300~400원
- 영상당 예상 시간: 약 1~3분
- Gemini 무료 한도: 하루 250건이면 개인 사용에 충분
- Gemini API 키: https://aistudio.google.com 에서 무료 발급 (신용카드 불필요)
