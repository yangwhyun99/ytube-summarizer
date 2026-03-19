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
        return { text: "업데이트", color: "bg-blue-100 text-blue-800" };
      case "new_section":
        return { text: "새 섹션", color: "bg-green-100 text-green-800" };
      default:
        return { text: action, color: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Youtube className="w-8 h-8 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900">YTSummarizer</h1>
          <span className="text-sm text-gray-500 hidden sm:inline">
            병합 리뷰
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Link
          href={`/knowledge/${kbId}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          종합본으로 돌아가기
        </Link>

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

        {merge && (
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <GitMerge className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  병합 리뷰: {merge.video_title}
                </h2>
              </div>
              <p className="text-sm text-gray-600">
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
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* 섹션 헤더 */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                      {diff.action === "new_section" ? (
                        <Plus className="w-4 h-4 text-green-600" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="font-semibold text-gray-900">
                        {diff.section_title}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${label.color}`}
                      >
                        {label.text}
                      </span>
                    </div>

                    {/* 변경 내용 */}
                    <div className="p-4">
                      {diff.action === "update" && diff.before && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-red-700 mb-2">
                            — 기존 내용
                          </h4>
                          <div className="p-3 bg-red-50 border border-red-100 rounded text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {diff.before}
                          </div>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium text-green-700 mb-2">
                          {diff.action === "update"
                            ? "+ 병합 후 내용"
                            : "+ 새 내용"}
                        </h4>
                        <div className="p-3 bg-green-50 border border-green-100 rounded text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
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
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleReview("approved")}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                  거부
                </button>
              </div>
            )}

            {merge.status !== "pending" && (
              <div
                className={`p-4 rounded-lg text-center ${
                  merge.status === "approved"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
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

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-400">
          YTSummarizer - Powered by Gemini & Claude
        </div>
      </footer>
    </div>
  );
}
