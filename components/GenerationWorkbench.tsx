"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Sparkles,
  Wand2,
  CircleCheck,
  CircleAlert,
  FileCode2,
  ListChecks,
  ClipboardList,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { GenerationEvent, Plan, UsageTotals, VirtualFS } from "@/lib/agent/types";
import { saveProject, updateProject } from "@/lib/actions/projects";
import { createVersion } from "@/lib/actions/versions";
import FileTree from "./FileTree";
import LivePreview from "./LivePreview";
import DownloadZipButton from "./DownloadZipButton";
import WaterBottle from "./WaterBottle";
import DiffReviewPanel, { type PendingChange } from "./DiffReviewPanel";
import VersionHistory from "./VersionHistory";
import PromptGallery from "./PromptGallery";
import ReceiptCard, { type ReceiptData } from "./ReceiptCard";
import { BOTTLE_ML } from "./WaterBottle";
import { playPop, playSplash } from "@/lib/sound";

type Phase = "idle" | "generating" | "done" | "error" | "editing";

// Picks an icon + tint for a log line so the terminal reads at a glance
// instead of as a flat wall of monospace text.
function logLineMeta(line: string) {
  if (line.startsWith("Error"))
    return { Icon: CircleAlert, className: "text-rose-400" };
  if (line.startsWith("Plan ready"))
    return { Icon: ClipboardList, className: "text-aurora-violet" };
  if (line.startsWith("Architected"))
    return { Icon: ListChecks, className: "text-aurora-amber" };
  if (line.startsWith("Self-QA:") && line.includes("needs a fix"))
    return { Icon: ShieldAlert, className: "text-amber-400" };
  if (line.startsWith("Self-QA passed"))
    return { Icon: ShieldCheck, className: "text-emerald-400" };
  if (line.startsWith("[") || line.toLowerCase().includes("writing") || line.toLowerCase().includes("drafting") || line.toLowerCase().includes("updating"))
    return { Icon: FileCode2, className: "text-aurora-cyan" };
  if (line.startsWith("Done") || line.startsWith("Draft ready") || line.startsWith("Changes applied"))
    return { Icon: CircleCheck, className: "text-emerald-400" };
  return { Icon: Loader2, className: "text-muted" };
}

