"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { VirtualFS } from "@/lib/agent/types";

export default function DownloadZipButton({
  files,
  projectName,
}: {
  files: VirtualFS;
  projectName: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;

    const entries = Object.entries(files).filter(([, content]) => typeof content === "string");
    if (entries.length === 0) {
      console.error("[DownloadZip] No generated files to download.");
      return;
    }

    setDownloading(true);
    try {
      const JSZipModule = await import("jszip");
      const JSZip = JSZipModule.default;
      const zip = new JSZip();

      for (const [path, content] of entries) {
        // Normalize accidental leading slashes so the archive always extracts
        // into a normal project directory rather than an absolute path.
        zip.file(path.replace(/^\/+/, ""), content);
      }

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(projectName || "srizva-project")
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "srizva-project"}.zip`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();

      // Keep the object URL alive until the browser has processed the click.
      window.setTimeout(() => {
        anchor.remove();
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("[DownloadZip] Failed:", error);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading || Object.keys(files).length === 0}
      aria-busy={downloading}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {downloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {downloading ? "Preparing ZIP..." : "Download ZIP"}
    </button>
  );
}
