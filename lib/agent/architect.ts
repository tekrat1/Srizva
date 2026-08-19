import { generateObject } from "ai";
import { groq, MODEL_ID } from "./groq";
import { TaskPlanSchema, type TaskPlan, type Plan } from "./types";
import { architectPrompt } from "./prompts";

export async function runArchitect(plan: Plan): Promise<TaskPlan> {
  const { object } = await generateObject({
    model: groq(MODEL_ID),
    schema: TaskPlanSchema,
    prompt: architectPrompt(JSON.stringify(plan, null, 2)),
  });
  return object;
}
