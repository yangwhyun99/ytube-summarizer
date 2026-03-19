"use client";

import { useEffect, useState } from "react";
import {
  Youtube,
  Trash2,
  FileText,
  FileDown,
  ArrowLeft,
  Search,
  Tag,
  X,
  Share2,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

interface SummaryItem {
  id: string;
  title: string;
  video_url: string;
  video_id: string;
  engine_used: string;
  detail_level: string;
  language: string;
  tags: string[];
  created_at: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function HistoryPage() {
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // 태그 편집
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  const fetchSummaries = async (tag?: string) => {
    try {
      let url = `${BACKEND_URL}/api/summaries`;
      if (tag) url += `?tag=${encodeURIComponent(tag)}`;
      const res = await fetch(url);
      if (res.ok) setSummaries(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/summaries/tags`);
      if (res.ok) setAllTags(await res.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSummaries();
    fetchTags();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchSummaries(selectedTag || undefined);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/summaries/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) setSummaries(await res.json());
    } finally {
      setSearching(false);
    }
  };

  const handleTagFilter = (tag: string | null) => {
    setSelectedTag(tag);
    setSearchQuery("");
    setLoading(true);
    fetchSummaries(tag || undefined);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 요약을 삭제하시겠습니까?")) return;
    const res = await fetch(`${BACKEND_URL}/api/summaries/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSummaries((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleExport = (id: string, format: "pdf" | "docx") => {
    window.open(`${BACKEND_URL}/api/export/${id}/${format}`, "_blank");
  };

  const handleAddTag = async (summaryId: string) => {
    if (!tagInput.trim()) return;
    const summary = summaries.find((s) => s.id === summaryId);
    if (!summary) return;

    const newTags = [...new Set([...summary.tags, tagInput.trim()])];
    const res = await fetch(`${BACKEND_URL}/api/summaries/${summaryId}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (res.ok) {
      setSummaries((prev) =>
        prev.map((s) => (s.id === summaryId ? { ...s, tags: newTags } : s))
      );
      setTagInput("");
      setEditingTagId(null);
      fetchTags();
    }
  };

  const handleRemoveTag = async (summaryId: string, tag: string) => {
    const summary = summaries.find((s) => s.id === summaryId);
    if (!summary) return;

    const newTags = summary.tags.filter((t) => t !== tag);
    const res = await fetch(`${BACKEND_URL}/api/summaries/${summaryId}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (res.ok) {
      setSummaries((prev) =>
        prev.map((s) => (s.id === summaryId ? { ...s, tags: newTags } : s))
      );
      fetchTags();
    }
  };

  const handleShare = async (id: string) => {
    const res = await fetch(`${BACKEND_URL}/api/summaries/${id}/share`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      const shareUrl = `${window.location.origin}/share/${data.share_id}`;
      await navigator.clipboard.writeText(shareUrl);
      alert(`공유 링크가 클립보드에 복사되었습니다:\n${shareUrl}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Youtube className="w-8 h-8 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900">YTSummarizer</h1>
          <span className="text-sm text-gray-500 hidden sm:inline">
            저장된 요약
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            새 요약으로 돌아가기
          </Link>
        </div>

        {/* 검색 바 */}
        <div className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="제목 또는 내용 검색"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {searching ? "검색 중..." : "검색"}
            </button>
          </div>
        </div>

        {/* 태그 필터 */}
        {allTags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => handleTagFilter(null)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                !selectedTag
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              전체
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagFilter(tag)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedTag === tag
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-12">불러오는 중...</p>
        ) : summaries.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <FileText className="w-16 h-16 mx-auto opacity-30" />
            <p className="mt-4 text-lg">
              {searchQuery
                ? "검색 결과가 없습니다"
                : "아직 저장된 요약이 없습니다"}
            </p>
            {!searchQuery && (
              <Link
                href="/"
                className="mt-3 inline-block text-red-600 hover:underline"
              >
                첫 영상을 요약해보세요
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map((s) => (
              <div
                key={s.id}
                className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* 썸네일 */}
                  <img
                    src={`https://img.youtube.com/vi/${s.video_id}/mqdefault.jpg`}
                    alt=""
                    className="w-28 h-16 object-cover rounded hidden sm:block"
                  />

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/summary/${s.id}`}
                      className="font-semibold text-gray-900 hover:text-red-600 truncate block"
                    >
                      {s.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>{s.engine_used}</span>
                      <span>
                        {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>

                  {/* 액션 */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleShare(s.id)}
                      title="공유 링크"
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExport(s.id, "pdf")}
                      title="PDF 내보내기"
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExport(s.id, "docx")}
                      title="DOCX 내보내기"
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      title="삭제"
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 태그 */}
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {(s.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(s.id, tag)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {editingTagId === s.id ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddTag(s.id)
                        }
                        placeholder="태그 입력"
                        className="w-24 px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-900"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddTag(s.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        추가
                      </button>
                      <button
                        onClick={() => {
                          setEditingTagId(null);
                          setTagInput("");
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingTagId(s.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded-full transition-colors"
                    >
                      <Tag className="w-3 h-3" />
                      태그
                    </button>
                  )}
                </div>
              </div>
            ))}
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
