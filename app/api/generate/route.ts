import { NextRequest } from "next/server";
import { generateProject } from "@/lib/agent/run";
import { getCurrentUser } from "@/lib/actions/auth";
import { checkGenerationLimit } from "@/lib/actions/rate-limit";
import type { GenerationEvent } from "@/lib/agent/types";
import { isProviderConfigured, requiredEnvVarName } from "@/lib/agent/groq";

export const runtime = "nodejs";
export const maxDuration = 300; // generation can take a few minutes

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
    });
  }

  if (!isProviderConfigured) {
    return new Response(
      JSON.stringify({ error: `Server is missing ${requiredEnvVarName}` }),
      { status: 500 }
    );
  }

  const limit = await checkGenerationLimit(user.uid);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ error: "Daily generation limit reached. Try again tomorrow." }),
      { status: 429 }
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
