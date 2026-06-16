/**
 * Minimal markdown renderer for AI concierge messages.
 * Supports: **bold**, *italic*, `code`, [text](url), bullet lists, numbered lists, paragraphs.
 * Intentionally tiny — avoids pulling in a full markdown/react-markdown dep.
 */

import type { ReactNode } from "react";
import { normalizeSafeUrl } from "@/lib/safe-url";

type Segment =
  | { type: "text"; value: string }
  | { type: "bold"; children: Segment[] }
  | { type: "italic"; children: Segment[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: Segment[] };

function parseInline(text: string): Segment[] {
  const out: Segment[] = [];
  let rest = text;
  const patterns: Array<{
    re: RegExp;
    build: (m: RegExpExecArray) => Segment;
  }> = [
    {
      re: /\[([^\]]+)\]\(([^)\s]+)\)/,
      build: (m) => ({
        type: "link",
        href: m[2],
        children: parseInline(m[1]),
      }),
    },
    {
      re: /`([^`]+)`/,
      build: (m) => ({ type: "code", value: m[1] }),
    },
    {
      re: /\*\*([^*]+)\*\*/,
      build: (m) => ({ type: "bold", children: parseInline(m[1]) }),
    },
    {
      re: /(?<![*])\*([^*\s][^*]*?)\*(?![*])/,
      build: (m) => ({ type: "italic", children: parseInline(m[1]) }),
    },
  ];

  while (rest.length > 0) {
    let earliest: { index: number; match: RegExpExecArray; build: (m: RegExpExecArray) => Segment } | null = null;
    for (const p of patterns) {
      const m = p.re.exec(rest);
      if (m && (earliest === null || m.index < earliest.index)) {
        earliest = { index: m.index, match: m, build: p.build };
      }
    }
    if (!earliest) {
      out.push({ type: "text", value: rest });
      break;
    }
    if (earliest.index > 0) {
      out.push({ type: "text", value: rest.slice(0, earliest.index) });
    }
    out.push(earliest.build(earliest.match));
    rest = rest.slice(earliest.index + earliest.match[0].length);
  }
  return out;
}

function renderSegments(segments: Segment[], keyPrefix = ""): ReactNode {
  return segments.map((seg, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (seg.type) {
      case "text":
        return <span key={key}>{seg.value}</span>;
      case "bold":
        return <strong key={key}>{renderSegments(seg.children, key)}</strong>;
      case "italic":
        return <em key={key}>{renderSegments(seg.children, key)}</em>;
      case "code":
        return (
          <code
            key={key}
            className="px-1 py-0.5 rounded bg-black/5 text-[0.85em] font-mono"
          >
            {seg.value}
          </code>
        );
      case "link": {
        const safeHref = normalizeSafeUrl(seg.href);
        if (!safeHref) {
          return <span key={key}>{renderSegments(seg.children, key)}</span>;
        }
        return (
          <a
            key={key}
            href={safeHref}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2 text-[color:var(--primary,#002927)]"
          >
            {renderSegments(seg.children, key)}
          </a>
        );
      }
    }
  });
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // skip leading blank lines
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet) {
      const items: string[] = [bullet[1]];
      i++;
      while (i < lines.length) {
        const m = /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (numbered) {
      const items: string[] = [numbered[1]];
      i++;
      while (i < lines.length) {
        const m = /^\s*\d+\.\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    // paragraph — consume until blank or list
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (/^\s*$/.test(l)) break;
      if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) break;
      paraLines.push(l);
      i++;
    }
    blocks.push({ kind: "p", text: paraLines.join("\n") });
  }
  return blocks;
}

export function renderMarkdown(md: string): ReactNode {
  const blocks = parseBlocks(md);
  return blocks.map((b, i) => {
    if (b.kind === "p") {
      return (
        <p key={i} className={i > 0 ? "mt-2" : ""}>
          {renderSegments(parseInline(b.text), `p-${i}`)}
        </p>
      );
    }
    if (b.kind === "ul") {
      return (
        <ul key={i} className={`list-disc pl-4 ${i > 0 ? "mt-2" : ""}`}>
          {b.items.map((item, j) => (
            <li key={j}>{renderSegments(parseInline(item), `ul-${i}-${j}`)}</li>
          ))}
        </ul>
      );
    }
    return (
      <ol key={i} className={`list-decimal pl-4 ${i > 0 ? "mt-2" : ""}`}>
        {b.items.map((item, j) => (
          <li key={j}>{renderSegments(parseInline(item), `ol-${i}-${j}`)}</li>
        ))}
      </ol>
    );
  });
}
