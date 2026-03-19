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
import SummaryContent from "../../components/SummaryContent";

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

function getYoutubeTimestampUrl(videoId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}s`;
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
      <header className="glass-header border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Youtube className="w-7 h-7 text-accent" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">YTSummarizer</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로 돌아가기
          </Link>

          {summary && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport("pdf")}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm border border-border rounded-xl hover:bg-card text-muted-light transition-all duration-300"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => handleExport("docx")}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm border border-border rounded-xl hover:bg-card text-muted-light transition-all duration-300"
              >
                <FileText className="w-4 h-4" />
                DOCX
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {summary && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {summary.title}
              </h2>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                <span className="px-2.5 py-1 bg-card border border-border rounded-lg font-mono text-xs">
                  {summary.engine_used}
                </span>
                {summary.video_duration && (
                  <span className="px-2.5 py-1 bg-card border border-border rounded-lg font-mono text-xs">
                    {formatTime(summary.video_duration)}
                  </span>
                )}
                {summary.keyframe_count > 0 && (
                  <span className="px-2.5 py-1 bg-card border border-border rounded-lg font-mono text-xs">
                    키프레임 {summary.keyframe_count}장
                  </span>
                )}
                <span className="px-2.5 py-1 bg-card border border-border rounded-lg font-mono text-xs">
                  {new Date(summary.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>

            <SummaryContent sections={summary.sections} videoId={summary.video_id} />
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
