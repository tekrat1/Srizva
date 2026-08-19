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

// ---- Streamed progress events (sent to the client over SSE) ----
export type GenerationEvent =
  | { type: "status"; message: string }
  | { type: "plan"; plan: Plan }
  | { type: "task_plan"; taskPlan: TaskPlan }
  | { type: "file_start"; path: string; index: number; total: number }
  | { type: "file_done"; path: string; content: string }
  | { type: "done"; files: VirtualFS; plan: Plan }
  | { type: "error"; message: string };
