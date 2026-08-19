"use client";

import { useState } from "react";
import type { Plan, VirtualFS } from "@/lib/agent/types";
import FileTree from "./FileTree";
import LivePreview from "./LivePreview";
import DownloadZipButton from "./DownloadZipButton";

export default function ProjectViewer({
  plan,
  files,
}: {
  plan: Plan;
  files: VirtualFS;
}) {
  const [view, setView] = useState<"preview" | "code">("preview");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{plan.name}</h1>
        <p className="mt-1 text-sm text-muted">{plan.description}</p>
      </div>

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
          <DownloadZipButton files={files} projectName={plan.name} />
        </div>

        <div className="h-[600px]">
          {view === "preview" ? <LivePreview files={files} /> : <FileTree files={files} />}
        </div>
      </div>
    </div>
  );
}
