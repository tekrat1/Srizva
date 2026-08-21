"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import { toast } from "sonner";
import type { Plan, UsageTotals, VirtualFS } from "@/lib/agent/types";
import { updateProject } from "@/lib/actions/projects";
import { createVersion } from "@/lib/actions/versions";
import FileTree from "./FileTree";
import LivePreview from "./LivePreview";
import DownloadZipButton from "./DownloadZipButton";
import DiffReviewPanel, { type PendingChange } from "./DiffReviewPanel";
import VersionHistory from "./VersionHistory";
import ShareButton from "./ShareButton";

export default function ProjectViewer({
  id,
  plan: initialPlan,
  files: initialFiles,
  isPublic,
  shareId,
  initialLocked = false,
  initialResetsInMs = null,
}: {
  id: string;
  plan: Plan;
  files: VirtualFS;
  isPublic?: boolean;
  shareId?: string;
  initialLocked?: boolean;
  initialResetsInMs?: number | null;
}) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [files, setFiles] = useState<VirtualFS>(initialFiles);
  const [editInstruction, setEditInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [locked, setLocked] = useState(initialLocked);
  // Kept for potential future "resets in Xh" messaging.
  void initialResetsInMs;
  const [applying, setApplying] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [versionRefresh, setVersionRefresh] = useState(0);
  const filesRef = useRef<VirtualFS>(initialFiles);
  const planRef = useRef<Plan>(initialPlan);
  const lastInstructionRef = useRef("");
  // Same pattern as GenerationWorkbench's edit flow: capture how long the
  // edit took and what usage it reported so acceptChanges can feed both
  // into updateProject — without this, edits made from /project/[id]
  // silently drop their usage/timing and never show up in stats or the
  // /usage cost dashboard.
  const editStartRef = useRef(0);
  const editUsageRef = useRef<UsageTotals | null>(null);

  // Next.js reuses this client component instance when navigating between
  // /project/[id] routes (same position in the tree), so the `files` state
  // above only picks up `initialFiles` on the very first mount. Without this,
  // opening project B after project A keeps showing project A's files/preview
  // (and Download ZIP exports project A's code) even though the heading and
  // description above correctly switch to project B, because those are read
  // straight from the `plan` prop instead of local state. Re-sync whenever
  // the project id actually changes.
  useEffect(() => {
    setFiles(initialFiles);
    filesRef.current = initialFiles;
    setPlan(initialPlan);
    planRef.current = initialPlan;
    setView("preview");
    setLog([]);
    setPendingChanges([]);
    setLocked(initialLocked);
  }, [id, initialFiles, initialPlan, initialLocked]);

  function appendLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editInstruction.trim() || editing || locked) return;

    setEditing(true);
    setLog([]);
    setPendingChanges([]);
    lastInstructionRef.current = editInstruction;
    editStartRef.current = Date.now();
    editUsageRef.current = null;
    appendLog(`Applying edit: "${editInstruction}"`);

    const pending: PendingChange[] = [];

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: editInstruction, files: filesRef.current, plan: planRef.current }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429 || body.locked) {
          setLocked(true);
        }
        throw new Error(body.error || "Failed to apply edit");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const event = JSON.parse(part.slice(6));

          switch (event.type) {
            case "rate_limited":
              appendLog(event.message);
              toast.warning(event.message);
              break;
            case "status":
              appendLog(event.message);
              break;
            case "file_start":
              appendLog(`[${event.index}/${event.total}] Drafting ${event.path}...`);
              break;
            case "qa_issue":
              appendLog(
                `Self-QA: ${event.path} needs a fix (attempt ${event.attempt}) — ${event.issues.join("; ")}`
              );
              break;
            case "qa_pass":
              appendLog(`Self-QA passed: ${event.path}`);
              break;
            case "file_done": {
              const oldContent = filesRef.current[event.path] ?? null;
              const idx = pending.findIndex((p) => p.path === event.path);
              const change: PendingChange = { path: event.path, oldContent, newContent: event.content };
              if (idx >= 0) pending[idx] = change;
              else pending.push(change);
              setPendingChanges([...pending]);
              break;
            }
            case "done":
              appendLog(
                `Draft ready — review ${pending.length} changed file${pending.length === 1 ? "" : "s"} below.`
              );
              editUsageRef.current = event.usage;
              setLocked(true);
              break;
            case "error":
              appendLog(`Error: ${event.message}`);
              toast.error(event.message);
              break;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Edit failed";
      appendLog(`Error: ${message}`);
      toast.error(message);
    } finally {
      setEditing(false);
    }
  }

  async function acceptChanges() {
    if (pendingChanges.length === 0) return;
    setApplying(true);

    const updated: VirtualFS = { ...filesRef.current };
    for (const change of pendingChanges) updated[change.path] = change.newContent;

    const result = await updateProject(id, planRef.current, updated, {
      tookMs: Date.now() - editStartRef.current,
      usage: editUsageRef.current ?? undefined,
    });
    if ("error" in result) {
      toast.error(result.error);
      setApplying(false);
      return;
    }

    await createVersion(id, lastInstructionRef.current || "Edit", "edit", planRef.current, updated);

    filesRef.current = updated;
    setFiles(updated);
    setPendingChanges([]);
    setEditInstruction("");
    setVersionRefresh((n) => n + 1);
    setApplying(false);
    toast.success("Changes applied");
  }

  function discardChanges() {
    setPendingChanges([]);
    appendLog("Changes discarded — nothing was saved.");
  }

  function handleRestore(restoredPlan: Plan, restoredFiles: VirtualFS) {
    setPlan(restoredPlan);
    planRef.current = restoredPlan;
    setFiles(restoredFiles);
    filesRef.current = restoredFiles;
    setPendingChanges([]);
    setLog([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{plan.name}</h1>
          <p className="mt-1 text-sm text-muted">{plan.description}</p>
        </div>
        <ShareButton projectId={id} initialIsPublic={isPublic} initialShareId={shareId} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
          <div className="flex gap-1">
            {(["preview", "code"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-3 py-1 text-xs capitalize ${
                  view === v ? "bg-primary/20 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <DownloadZipButton files={files} projectName={plan.name} />
        </div>

        <div className="h-[600px]">
          {view === "preview" ? <LivePreview files={files} /> : <FileTree files={files} />}
        </div>
      </div>

      {log.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-black/30 p-3 font-mono text-xs text-muted scrollbar-thin">
          {log.map((line, i) => {
            const isQaIssue = line.startsWith("Self-QA:") && line.includes("needs a fix");
            const isQaPass = line.startsWith("Self-QA passed");
            return (
              <div
                key={i}
                className={`flex items-start gap-1.5 ${
                  isQaIssue ? "text-amber-400" : isQaPass ? "text-emerald-400" : ""
                }`}
              >
                {isQaIssue && <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />}
                {isQaPass && <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />}
                <span>{line}</span>
              </div>
            );
          })}
        </div>
      )}

      {pendingChanges.length > 0 && (
        <DiffReviewPanel
          changes={pendingChanges}
          onAccept={acceptChanges}
          onDiscard={discardChanges}
          applying={applying}
        />
      )}

      {locked && (
        <div className="flex items-center gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            You&apos;ve used today&apos;s build. Generating and editing are both locked until
            tomorrow — come back then.
          </span>
        </div>
      )}

      <form onSubmit={handleEdit} className="flex gap-2">
        <input
          value={editInstruction}
          onChange={(e) => setEditInstruction(e.target.value)}
          placeholder="e.g. Make the add button blue and round the corners"
          disabled={editing || locked}
          className="flex-1 rounded-md border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={editing || !editInstruction.trim() || locked}
          className="flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-medium hover:bg-surface disabled:opacity-50"
        >
          {locked ? <Lock className="h-4 w-4" /> : editing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {locked ? "Locked" : "Apply edit"}
        </button>
      </form>

      <VersionHistory projectId={id} refreshKey={versionRefresh} onRestore={handleRestore} />
    </div>
  );
}
