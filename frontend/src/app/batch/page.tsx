"use client";

import { useState } from "react";
import {
  Youtube,
  ArrowLeft,
  Loader2,
  ListVideo,
  Check,
  X,
  Play,
} from "lucide-react";
import Link from "next/link";

interface PlaylistVideo {
  video_id: string;
  title: string;
  url: string;
  duration: number | null;
}

interface BatchResult {
  url: string;
  status: string;
  id?: string;
  title?: string;
  error?: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function BatchPage() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingList, setLoadingList] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [engine, setEngine] = useState("gemini");
  const [detailLevel, setDetailLevel] = useState("detailed");
  const [language, setLanguage] = useState("ko");

  const handleLoadPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    setLoadingList(true);
    setError(null);
    setVideos([]);
    setResults(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/playlist/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: playlistUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "재생목록 로딩 실패");
      }
      const data = await res.json();
      setVideos(data.videos);
      setSelected(new Set(data.videos.map((v: PlaylistVideo) => v.url)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoadingList(false);
    }
  };

  const toggleVideo = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selected.size === videos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(videos.map((v) => v.url)));
    }
  };

  const handleBatchSummarize = async () => {
    if (selected.size === 0) return;
    setProcessing(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/batch-summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [...selected],
          engine,
          detail_level: detailLevel,
          language,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "배치 처리 실패");
      }
      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setProcessing(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="glass-header border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Youtube className="w-7 h-7 text-accent" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">YTSummarizer</h1>
          <span className="text-sm text-muted hidden sm:inline">배치 처리</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors duration-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로 돌아가기
        </Link>

        {/* 재생목록 URL 입력 */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="YouTube 재생목록 URL을 붙여넣으세요"
              className="flex-1 px-5 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder-muted transition-colors duration-300"
              disabled={loadingList || processing}
            />
            <button
              onClick={handleLoadPlaylist}
              disabled={loadingList || !playlistUrl.trim()}
              className="px-6 py-3.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover disabled:opacity-40 flex items-center gap-2 transition-all duration-300"
            >
              {loadingList ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ListVideo className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">
                {loadingList ? "로딩..." : "불러오기"}
              </span>
            </button>
          </div>

          {/* 옵션 */}
          {videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-card border border-border rounded-xl">
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">
                  AI 엔진
                </label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-foreground"
                >
                  <option value="gemini">Gemini Flash (무료)</option>
                  <option value="claude">Claude Sonnet (프리미엄)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">
                  상세도
                </label>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-foreground"
                >
                  <option value="brief">간략 요약</option>
                  <option value="detailed">상세 요약</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">
                  요약 언어
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-foreground"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 영상 목록 */}
        {videos.length > 0 && !results && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-muted hover:text-foreground transition-colors duration-300"
                >
                  {selected.size === videos.length
                    ? "전체 해제"
                    : "전체 선택"}
                </button>
                <span className="text-sm text-muted font-mono">
                  {selected.size}/{videos.length}
                </span>
              </div>
              <button
                onClick={handleBatchSummarize}
                disabled={processing || selected.size === 0}
                className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover disabled:opacity-40 flex items-center gap-2 transition-all duration-300"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {selected.size}개 요약 시작
                  </>
                )}
              </button>
            </div>

            {videos.map((v) => (
              <label
                key={v.video_id}
                className={`flex items-center gap-3 p-3.5 bg-card border rounded-xl cursor-pointer transition-all duration-300 ${
                  selected.has(v.url)
                    ? "border-accent/50 bg-accent-soft"
                    : "border-border hover:border-border-hover"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(v.url)}
                  onChange={() => toggleVideo(v.url)}
                  className="w-4 h-4 accent-[var(--accent)] rounded"
                />
                <img
                  src={`https://img.youtube.com/vi/${v.video_id}/default.jpg`}
                  alt=""
                  className="w-20 h-12 object-cover rounded-lg hidden sm:block opacity-80"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {v.title}
                  </p>
                  {v.duration && (
                    <p className="text-xs text-muted font-mono">
                      {formatDuration(v.duration)}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {/* 처리 중 */}
        {processing && (
          <div className="text-center py-16">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl" />
              <Loader2 className="w-14 h-14 text-accent animate-spin relative" />
            </div>
            <p className="mt-6 text-foreground font-medium">
              {selected.size}개 영상을 순차 요약하고 있습니다...
            </p>
            <p className="mt-2 text-sm text-muted">
              영상당 1~3분 소요. 브라우저를 닫지 마세요.
            </p>
          </div>
        )}

        {/* 결과 */}
        {results && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">
              배치 처리 완료 —{" "}
              <span className="text-green-400">{results.filter((r) => r.status === "success").length}</span>/
              {results.length}개 성공
            </h3>
            {results.map((r, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl flex items-center gap-3 ${
                  r.status === "success"
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                {r.status === "success" ? (
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {r.status === "success" ? (
                    <Link
                      href={`/summary/${r.id}`}
                      className="text-sm font-medium text-green-300 hover:underline truncate block"
                    >
                      {r.title}
                    </Link>
                  ) : (
                    <p className="text-sm text-red-300 truncate">
                      {r.error || "오류 발생"}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <Link
              href="/history"
              className="inline-block mt-4 text-sm text-accent hover:underline"
            >
              저장된 요약 보기 →
            </Link>
          </div>
        )}

        {/* 빈 상태 */}
        {!loadingList && videos.length === 0 && !results && !processing && (
          <div className="text-center text-muted py-20">
            <ListVideo className="w-16 h-16 mx-auto opacity-20" />
            <p className="mt-4 text-lg text-muted-light">
              YouTube 재생목록 URL을 입력하면
            </p>
            <p className="text-lg text-muted-light">여러 영상을 한 번에 요약합니다</p>
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-[#05080f]">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-sm text-muted">YTSummarizer</span>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-dot" />
            Powered by Gemini & Claude
          </div>
        </div>
      </footer>
    </div>
  );
}
