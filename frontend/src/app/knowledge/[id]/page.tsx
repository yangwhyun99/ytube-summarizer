"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Youtube,
  ArrowLeft,
  Loader2,
  BookOpen,
  Plus,
  GitMerge,
  Clock,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

interface KnowledgeSection {
  id: string;
  section_title: string;
  section_order: number;
  content: string;
  source_video_ids: string[];
  updated_at: string;
}

interface KnowledgeBaseDetail {
  id: string;
  title: string;
  description: string;
  sections: KnowledgeSection[];
  source_summary_ids: string[];
  created_at: string;
  updated_at: string;
}

interface SummaryItem {
  id: string;
  title: string;
  video_id: string;
  engine_used: string;
  created_at: string;
}

interface MergeHistoryItem {
  id: string;
  video_summary_id: string;
  video_title: string;
  changes_diff: { section_title: string; action: string; before: string | null; after: string }[];
  status: string;
  created_at: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function KnowledgeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kbId = params.id as string;

  const [kb, setKb] = useState<KnowledgeBaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showMerge, setShowMerge] = useState(false);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [selectedSummary, setSelectedSummary] = useState("");
  const [merging, setMerging] = useState(false);

  const [mergeHistories, setMergeHistories] = useState<MergeHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchKb = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge/${kbId}`);
      if (!res.ok) throw new Error("종합본을 찾을 수 없습니다.");
      setKb(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaries = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/summaries`);
      if (res.ok) setSummaries(await res.json());
    } catch {
      // ignore
    }
  };

  const fetchMergeHistories = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge/${kbId}/merges`);
      if (res.ok) setMergeHistories(await res.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchKb();
    fetchMergeHistories();
  }, [kbId]);

  const handleStartMerge = async () => {
    if (!selectedSummary) return;
    setMerging(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge/${kbId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary_id: selectedSummary }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "병합 실패");
      }
      const mergeResult = await res.json();
      router.push(`/knowledge/${kbId}/merge/${mergeResult.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "병합 중 오류 발생");
    } finally {
      setMerging(false);
    }
  };

  const handleOpenMergePanel = () => {
    setShowMerge(true);
    fetchSummaries();
  };

  const availableSummaries = summaries.filter(
    (s) => !kb?.source_summary_ids.includes(s.id)
  );

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
            href="/knowledge"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            종합본 목록
          </Link>

          {kb && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) fetchMergeHistories();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm border border-border rounded-xl hover:bg-card text-muted-light transition-all duration-300"
              >
                <Clock className="w-4 h-4" />
                병합 이력
              </button>
              <button
                onClick={handleOpenMergePanel}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm bg-accent text-white rounded-xl hover:bg-accent-hover transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                요약 병합
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
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 요약 병합 패널 */}
        {showMerge && kb && (
          <div className="mb-6 p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-blue-400" />
              영상 요약을 종합본에 병합
            </h3>
            {availableSummaries.length === 0 ? (
              <p className="text-sm text-muted">
                병합 가능한 요약이 없습니다. 먼저 영상을 요약하세요.
              </p>
            ) : (
              <>
                <select
                  value={selectedSummary}
                  onChange={(e) => setSelectedSummary(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground"
                >
                  <option value="">요약을 선택하세요</option>
                  {availableSummaries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.engine_used},{" "}
                      {new Date(s.created_at).toLocaleDateString("ko-KR")})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleStartMerge}
                    disabled={merging || !selectedSummary}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2 transition-all duration-300"
                  >
                    {merging ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      "병합 시작"
                    )}
                  </button>
                  <button
                    onClick={() => setShowMerge(false)}
                    className="px-5 py-2.5 border border-border text-muted-light rounded-xl text-sm hover:bg-card transition-all duration-300"
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 병합 이력 */}
        {showHistory && (
          <div className="mb-6 space-y-2">
            <h3 className="font-semibold text-foreground">병합 이력</h3>
            {mergeHistories.length === 0 ? (
              <p className="text-sm text-muted">아직 병합 이력이 없습니다.</p>
            ) : (
              mergeHistories.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between card-hover"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {h.video_title}
                    </p>
                    <p className="text-xs text-muted font-mono">
                      {new Date(h.created_at).toLocaleDateString("ko-KR")} ·{" "}
                      {h.changes_diff.length}개 변경
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.status === "pending" ? (
                      <Link
                        href={`/knowledge/${kbId}/merge/${h.id}`}
                        className="px-3 py-1.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors duration-300"
                      >
                        리뷰 대기
                      </Link>
                    ) : h.status === "approved" ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Check className="w-3 h-3" /> 승인됨
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <X className="w-3 h-3" /> 거부됨
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 종합본 내용 */}
        {kb && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <BookOpen className="w-6 h-6 text-accent" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{kb.title}</h2>
              </div>
              {kb.description && (
                <p className="text-muted-light">{kb.description}</p>
              )}
              <div className="mt-3 flex gap-3 text-sm text-muted font-mono">
                <span>{kb.sections.length}개 섹션</span>
                <span>{kb.source_summary_ids.length}개 영상 병합됨</span>
                <span>
                  최종 수정:{" "}
                  {new Date(kb.updated_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>

            {kb.sections.length === 0 ? (
              <div className="text-center text-muted py-16">
                <p className="text-muted-light">아직 섹션이 없습니다.</p>
                <p className="text-sm mt-1.5">
                  영상 요약을 병합하면 섹션이 자동으로 생성됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {kb.sections.map((section) => (
                  <div
                    key={section.id}
                    className="p-5 bg-card border border-border rounded-xl card-hover"
                  >
                    <h3 className="text-lg font-semibold text-foreground">
                      {section.section_title}
                    </h3>
                    <p className="mt-3 text-muted-light leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </p>
                    <div className="mt-3 flex gap-2 text-xs text-muted font-mono">
                      <span>출처: {section.source_video_ids.length}개 영상</span>
                      <span>
                        수정: {new Date(section.updated_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
