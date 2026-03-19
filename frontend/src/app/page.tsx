"use client";

import { useState } from "react";
import { Youtube, Loader2, Settings2, ChevronDown } from "lucide-react";

interface Section {
  title: string;
  content: string;
  timestamp_start: number | null;
  timestamp_end: number | null;
}

interface SummaryData {
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

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const [engine, setEngine] = useState("gemini");
  const [detailLevel, setDetailLevel] = useState("detailed");
  const [language, setLanguage] = useState("ko");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/summarize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            engine,
            detail_level: detailLevel,
            language,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "요약 생성에 실패했습니다.");
      }

      const data: SummaryData = await res.json();
      setSummary(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Youtube className="w-8 h-8 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900">YTSummarizer</h1>
          <span className="text-sm text-gray-500 hidden sm:inline">
            YouTube 영상 AI 요약
          </span>
        </div>
      </header>

      {/* 메인 */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* URL 입력 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube URL을 붙여넣으세요"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">요약 중...</span>
                </>
              ) : (
                "요약하기"
              )}
            </button>
          </div>

          {/* 옵션 토글 */}
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            옵션
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showOptions ? "rotate-180" : ""}`}
            />
          </button>

          {showOptions && (
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
        </form>

        {/* 로딩 */}
        {loading && (
          <div className="mt-12 text-center">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">영상을 분석하고 있습니다...</p>
            <p className="mt-1 text-sm text-gray-400">
              영상 길이에 따라 1~3분 소요될 수 있습니다
            </p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 요약 결과 */}
        {summary && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {summary.title}
              </h2>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                <span>엔진: {summary.engine_used}</span>
                {summary.video_duration && (
                  <span>
                    영상 길이: {formatTime(summary.video_duration)}
                  </span>
                )}
                {summary.keyframe_count > 0 && (
                  <span>키프레임: {summary.keyframe_count}장</span>
                )}
                <span>자막: {summary.transcript_language}</span>
              </div>
            </div>

            <div className="space-y-4">
              {summary.sections.map((section, i) => (
                <div
                  key={i}
                  className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    {section.timestamp_start !== null && (
                      <span className="text-sm text-red-600 font-mono whitespace-nowrap">
                        [{formatTime(section.timestamp_start)}
                        {section.timestamp_end !== null &&
                          ` - ${formatTime(section.timestamp_end)}`}
                        ]
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !summary && !error && (
          <div className="mt-16 text-center text-gray-400">
            <Youtube className="w-16 h-16 mx-auto opacity-30" />
            <p className="mt-4 text-lg">
              YouTube URL을 입력하면 AI가 영상을 요약합니다
            </p>
            <p className="mt-1 text-sm">
              트랜스크립트 + 키프레임 분석으로 빠짐없는 요약을 제공합니다
            </p>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-400">
          YTSummarizer - Powered by Gemini & Claude
        </div>
      </footer>
    </div>
  );
}
