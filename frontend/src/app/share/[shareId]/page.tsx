"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Youtube, Loader2 } from "lucide-react";
import Link from "next/link";

interface Section {
  title: string;
  content: string;
  timestamp_start: number | null;
  timestamp_end: number | null;
}

interface SharedSummary {
  id: string;
  title: string;
  sections: Section[];
  full_text: string;
  engine_used: string;
  video_duration: number | null;
  keyframe_count: number;
  tags: string[];
  created_at: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function formatTime(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SharedSummaryPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [summary, setSummary] = useState<SharedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/summaries/shared/${shareId}`
        );
        if (!res.ok) throw new Error("공유된 요약을 찾을 수 없습니다.");
        setSummary(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchShared();
  }, [shareId]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Youtube className="w-8 h-8 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900">YTSummarizer</h1>
          <span className="text-sm text-gray-500 hidden sm:inline">
            공유된 요약
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <Link href="/" className="mt-2 inline-block text-red-600 hover:underline text-sm">
              홈으로 이동
            </Link>
          </div>
        )}

        {summary && (
          <div className="space-y-6">
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
                <span>
                  {new Date(summary.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              {summary.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {summary.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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

            <div className="pt-4 border-t border-gray-200 text-center">
              <Link
                href="/"
                className="text-red-600 hover:underline text-sm"
              >
                YTSummarizer로 나도 영상 요약하기 →
              </Link>
            </div>
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
