"use client";

import { useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/* ─── 타입 ─── */

interface TimestampRef {
  time: number;
  label: string;
}

interface Section {
  title: string;
  content: string;
  timestamps?: TimestampRef[];
  timestamp_start?: number | null;
  timestamp_end?: number | null;
}

interface SummaryContentProps {
  sections: Section[];
  videoId?: string;
}

/* ─── Mermaid 렌더러 ─── */

function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#1e293b",
            primaryTextColor: "#e8eaf0",
            primaryBorderColor: "#334155",
            lineColor: "#64748b",
            secondaryColor: "#1a2236",
            tertiaryColor: "#0f1629",
            fontFamily: "var(--font-geist-sans), sans-serif",
          },
        });
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, chart.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-xs text-muted p-3 bg-surface rounded-lg overflow-x-auto">${chart}</pre>`;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center [&_svg]:max-w-full"
    />
  );
}

/* ─── Markdown 커스텀 렌더러 ─── */

function useMarkdownComponents(videoId?: string): Components {
  return {
    p: ({ children }) => (
      <p className="text-muted-light leading-relaxed mb-3">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="text-foreground font-semibold">{children}</strong>
    ),
    ul: ({ children }) => (
      <ul className="space-y-1.5 mb-4 ml-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="space-y-1.5 mb-4 ml-1 list-decimal list-inside">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-muted-light leading-relaxed flex gap-2">
        <span className="text-accent mt-1.5 text-[8px] flex-shrink-0">●</span>
        <span>{children}</span>
      </li>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-border">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-surface border-b border-border">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-foreground font-semibold text-xs uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-muted-light border-t border-border/50">
        {children}
      </td>
    ),
    code: ({ className, children }) => {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match ? match[1] : "";
      const codeStr = String(children).replace(/\n$/, "");

      if (lang === "mermaid") {
        return <MermaidDiagram chart={codeStr} />;
      }

      // 인라인 코드
      if (!className) {
        return (
          <code className="bg-surface px-1.5 py-0.5 rounded text-accent font-mono text-sm">
            {children}
          </code>
        );
      }

      // 코드 블록
      return (
        <code className={`block text-sm ${className || ""}`}>{children}</code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-surface border border-border rounded-lg p-4 my-4 overflow-x-auto text-sm font-mono text-muted-light">
        {children}
      </pre>
    ),
    h1: ({ children }) => (
      <h1 className="text-xl font-bold text-foreground mt-6 mb-3">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-bold text-foreground mt-5 mb-2">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-accent/50 pl-4 my-3 text-muted italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-border/50 my-6" />,
  };
}

/* ─── 유틸 ─── */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTimestamps(section: Section): TimestampRef[] {
  if (section.timestamps && section.timestamps.length > 0) {
    return section.timestamps;
  }
  // 구 포맷 fallback
  const result: TimestampRef[] = [];
  if (section.timestamp_start != null) {
    const label =
      section.timestamp_end != null
        ? `${formatTime(section.timestamp_start)} - ${formatTime(section.timestamp_end)}`
        : formatTime(section.timestamp_start);
    result.push({ time: section.timestamp_start, label });
  }
  return result;
}

/* ─── 메인 컴포넌트 ─── */

export default function SummaryContent({ sections, videoId }: SummaryContentProps) {
  const components = useMarkdownComponents(videoId);

  const makeYoutubeLink = useCallback(
    (time: number) =>
      videoId
        ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(time)}s`
        : null,
    [videoId]
  );

  return (
    <article className="space-y-8">
      {sections.map((section, i) => {
        const timestamps = getTimestamps(section);
        return (
          <section key={i}>
            {/* 섹션 헤딩 + 타임스탬프 */}
            <div className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-2 mb-4">
              <h3 className="text-xl font-bold text-foreground">{section.title}</h3>
              {timestamps.length > 0 && (
                <div className="flex gap-2 flex-shrink-0">
                  {timestamps.map((ts, j) => {
                    const link = makeYoutubeLink(ts.time);
                    return link ? (
                      <a
                        key={j}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted font-mono hover:text-accent transition-colors whitespace-nowrap"
                        title={ts.label || `${formatTime(ts.time)}`}
                      >
                        {formatTime(ts.time)}
                      </a>
                    ) : (
                      <span key={j} className="text-xs text-muted font-mono whitespace-nowrap">
                        {formatTime(ts.time)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Markdown 본문 */}
            <div className="pl-0.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {section.content}
              </ReactMarkdown>
            </div>
          </section>
        );
      })}
    </article>
  );
}
