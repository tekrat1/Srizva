import { qaCheckFile, qaCheckProject } from "../qa";
import type { VirtualFS } from "../types";
import type { ValidationIssue } from "../graph/state";

export function validateProject(files: VirtualFS): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [path, content] of Object.entries(files)) {
    for (const issue of qaCheckFile(path, content)) {
      issues.push({ path, message: issue.message, kind: "qa" });
    }
  }

  // Cross-file contract QA catches the class of bug that syntax parsing
  // cannot see: HTML and JS both parse, but their ids, handlers, and core
  // interaction logic do not agree.
  //
  // IMPORTANT: route each issue to the file that actually needs the fix,
  // not always index.html. Defaulting every cross-file issue to the HTML
  // file meant the repair loop kept rewriting an already-correct
  // index.html while the real mismatch (missing JS function, stray CSS
  // selector, etc.) in script.js/style.css was never touched - each
  // rewrite shuffled ids/classes and produced a fresh batch of mismatches,
  // so the issue count oscillated (e.g. 1 -> 28 -> 4) until the repair
  // attempt cap was hit without ever fixing the actual bug.
  const htmlPath = Object.keys(files).find((p) => /\.html?$/i.test(p)) ?? "index.html";
  const jsPath = Object.keys(files).find((p) => /\.(?:js|mjs)$/i.test(p));
  const cssPath = Object.keys(files).find((p) => /\.css$/i.test(p));

  function targetFileFor(message: string): string {
    // "JS calls a function that doesn't exist" / "core function empty" /
    // calculator-logic issues -> the JS is missing behavior.
    if (jsPath && /no matching javascript function|numeric-input handler|evaluator|appendnumber|setoperation|calculator/i.test(message)) {
      return jsPath;
    }
    // "CSS selector doesn't match HTML" -> the CSS is stale, not the markup.
    if (cssPath && /css selector/i.test(message)) {
      return cssPath;
    }
    // "JS looks up an id that isn't in the HTML" -> the markup is missing it.
    if (/element id .* is not present in the generated html/i.test(message)) {
      return htmlPath;
    }
    // Form/onclick wiring issues live at the HTML/JS boundary; default to JS
    // since that's almost always where the missing behavior belongs.
    if (jsPath && /submit handler|onclick function/i.test(message)) {
      return jsPath;
    }
    return htmlPath;
  }

  const projectIssues = qaCheckProject(files);
  for (const issue of projectIssues) {
    issues.push({ path: targetFileFor(issue.message), message: issue.message, kind: "integration" });
  }

  const paths = new Set(Object.keys(files));
  for (const [path, content] of Object.entries(files)) {
    const refs = content.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);
    for (const match of refs) {
      const target = match[1].split("?")[0].split("#")[0];
      if (!target || target.startsWith("http") || target.startsWith("data:") || target.startsWith("#")) continue;
      if (target.startsWith("mailto:") || target.startsWith("tel:")) continue;
      const local = target.replace(/^\.\//, "");
      const relative = path.includes("/") ? `${path.slice(0, path.lastIndexOf("/"))}/${local}` : local;
      if (!paths.has(local) && !paths.has(relative)) {
        issues.push({
          path,
          message: `Local reference "${target}" does not match a generated file.`,
          kind: "reference",
        });
      }
    }
  }

  return issues;
}