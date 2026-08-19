"use client";

import { useState } from "react";
import { FileCode } from "lucide-react";
import type { VirtualFS } from "@/lib/agent/types";

export default function FileTree({ files }: { files: VirtualFS }) {
  const paths = Object.keys(files);
  const [selected, setSelected] = useState<string | null>(paths[0] ?? null);

  return (
    <div className="flex h-full">
      <div className="w-52 shrink-0 overflow-y-auto border-r border-border p-2 scrollbar-thin">
        {paths.map((path) => (
          <button
            key={path}
            onClick={() => setSelected(path)}
            className={`flex w-full items-center gap-2 truncate rounded px-2 py-1.5 text-left text-xs ${
              selected === path
                ? "bg-primary/20 text-white"
                : "text-muted hover:bg-white/5 hover:text-white"
            }`}
            title={path}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{path}</span>
          </button>
        ))}
      </div>

      <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed scrollbar-thin">
        <code>{selected ? files[selected] : "Select a file"}</code>
      </pre>
    </div>
  );
}
