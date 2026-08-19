import { runPlanner } from "./planner";
import { runArchitect } from "./architect";
import { runCoderForFile } from "./coder";
import type { GenerationEvent, VirtualFS } from "./types";

/**
 * Runs the full Planner -> Architect -> Coder pipeline, calling `emit` for
 * every progress event so the caller can stream them to the client (SSE).
 */
export async function generateProject(
  userPrompt: string,
  emit: (event: GenerationEvent) => void
): Promise<void> {
  try {
    emit({ type: "status", message: "Planning your project..." });
    const plan = await runPlanner(userPrompt);
    emit({ type: "plan", plan });

    emit({ type: "status", message: "Breaking the plan into build tasks..." });
    const taskPlan = await runArchitect(plan);
    emit({ type: "task_plan", taskPlan });

    const fs: VirtualFS = {};
    const steps = taskPlan.implementation_steps;

    for (let i = 0; i < steps.length; i++) {
      const task = steps[i];
      emit({
        type: "file_start",
        path: task.filepath,
        index: i + 1,
        total: steps.length,
      });

      const content = await runCoderForFile(task, plan, fs);
      fs[task.filepath] = content;

      emit({ type: "file_done", path: task.filepath, content });
    }

    emit({ type: "done", files: fs, plan });
  } catch (err) {
    emit({
      type: "error",
      message: err instanceof Error ? err.message : "Generation failed",
    });
  }
}
