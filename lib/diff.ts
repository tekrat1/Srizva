// Small dependency-free line diff (LCS-based), good enough for reviewing
// AI-generated file edits. Not a full Myers diff, but for typical
// generated-site file sizes (tens to low hundreds of lines) it's plenty
// fast and produces clean, readable red/green output.

export type DiffLineType = "same" | "add" | "remove";

export interface DiffLine {
  type: DiffLineType;
  text: string;
  oldLineNo?: number;
  newLineNo?: number;
}

// Guards against pathological O(n*m) blowup on huge files - beyond this
// we fall back to a coarse "everything changed" diff instead of hanging
// the browser tab.
const MAX_CELLS = 400_000;

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const n = oldLines.length;
  const m = newLines.length;

  if (n * m > MAX_CELLS) {
    const result: DiffLine[] = [];
    oldLines.forEach((text, i) => result.push({ type: "remove", text, oldLineNo: i + 1 }));
    newLines.forEach((text, i) => result.push({ type: "add", text, newLineNo: i + 1 }));
    return result;
  }

  // dp[i][j] = length of LCS of oldLines[i:] and newLines[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;

  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: "same", text: oldLines[i], oldLineNo: oldNo++, newLineNo: newNo++ });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", text: oldLines[i], oldLineNo: oldNo++ });
      i++;
    } else {
      result.push({ type: "add", text: newLines[j], newLineNo: newNo++ });
      j++;
    }
  }
  while (i < n) {
    result.push({ type: "remove", text: oldLines[i], oldLineNo: oldNo++ });
    i++;
  }
  while (j < m) {
    result.push({ type: "add", text: newLines[j], newLineNo: newNo++ });
    j++;
  }

  return result;
}

export function diffStats(diff: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff) {
    if (line.type === "add") added++;
    else if (line.type === "remove") removed++;
  }
  return { added, removed };
}
