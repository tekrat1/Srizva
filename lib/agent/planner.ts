import { generateObject } from "ai";
import { groq, MODEL_ID } from "./groq";
import { PlanSchema, type Plan } from "./types";
import { plannerPrompt } from "./prompts";

export async function runPlanner(userPrompt: string): Promise<Plan> {
  const { object } = await generateObject({
    model: groq(MODEL_ID),
    schema: PlanSchema,
    prompt: plannerPrompt(userPrompt),
  });
  return object;
}
