import type { ImplementationTask, Plan, TaskPlan } from "./types";

/**
 * Deterministic complexity routing.
 *
 * The goal is not to "understand" the request with another LLM call.
 * It is deliberately conservative: only small static HTML/CSS/JS requests
 * take the zero-planning fast path. Anything that looks like a real
 * application keeps the full planner/architect workflow.
 */
const COMPLEX_SIGNALS = [
  "react", "next.js", "nextjs", "vite", "vue", "svelte", "angular",
  "typescript", "tailwind", "database", "firebase", "mongodb", "postgres",
  "mysql", "supabase", "authentication", "auth", "login", "signup",
  "payment", "stripe", "api", "backend", "server", "websocket", "socket",
  "realtime", "real-time", "crud", "admin", "dashboard", "saas", "ecommerce",
  "e-commerce", "shop", "cart", "checkout", "multi-user", "role-based",
  "upload", "file upload", "external api", "integration", "oauth",
  "notification", "email", "deployment", "deploy", "cms",
];

const SIMPLE_SIGNALS = [
  "todo", "to-do", "pomodoro", "timer", "counter", "calculator",
  "landing page", "portfolio", "personal page", "contact form",
  "stopwatch", "notes app", "quote generator", "color picker",
  "quiz", "tic tac toe", "weather ui", "clock", "habit tracker",
];

export function isSimpleProjectRequest(request: string): boolean {
  const text = request.toLowerCase().trim();
  if (!text || text.length > 700) return false;
  if (COMPLEX_SIGNALS.some((signal) => text.includes(signal))) return false;

  const explicitSimple = SIMPLE_SIGNALS.some((signal) => text.includes(signal));
  const shortStaticRequest =
    text.length <= 220 &&
    /\b(build|create|make|design|generate)\b/.test(text) &&
    !/\b(data|users|account|server|store|sync|database|api)\b/.test(text);

  return explicitSimple || shortStaticRequest;
}

function titleFromRequest(request: string): string {
  const cleaned = request
    .replace(/\b(build|create|make|design|generate|a|an|the)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").slice(0, 4);
  if (!words.length) return "Srizva App";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function inferFeatures(request: string): string[] {
  const text = request.toLowerCase();
  const features: string[] = [];

  const rules: Array<[RegExp, string]> = [
    [/\btodo|to-do\b/, "Add, complete, delete and manage tasks"],
    [/\bpomodoro\b|\btimer\b|\bstopwatch\b/, "Start, pause, reset and track time"],
    [/\bdark mode\b|\bdark theme\b/, "Dark mode/theme toggle"],
    [/\blocalstorage\b|\bpersist|save\b/, "Persist state in localStorage"],
    [/\bsearch\b/, "Search/filter content"],
    [/\bfilter\b/, "Filter visible items"],
    [/\bresponsive\b|\bmobile\b/, "Responsive mobile-first layout"],
    [/\banimation|animated|motion\b/, "Subtle UI animations and transitions"],
    [/\bdrag\b/, "Drag-and-drop interaction"],
    [/\bform\b/, "Client-side form interaction and validation"],
  ];

  for (const [pattern, feature] of rules) {
    if (pattern.test(text)) features.push(feature);
  }

  if (!features.length) features.push("Core interactive behavior requested by the user");
  features.push("Responsive, polished visual design");
  return [...new Set(features)];
}

export function buildFastPlan(request: string): Plan {
  return {
    name: titleFromRequest(request),
    description: request.trim(),
    techstack: "HTML, CSS, JavaScript",
    features: inferFeatures(request),
    files: [
      { path: "index.html", purpose: "Semantic page structure and UI markup." },
      { path: "style.css", purpose: "Responsive visual design, typography, layout and motion." },
      { path: "script.js", purpose: "Interactive behavior and client-side state." },
    ],
  };
}

export function buildFastTaskPlan(plan: Plan, request: string): TaskPlan {
  const byPath: Record<string, string> = {
    "index.html":
      `Build the complete semantic UI for the user's request. Create all stable ids and class names that CSS/JS will use. Link ./style.css and ./script.js. Request: ${request}`,
    "style.css":
      `Style ${plan.name} using the exact ids/classes/HTML structure already present in index.html. Make it polished, responsive and cohesive. Request: ${request}`,
    "script.js":
      `Implement all requested interactive behavior for ${plan.name} using the exact ids/classes/elements already present in index.html. Keep state and event handling robust. Request: ${request}`,
  };

  return {
    implementation_steps: plan.files.map((file: Plan["files"][number]): ImplementationTask => ({
      filepath: file.path,
      task_description: byPath[file.path] ??
        `Implement ${file.path}: ${file.purpose}. Integrate with the existing project.`,
    })),
  };
}
