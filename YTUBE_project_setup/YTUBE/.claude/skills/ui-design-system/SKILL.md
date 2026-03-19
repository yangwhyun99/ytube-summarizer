---
name: ui-design-system
description: YTSummarizer 다크 테마 디자인 시스템. 컬러 팔레트, CSS 클래스, 애니메이션, 컴포넌트 패턴 등 UI 작업 시 참조하여 일관된 디자인 유지.
---

# UI Design System Skill

## 디자인 철학
- **다크 네이비 기반** 모던 UI (NexusDev 스타일 참고)
- 레드 액센트 (#ef4444) 포인트 컬러
- 글래스모피즘 + 그라디언트 보더 카드
- 부드러운 애니메이션 (float, slide-up, shimmer)
- 모바일 우선 반응형

## 컬러 팔레트 (Tailwind v4 @theme inline)

```css
@theme inline {
  --color-background: #0a0e1a;      /* 메인 배경 */
  --color-foreground: #e8eaf0;      /* 기본 텍스트 */
  --color-card: #111827;            /* 카드 배경 */
  --color-card-hover: #1a2236;      /* 카드 호버 */
  --color-border: #1e293b;          /* 기본 보더 */
  --color-border-hover: #334155;    /* 보더 호버 */
  --color-muted: #64748b;           /* 비활성 텍스트 */
  --color-muted-light: #94a3b8;     /* 연한 비활성 텍스트 */
  --color-accent: #ef4444;          /* 포인트 컬러 (레드) */
  --color-accent-hover: #dc2626;    /* 포인트 호버 */
  --color-accent-soft: #ef44441a;   /* 포인트 배경 (투명) */
  --color-surface: #0f1629;         /* 인풋/서피스 배경 */
}
```

### 주의: Tailwind v4 @theme inline에서는 `var()` 참조 사용 불가
```css
/* ❌ 잘못됨 — 색상이 적용되지 않음 */
--color-card: var(--card);

/* ✅ 올바름 — 직접 hex 값 사용 */
--color-card: #111827;
```

## CSS 유틸리티 클래스 (globals.css)

### 애니메이션
| 클래스 | 효과 |
|--------|------|
| `.float` | 위아래 떠다니는 효과 (6s) |
| `.float-delayed` | 지연된 떠다니기 (5s, 1s delay) |
| `.slide-up` | 아래→위 등장 (0.8s) |
| `.slide-up-delay-1/2/3` | 순차 등장 (0.15s 간격) |
| `.fade-in` | 페이드인 (1s) |
| `.fade-in-delay` | 지연 페이드인 (0.5s delay) |
| `.shimmer-text` | 텍스트 반짝임 효과 |
| `.pulse-dot` | 점 깜빡임 |

### 컴포넌트 스타일
| 클래스 | 용도 |
|--------|------|
| `.hero-glow` | 히어로 영역 배경 그라디언트 광채 |
| `.gradient-border` | 그라디언트 보더 카드 (레드→블루→퍼플) |
| `.glow-btn` | 호버 시 글로우 효과 버튼 |
| `.card-hover` | 카드 호버 (배경색 변경 + translateY) |
| `.glass-header` | 글래스모피즘 헤더 (blur 16px) |
| `.stat-glow` | 숫자 글로우 효과 |
| `.typing-cursor` | 타이핑 커서 애니메이션 |

## 컴포넌트 패턴

### 카드
```tsx
<div className="bg-card border border-border rounded-2xl p-6 card-hover">
  {/* content */}
</div>
```

### 그라디언트 보더 카드
```tsx
<div className="gradient-border p-8">
  <div className="relative z-10">
    {/* content */}
  </div>
</div>
```

### 액센트 버튼
```tsx
<button className="bg-accent hover:bg-accent-hover text-white font-semibold
  px-8 py-4 rounded-xl glow-btn transition-all duration-300">
  버튼 텍스트
</button>
```

### 인풋 필드
```tsx
<input className="flex-1 bg-surface border border-border rounded-xl px-6 py-4
  text-foreground placeholder-muted focus:border-accent outline-none
  transition-all duration-300" />
```

### 글래스 헤더
```tsx
<header className="glass-header fixed top-0 w-full z-50 border-b border-border">
  {/* nav content */}
</header>
```

### 배지/태그
```tsx
<span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium">
  태그
</span>
```

### 메타데이터 표시
```tsx
<span className="flex items-center gap-1 bg-card px-3 py-1.5 rounded-lg text-sm">
  <Icon className="w-4 h-4 text-accent" />
  <span className="text-muted-light">라벨</span>
</span>
```

## 페이지 레이아웃 패턴

### 기본 페이지 구조
```tsx
<div className="min-h-screen bg-background text-foreground">
  {/* 헤더 */}
  <header className="glass-header ...">...</header>

  {/* 메인 콘텐츠 (헤더 높이만큼 pt) */}
  <main className="pt-20 pb-12 px-4">
    <div className="max-w-4xl mx-auto">
      {/* content */}
    </div>
  </main>
</div>
```

### 히어로 섹션 (메인 페이지)
```tsx
<section className="hero-glow min-h-[85vh] flex items-center">
  <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
    {/* 좌: 타이틀 + 인풋 */}
    {/* 우: 데모 카드 (float 애니메이션) */}
  </div>
</section>
```

## 반응형 브레이크포인트
- `sm:` (640px) — 모바일 가로
- `md:` (768px) — 태블릿
- `lg:` (1024px) — 데스크탑

## 모바일 최적화
- 터치 최적화: `-webkit-tap-highlight-color: transparent`
- 인풋 폰트 사이즈 16px (모바일 줌 방지)
- safe-area-inset 대응 (노치/하단 바)

## 아이콘
- `lucide-react` 사용
- 크기: `w-4 h-4` (인라인), `w-5 h-5` (버튼 내), `w-8 h-8` (카드 아이콘)
- 포인트 아이콘 색상: `text-accent`
