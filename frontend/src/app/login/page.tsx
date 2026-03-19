"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister
        ? { email, username, password }
        : { email, password };

      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "오류가 발생했습니다.");
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="glass-nav fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl rounded-2xl flex items-center gap-3 px-8 py-4 z-50">
        <div className="flex items-center gap-3 w-full">
          <Link href="/" className="text-xl font-black tracking-tighter text-accent font-headline">YTSummarizer</Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pt-24">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors duration-300 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>

          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2 font-headline">
            {isRegister ? "회원가입" : "로그인"}
          </h2>
          <p className="text-muted mb-8">
            {isRegister
              ? "계정을 만들고 프리미엄 기능을 이용하세요"
              : "계정에 로그인하세요"}
          </p>

          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-light mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted transition-colors duration-300"
                placeholder="email@example.com"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">
                  사용자명
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted transition-colors duration-300"
                  placeholder="사용자명"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-light mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted transition-colors duration-300"
                placeholder="6자 이상"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover disabled:opacity-40 flex items-center justify-center gap-2 transition-all duration-300"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isRegister ? "가입하기" : "로그인"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-sm text-muted hover:text-accent transition-colors duration-300"
            >
              {isRegister
                ? "이미 계정이 있으신가요? 로그인"
                : "계정이 없으신가요? 회원가입"}
            </button>
          </div>
        </div>
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
