"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Youtube,
  ArrowLeft,
  FileDown,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Section {
  title: string;
  content: string;
  timestamp_start: number | null;
  timestamp_end: number | null;
}

interface SummaryDetail {
  id: string;
  title: string;
  video_url: string;
  video_id: string;
  sections: Section[];
  full_text: string;
  engine_used: string;
  detail_level: string;
  language: string;
  video_duration: number | null;
  keyframe_count: number;
  transcript_language: string;
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

export default function SummaryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [summary, setSummary] = useState<SummaryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/summaries/${id}`);
        if (!res.ok) throw new Error("요약을 찾을 수 없습니다.");
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [id]);

  const handleExport = (format: "pdf" | "docx") => {
    window.open(`${BACKEND_URL}/api/export/${id}/${format}`, "_blank");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Youtube className="w-8 h-8 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900">YTSummarizer</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/history"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로 돌아가기
          </Link>

          {summary && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport("pdf")}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => handleExport("docx")}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                DOCX
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
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
                {summary.keyframe_count > 0 && (
                  <span>키프레임: {summary.keyframe_count}장</span>
                )}
                <span>
                  {new Date(summary.created_at).toLocaleDateString("ko-KR")}
                </span>
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
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-400">
          YTSummarizer - Powered by Gemini & Claude
        </div>
      </footer>
    </div>
  );
}
