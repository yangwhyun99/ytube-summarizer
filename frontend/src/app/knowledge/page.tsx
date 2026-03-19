"use client";

import { useEffect, useState } from "react";
import {
  Youtube,
  BookOpen,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface KnowledgeBaseItem {
  id: string;
  title: string;
  description: string;
  section_count: number;
  source_count: number;
  created_at: string;
  updated_at: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function KnowledgeListPage() {
  const [bases, setBases] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchBases = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge`);
      if (res.ok) setBases(await res.json());
    } catch {
      // 서버 미실행 시 무시
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBases();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDesc }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewDesc("");
        setShowCreate(false);
        await fetchBases();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 종합본을 삭제하시겠습니까?")) return;
    const res = await fetch(`${BACKEND_URL}/api/knowledge/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setBases((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Youtube className="w-8 h-8 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900">YTSummarizer</h1>
          <span className="text-sm text-gray-500 hidden sm:inline">
            지식 종합본
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 종합본
          </button>
        </div>

        {/* 종합본 생성 폼 */}
        {showCreate && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="종합본 제목 (예: Claude Code 종합 가이드)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="설명 (선택사항)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {creating ? "생성 중..." : "생성"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
          </div>
        ) : bases.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <BookOpen className="w-16 h-16 mx-auto opacity-30" />
            <p className="mt-4 text-lg">아직 종합본이 없습니다</p>
            <p className="mt-1 text-sm">
              종합본을 만들고, 영상 요약을 병합하여 지식을 축적하세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bases.map((kb) => (
              <div
                key={kb.id}
                className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center gap-4"
              >
                <BookOpen className="w-10 h-10 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/knowledge/${kb.id}`}
                    className="font-semibold text-gray-900 hover:text-red-600 truncate block"
                  >
                    {kb.title}
                  </Link>
                  {kb.description && (
                    <p className="text-sm text-gray-500 truncate">
                      {kb.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>{kb.section_count}개 섹션</span>
                    <span>{kb.source_count}개 영상</span>
                    <span>
                      {new Date(kb.updated_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(kb.id)}
                  title="삭제"
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
