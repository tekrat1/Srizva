"use client";

import { Download } from "lucide-react";
import type { VirtualFS } from "@/lib/agent/types";

export default function DownloadZipButton({
  files,
  projectName,
}: {
  files: VirtualFS;
  projectName: string;
}) {
  async function handleDownload() {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-white/5"
    >
      <Download className="h-3.5 w-3.5" />
      Download ZIP
    </button>
  );
}
