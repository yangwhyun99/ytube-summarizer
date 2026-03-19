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
      <header className="glass-header border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Youtube className="w-7 h-7 text-accent" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">YTSummarizer</h1>
          <span className="text-sm text-muted hidden sm:inline">지식 종합본</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            새 종합본
          </button>
        </div>

        {/* 종합본 생성 폼 */}
        {showCreate && (
          <div className="mb-6 p-5 bg-card border border-border rounded-xl space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="종합본 제목 (예: Claude Code 종합 가이드)"
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder-muted transition-colors duration-300"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="설명 (선택사항)"
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder-muted transition-colors duration-300"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-all duration-300"
              >
                {creating ? "생성 중..." : "생성"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 border border-border text-muted-light rounded-xl text-sm hover:bg-card transition-all duration-300"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          </div>
        ) : bases.length === 0 ? (
          <div className="text-center text-muted py-20">
            <BookOpen className="w-16 h-16 mx-auto opacity-20" />
            <p className="mt-4 text-lg text-muted-light">아직 종합본이 없습니다</p>
            <p className="mt-1.5 text-sm">
              종합본을 만들고, 영상 요약을 병합하여 지식을 축적하세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bases.map((kb) => (
              <div
                key={kb.id}
                className="p-4 bg-card border border-border rounded-xl card-hover flex items-center gap-4"
              >
                <BookOpen className="w-10 h-10 text-accent flex-shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/knowledge/${kb.id}`}
                    className="font-semibold text-foreground hover:text-accent truncate block transition-colors duration-300"
                  >
                    {kb.title}
                  </Link>
                  {kb.description && (
                    <p className="text-sm text-muted truncate">
                      {kb.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted font-mono">
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
                  className="p-2 text-muted hover:text-red-400 transition-colors duration-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
