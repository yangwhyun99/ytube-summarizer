"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Settings2,
  ChevronDown,
  FileDown,
  FileText,
  History,
  BookOpen,
  ListVideo,
  LogOut,
  ArrowRight,
  Zap,
  Globe,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import SummaryContent from "./components/SummaryContent";

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

const demoSections = [
  { num: "01", title: "핵심 개념 소개", content: "영상의 주요 주제와 핵심 키워드를 자동으로 추출하여 구조화된 요약을 생성합니다." },
  { num: "02", title: "실전 활용 방법", content: "트랜스크립트와 키프레임을 결합하여 시각적 맥락까지 포함한 완벽한 요약을 제공합니다." },
  { num: "03", title: "결론 및 인사이트", content: "영상의 핵심 메시지를 압축하고, 관련 태그를 자동으로 생성합니다." },
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
      {/* ===== 플로팅 네비게이션 ===== */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl rounded-2xl glass-nav flex justify-between items-center px-8 py-4 z-50">
        <Link href="/" className="text-2xl font-black tracking-tighter text-accent font-headline">
          YTSummarizer
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <Link href="/history" className="text-muted-light hover:text-white transition-colors text-sm">
            History
          </Link>
          <Link href="/batch" className="text-muted-light hover:text-white transition-colors text-sm">
            Batch
          </Link>
          <Link href="/knowledge" className="text-muted-light hover:text-white transition-colors text-sm">
            Knowledge
          </Link>
        </div>
        {currentUser ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-light hidden sm:inline">
              {currentUser.username}
              {currentUser.plan === "premium" && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-accent/20 text-accent text-xs rounded font-mono">PRO</span>
              )}
            </span>
            <button onClick={handleLogout} className="p-1.5 text-muted hover:text-white transition-colors" title="로그아웃">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link href="/login" className="bg-accent text-white px-6 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-transform duration-300 active:scale-95">
            Get Started
          </Link>
        )}
      </nav>

      <main className="flex-1">
        {/* ===== 히어로 (요약 결과 없을 때) ===== */}
        {!loading && !summary && !error && (
          <>
            <section className="hero-glow relative min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
                {/* 왼쪽: 콘텐츠 + 입력 */}
                <div className="lg:col-span-7 space-y-12 relative">
                  {/* 사이드 라벨 */}
                  <div className="absolute -left-12 top-0 hidden xl:block">
                    <div className="[writing-mode:vertical-lr] rotate-180 text-[0.625rem] font-bold tracking-[0.4em] text-white/20 uppercase whitespace-nowrap">
                      Editorial Futurism / AI-Summarizer / V2.4
                    </div>
                  </div>

                  <div className="space-y-6">
                    <span className="slide-up text-[0.6875rem] uppercase tracking-[0.2em] text-secondary font-bold">
                      The Future of Content Consumption
                    </span>
                    <h2 className="slide-up-delay-1 text-5xl md:text-7xl font-headline font-extrabold tracking-[-0.04em] leading-[1.1] text-white">
                      MASTER <br />YOUTUBE IN <br /><span className="text-accent">3 MINUTES.</span>
                    </h2>
                    <p className="slide-up-delay-2 text-muted-light text-lg md:text-xl max-w-xl leading-relaxed font-light">
                      시간 낭비는 이제 그만. AI가 트랜스크립트와 키프레임을 분석하여 핵심 인사이트만 골라냅니다.
                    </p>
                  </div>

                  {/* URL 입력 */}
                  <form onSubmit={handleSubmit} className="slide-up-delay-3 max-w-2xl">
                    <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-2 rounded-2xl border-b-2 border-border focus-within:border-secondary transition-all">
                      <div className="flex-1 flex items-center px-4 w-full">
                        <svg className="w-5 h-5 text-muted-light mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.07a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
                        </svg>
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="bg-transparent border-none focus:ring-0 text-white w-full text-sm placeholder:text-[#555]"
                          disabled={loading}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || !url.trim()}
                        className="w-full md:w-auto bg-accent text-white px-8 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-[0px_10px_30px_rgba(255,85,68,0.15)] disabled:opacity-30 disabled:hover:scale-100"
                      >
                        Summarize
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowOptions(!showOptions)}
                      className="mt-3 flex items-center gap-1.5 text-xs text-muted hover:text-muted-light transition-colors uppercase tracking-wider"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Options
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showOptions ? "rotate-180" : ""}`} />
                    </button>

                    {showOptions && (
                      <div className="mt-3 grid grid-cols-3 gap-3 p-4 bg-surface border border-border rounded-xl">
                        <div>
                          <label className="block text-[0.625rem] font-bold text-muted uppercase tracking-wider mb-1">Engine</label>
                          <select value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground">
                            <option value="gemini">Gemini (Free)</option>
                            <option value="claude">Claude (Pro)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[0.625rem] font-bold text-muted uppercase tracking-wider mb-1">Detail</label>
                          <select value={detailLevel} onChange={(e) => setDetailLevel(e.target.value)} className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground">
                            <option value="brief">Brief</option>
                            <option value="detailed">Detailed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[0.625rem] font-bold text-muted uppercase tracking-wider mb-1">Language</label>
                          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground">
                            <option value="ko">한국어</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                {/* 오른쪽: 아티팩트 카드 */}
                <div className="lg:col-span-5 relative mt-12 lg:mt-0 hidden lg:block">
                  <div className="absolute -top-20 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />
                  <div className="float relative bg-surface-high/40 backdrop-blur-2xl rounded-3xl p-8 border border-white/5 shadow-2xl">
                    {/* 카드 헤더 */}
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/40" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                        <div className="w-3 h-3 rounded-full bg-green-500/40" />
                      </div>
                      <span className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-light bg-white/5 px-2 py-1 rounded">AI-Analysis v2.4</span>
                    </div>

                    {/* 데모 썸네일 */}
                    <div className="aspect-video rounded-xl bg-card relative overflow-hidden mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-secondary/10" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* 데모 섹션 */}
                    <h3 className="text-lg font-headline font-bold text-white mb-4">AI 기술의 미래와 활용법</h3>
                    <div className="space-y-3">
                      {demoSections.map((s) => (
                        <div key={s.num} className="flex items-start gap-3">
                          <span className="text-secondary text-xs font-bold mt-0.5">{s.num}</span>
                          <p className="text-sm text-muted-light leading-relaxed">{s.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-5 mt-5 border-t border-white/5 flex justify-between items-center">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-background bg-surface-high flex items-center justify-center text-[10px] font-bold">AI</div>
                        <div className="w-8 h-8 rounded-full border-2 border-background bg-accent flex items-center justify-center text-[10px] font-bold text-white">YT</div>
                      </div>
                      <span className="text-[0.6875rem] font-bold text-secondary uppercase tracking-tighter">View Full Summary →</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 피처 그리드 */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border pb-8 mb-12">
                <h2 className="text-3xl font-headline font-bold text-white tracking-tight">왜 YTSummarizer 인가</h2>
                <p className="text-muted-light text-sm max-w-xs">독보적인 AI 파이프라인으로 정보를 압축합니다. 단순 요약을 넘어 인사이트를 제공합니다.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card p-8 rounded-2xl card-hover group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-lg font-headline font-bold mb-2 text-white">Fast Analysis</h4>
                  <p className="text-sm text-muted-light leading-relaxed">1시간 분량도 단 10초면 충분합니다. 영상이 끝나기도 전에 요약을 받아보세요.</p>
                </div>
                <div className="bg-card p-8 rounded-2xl card-hover group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6 text-secondary" />
                  </div>
                  <h4 className="text-lg font-headline font-bold mb-2 text-white">Key Highlights</h4>
                  <p className="text-sm text-muted-light leading-relaxed">타임스탬프와 함께 핵심 장면만 추출하여 구조화된 요약 리포트를 구성합니다.</p>
                </div>
                <div className="bg-card p-8 rounded-2xl card-hover group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-headline font-bold mb-2 text-white">Multi-Language</h4>
                  <p className="text-sm text-muted-light leading-relaxed">한국어, 영어 등 다국어 지원. 외국어 강의도 한국어로 즉시 요약합니다.</p>
                </div>
                <div className="bg-card p-8 rounded-2xl card-hover group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <FileDown className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-lg font-headline font-bold mb-2 text-white">Export to PDF</h4>
                  <p className="text-sm text-muted-light leading-relaxed">분석된 모든 내용은 고해상도 PDF, DOCX로 내보내기 가능합니다.</p>
                </div>
              </div>
            </section>

            {/* CTA 배너 */}
            <section className="px-6 pb-24 max-w-7xl mx-auto">
              <div className="bg-accent rounded-[3rem] p-12 md:p-24 overflow-hidden relative">
                <div className="relative z-10 max-w-2xl space-y-8">
                  <h2 className="text-4xl md:text-6xl font-headline font-black text-[#5c0001] leading-tight">지식의 지평을 <br />넓히는 기술.</h2>
                  <p className="text-[#5c0001]/80 text-lg font-medium">단순한 요약 서비스를 넘어, 당신의 학습 능력을 증폭시키는 인텔리전트 툴킷입니다.</p>
                  <div className="flex gap-4">
                    <Link href="/login" className="bg-[#050505] text-white px-10 py-5 rounded-2xl font-bold hover:scale-105 transition-transform">시작하기</Link>
                    <Link href="/knowledge" className="bg-transparent border-2 border-[#5c0001]/20 text-[#5c0001] px-10 py-5 rounded-2xl font-bold hover:bg-[#5c0001]/10 transition-colors">둘러보기</Link>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===== 로딩 ===== */}
        {loading && (
          <div className="max-w-4xl mx-auto px-6 pt-32 pb-8">
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-2 rounded-2xl border-b-2 border-border">
                <div className="flex-1 flex items-center px-4 w-full">
                  <input type="text" value={url} className="bg-transparent border-none focus:ring-0 text-white w-full text-sm" disabled />
                </div>
                <button disabled className="w-full md:w-auto bg-accent/50 text-white px-8 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />Analyzing...
                </button>
              </div>
            </form>
            <div className="text-center py-20">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl scale-150" />
                <Loader2 className="w-16 h-16 text-accent animate-spin relative" />
              </div>
              <p className="mt-8 text-xl font-headline font-bold text-white">영상을 분석하고 있습니다</p>
              <p className="mt-2 text-muted text-sm">트랜스크립트 추출 → 키프레임 캡처 → AI 요약 생성</p>
              <div className="mt-6 flex justify-center gap-2">
                {["EXTRACT", "ANALYZE", "GENERATE"].map((step, i) => (
                  <span key={i} className="px-3 py-1 bg-card border border-border rounded-lg text-[0.625rem] text-muted font-bold uppercase tracking-wider">
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== 에러 ===== */}
        {error && (
          <div className="max-w-4xl mx-auto px-6 pt-32 pb-8">
            <form onSubmit={handleSubmit} className="mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-2 rounded-2xl border-b-2 border-border focus-within:border-secondary transition-all">
                <div className="flex-1 flex items-center px-4 w-full">
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="bg-transparent border-none focus:ring-0 text-white w-full text-sm placeholder:text-[#555]" />
                </div>
                <button type="submit" disabled={!url.trim()} className="w-full md:w-auto bg-accent text-white px-8 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-30">
                  Retry <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
            <div className="p-5 bg-accent/10 border border-accent/30 rounded-2xl">
              <p className="text-accent font-medium text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* ===== 요약 결과 ===== */}
        {summary && (
          <div className="max-w-4xl mx-auto px-6 pt-32 pb-8">
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-2 rounded-2xl border-b-2 border-border focus-within:border-secondary transition-all">
                <div className="flex-1 flex items-center px-4 w-full">
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="새 URL을 입력하세요" className="bg-transparent border-none focus:ring-0 text-white w-full text-sm placeholder:text-[#555]" />
                </div>
                <button type="submit" disabled={loading || !url.trim()} className="w-full md:w-auto bg-accent text-white px-8 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-30">
                  Summarize <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-headline font-bold text-white tracking-tight">{summary.title}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-accent/10 text-accent text-[0.6875rem] rounded-lg font-bold uppercase tracking-wider">{summary.engine_used}</span>
                  {summary.video_duration && <span className="px-2.5 py-1 bg-card border border-border text-muted text-[0.6875rem] rounded-lg font-mono">{formatTime(summary.video_duration)}</span>}
                  {summary.keyframe_count > 0 && <span className="px-2.5 py-1 bg-card border border-border text-muted text-[0.6875rem] rounded-lg font-mono">키프레임 {summary.keyframe_count}장</span>}
                  <span className="px-2.5 py-1 bg-card border border-border text-muted text-[0.6875rem] rounded-lg font-mono">{summary.transcript_language}</span>
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

              <SummaryContent sections={summary.sections} videoId={extractVideoId(url)} />
            </div>
          </div>
        )}
      </main>

      {/* ===== 푸터 ===== */}
      <footer className="w-full py-12 px-6 bg-[#050505] border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="text-lg font-bold text-accent font-headline">YTSummarizer</div>
            <p className="text-muted text-xs leading-relaxed max-w-[200px]">
              AI로 영상을 분석하고 지식을 축적하는 가장 효율적인 방법을 제시합니다.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h5 className="text-[0.6875rem] uppercase tracking-[0.05em] text-accent font-bold">Platform</h5>
            <Link href="/history" className="text-[0.6875rem] text-muted hover:text-white transition-opacity uppercase tracking-[0.05em]">History</Link>
            <Link href="/batch" className="text-[0.6875rem] text-muted hover:text-white transition-opacity uppercase tracking-[0.05em]">Batch</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h5 className="text-[0.6875rem] uppercase tracking-[0.05em] text-accent font-bold">Features</h5>
            <Link href="/knowledge" className="text-[0.6875rem] text-muted hover:text-white transition-opacity uppercase tracking-[0.05em]">Knowledge Base</Link>
            <Link href="/login" className="text-[0.6875rem] text-muted hover:text-white transition-opacity uppercase tracking-[0.05em]">Account</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h5 className="text-[0.6875rem] uppercase tracking-[0.05em] text-accent font-bold">Support</h5>
            <span className="text-[0.6875rem] text-muted uppercase tracking-[0.05em]">Gemini & Claude</span>
            <span className="text-[0.6875rem] text-muted uppercase tracking-[0.05em]">Powered by AI</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted">© 2024 YTSummarizer. Editorial Futurism.</div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-dot" />
            System Operational
          </div>
        </div>
      </footer>
    </div>
  );
}
