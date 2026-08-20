"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronRight, FilePlus2, FileDiff, Loader2 } from "lucide-react";
import DiffView from "./DiffView";
import { diffLines, diffStats } from "@/lib/diff";

export interface PendingChange {
  path: string;
  /** null means this is a brand-new file, not a modification. */
  oldContent: string | null;
  newContent: string;
}

export default function DiffReviewPanel({
  changes,
  onAccept,
  onDiscard,
  applying,
}: {
  changes: PendingChange[];
  onAccept: () => void;
  onDiscard: () => void;
  applying?: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Auto-expand the first file so the review isn't hidden behind a click.
    return changes[0] ? { [changes[0].path]: true } : {};
  });

  function toggle(path: string) {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-aurora-cyan/30 bg-surface shadow-[0_8px_30px_rgba(34,211,238,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-white/[0.02] px-3 py-2.5">
        <div>
          <p className="text-xs font-medium text-foreground">
            Review changes · {changes.length} file{changes.length === 1 ? "" : "s"}
          </p>
          <p className="text-[10px] text-muted">Like a mini code review - nothing is saved until you apply it.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDiscard}
            disabled={applying}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Discard
          </button>
          <button
            onClick={onAccept}
            disabled={applying}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:pointer-events-none disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Apply changes
          </button>
        </div>
      </div>

      <div className="max-h-[440px] divide-y divide-border overflow-y-auto scrollbar-thin">
        {changes.map((change) => {
          const isNew = change.oldContent === null;
          const stats = diffStats(diffLines(change.oldContent ?? "", change.newContent));
          const open = expanded[change.path] ?? false;

          return (
            <div key={change.path}>
              <button
                onClick={() => toggle(change.path)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/[0.03]"
              >
                {open ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                )}
                {isNew ? (
                  <FilePlus2 className="h-3.5 w-3.5 shrink-0 text-aurora-cyan" />
                ) : (
                  <FileDiff className="h-3.5 w-3.5 shrink-0 text-aurora-amber" />
                )}
                <span className="flex-1 truncate font-mono">{change.path}</span>
                {isNew ? (
                  <span className="shrink-0 text-[10px] font-medium text-aurora-cyan">new file</span>
                ) : (
                  <span className="shrink-0 font-mono text-[10px]">
                    <span className="text-emerald-400">+{stats.added}</span>{" "}
                    <span className="text-rose-400">-{stats.removed}</span>
                  </span>
                )}
              </button>
              {open && <DiffView oldContent={change.oldContent ?? ""} newContent={change.newContent} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
