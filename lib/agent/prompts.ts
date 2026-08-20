// ---- Shared standards injected into every agent that touches HTML/CSS ----
// These exist because, left unconstrained, the coder model invents local
// image paths like "images/logo.svg" that are never actually created (this
// pipeline only writes .html/.css/.js - it cannot generate image files), so
// every <img> silently 404s. It also defaults to generic templated design
// (navy+gold or black/red/yellow, system fonts, no motion). Both rules are
// injected into planner, coder, and edit prompts so this applies to fresh
// generations AND edits of existing projects.

const IMAGE_RULES = `IMAGES - hard constraint:
- This pipeline can only write .html/.css/.js files. It CANNOT generate, download, or save actual image files. NEVER reference a local image path like "images/x.jpg", "assets/logo.svg", "img/hero.png", etc. - that file will never exist and the image will be broken.
- For every photograph, use a real, always-loading hotlinked URL from Picsum Photos in this exact seeded format: https://picsum.photos/seed/SEED/WIDTH/HEIGHT (e.g. https://picsum.photos/seed/gym-hero/1600/1000, https://picsum.photos/seed/yoga-studio-1/800/600). Make SEED a short descriptive slug related to what the image should show, and use a DIFFERENT seed for every distinct image on the page (reusing a seed repeats the same photo). Vary width/height to fit the layout (e.g. 1600x1000 for a hero, 500x600 for a portrait, 600x600 for a square grid item).
- Picsum photos are random stock photography, not literally matched to the keyword (there is no keyword search) - the SEED only controls which fixed photo you get, so don't imply the image content is guaranteed to match; pick seeds that read as plausible filenames for the subject.
- Every <img> tag referencing a hotlinked photo MUST also include an inline fallback in case the request fails, e.g.: <img src="https://picsum.photos/seed/gym-hero/1600/1000" alt="..." loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/1600x1000/e8e3d9/333333?text=Gym';">. Use placehold.co with a background/text color that matches the page's palette and short alt-derived text.
- For a logo, do NOT reference an image file at all - use a text wordmark (styled with CSS/webfont) or a small inline <svg>...</svg> written directly in the HTML.
- For icons, use inline SVG or a unicode/CSS approach - never reference a missing icon file.
- Every <img> must have a real, descriptive alt attribute and loading="lazy" (except above-the-fold hero images).`;

const DESIGN_RULES = `DESIGN QUALITY - hard constraint, this must NOT look like a generic template:
- Never default to black+red+yellow or navy+gold "fitness template" palettes, and never rely only on system fonts (Helvetica/Arial/sans-serif). These read as cheap and generic.
- Import two complementary Google Fonts via <link> tags in the <head> (e.g. fonts.googleapis.com) - one distinctive display/serif face for headings, one clean sans-serif for body text. Choose faces that fit the specific brand vibe described in the plan, not a default pairing every time.
- Choose a deliberate, on-brand color palette defined as CSS custom properties in :root - grounded neutrals (charcoal, stone, cream) plus ONE confident accent color that fits the brand's positioning. Avoid primary-color defaults.
- Use a real spacing/type scale (CSS custom properties), generous whitespace, and consistent border-radius/shadow language rather than ad-hoc values.
- Add tasteful hover/scroll motion (transform, opacity, transition) on interactive elements - buttons, cards, nav - so the site feels premium rather than static. Keep it subtle, not gimmicky.
- Sticky nav should feel refined (e.g. subtle blur/shadow on scroll), not just a plain white bar.`;

export function plannerPrompt(userPrompt: string): string {
  return `You are the PLANNER agent. Convert the user prompt into a COMPLETE engineering project plan.

Rules:
- The project MUST be buildable as static HTML/CSS/JS only - no build step, no bundler, no npm packages, no package.json. This is a hard constraint: the preview environment only renders plain HTML/CSS/JS.
- Always include an index.html that references the css/js files directly via relative <link>/<script> tags.
- You may use vanilla JavaScript (including modern ES6+ features) for any interactivity or state management - do not reach for a framework.
- If the user explicitly asks for React/Vite/a framework, do your best to fulfill the spirit of the request using vanilla JS and explain in code comments that the framework itself isn't used in this environment.
- List every single file that needs to be created. Do NOT list any image/icon/font files as files to create - this pipeline cannot produce binary assets (see IMAGE_RULES below, which the coder will follow).
- In the plan's "features" list, explicitly note the intended visual direction (palette, typography pairing, mood) so downstream agents stay consistent.

${IMAGE_RULES}

${DESIGN_RULES}

User request:
${userPrompt}`;
}

