import { NextRequest } from "next/server";
import { generateProject } from "@/lib/agent/run";
import type { GenerationEvent } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 300; // generation can take a few minutes

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server is missing GROQ_API_KEY" }),
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: GenerationEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      await generateProject(prompt, emit);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