export default function GenerationWorkbench() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [files, setFiles] = useState<VirtualFS>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [view, setView] = useState<"code" | "preview">("preview");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [applying, setApplying] = useState(false);
  const [versionRefresh, setVersionRefresh] = useState(0);
  const filesRef = useRef<VirtualFS>({});
  const planRef = useRef<Plan | null>(null);
  const lastInstructionRef = useRef("");

  // Drives the water-bottle mascot: total files expected vs. files
  // finished so far, so the bottle drains in step with real progress.
  const [totalFiles, setTotalFiles] = useState(0);
  const [completedFiles, setCompletedFiles] = useState(0);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const generationStartRef = useRef(0);
  const editStartRef = useRef(0);
  const editUsageRef = useRef<UsageTotals | null>(null);

  const bottleLevel =
    phase === "done"
      ? 0
      : totalFiles > 0
        ? Math.max(0, 1 - completedFiles / totalFiles)
        : phase === "generating" || phase === "editing"
          ? 0.97
          : 1;

  function appendLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || phase === "generating") return;

    setPhase("generating");
    setLog([]);
    setFiles({});
    filesRef.current = {};
    setPlan(null);
    planRef.current = null;
    setProjectId(null);
    setPendingChanges([]);
    setTotalFiles(0);
    setCompletedFiles(0);
    setReceipt(null);
    generationStartRef.current = Date.now();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to start generation");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPlan: Plan | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const event: GenerationEvent = JSON.parse(part.slice(6));

          switch (event.type) {
            case "status":
              appendLog(event.message);
              break;
            case "rate_limited":
              appendLog(event.message);
              toast.warning(event.message);
              break;
            case "plan":
              finalPlan = event.plan;
              setPlan(event.plan);
              planRef.current = event.plan;
              appendLog(`Plan ready: ${event.plan.name} (${event.plan.files.length} files)`);
              break;
            case "task_plan":
              appendLog(`Architected ${event.taskPlan.implementation_steps.length} build tasks.`);
              break;
            case "file_start":
              appendLog(`[${event.index}/${event.total}] Writing ${event.path}...`);
              setTotalFiles(event.total);
              break;
            case "qa_issue":
              appendLog(
                `Self-QA: ${event.path} needs a fix (attempt ${event.attempt}) — ${event.issues.join("; ")}`
              );
              break;
            case "qa_pass":
              appendLog(`Self-QA passed: ${event.path}`);
              break;
            case "file_done":
              filesRef.current = { ...filesRef.current, [event.path]: event.content };
              setFiles({ ...filesRef.current });
              setCompletedFiles((c) => c + 1);
              playPop();
              break;
            case "done":
              appendLog("Done. Preview is booting...");
              setPhase("done");
              playSplash();
              setReceipt({
                appName: finalPlan?.name ?? "Your app",
                prompt,
                fileCount: Object.keys(event.files).length,
                tookMs: Date.now() - generationStartRef.current,
                waterMl: BOTTLE_ML,
                model: event.usage.model,
                tokensUsed: event.usage.totalTokens,
              });
              if (finalPlan) {
                const tookMs = Date.now() - generationStartRef.current;
                const result = await saveProject(prompt, finalPlan, event.files, {
                  tookMs,
                  usage: event.usage,
                });
                if ("id" in result) {
                  setProjectId(result.id);
                  router.prefetch(`/project/${result.id}`);
                  await createVersion(result.id, prompt, "generate", finalPlan, event.files);
                  setVersionRefresh((n) => n + 1);
                }
              }
              break;
            case "error":
              appendLog(`Error: ${event.message}`);
              setPhase("error");
              toast.error(event.message);
              break;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      appendLog(`Error: ${message}`);
      setPhase("error");
      toast.error(message);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editInstruction.trim() || !plan || phase === "editing") return;

    setPhase("editing");
    setTotalFiles(0);
    setCompletedFiles(0);
    setPendingChanges([]);
    setReceipt(null);
    lastInstructionRef.current = editInstruction;
    editStartRef.current = Date.now();
    editUsageRef.current = null;
    appendLog(`Applying edit: "${editInstruction}"`);

    const pending: PendingChange[] = [];

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: editInstruction, files: filesRef.current, plan }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
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
            case "status":
              appendLog(event.message);
              break;
            case "rate_limited":
              appendLog(event.message);
              toast.warning(event.message);
              break;
            case "file_start":
              appendLog(`[${event.index}/${event.total}] Drafting ${event.path}...`);
              setTotalFiles(event.total);
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
              setCompletedFiles((c) => c + 1);
              playPop();
              break;
            }
            case "done":
              appendLog(
                `Draft ready — review ${pending.length} changed file${pending.length === 1 ? "" : "s"} below.`
              );
              editUsageRef.current = event.usage;
              setPhase("done");
              playSplash();
              break;
            case "error":
              appendLog(`Error: ${event.message}`);
              setPhase("done");
              toast.error(event.message);
              break;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Edit failed";
      appendLog(`Error: ${message}`);
      setPhase("done");
      toast.error(message);
    }
  }

  async function acceptChanges() {
    if (pendingChanges.length === 0 || !planRef.current) return;
    setApplying(true);

    const updated: VirtualFS = { ...filesRef.current };
    for (const change of pendingChanges) updated[change.path] = change.newContent;

    if (projectId) {
      const result = await updateProject(projectId, planRef.current, updated, {
        tookMs: Date.now() - editStartRef.current,
        usage: editUsageRef.current ?? undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        setApplying(false);
        return;
      }
      await createVersion(projectId, lastInstructionRef.current || "Edit", "edit", planRef.current, updated);
      setVersionRefresh((n) => n + 1);
    }

    filesRef.current = updated;
    setFiles(updated);
    setPendingChanges([]);
    setEditInstruction("");
    setApplying(false);
    appendLog("Changes applied.");
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
  }

  const hasFiles = Object.keys(files).length > 0;

  return (
    <div className="space-y-6">
      {/* Water bottle mascot — floats in the open gutter beside the
          workbench on wide screens, tracking generation progress. */}
      <div className="pointer-events-none fixed right-8 top-28 z-20 hidden xl:block">
        <WaterBottle progress={bottleLevel} phase={phase} />
      </div>

      <form onSubmit={handleGenerate} className="group relative flex gap-2">
        <div className="relative flex-1">
          <Wand2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-aurora-violet" />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A pomodoro timer app with a clean minimal UI"
            disabled={phase === "generating"}
            className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none transition-shadow focus:border-aurora-violet/60 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.15)] disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={phase === "generating" || !prompt.trim()}
          className="btn-aurora relative flex items-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-medium text-white shadow-[0_4px_20px_rgba(139,92,246,0.35)] transition-transform hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-50"
        >
          {phase === "generating" && (
            <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] bg-[length:200%_100%]" />
          )}
          {phase === "generating" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="relative">Generate</span>
        </button>
      </form>

      {phase === "idle" && log.length === 0 && !hasFiles && (
        <PromptGallery onSelect={(p) => setPrompt(p)} />
      )}

      {log.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-black/30">
          <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.02] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-rose-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-300/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
            <span className="ml-2 text-[10px] font-medium tracking-wide text-muted/70">
              build log
            </span>
            {(phase === "generating" || phase === "editing") && totalFiles > 0 && (
              <span className="ml-auto text-[10px] font-medium text-aurora-cyan">
                {completedFiles}/{totalFiles} files
              </span>
            )}
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto p-3 font-mono text-xs scrollbar-thin">
            {log.map((line, i) => {
              const { Icon, className } = logLineMeta(line);
              const isSpinner = Icon === Loader2;
              return (
                <div key={i} className={`log-line-in flex items-start gap-2 ${className}`}>
                  <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${isSpinner ? "animate-spin" : ""}`} />
                  <span className="text-muted">{line}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasFiles && (
        <div className="overflow-hidden rounded-xl border border-border shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <div className="flex gap-1">
              {(["preview", "code"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-lg px-3 py-1 text-xs capitalize transition-colors ${
                    view === v
                      ? "bg-gradient-to-r from-aurora-violet/25 to-aurora-cyan/20 text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {plan && <DownloadZipButton files={files} projectName={plan.name} />}
          </div>

          <div className="h-[520px]">
            {view === "preview" ? (
              <LivePreview files={files} />
            ) : (
              <FileTree files={files} />
            )}
          </div>
        </div>
      )}

      {receipt && phase === "done" && <ReceiptCard data={receipt} />}

      {pendingChanges.length > 0 && (
        <DiffReviewPanel
          changes={pendingChanges}
          onAccept={acceptChanges}
          onDiscard={discardChanges}
          applying={applying}
        />
      )}

      {hasFiles && phase !== "generating" && (
        <form onSubmit={handleEdit} className="flex gap-2">
          <input
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
            placeholder="e.g. Make the add button blue and round the corners"
            disabled={phase === "editing"}
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-shadow focus:border-aurora-cyan/60 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={phase === "editing" || !editInstruction.trim()}
            className="flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium transition-colors hover:border-aurora-cyan/50 hover:bg-surface disabled:pointer-events-none disabled:opacity-50"
          >
            {phase === "editing" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Apply edit
          </button>
        </form>
      )}

      {projectId && (
        <VersionHistory projectId={projectId} refreshKey={versionRefresh} onRestore={handleRestore} />
      )}
    </div>
  );
}
