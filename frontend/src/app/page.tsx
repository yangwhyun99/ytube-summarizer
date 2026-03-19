"use client";

import { useState, useEffect } from "react";
import {
  Youtube,
  Loader2,
  Settings2,
  ChevronDown,
  FileDown,
  FileText,
  History,
  BookOpen,
  ListVideo,
  User,
  LogOut,
  ArrowRight,
  Play,
  Zap,
  Globe,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface Section {
  title: string;
  content: string;
  timestamp_start: number | null;
  timestamp_end: number | null;
}

interface SummaryData {
  id: string;
  title: string;
  sections: Section[];
  full_text: string;
  engine_used: string;
  detail_level: string;
  language: string;
  video_duration: number | null;
  keyframe_count: number;
  transcript_language: string;
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function extractVideoId(videoUrl: string): string {
  const match = videoUrl.match(/(?:v=|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : "";
}

function getYoutubeTimestampUrl(videoUrl: string, seconds: number): string {
  const videoId = extractVideoId(videoUrl);
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}s`;
}

// 데모 요약 미리보기 데이터
const demoSections = [
  { title: "핵심 개념 소개", time: "0:00", content: "영상의 주요 주제와 핵심 키워드를 자동으로 추출하여 구조화된 요약을 생성합니다..." },
  { title: "실전 활용 방법", time: "5:32", content: "트랜스크립트와 키프레임을 결합하여 시각적 맥락까지 포함한 완벽한 요약..." },
  { title: "결론 및 인사이트", time: "12:47", content: "영상의 핵심 메시지를 3줄로 압축하고, 관련 태그를 자동 생성합니다..." },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [engine, setEngine] = useState("gemini");
  const [detailLevel, setDetailLevel] = useState("detailed");
  const [language, setLanguage] = useState("ko");
  const [currentUser, setCurrentUser] = useState<{ username: string; plan: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/summarize`,
        { method: "POST", headers, body: JSON.stringify({ url: url.trim(), engine, detail_level: detailLevel, language }) }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "요약 생성에 실패했습니다.");
      }
      const data: SummaryData = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ===== 헤더 ===== */}
      <header className="glass-header border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-accent fill-accent" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">YTSummarizer</h1>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <Link href="/batch" className="text-sm text-muted hover:text-foreground transition-colors duration-300 hidden sm:flex items-center gap-1.5">
              <ListVideo className="w-4 h-4" />배치
            </Link>
            <Link href="/knowledge" className="text-sm text-muted hover:text-foreground transition-colors duration-300 hidden sm:flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />종합본
            </Link>
            <Link href="/history" className="text-sm text-muted hover:text-foreground transition-colors duration-300 hidden sm:flex items-center gap-1.5">
              <History className="w-4 h-4" />저장된 요약
            </Link>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-light hidden sm:inline">
                  {currentUser.username}
                  {currentUser.plan === "premium" && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded font-mono">PRO</span>
                  )}
                </span>
                <button onClick={handleLogout} className="p-1.5 text-muted hover:text-foreground transition-colors" title="로그아웃">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="px-4 py-1.5 text-sm border border-border rounded-lg text-muted-light hover:text-foreground hover:border-border-hover transition-all duration-300">
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ===== 히어로 (요약 결과 없을 때) ===== */}
        {!loading && !summary && !error && (
          <>
            {/* 히어로 섹션 */}
            <section className="hero-glow relative">
              <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* 왼쪽: 텍스트 + CTA */}
                  <div>
                    <div className="slide-up">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-xs text-accent font-medium mb-6">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI 기반 영상 요약 플랫폼
                      </span>
                    </div>

                    <h2 className="slide-up-delay-1 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                      <span className="shimmer-text">YouTube 영상을</span>
                      <br />
                      <span className="text-foreground">3분 만에</span>
                      <br />
                      <span className="text-accent">완벽하게 요약</span>
                    </h2>

                    <p className="slide-up-delay-2 text-muted-light text-lg leading-relaxed mb-8 max-w-md">
                      트랜스크립트 추출, 키프레임 분석, AI 요약을 하나의 파이프라인으로.
                      긴 영상도 핵심만 빠르게 파악하세요.
                    </p>

                    {/* URL 입력 — 히어로 안에 통합 */}
                    <form onSubmit={handleSubmit} className="slide-up-delay-3">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent/60" />
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="YouTube URL을 붙여넣으세요"
                            className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl text-foreground placeholder-muted transition-all duration-300 text-base"
                            disabled={loading}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading || !url.trim()}
                          className="glow-btn px-7 py-4 bg-accent text-white rounded-2xl font-semibold hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 group whitespace-nowrap relative z-10"
                        >
                          요약하기
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOptions(!showOptions)}
                        className="mt-3 flex items-center gap-1.5 text-sm text-muted hover:text-muted-light transition-colors"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        고급 옵션
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showOptions ? "rotate-180" : ""}`} />
                      </button>
                      {showOptions && (
                        <div className="mt-3 grid grid-cols-3 gap-3 p-4 bg-card border border-border rounded-xl">
                          <div>
                            <label className="block text-xs font-medium text-muted-light mb-1">AI 엔진</label>
                            <select value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground">
                              <option value="gemini">Gemini (무료)</option>
                              <option value="claude">Claude (프리미엄)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-light mb-1">상세도</label>
                            <select value={detailLevel} onChange={(e) => setDetailLevel(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground">
                              <option value="brief">간략</option>
                              <option value="detailed">상세</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-light mb-1">언어</label>
                            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground">
                              <option value="ko">한국어</option>
                              <option value="en">English</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* 오른쪽: 데모 요약 미리보기 카드 */}
                  <div className="hidden lg:block">
                    <div className="float gradient-border p-6 shadow-2xl shadow-black/40">
                      {/* 카드 상단 — 가짜 영상 정보 */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                          <Play className="w-5 h-5 text-accent fill-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">AI 기술의 미래와 활용법</p>
                          <p className="text-xs text-muted font-mono">23:47 · Gemini Flash · 3개 섹션</p>
                        </div>
                      </div>

                      {/* 섹션 미리보기 */}
                      <div className="space-y-3">
                        {demoSections.map((s, i) => (
                          <div key={i} className="p-3.5 bg-surface/80 rounded-xl border border-border/60">
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                              <span className="text-xs text-accent font-mono">{s.time}</span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed line-clamp-2">{s.content}</p>
                          </div>
                        ))}
                      </div>

                      {/* 하단 액션 */}
                      <div className="mt-4 flex gap-2">
                        <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs rounded-lg font-medium">PDF 내보내기</span>
                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-lg font-medium">공유하기</span>
                        <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-xs rounded-lg font-medium">종합본에 추가</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 스탯 바 */}
            <section className="border-y border-border bg-card/50">
              <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                  <div className="count-up">
                    <p className="text-3xl font-bold text-foreground stat-glow">AI</p>
                    <p className="text-xs text-muted mt-1">Gemini & Claude 듀얼 엔진</p>
                  </div>
                  <div className="count-up" style={{ animationDelay: "0.1s" }}>
                    <p className="text-3xl font-bold text-foreground stat-glow">∞</p>
                    <p className="text-xs text-muted mt-1">영상 길이 제한 없음</p>
                  </div>
                  <div className="count-up" style={{ animationDelay: "0.2s" }}>
                    <p className="text-3xl font-bold text-accent stat-glow">5+</p>
                    <p className="text-xs text-muted mt-1">내보내기 형식</p>
                  </div>
                  <div className="count-up" style={{ animationDelay: "0.3s" }}>
                    <p className="text-3xl font-bold text-foreground stat-glow">100%</p>
                    <p className="text-xs text-muted mt-1">무료로 시작하기</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 기능 소개 카드 */}
            <section className="py-20">
              <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-14">
                  <h3 className="text-3xl font-bold text-foreground tracking-tight mb-3">어떻게 동작하나요?</h3>
                  <p className="text-muted-light max-w-lg mx-auto">URL을 입력하면 3단계 AI 파이프라인이 영상을 분석합니다</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Step 1 */}
                  <div className="group gradient-border p-7 card-hover cursor-default">
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                        <Globe className="w-6 h-6 text-accent" strokeWidth={1.5} />
                      </div>
                      <div className="text-xs text-accent font-mono mb-2">STEP 01</div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">트랜스크립트 추출</h4>
                      <p className="text-sm text-muted leading-relaxed">
                        자동자막, 수동자막을 우선 추출하고 없으면 Whisper AI로 음성을 직접 인식합니다.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="group gradient-border p-7 card-hover cursor-default">
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-500/20 transition-colors">
                        <Zap className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
                      </div>
                      <div className="text-xs text-blue-400 font-mono mb-2">STEP 02</div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">키프레임 분석</h4>
                      <p className="text-sm text-muted leading-relaxed">
                        영상의 장면 전환을 감지하여 핵심 프레임을 캡처하고, 텍스트와 함께 AI에 전달합니다.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="group gradient-border p-7 card-hover cursor-default">
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition-colors">
                        <Sparkles className="w-6 h-6 text-purple-400" strokeWidth={1.5} />
                      </div>
                      <div className="text-xs text-purple-400 font-mono mb-2">STEP 03</div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">AI 요약 생성</h4>
                      <p className="text-sm text-muted leading-relaxed">
                        Gemini 또는 Claude가 섹션별로 구조화된 요약을 생성하고 타임스탬프를 매핑합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 추가 기능 하이라이트 */}
            <section className="py-16 border-t border-border">
              <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-card border border-border rounded-xl card-hover">
                    <ListVideo className="w-5 h-5 text-accent mb-3" strokeWidth={1.5} />
                    <h5 className="text-sm font-semibold text-foreground mb-1">배치 처리</h5>
                    <p className="text-xs text-muted leading-relaxed">재생목록 전체를 한 번에 요약</p>
                  </div>
                  <div className="p-5 bg-card border border-border rounded-xl card-hover">
                    <BookOpen className="w-5 h-5 text-blue-400 mb-3" strokeWidth={1.5} />
                    <h5 className="text-sm font-semibold text-foreground mb-1">지식 종합본</h5>
                    <p className="text-xs text-muted leading-relaxed">여러 요약을 병합해 지식 베이스 구축</p>
                  </div>
                  <div className="p-5 bg-card border border-border rounded-xl card-hover">
                    <FileDown className="w-5 h-5 text-green-400 mb-3" strokeWidth={1.5} />
                    <h5 className="text-sm font-semibold text-foreground mb-1">PDF / DOCX 내보내기</h5>
                    <p className="text-xs text-muted leading-relaxed">요약본을 문서로 바로 저장</p>
                  </div>
                  <div className="p-5 bg-card border border-border rounded-xl card-hover">
                    <Shield className="w-5 h-5 text-purple-400 mb-3" strokeWidth={1.5} />
                    <h5 className="text-sm font-semibold text-foreground mb-1">공유 & 협업</h5>
                    <p className="text-xs text-muted leading-relaxed">링크 한 번으로 요약 공유</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===== 요약 중일 때 (로딩) ===== */}
        {loading && (
          <div className="max-w-4xl mx-auto px-6 py-8">
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent/60" />
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl text-foreground placeholder-muted" disabled />
                </div>
                <button type="submit" disabled className="px-7 py-4 bg-accent text-white rounded-2xl font-semibold opacity-50 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />요약 중...
                </button>
              </div>
            </form>
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl scale-150" />
                <Loader2 className="w-16 h-16 text-accent animate-spin relative" />
              </div>
              <p className="mt-8 text-xl font-semibold text-foreground">영상을 분석하고 있습니다</p>
              <p className="mt-2 text-muted">트랜스크립트 추출 → 키프레임 캡처 → AI 요약 생성</p>
              <div className="mt-6 flex justify-center gap-2">
                {["추출 중", "분석 중", "생성 중"].map((step, i) => (
                  <span key={i} className="px-3 py-1 bg-card border border-border rounded-full text-xs text-muted font-mono">
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== 에러 ===== */}
        {error && (
          <div className="max-w-4xl mx-auto px-6 py-8">
            <form onSubmit={handleSubmit} className="mb-6">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent/60" />
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube URL을 붙여넣으세요" className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl text-foreground placeholder-muted" />
                </div>
                <button type="submit" disabled={!url.trim()} className="glow-btn px-7 py-4 bg-accent text-white rounded-2xl font-semibold hover:bg-accent-hover disabled:opacity-30 flex items-center gap-2 transition-all group relative z-10">
                  다시 시도<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
            <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl">
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* ===== 요약 결과 ===== */}
        {summary && (
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* 입력 폼 유지 */}
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent/60" />
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="새 URL을 입력하세요" className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl text-foreground placeholder-muted transition-all duration-300" />
                </div>
                <button type="submit" disabled={loading || !url.trim()} className="glow-btn px-7 py-4 bg-accent text-white rounded-2xl font-semibold hover:bg-accent-hover disabled:opacity-30 flex items-center gap-2 transition-all group relative z-10">
                  요약하기<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{summary.title}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs rounded-lg font-mono">{summary.engine_used}</span>
                  {summary.video_duration && <span className="px-2.5 py-1 bg-card border border-border text-muted text-xs rounded-lg font-mono">{formatTime(summary.video_duration)}</span>}
                  {summary.keyframe_count > 0 && <span className="px-2.5 py-1 bg-card border border-border text-muted text-xs rounded-lg font-mono">키프레임 {summary.keyframe_count}장</span>}
                  <span className="px-2.5 py-1 bg-card border border-border text-muted text-xs rounded-lg font-mono">자막: {summary.transcript_language}</span>
                </div>
                {summary.id && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/export/${summary.id}/pdf`, "_blank")}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-xl hover:bg-card text-muted-light transition-all"
                    >
                      <FileDown className="w-4 h-4" />PDF
                    </button>
                    <button
                      onClick={() => window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/export/${summary.id}/docx`, "_blank")}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-xl hover:bg-card text-muted-light transition-all"
                    >
                      <FileText className="w-4 h-4" />DOCX
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {summary.sections.map((section, i) => (
                  <div key={i} className="p-5 bg-card border border-border rounded-xl card-hover">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                      {section.timestamp_start !== null && (
                        <a
                          href={getYoutubeTimestampUrl(url, section.timestamp_start)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-accent font-mono whitespace-nowrap hover:text-accent-hover hover:underline transition-colors"
                        >
                          [{formatTime(section.timestamp_start)}{section.timestamp_end !== null && ` - ${formatTime(section.timestamp_end)}`}]
                        </a>
                      )}
                    </div>
                    <p className="mt-3 text-muted-light leading-relaxed whitespace-pre-wrap">{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== 푸터 ===== */}
      <footer className="border-t border-border bg-[#05080f]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-accent/20 rounded-md flex items-center justify-center">
                <Play className="w-3 h-3 text-accent fill-accent" />
              </div>
              <span className="text-sm font-medium text-muted-light">YTSummarizer</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted">
              <Link href="/batch" className="hover:text-muted-light transition-colors">배치 처리</Link>
              <Link href="/knowledge" className="hover:text-muted-light transition-colors">지식 종합본</Link>
              <Link href="/history" className="hover:text-muted-light transition-colors">저장된 요약</Link>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-dot" />
              Powered by Gemini & Claude
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
