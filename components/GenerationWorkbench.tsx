"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { GenerationEvent, Plan, VirtualFS } from "@/lib/agent/types";
import { saveProject } from "@/lib/actions/projects";
import FileTree from "./FileTree";
import LivePreview from "./LivePreview";
import DownloadZipButton from "./DownloadZipButton";

type Phase = "idle" | "generating" | "done" | "error";

export default function GenerationWorkbench() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [files, setFiles] = useState<VirtualFS>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [view, setView] = useState<"code" | "preview">("preview");
  const filesRef = useRef<VirtualFS>({});

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
            case "plan":
              finalPlan = event.plan;
              setPlan(event.plan);
              appendLog(`Plan ready: ${event.plan.name} (${event.plan.files.length} files)`);
              break;
            case "task_plan":
              appendLog(`Architected ${event.taskPlan.implementation_steps.length} build tasks.`);
              break;
            case "file_start":
              appendLog(`[${event.index}/${event.total}] Writing ${event.path}...`);
              break;
            case "file_done":
              filesRef.current = { ...filesRef.current, [event.path]: event.content };
              setFiles({ ...filesRef.current });
              break;
            case "done":
              appendLog("Done. Preview is booting...");
              setPhase("done");
              if (finalPlan) {
                const result = await saveProject(prompt, finalPlan, event.files);
                if ("id" in result) {
                  router.prefetch(`/project/${result.id}`);
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

  const hasFiles = Object.keys(files).length > 0;

  return (
    <div className="space-y-6">
      <form onSubmit={handleGenerate} className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. A pomodoro timer app with a clean minimal UI"
          disabled={phase === "generating"}
          className="flex-1 rounded-md border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={phase === "generating" || !prompt.trim()}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {phase === "generating" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate
        </button>
      </form>

      {log.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-black/30 p-3 font-mono text-xs text-muted scrollbar-thin">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {hasFiles && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <div className="flex gap-1">
              {(["preview", "code"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded px-3 py-1 text-xs capitalize ${
                    view === v ? "bg-primary/20 text-white" : "text-muted hover:text-white"
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
    </div>
  );
}
