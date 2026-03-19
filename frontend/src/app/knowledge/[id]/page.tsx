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

  // 병합 관련
  const [showMerge, setShowMerge] = useState(false);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [selectedSummary, setSelectedSummary] = useState("");
  const [merging, setMerging] = useState(false);

  // 병합 이력
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
      // diff 리뷰 페이지로 이동
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

  // 이미 병합된 요약 필터링
  const availableSummaries = summaries.filter(
    (s) => !kb?.source_summary_ids.includes(s.id)
  );

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
            href="/knowledge"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <Clock className="w-4 h-4" />
                병합 이력
              </button>
              <button
                onClick={handleOpenMergePanel}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                요약 병합
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
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 요약 병합 패널 */}
        {showMerge && kb && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-blue-600" />
              영상 요약을 종합본에 병합
            </h3>
            {availableSummaries.length === 0 ? (
              <p className="text-sm text-gray-500">
                병합 가능한 요약이 없습니다. 먼저 영상을 요약하세요.
              </p>
            ) : (
              <>
                <select
                  value={selectedSummary}
                  onChange={(e) => setSelectedSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
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
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors"
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
            <h3 className="font-semibold text-gray-900">병합 이력</h3>
            {mergeHistories.length === 0 ? (
              <p className="text-sm text-gray-500">아직 병합 이력이 없습니다.</p>
            ) : (
              mergeHistories.map((h) => (
                <div
                  key={h.id}
                  className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {h.video_title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(h.created_at).toLocaleDateString("ko-KR")} ·{" "}
                      {h.changes_diff.length}개 변경
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.status === "pending" ? (
                      <Link
                        href={`/knowledge/${kbId}/merge/${h.id}`}
                        className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
                      >
                        리뷰 대기
                      </Link>
                    ) : h.status === "approved" ? (
                      <span className="flex items-center gap-1 text-xs text-green-700">
                        <Check className="w-3 h-3" /> 승인됨
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-700">
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
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-bold text-gray-900">{kb.title}</h2>
              </div>
              {kb.description && (
                <p className="text-gray-500">{kb.description}</p>
              )}
              <div className="mt-2 flex gap-3 text-sm text-gray-500">
                <span>{kb.sections.length}개 섹션</span>
                <span>{kb.source_summary_ids.length}개 영상 병합됨</span>
                <span>
                  최종 수정:{" "}
                  {new Date(kb.updated_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>

            {kb.sections.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p>아직 섹션이 없습니다.</p>
                <p className="text-sm mt-1">
                  영상 요약을 병합하면 섹션이 자동으로 생성됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {kb.sections.map((section) => (
                  <div
                    key={section.id}
                    className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.section_title}
                    </h3>
                    <p className="mt-2 text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </p>
                    <div className="mt-3 flex gap-2 text-xs text-gray-400">
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

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-400">
          YTSummarizer - Powered by Gemini & Claude
        </div>
      </footer>
    </div>
  );
}
