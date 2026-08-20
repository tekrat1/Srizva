import type { VirtualFS } from "../types";

const IMPORT_RE = /(?:import\s+(?:[^"']*?\s+from\s+)?|export\s+[^"']*?\s+from\s+|require\s*\(\s*|import\s*\(\s*)(["'])([^"']+)\1/g;

function normalize(base: string, target: string): string | null {
  if (!target.startsWith(".")) return null;
  const parts = `${base}/../${target}`.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  const raw = stack.join("/");
  const candidates = [
    raw,
    `${raw}.js`,
    `${raw}.mjs`,
    `${raw}.ts`,
    `${raw}.tsx`,
    `${raw}.css`,
    `${raw}/index.js`,
    `${raw}/index.ts`,
    `${raw}/index.tsx`,
  ];
  return candidates[0] ?? null;
}

function resolve(baseFile: string, target: string, files: VirtualFS): string | null {
  if (!target.startsWith(".")) return null;
  const dir = baseFile.includes("/") ? baseFile.slice(0, baseFile.lastIndexOf("/")) : ".";
  const normalized = normalize(dir, target);
  if (!normalized) return null;
  const candidates = [
    normalized,
    `${normalized}.js`,
    `${normalized}.mjs`,
    `${normalized}.ts`,
    `${normalized}.tsx`,
    `${normalized}.css`,
    `${normalized}/index.js`,
    `${normalized}/index.ts`,
    `${normalized}/index.tsx`,
  ];
  return candidates.find((p) => p in files) ?? null;
}

export function buildDependencyGraph(files: VirtualFS): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const [path, content] of Object.entries(files)) {
    const deps = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = IMPORT_RE.exec(content)) !== null) {
      const resolved = resolve(path, match[2], files);
      if (resolved) deps.add(resolved);
    }
    if (/\b(?:href|src)=["'][^"']+["']/i.test(content)) {
      const refs = content.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);
      for (const ref of refs) {
        const target = ref[1].split("?")[0].split("#")[0];
        if (!target || target.startsWith("http") || target.startsWith("#")) continue;
        if (target in files) deps.add(target);
        else if (`${path.includes("/") ? path.slice(0, path.lastIndexOf("/")) + "/" : ""}${target}` in files) {
          deps.add(`${path.includes("/") ? path.slice(0, path.lastIndexOf("/")) + "/" : ""}${target}`);
        }
      }
    }
    graph[path] = [...deps];
  }
  return graph;
}
