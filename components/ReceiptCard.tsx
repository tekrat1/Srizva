"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, Droplets } from "lucide-react";
import { toast } from "sonner";

export interface ReceiptData {
  appName: string;
  prompt: string;
  fileCount: number;
  tookMs: number;
  waterMl: number;
  model?: string;
  tokensUsed?: number;
}

const CARD_WIDTH = 560;
const CARD_HEIGHT = 760;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function drawReceipt(canvas: HTMLCanvasElement, data: ReceiptData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = CARD_WIDTH * dpr;
  canvas.height = CARD_HEIGHT * dpr;
  canvas.style.width = `${CARD_WIDTH}px`;
  canvas.style.height = `${CARD_HEIGHT}px`;
  ctx.scale(dpr, dpr);

  const margin = 36;
  const contentWidth = CARD_WIDTH - margin * 2;

  // Background: soft aurora gradient behind a paper card
  const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bgGrad.addColorStop(0, "#0b0d10");
  bgGrad.addColorStop(1, "#151022");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Paper receipt with jagged (torn) top/bottom edges
  const paperTop = 40;
  const paperBottom = CARD_HEIGHT - 40;
  const jag = 9;

  function jaggedEdgePath(yBase: number, direction: 1 | -1) {
    ctx!.moveTo(margin - 14, yBase);
    let x = margin - 14;
    let toggle = 0;
    while (x < CARD_WIDTH - margin + 14) {
      x += jag;
      toggle = toggle === 0 ? 1 : 0;
      ctx!.lineTo(x, yBase + direction * (toggle ? jag * 0.6 : 0));
    }
  }

  ctx.beginPath();
  jaggedEdgePath(paperTop, 1);
  ctx.lineTo(CARD_WIDTH - margin + 14, paperBottom);
  jaggedEdgePath(paperBottom, -1);
  ctx.closePath();
  ctx.fillStyle = "#faf7f0";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#14171c";

  let y = paperTop + 56;

  // Header
  ctx.textAlign = "center";
  ctx.font = "700 13px 'Courier New', monospace";
  ctx.fillStyle = "#8b8f97";
  ctx.fillText("· · · B U I L D I F Y   R E C E I P T · · ·", CARD_WIDTH / 2, y);
  y += 34;

  ctx.font = "700 26px 'Courier New', monospace";
  ctx.fillStyle = "#14171c";
  ctx.fillText(data.appName.toUpperCase(), CARD_WIDTH / 2, y);
  y += 30;

  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  ctx.font = "400 12px 'Courier New', monospace";
  ctx.fillStyle = "#8b8f97";
  ctx.fillText(dateStr, CARD_WIDTH / 2, y);
  y += 26;

  // Dashed divider
  function dashedLine() {
    ctx!.beginPath();
    ctx!.setLineDash([4, 4]);
    ctx!.strokeStyle = "#c9c4b6";
    ctx!.moveTo(margin, y);
    ctx!.lineTo(CARD_WIDTH - margin, y);
    ctx!.stroke();
    ctx!.setLineDash([]);
  }
  dashedLine();
  y += 30;

  // Prompt block
  ctx.textAlign = "left";
  ctx.font = "700 11px 'Courier New', monospace";
  ctx.fillStyle = "#8b8f97";
  ctx.fillText("PROMPT", margin, y);
  y += 20;

  ctx.font = "400 15px 'Courier New', monospace";
  ctx.fillStyle = "#14171c";
  const promptLines = wrapText(ctx, `"${data.prompt}"`, contentWidth).slice(0, 4);
  for (const line of promptLines) {
    ctx.fillText(line, margin, y);
    y += 21;
  }
  y += 16;

  dashedLine();
  y += 34;

  // Line items
  function lineItem(label: string, value: string, big = false) {
    ctx!.textAlign = "left";
    ctx!.font = `400 ${big ? 15 : 14}px 'Courier New', monospace`;
    ctx!.fillStyle = "#4a4d55";
    ctx!.fillText(label, margin, y);
    ctx!.textAlign = "right";
    ctx!.font = `700 ${big ? 15 : 14}px 'Courier New', monospace`;
    ctx!.fillStyle = "#14171c";
    ctx!.fillText(value, CARD_WIDTH - margin, y);
    y += big ? 30 : 26;
  }

  lineItem("Files generated", String(data.fileCount));
  lineItem("Build time", formatDuration(data.tookMs));
  lineItem("Model", data.model ?? "gpt-oss-120b");
  if (data.tokensUsed) {
    lineItem("Tokens used", data.tokensUsed.toLocaleString());
  }
  y += 8;
  dashedLine();
  y += 40;

  // Big water stat — the payoff
  ctx.textAlign = "center";
  ctx.font = "700 13px 'Courier New', monospace";
  ctx.fillStyle = "#0891b2";
  ctx.fillText("💧 WATER USED 💧", CARD_WIDTH / 2, y);
  y += 54;

  ctx.font = "800 56px 'Courier New', monospace";
  ctx.fillStyle = "#14171c";
  ctx.fillText(`${data.waterMl} mL`, CARD_WIDTH / 2, y);
  y += 30;

  ctx.font = "italic 12px 'Courier New', monospace";
  ctx.fillStyle = "#8b8f97";
  ctx.fillText("(one full bottle, roughly)", CARD_WIDTH / 2, y);
  y += 40;

  dashedLine();
  y += 32;

  ctx.font = "700 13px 'Courier New', monospace";
  ctx.fillStyle = "#8b8f97";
  ctx.fillText("THANK YOU FOR BUILDING", CARD_WIDTH / 2, y);
  y += 20;
  ctx.font = "400 11px 'Courier New', monospace";
  ctx.fillText("srizva.app", CARD_WIDTH / 2, y);
}

export default function ReceiptCard({ data }: { data: ReceiptData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      drawReceipt(canvasRef.current, data);
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.appName, data.prompt, data.fileCount, data.tookMs, data.waterMl, data.model, data.tokensUsed]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.appName.replace(/\s+/g, "-").toLowerCase()}-receipt.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "srizva-receipt.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "My Srizva receipt",
            text: `I just built "${data.appName}" and used ${data.waterMl} mL of water doing it 💧`,
          });
        } catch {
          // user cancelled — no-op
        }
      } else {
        download();
        toast.info("Sharing isn't supported here — downloaded instead.");
      }
    }, "image/png");
  }

  return (
    <div className="animate-fade-up flex flex-col items-center gap-4 rounded-2xl border border-border bg-black/20 p-6">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Droplets className="h-3.5 w-3.5 text-aurora-cyan" />
        Your build receipt is ready
      </div>

      <canvas
        ref={canvasRef}
        className="max-w-full rounded-lg"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={download}
          disabled={!ready}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-white/5 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
        <button
          type="button"
          onClick={share}
          disabled={!ready}
          className="btn-aurora flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </div>
  );
}
