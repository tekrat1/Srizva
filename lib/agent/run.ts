import { runGenerationGraph } from "./graph/graph";
import type { GenerationEvent } from "./types";

/**
 * Public generation entry point. The implementation is now a LangGraph
 * stateful workflow; keeping this wrapper preserves the existing API route.
 */
export async function generateProject(
  userPrompt: string,
  emit: (event: GenerationEvent) => void
): Promise<void> {
  try {
    await runGenerationGraph(userPrompt, emit);
  } catch (err) {
    console.error("[generateProject] graph failed:", err);
    const message = err instanceof Error
      ? (err.message?.trim() || err.name || "Generation failed")
      : String(err || "Generation failed");
    emit({ type: "error", message });
  }
}
