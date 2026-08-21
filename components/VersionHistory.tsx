"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, Sparkles, Pencil, Undo2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { listVersions, restoreVersion, type ProjectVersion } from "@/lib/actions/versions";
import type { Plan, VirtualFS } from "@/lib/agent/types";

function kindMeta(kind: ProjectVersion["kind"]) {
  if (kind === "generate") return { Icon: Sparkles, className: "text-aurora-violet", label: "Generated" };
  if (kind === "restore") return { Icon: Undo2, className: "text-aurora-amber", label: "Restored" };
  return { Icon: Pencil, className: "text-aurora-cyan", label: "Edited" };
}

export default function VersionHistory({
  projectId,
  refreshKey,
  onRestore,
}: {
  projectId: string;
  refreshKey: number;
  onRestore: (plan: Plan, files: VirtualFS) => void;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listVersions(projectId).then((v) => {
      if (!cancelled) {
        setVersions(v);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  async function handleRestore(versionId: string) {
    setRestoringId(versionId);
    const result = await restoreVersion(projectId, versionId);
    setRestoringId(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onRestore(result.plan, result.files);
    toast.success("Restored that version");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-muted" />
          Version history
          {versions.length > 0 && <span className="text-muted">({versions.length})</span>}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-muted" />}
      </button>

      {open && (
        <div className="max-h-72 space-y-0.5 overflow-y-auto border-t border-border p-2 scrollbar-thin">
          {loading && (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history...
            </div>
          )}
          {!loading && versions.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted">No snapshots yet - one is taken every generate/edit.</div>
          )}
          {versions.map((v, idx) => {
            const { Icon, className, label } = kindMeta(v.kind);
            const isCurrent = idx === 0;
            return (
              <div
                key={v.id}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/[0.03]"
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${className}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{v.label || label}</span>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-muted">
                        current
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted">{new Date(v.createdAt).toLocaleString()}</div>
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => handleRestore(v.id)}
                    disabled={restoringId !== null}
                    className="tap flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {restoringId === v.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    Restore
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
