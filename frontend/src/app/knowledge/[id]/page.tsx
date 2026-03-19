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
import SummaryContent from "../../components/SummaryContent";

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
  const [selectedSummaries, setSelectedSummaries] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [mergeResults, setMergeResults] = useState<{ summary_id: string; status: string; title?: string; error?: string; changes?: number }[] | null>(null);

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

  const toggleSummary = (id: string) => {
    setSelectedSummaries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSummaries.size === availableSummaries.length) {
      setSelectedSummaries(new Set());
    } else {
      setSelectedSummaries(new Set(availableSummaries.map((s) => s.id)));
    }
  };

  const handleStartMerge = async () => {
    if (selectedSummaries.size === 0) return;
    setMerging(true);
    setError(null);
    setMergeResults(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge/${kbId}/batch-merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary_ids: [...selectedSummaries] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "병합 실패");
      }
      const data = await res.json();
      setMergeResults(data.results);
      // 성공 시 종합본 새로고침
      fetchKb();
      fetchMergeHistories();
      setSelectedSummaries(new Set());
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
      <header className="glass-nav fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl rounded-2xl flex items-center gap-3 px-8 py-4 z-50">
        <div className="flex items-center gap-3 w-full">
          <Link href="/" className="text-xl font-black tracking-tighter text-accent font-headline">YTSummarizer</Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 pt-24">
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
          <div className="mb-6 p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-4">
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
                <div className="flex items-center justify-between">
                  <button onClick={toggleAll} className="text-xs text-muted hover:text-foreground transition-colors">
                    {selectedSummaries.size === availableSummaries.length ? "전체 해제" : "전체 선택"}
                  </button>
                  <span className="text-xs text-muted font-mono">{selectedSummaries.size}/{availableSummaries.length} 선택</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableSummaries.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedSummaries.has(s.id)
                          ? "bg-blue-500/20 border border-blue-500/40"
                          : "bg-surface border border-border hover:border-border-hover"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSummaries.has(s.id)}
                        onChange={() => toggleSummary(s.id)}
                        className="w-4 h-4 rounded accent-blue-500"
                      />
                      <img
                        src={`https://img.youtube.com/vi/${s.video_id}/default.jpg`}
                        alt=""
                        className="w-16 h-10 object-cover rounded-lg hidden sm:block opacity-80"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted font-mono">
                          {s.engine_used} · {new Date(s.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleStartMerge}
                    disabled={merging || selectedSummaries.size === 0}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2 transition-all duration-300"
                  >
                    {merging ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {selectedSummaries.size}개 병합 중...
                      </>
                    ) : (
                      <>{selectedSummaries.size}개 병합 시작</>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowMerge(false); setMergeResults(null); }}
                    className="px-5 py-2.5 border border-border text-muted-light rounded-xl text-sm hover:bg-card transition-all duration-300"
                  >
                    닫기
                  </button>
                </div>
              </>
            )}

            {/* 병합 결과 */}
            {mergeResults && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <h4 className="text-sm font-semibold text-foreground">
                  병합 완료 — <span className="text-green-400">{mergeResults.filter(r => r.status === "success").length}</span>/{mergeResults.length}개 성공
                </h4>
                {mergeResults.map((r, i) => (
                  <div key={i} className={`text-sm flex items-center gap-2 ${r.status === "success" ? "text-green-400" : r.status === "skipped" ? "text-yellow-400" : "text-red-400"}`}>
                    {r.status === "success" ? <Check className="w-3.5 h-3.5" /> : r.status === "skipped" ? <Clock className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span className="truncate">{r.title || r.summary_id}</span>
                    {r.changes && <span className="text-muted text-xs">({r.changes}개 변경)</span>}
                    {r.error && <span className="text-xs">— {r.error}</span>}
                  </div>
                ))}
              </div>
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
              <SummaryContent
                sections={kb.sections.map((s) => ({
                  title: s.section_title,
                  content: s.content,
                }))}
              />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-[#050505]">
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
