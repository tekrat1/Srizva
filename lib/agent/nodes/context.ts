import type { VirtualFS } from "../types";

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((x) => x.length > 2)
  );
}

export function selectRelevantContext(
  target: string,
  taskDescription: string,
  files: VirtualFS,
  dependencyGraph: Record<string, string[]>,
  maxChars = 6500
): string {
  const direct = new Set(dependencyGraph[target] ?? []);
  const reverse = new Set(
    Object.entries(dependencyGraph)
      .filter(([, deps]) => deps.includes(target))
      .map(([file]) => file)
  );
  const taskWords = tokenize(`${target} ${taskDescription}`);

  const ranked = Object.entries(files)
    .filter(([path]) => path !== target)
    .map(([path, content]) => {
      const words = tokenize(`${path} ${content.slice(0, 3000)}`);
      let score = 0;
      if (direct.has(path)) score += 100;
      if (reverse.has(path)) score += 80;
      for (const word of taskWords) if (words.has(word)) score += 2;
      if (path.endsWith(".html")) score += 8;
      if (path.endsWith(".css") && target.endsWith(".html")) score += 10;
      return { path, content, score };
    })
    .sort((a, b) => b.score - a.score);

  const chunks: string[] = [];
  let used = 0;
  for (const item of ranked) {
    const chunk = `--- ${item.path} ---\n${item.content}`;
    if (used + chunk.length > maxChars) continue;
    chunks.push(chunk);
    used += chunk.length;
  }

  return chunks.join("\n\n");
}