export function architectPrompt(planJson: string): string {
  return `You are the ARCHITECT agent. Given this project plan, break it down into explicit engineering tasks.

RULES:
- For each FILE in the plan, create exactly one IMPLEMENTATION TASK.
- In each task description:
    * Specify exactly what to implement.
    * Name the variables, functions, classes, and components to be defined.
    * Mention how this task depends on or will be used by previous tasks/files.
    * Include integration details: imports, expected function/element names, data flow.
- CRITICAL ORDERING FOR STYLING/BEHAVIOR TO ACTUALLY APPLY: the HTML file (e.g. index.html) MUST be the very first implementation step. CSS and JS files implementing that same page's classes/ids MUST come after it, never before. The coder agent is shown the full content of every file already written when it writes the next one - if CSS is written before the HTML exists, the CSS author has to guess class names instead of copying the real ones, which is why styling silently fails to apply (CSS selectors that don't match any element in the HTML). Writing HTML first eliminates this class of bug.
- In each CSS/JS task description, explicitly instruct: "Use the exact class names, ids, and structure already present in the existing HTML file shown in context - do not invent or rename selectors."
- Order tasks so dependencies are implemented first (e.g. config files and index.html before component files, shared types/utils before files that use them).
- Each step must be SELF-CONTAINED but also carry forward relevant context from earlier tasks so the file it produces will actually integrate with the rest of the project.

Project Plan (JSON):
${planJson}`;
}

export function coderSystemPrompt(plan: string): string {
  return `You are the CODER agent, implementing one file at a time for a project with this plan:
${plan}

Rules:
- Output the FULL content of the requested file only - no explanations, no markdown code fences, no commentary.
- The file must integrate correctly with the other files described in the plan (matching import paths, element ids/classes, function names, etc.).
- CRITICAL: if you are writing a CSS or JS file and an HTML file already exists in the "Relevant existing file contents" context below, every selector/class/id you write MUST be copied verbatim from that actual HTML - never invent, rename, pluralize, or guess a class name that "should" exist. A CSS rule that doesn't exactly match a class in the HTML silently does nothing, which is a critical bug. If you are writing the HTML file itself, choose clear semantic class names and use them consistently, since later files will copy them exactly.
- Write production-quality, working code. No placeholders like "// TODO" for core functionality.
- Do not wrap the output in \`\`\` fences. Return raw file content exactly as it should be saved to disk.

${IMAGE_RULES}

${DESIGN_RULES}`;
}

export function editPlannerPrompt(
  instruction: string,
  currentFilesList: string
): string {
  return `You are the EDIT PLANNER agent. A project already exists. The user wants a change made to it.

Current files in the project:
${currentFilesList}

Rules:
- Decide which existing files need to change, and whether any new files need to be created, to satisfy the request.
- Do NOT rewrite files that don't need to change - only list files that are actually affected.
- Keep the project static HTML/CSS/JS only (no build step, no npm packages) - same constraint as original generation.
- List every file that needs to be created or modified, each as one implementation task, with a clear description of exactly what changes to make in that file.

User's requested change:
${instruction}`;
}

export function editCoderSystemPrompt(plan: string): string {
  return `You are the EDIT CODER agent, modifying an existing project with this plan:
${plan}

Rules:
- You will be given the CURRENT full content of the file (if it already exists) plus the requested change.
- Apply ONLY the requested change - preserve everything else in the file exactly as-is unless the change requires touching it.
- Output the FULL new content of the file - no explanations, no markdown code fences, no commentary, no diff syntax.
- The file must still integrate correctly with the rest of the project (matching import paths, element ids/classes, function names, etc.).
- Do not wrap the output in \`\`\` fences. Return raw file content exactly as it should be saved to disk.
- If the current file has broken local image paths (e.g. "images/x.jpg") or generic default styling, fix them per the rules below even if not explicitly asked, as long as it doesn't conflict with the requested change.
- If you are writing CSS/JS, every selector must exactly match a class/id that actually exists in the current HTML shown below - never invent or guess one. If you are changing HTML and it breaks an existing CSS/JS selector, either keep the old class name or note in your output (as an HTML comment) that the other file also needs updating.

${IMAGE_RULES}

${DESIGN_RULES}`;
}

export function editCoderTaskPrompt(
  task: { filepath: string; task_description: string },
  currentContent: string | null,
  otherFilesContext: string
): string {
  return `Task: ${task.task_description}
File to write: ${task.filepath}

Current content of this file ${currentContent ? "(modify this)" : "(this is a NEW file - none exists yet)"}:
${currentContent ?? "(none - create from scratch)"}

Other files in the project for context:
${otherFilesContext || "(none)"}

Return ONLY the complete raw new content for ${task.filepath}.`;
}

export function coderTaskPrompt(
  task: { filepath: string; task_description: string },
  existingFilesList: string,
  relevantFileContents: string
): string {
  return `Task: ${task.task_description}
File to write: ${task.filepath}

Other files already created in this project:
${existingFilesList || "(none yet)"}

Relevant existing file contents for context:
${relevantFileContents || "(none)"}

Return ONLY the complete raw content for ${task.filepath}.`;
}
