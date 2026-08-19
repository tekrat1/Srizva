"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type { VirtualFS } from "@/lib/agent/types";

/**
 * Zero-dependency static preview.
 *
 * Inlines every CSS/JS file referenced by index.html directly into the HTML
 * as <style>/<script> tags, then renders the whole thing in a sandboxed
 * iframe via `srcDoc`. No install step, no server, no external service -
 * runs entirely client-side and costs nothing to build or deploy.
 *
 * Only supports plain HTML/CSS/JS projects (no npm packages / bundler).
 * The planner prompt is configured to only ever produce this kind of
 * project, so this covers everything the agent generates.
 */
function buildPreviewHtml(files: VirtualFS): string | null {
  const entry =
    files["index.html"] ??
    files["/index.html"] ??
    Object.entries(files).find(([path]) => path.toLowerCase().endsWith("index.html"))?.[1];

  if (!entry) return null;

  const normalize = (p: string) => p.replace(/^\.?\//, "");
  const lookup = (href: string) => {
    const clean = normalize(href.split("?")[0].split("#")[0]);
    return files[clean] ?? files[`/${clean}`] ?? null;
  };

  let html = entry;

  // Inline <link rel="stylesheet" href="..."> tags
  html = html.replace(
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href: string) => {
      if (/^https?:\/\//i.test(href)) return match; // leave external CDN CSS as-is
      const css = lookup(href);
      return css ? `<style>\n${css}\n</style>` : match;
    }
  );

  // Inline <script src="..."></script> tags
  html = html.replace(
    /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi,
    (match, src: string) => {
      if (/^https?:\/\//i.test(src)) return match; // leave external CDN scripts as-is
      const js = lookup(src);
      return js ? `<script>\n${js}\n</script>` : match;
    }
  );

  return html;
}

export default function LivePreview({ files }: { files: VirtualFS }) {
  const html = useMemo(() => buildPreviewHtml(files), [files]);

  if (Object.keys(files).length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted">
        Waiting for files...
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm">
        <p className="text-red-400">No index.html found to preview.</p>
        <p className="text-muted">You can still download the code and open it locally.</p>
      </div>
    );
  }

  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted">
        <span className="truncate">Live preview</span>
        <a
          href={blobUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 hover:text-white"
        >
          Open in new tab <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <iframe
        srcDoc={html}
        className="w-full flex-1 bg-white"
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
        title="Live preview"
      />
    </div>
  );
}
