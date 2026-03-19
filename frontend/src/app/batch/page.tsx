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
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Youtube className="w-8 h-8 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900">YTSummarizer</h1>
          <span className="text-sm text-gray-500 hidden sm:inline">
            배치 처리
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로 돌아가기
        </Link>

        {/* 재생목록 URL 입력 */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="YouTube 재생목록 URL을 붙여넣으세요"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 placeholder-gray-400"
              disabled={loadingList || processing}
            />
            <button
              onClick={handleLoadPlaylist}
              disabled={loadingList || !playlistUrl.trim()}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI 엔진
                </label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                >
                  <option value="gemini">Gemini Flash (무료)</option>
                  <option value="claude">Claude Sonnet (프리미엄)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상세도
                </label>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                >
                  <option value="brief">간략 요약</option>
                  <option value="detailed">상세 요약</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  요약 언어
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 영상 목록 */}
        {videos.length > 0 && !results && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {selected.size === videos.length
                    ? "전체 해제"
                    : "전체 선택"}
                </button>
                <span className="text-sm text-gray-400">
                  {selected.size}/{videos.length}개 선택
                </span>
              </div>
              <button
                onClick={handleBatchSummarize}
                disabled={processing || selected.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
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
                className={`flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer transition-colors ${
                  selected.has(v.url)
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(v.url)}
                  onChange={() => toggleVideo(v.url)}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <img
                  src={`https://img.youtube.com/vi/${v.video_id}/default.jpg`}
                  alt=""
                  className="w-20 h-12 object-cover rounded hidden sm:block"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {v.title}
                  </p>
                  {v.duration && (
                    <p className="text-xs text-gray-500">
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
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">
              {selected.size}개 영상을 순차 요약하고 있습니다...
            </p>
            <p className="mt-1 text-sm text-gray-400">
              영상당 1~3분 소요. 브라우저를 닫지 마세요.
            </p>
          </div>
        )}

        {/* 결과 */}
        {results && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">
              배치 처리 완료 —{" "}
              {results.filter((r) => r.status === "success").length}/
              {results.length}개 성공
            </h3>
            {results.map((r, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg flex items-center gap-3 ${
                  r.status === "success"
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {r.status === "success" ? (
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {r.status === "success" ? (
                    <Link
                      href={`/summary/${r.id}`}
                      className="text-sm font-medium text-green-800 hover:underline truncate block"
                    >
                      {r.title}
                    </Link>
                  ) : (
                    <p className="text-sm text-red-800 truncate">
                      {r.error || "오류 발생"}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <Link
              href="/history"
              className="inline-block mt-4 text-sm text-red-600 hover:underline"
            >
              저장된 요약 보기 →
            </Link>
          </div>
        )}

        {/* 빈 상태 */}
        {!loadingList && videos.length === 0 && !results && !processing && (
          <div className="text-center text-gray-400 py-16">
            <ListVideo className="w-16 h-16 mx-auto opacity-30" />
            <p className="mt-4 text-lg">
              YouTube 재생목록 URL을 입력하면
            </p>
            <p className="text-lg">여러 영상을 한 번에 요약합니다</p>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-400">
          YTSummarizer - Powered by Gemini & Claude
        </div>
      </footer>
    </div>
  );
}
