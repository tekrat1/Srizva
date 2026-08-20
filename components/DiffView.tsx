"use client";

import { diffLines } from "@/lib/diff";

const MAX_VISIBLE_LINES = 600;

export default function DiffView({
  oldContent,
  newContent,
}: {
  oldContent: string;
  newContent: string;
}) {
  const diff = diffLines(oldContent, newContent);
  const visible = diff.slice(0, MAX_VISIBLE_LINES);
  const hidden = diff.length - visible.length;

  return (
    <pre className="max-h-96 overflow-auto bg-black/20 text-xs leading-relaxed scrollbar-thin">
      <code>
        {visible.map((line, i) => {
          const marker = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
          const rowClass =
            line.type === "add"
              ? "bg-emerald-500/10 text-emerald-300"
              : line.type === "remove"
                ? "bg-rose-500/10 text-rose-300"
                : "text-muted";
          return (
            <div key={i} className={`flex whitespace-pre px-3 ${rowClass}`}>
              <span className="mr-2 w-3 shrink-0 select-none opacity-70">{marker}</span>
              <span className="flex-1">{line.text.length ? line.text : "\u00A0"}</span>
            </div>
          );
        })}
        {hidden > 0 && (
          <div className="px-3 py-1 text-muted">… {hidden} more line(s) not shown</div>
        )}
      </code>
    </pre>
  );
}
