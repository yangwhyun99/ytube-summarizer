"use client";

import { useEffect, useState } from "react";
import { Youtube, Trash2, FileText, FileDown, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface SummaryItem {
  id: string;
  title: string;
  video_url: string;
  video_id: string;
  engine_used: string;
  detail_level: string;
  language: string;
  created_at: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function HistoryPage() {
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummaries = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/summaries`);
      if (res.ok) {
        const data = await res.json();
        setSummaries(data);
      }
    } catch {
      // 서버 미실행 시 무시
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
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
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            새 요약으로 돌아가기
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-12">불러오는 중...</p>
        ) : summaries.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <FileText className="w-16 h-16 mx-auto opacity-30" />
            <p className="mt-4 text-lg">아직 저장된 요약이 없습니다</p>
            <Link
              href="/"
              className="mt-3 inline-block text-red-600 hover:underline"
            >
              첫 영상을 요약해보세요
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map((s) => (
              <div
                key={s.id}
                className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center gap-4"
              >
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
