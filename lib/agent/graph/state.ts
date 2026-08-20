import { Annotation } from "@langchain/langgraph";
import type {
  ImplementationTask,
  Plan,
  TaskPlan,
  UsageTotals,
  VirtualFS,
  GenerationEvent,
} from "../types";
import type { AIProviderName } from "../groq";

export interface FileChange {
  path: string;
  previousContent: string | null;
  newContent: string;
  agent: string;
  taskId: string;
  timestamp: number;
  reason: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
  kind: "qa" | "reference" | "integration";
}

/**
 * Every field below is always returned as its complete new value by the
 * node that writes it (e.g. `files: { ...state.files, [path]: content }`,
 * `changes: [...state.changes, next]`) - the nodes do their own merging,
 * so the channel itself just needs last-write-wins, not accumulation.
 * Newer @langchain/langgraph releases require an explicit `value`
 * (BinaryOperator) on every Annotation - `default` alone is no longer
 * enough - so this is passed explicitly everywhere below instead of
 * relying on an implicit overwrite behavior.
 */
function overwrite<T>(_current: T, update: T): T {
  return update;
}

export const AgentState = Annotation.Root({
  userRequest: Annotation<string>({ value: overwrite, default: () => "" }),
  mode: Annotation<"generate" | "edit">({ value: overwrite, default: () => "generate" }),
  fastPath: Annotation<boolean>({ value: overwrite, default: () => false }),
  // "Turbo mode": user-selected speed toggle. When true, the graph skips
  // per-file repair, project-wide validation-repair, and the final review
  // LLM pass - same core planner/architect/coder calls, none of the
  // reliability overhead. See graph.ts.
  turboMode: Annotation<boolean>({ value: overwrite, default: () => false }),
  // Sticky provider: once a call succeeds on a given AI provider, later
  // calls in the SAME generation try that provider first instead of
  // restarting at the front of PROVIDER_ORDER (groq -> gemini -> ...) and
  // re-failing against exhausted/unavailable providers every single call.
  stickyProvider: Annotation<AIProviderName | null>({ value: overwrite, default: () => null }),
  originalFiles: Annotation<VirtualFS>({ value: overwrite, default: () => ({}) }),
  files: Annotation<VirtualFS>({ value: overwrite, default: () => ({}) }),
  plan: Annotation<Plan | null>({ value: overwrite, default: () => null }),
  taskPlan: Annotation<TaskPlan | null>({ value: overwrite, default: () => null }),
  tasks: Annotation<ImplementationTask[]>({ value: overwrite, default: () => [] }),
  currentTaskIndex: Annotation<number>({ value: overwrite, default: () => 0 }),
  currentTask: Annotation<ImplementationTask | null>({ value: overwrite, default: () => null }),
  completedTasks: Annotation<string[]>({ value: overwrite, default: () => [] }),
  failedTasks: Annotation<string[]>({ value: overwrite, default: () => [] }),
  dependencyGraph: Annotation<Record<string, string[]>>({ value: overwrite, default: () => ({}) }),
  relevantContext: Annotation<string>({ value: overwrite, default: () => "" }),
  currentIssues: Annotation<string[]>({ value: overwrite, default: () => [] }),
  repairReason: Annotation<"file" | "validation" | null>({ value: overwrite, default: () => null }),
  validationIssues: Annotation<ValidationIssue[]>({ value: overwrite, default: () => [] }),
  repairAttempts: Annotation<Record<string, number>>({ value: overwrite, default: () => ({}) }),
  changes: Annotation<FileChange[]>({ value: overwrite, default: () => [] }),
  usage: Annotation<UsageTotals | null>({ value: overwrite, default: () => null }),
  generationFinishReason: Annotation<string | null>({ value: overwrite, default: () => null }),
  iteration: Annotation<number>({ value: overwrite, default: () => 0 }),
  maxIterations: Annotation<number>({ value: overwrite, default: () => 40 }),
  finalStatus: Annotation<"running" | "completed" | "failed">({
    value: overwrite,
    default: () => "running",
  }),
  lastError: Annotation<string>({ value: overwrite, default: () => "" }),
});

export type AgentStateType = typeof AgentState.State;
export type AgentEventEmitter = (event: GenerationEvent) => void;
