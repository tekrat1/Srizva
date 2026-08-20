import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth";
import { checkEditLimit } from "@/lib/actions/rate-limit";
import { runEditGraph } from "@/lib/agent/graph/editGraph";
import type { Plan, VirtualFS } from "@/lib/agent/types";
import { isProviderConfigured, requiredEnvVarName } from "@/lib/agent/groq";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  const { instruction, files, plan } = (await req.json()) as {
    instruction?: string;
    files?: VirtualFS;
    plan?: Plan;
  };

  if (!instruction || typeof instruction !== "string" || instruction.trim().length < 3) {
    return new Response(JSON.stringify({ error: "Instruction is required" }), { status: 400 });
  }
  if (!files || !plan) {
    return new Response(JSON.stringify({ error: "Missing current project files/plan" }), { status: 400 });
  }

  if (!isProviderConfigured) {
    return new Response(JSON.stringify({ error: `Server is missing ${requiredEnvVarName}` }), { status: 500 });
  }

  const limit = await checkEditLimit(user.uid);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ error: "Daily edit limit reached. Try again tomorrow." }),
      { status: 429 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      await runEditGraph(instruction, files, plan, emit);
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
