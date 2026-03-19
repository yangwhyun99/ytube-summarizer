"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Youtube,
  ArrowLeft,
  Loader2,
  Check,
  X,
  GitMerge,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface DiffItem {
  section_title: string;
  action: string;
  before: string | null;
  after: string;
}

interface MergeDetail {
  id: string;
  knowledge_base_id: string;
  video_summary_id: string;
  video_title: string;
  changes_diff: DiffItem[];
  status: string;
  created_at: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function MergeReviewPage() {
  const params = useParams();
  const router = useRouter();
  const kbId = params.id as string;
  const mergeId = params.mergeId as string;

  const [merge, setMerge] = useState<MergeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMerge = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/knowledge/${kbId}/merges`);
        if (!res.ok) throw new Error("병합 이력을 불러올 수 없습니다.");
        const histories = await res.json();
        const found = histories.find(
          (h: MergeDetail) => h.id === mergeId
        );
        if (!found) throw new Error("병합을 찾을 수 없습니다.");
        setMerge(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류 발생");
      } finally {
        setLoading(false);
      }
    };
    fetchMerge();
  }, [kbId, mergeId]);

  const handleReview = async (status: "approved" | "rejected") => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/knowledge/${kbId}/merges/${mergeId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "처리 실패");
      }
      router.push(`/knowledge/${kbId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setSubmitting(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "update":
        return { text: "업데이트", color: "bg-blue-500/20 text-blue-400" };
      case "new_section":
        return { text: "새 섹션", color: "bg-green-500/20 text-green-400" };
      default:
        return { text: action, color: "bg-card text-muted-light" };
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="glass-header border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Youtube className="w-7 h-7 text-accent" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">YTSummarizer</h1>
          <span className="text-sm text-muted hidden sm:inline">병합 리뷰</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <Link
          href={`/knowledge/${kbId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors duration-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          종합본으로 돌아가기
        </Link>

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

        {merge && (
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <GitMerge className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-foreground">
                  병합 리뷰: {merge.video_title}
                </h2>
              </div>
              <p className="text-sm text-muted-light">
                아래 변경사항을 검토하고 승인 또는 거부하세요.
                {merge.changes_diff.length}개의 변경이 감지되었습니다.
              </p>
            </div>

            {/* Diff 목록 */}
            <div className="space-y-4">
              {merge.changes_diff.map((diff, i) => {
                const label = getActionLabel(diff.action);
                return (
                  <div
                    key={i}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    {/* 섹션 헤더 */}
                    <div className="px-5 py-3.5 bg-card border-b border-border flex items-center gap-2">
                      {diff.action === "new_section" ? (
                        <Plus className="w-4 h-4 text-green-400" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="font-semibold text-foreground">
                        {diff.section_title}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs rounded-lg ${label.color}`}
                      >
                        {label.text}
                      </span>
                    </div>

                    {/* 변경 내용 */}
                    <div className="p-5 bg-surface">
                      {diff.action === "update" && diff.before && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-red-400 mb-2">
                            — 기존 내용
                          </h4>
                          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-muted-light whitespace-pre-wrap leading-relaxed">
                            {diff.before}
                          </div>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium text-green-400 mb-2">
                          {diff.action === "update"
                            ? "+ 병합 후 내용"
                            : "+ 새 내용"}
                        </h4>
                        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl text-sm text-muted-light whitespace-pre-wrap leading-relaxed">
                          {diff.after}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 승인/거부 버튼 */}
            {merge.status === "pending" && (
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => handleReview("approved")}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-40 transition-all duration-300"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  승인 — 종합본에 반영
                </button>
                <button
                  onClick={() => handleReview("rejected")}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 border border-border text-muted-light rounded-xl font-medium hover:bg-card disabled:opacity-40 transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                  거부
                </button>
              </div>
            )}

            {merge.status !== "pending" && (
              <div
                className={`p-5 rounded-xl text-center ${
                  merge.status === "approved"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {merge.status === "approved"
                  ? "이 병합은 이미 승인되었습니다."
                  : "이 병합은 거부되었습니다."}
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
