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
      <header className="glass-header border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Youtube className="w-7 h-7 text-accent" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">YTSummarizer</h1>
          <span className="text-sm text-muted hidden sm:inline">공유된 요약</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {loading && (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
            <Link href="/" className="mt-3 inline-block text-accent hover:underline text-sm">
              홈으로 이동
            </Link>
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
                    영상 길이: {formatTime(summary.video_duration)}
                  </span>
                )}
                <span className="px-2.5 py-1 bg-card border border-border rounded-lg font-mono text-xs">
                  {new Date(summary.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              {summary.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {summary.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 bg-surface border border-border text-muted-light text-xs rounded-lg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {summary.sections.map((section, i) => (
                <div
                  key={i}
                  className="p-5 bg-card border border-border rounded-xl card-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {section.title}
                    </h3>
                    {section.timestamp_start !== null && (
                      <span className="text-sm text-accent font-mono whitespace-nowrap">
                        [{formatTime(section.timestamp_start)}
                        {section.timestamp_end !== null &&
                          ` - ${formatTime(section.timestamp_end)}`}
                        ]
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-muted-light leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-border text-center">
              <Link
                href="/"
                className="text-accent hover:underline text-sm"
              >
                YTSummarizer로 나도 영상 요약하기 →
              </Link>
            </div>
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
