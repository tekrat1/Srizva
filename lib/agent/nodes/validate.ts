import { qaCheckFile } from "../qa";
import type { VirtualFS } from "../types";
import type { ValidationIssue } from "../graph/state";

export function validateProject(files: VirtualFS): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [path, content] of Object.entries(files)) {
    for (const issue of qaCheckFile(path, content)) {
      issues.push({ path, message: issue.message, kind: "qa" });
    }
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
