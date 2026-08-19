import { generateText } from "ai";
import { groq, MODEL_ID } from "./groq";
import type { ImplementationTask, Plan, VirtualFS } from "./types";
import { coderSystemPrompt, coderTaskPrompt } from "./prompts";

// Strips accidental ```lang fences if the model adds them despite instructions.
function stripFences(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

export async function runCoderForFile(
  task: ImplementationTask,
  plan: Plan,
  fs: VirtualFS
): Promise<string> {
  const existingFilesList = Object.keys(fs).join("\n");

  // Give the model the content of a few likely-relevant existing files
  // (e.g. index.html when writing app.js) so imports/ids/classes line up.
  const relevant = Object.entries(fs)
    .filter(([path]) => {
      const base = path.split("/").pop() || "";
      const ext = base.split(".").pop();
      return ext === "html" || base === "package.json" || base.startsWith("types");
    })
    .slice(0, 5)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join("\n\n");

  const { text } = await generateText({
    model: groq(MODEL_ID),
    system: coderSystemPrompt(JSON.stringify(plan)),
    prompt: coderTaskPrompt(task, existingFilesList, relevant),
  });

  return stripFences(text);
}
