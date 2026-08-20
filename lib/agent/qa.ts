/**
 * Lightweight, dependency-free "does this actually parse" pass, run after
 * the coder produces a file and before it's shown to the user.
 *
 * This is deliberately NOT a full parser - it's a set of cheap structural
 * checks (balanced tags/braces, valid JS syntax) that catch the class of
 * mistake an LLM coder occasionally makes (an unclosed <div>, a dangling
 * brace, a truncated function). It never executes generated code - JS is
 * only ever handed to `new Function(...)`, which parses/compiles but does
 * not run the function body, so this is safe to run on untrusted output.
 */

export interface QAIssue {
  message: string;
}

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function checkHtml(content: string): QAIssue[] {
  const issues: QAIssue[] = [];

  // Strip comments and the contents of <script>/<style> blocks first, so
  // JS/CSS syntax (which often contains bare `<`/`>` in comparisons, or
  // template strings) never gets misread as HTML tags.
  const stripped = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "<script></script>")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "<style></style>");

  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^"'>])*?)(\/?)>/g;
  const stack: string[] = [];
  let match: RegExpExecArray | null;
  let unexpectedClose = 0;

  while ((match = tagRe.exec(stripped)) !== null) {
    const [, closing, rawTag, , selfClosed] = match;
    const tag = rawTag.toLowerCase();
    if (VOID_ELEMENTS.has(tag)) continue;
    if (selfClosed === "/") continue; // explicit self-close, e.g. <path ... />

    if (closing === "/") {
      if (stack.length && stack[stack.length - 1] === tag) {
        stack.pop();
      } else if (stack.includes(tag)) {
        // Mismatched nesting somewhere below - pop down to it.
        while (stack.length && stack[stack.length - 1] !== tag) stack.pop();
        stack.pop();
      } else {
        unexpectedClose++;
      }
    } else {
      stack.push(tag);
    }
  }

  if (stack.length > 0) {
    const counts = stack.reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(counts)
      .map(([t, c]) => (c > 1 ? `<${t}> x${c}` : `<${t}>`))
      .join(", ");
    issues.push({
      message: `Unclosed HTML tag(s): ${summary}. Every opening tag needs a matching closing tag.`,
    });
  }
  if (unexpectedClose > 0) {
    issues.push({
      message: `Found ${unexpectedClose} closing tag(s) with no matching opening tag.`,
    });
  }
  if (!/<html[\s>]/i.test(stripped) && stripped.trim().length > 0 && /<!doctype/i.test(content) === false && /<head[\s>]/i.test(stripped)) {
    // Only flag if it looks like it was meant to be a full document (has a
    // <head>) but is missing <html> - avoids false positives on partial
    // HTML fragments some tasks legitimately produce.
    issues.push({ message: "Missing <html> root element around a <head> section." });
  }

  return issues;
}

function checkCss(content: string): QAIssue[] {
  const issues: QAIssue[] = [];
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "");

  let depth = 0;
  for (const ch of stripped) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth < 0) {
      issues.push({ message: "Found an extra closing `}` with no matching `{`." });
      depth = 0;
    }
  }
  if (depth > 0) {
    issues.push({ message: `${depth} unclosed CSS rule block(s) - missing \`}\`.` });
  }

  const parenDepth = (stripped.match(/\(/g) ?? []).length - (stripped.match(/\)/g) ?? []).length;
  if (parenDepth !== 0) {
    issues.push({ message: "Unbalanced parentheses in CSS (e.g. inside a url()/calc()/rgba())." });
  }

  return issues;
}

function checkJs(content: string): QAIssue[] {
  const issues: QAIssue[] = [];
  try {
    // Parses (compiles) the code without ever calling/executing it - this
    // is a syntax check only, not code execution.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // ES module syntax (import/export) isn't valid inside `new Function`
    // even though it's valid in a real <script type="module">, so don't
    // flag those as broken - just skip the check in that case.
    if (/import|export/i.test(message) || /\bimport\b|\bexport\b/.test(content.slice(0, 200))) {
      return issues;
    }
    issues.push({ message: `JavaScript syntax error: ${message}` });
  }
  return issues;
}

export function qaCheckFile(path: string, content: string): QAIssue[] {
  if (!content || !content.trim()) {
    return [{ message: "File came back empty." }];
  }

  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "html" || ext === "htm") return checkHtml(content);
  if (ext === "css") return checkCss(content);
  if (ext === "js" || ext === "mjs") return checkJs(content);
  return [];
}
