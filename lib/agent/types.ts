import { z } from "zod";

// ---- Plan (Planner agent output) ----
export const FileSchema = z.object({
  path: z.string().describe("The path to the file to be created, relative to project root"),
  purpose: z
    .string()
    .describe("The purpose of the file, e.g. 'main application logic', 'styling'"),
});

export const PlanSchema = z.object({
  name: z.string().describe("The name of the app to be built"),
  description: z.string().describe("A one-line description of the app"),
  techstack: z
    .string()
    .describe("The tech stack, e.g. 'html, css, javascript' or 'react, tailwind'"),
  features: z.array(z.string()).describe("Key features the app should have"),
  files: z.array(FileSchema).describe("Every file that needs to be created"),
});
export type Plan = z.infer<typeof PlanSchema>;
export type ProjectFile = z.infer<typeof FileSchema>;

// ---- Task plan (Architect agent output) ----
export const ImplementationTaskSchema = z.object({
  filepath: z.string().describe("The path to the file to implement"),
  task_description: z
    .string()
    .describe("A detailed, self-contained description of exactly what to implement in this file"),
});

export const TaskPlanSchema = z.object({
  implementation_steps: z.array(ImplementationTaskSchema),
});
export type TaskPlan = z.infer<typeof TaskPlanSchema>;
export type ImplementationTask = z.infer<typeof ImplementationTaskSchema>;

// ---- Virtual file system used during generation ----
export type VirtualFS = Record<string, string>; // path -> file content

// ---- Token usage, accumulated across every LLM call in a pipeline run ----
/** Shape returned by the `ai` SDK's `usage` field on generateText/generateObject. */
export interface CallUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface UsageTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Number of individual LLM calls this run made (incl. QA repairs/retries). */
  calls: number;
  model: string;
}

export function emptyUsage(model: string): UsageTotals {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0, model };
}

export function addUsage(totals: UsageTotals, usage: CallUsage | undefined): void {
  if (!usage) return;
  totals.promptTokens += usage.promptTokens ?? 0;
  totals.completionTokens += usage.completionTokens ?? 0;
  totals.totalTokens +=
    usage.totalTokens ?? (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);
  totals.calls += 1;
}

// ---- Streamed progress events (sent to the client over SSE) ----
export type GenerationEvent =
  | { type: "status"; message: string }
  | { type: "rate_limited"; message: string; waitMs: number }
  | { type: "plan"; plan: Plan }
  | { type: "task_plan"; taskPlan: TaskPlan }
  | { type: "file_start"; path: string; index: number; total: number }
  | { type: "qa_issue"; path: string; issues: string[]; attempt: number }
  | { type: "qa_pass"; path: string }
  | { type: "file_done"; path: string; content: string }
  | { type: "done"; files: VirtualFS; plan: Plan; usage: UsageTotals }
  | { type: "error"; message: string };
