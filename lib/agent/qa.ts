/**
 * Srizva generated-code QA.
 *
 * This intentionally has two layers:
 *  1) file-level structural checks (syntax, truncation, HTML/CSS structure)
 *  2) deterministic functional checks for common browser interactions.
 *
 * The checks never execute generated code. They are deliberately conservative:
 * when something is ambiguous they do not pretend the project is "proven
 * correct"; they only flag high-confidence failure patterns that can be
 * repaired by the coder.
 */

import { hasToolCallArtifacts } from "./sanitize";

export interface QAIssue {
  message: string;
}

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

const CORE_HANDLER_NAMES =
  /^(?:calculate|evaluate|evaluateExpression|compute|submit|handleSubmit|handleClick|addItem|removeItem|deleteItem|toggle|toggleMenu|toggleModal|openModal|closeModal|save|login|signup|logout|search|filter|reset|clear|checkout|addToCart|removeFromCart|next|previous|start|pause|stop|resume|play|stopTimer|startTimer)$/i;

function checkHtml(content: string): QAIssue[] {
  const issues: QAIssue[] = [];

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
    if (VOID_ELEMENTS.has(tag) || selfClosed === "/") continue;

    if (closing === "/") {
      if (stack.length && stack[stack.length - 1] === tag) {
        stack.pop();
      } else if (stack.includes(tag)) {
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

  // High-confidence interactive marker checks.
  const interactiveButtons = [...content.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  for (const [, attrs, label] of interactiveButtons) {
    const hasHandler = /\bonclick\s*=|\bdata-action\s*=|\bid\s*=|\btype\s*=\s*["']submit["']/i.test(attrs);
    const text = label.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!hasHandler && text) {
      issues.push({
        message: `Interactive button "${text.slice(0, 50)}" has no id, data-action, onclick handler, or submit type for deterministic wiring.`,
      });
    }
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

  const parenDepth =
    (stripped.match(/\(/g) ?? []).length -
    (stripped.match(/\)/g) ?? []).length;
  if (parenDepth !== 0) {
    issues.push({ message: "Unbalanced parentheses in CSS (e.g. inside a url()/calc()/rgba())." });
  }

  return issues;
}

function checkJs(content: string): QAIssue[] {
  const issues: QAIssue[] = [];

  try {
    // Syntax-only parse; generated code is never executed here.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/import|export/i.test(message) && !/\bimport\b|\bexport\b/.test(content.slice(0, 300))) {
      issues.push({ message: `JavaScript syntax error: ${message}` });
    }
  }

  const trimmed = content.trim();

  if (
    /[.?:=,+\-*/%&|]\s*$/.test(trimmed) ||
    /\b(?:getElementById|getElementsByClassName|getElementsByTagName|querySelector|querySelectorAll|addEventListener|setTimeout|setInterval)\s*$/.test(trimmed)
  ) {
    issues.push({ message: "JavaScript appears truncated or ends with an incomplete expression." });
  }

  if (
    /\b(?:const|let|var|function|class|if|for|while|switch|return)\s+[A-Za-z_$][\w$]*\s*$/.test(trimmed)
  ) {
    issues.push({ message: "JavaScript appears to end in an incomplete declaration." });
  }

  // High-confidence empty core behavior. Empty helper functions can be
  // legitimate, but these names are almost always user-facing behavior.
  const fnRe =
    /(?:function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{([\s\S]*?)\})|(?:const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{([\s\S]*?)\})/g;
  let fn: RegExpExecArray | null;
  while ((fn = fnRe.exec(content)) !== null) {
    const name = fn[1] ?? fn[3] ?? "";
    const body = (fn[2] ?? fn[4] ?? "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trim();
    if (CORE_HANDLER_NAMES.test(name) && !body) {
      issues.push({
        message: `Core interaction function "${name}()" is empty. Implement its behavior completely; do not leave a placeholder.`,
      });
    }
  }

  // Catch explicit model placeholders in executable JS.
  if (
    /(?:\/\/|\/\*)\s*(?:TODO|FIXME|placeholder|not implemented|implement later|actual .* logic)\b/i.test(content) ||
    /\b(?:throw\s+new\s+Error\s*\(\s*["']not implemented|console\.warn\s*\(\s*["'][^"']*not implemented)/i.test(content)
  ) {
    issues.push({
      message: "JavaScript contains a placeholder/not-implemented marker in executable logic.",
    });
  }

  // A very common LLM wiring error: passing the element id instead of the
  // displayed numeric value. Only flag it when appendNumber/setNumber is
  // actually used, so ordinary DOM code is unaffected.
  if (
    /\b(?:appendNumber|setNumber|inputNumber|appendDigit)\s*\(\s*[^)]*\b(?:button|btn)\.id\s*\)/i.test(content)
  ) {
    issues.push({
      message: "Numeric input wiring passes button.id instead of the button's displayed value/text. This produces values such as \"num7\" instead of 7.",
    });
  }

  return issues;
}

/**
 * Cross-file functional QA. This is where the old syntax-only QA was blind:
 * HTML and JS can each parse perfectly while their contract is broken.
 */
export function qaCheckProject(files: Record<string, string>): QAIssue[] {
  const issues: QAIssue[] = [];
  const htmlEntries = Object.entries(files).filter(([p]) => /\.html?$/i.test(p));
  const js = Object.entries(files)
    .filter(([p]) => /\.(?:js|mjs)$/i.test(p))
    .map(([, c]) => c)
    .join("\n\n");
  const html = htmlEntries.map(([, c]) => c).join("\n\n");

  if (!html || !js) return issues;

  // Inline onclick -> function must exist somewhere in JS.
  const declaredFunctions = new Set<string>();
  for (const m of js.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) declaredFunctions.add(m[1]);
  for (const m of js.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g)) {
    declaredFunctions.add(m[1]);
  }

  for (const m of html.matchAll(/\bonclick\s*=\s*["']\s*([A-Za-z_$][\w$]*)\s*\(/gi)) {
    if (!declaredFunctions.has(m[1])) {
      issues.push({
        message: `HTML calls onclick function "${m[1]}()" but no matching JavaScript function was generated.`,
      });
    }
  }

  // Literal DOM ids referenced from JS should normally exist in the HTML.
  // Ignore dynamically-created ids and selectors containing variables.
  const ids = new Set<string>();
  for (const m of html.matchAll(/\bid=["']([^"']+)["']/gi)) ids.add(m[1]);

  for (const m of js.matchAll(/\b(?:getElementById)\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    if (!ids.has(m[1])) {
      issues.push({
        message: `JavaScript looks up element id "${m[1]}", but that id is not present in the generated HTML.`,
      });
    }
  }

  // Calculator-style projects get a stronger deterministic contract check.
  const hasCalculatorSignals =
    /\b(?:calculator|calc)\b/i.test(html) ||
    /\b(?:evaluateExpression|calculate|appendNumber|setOperation)\b/i.test(js);

  if (hasCalculatorSignals) {
    const digitButtonCount = [...html.matchAll(/<button\b[^>]*>\s*[0-9]\s*<\/button>/gi)].length;
    const hasDigitHandling = /\b(?:appendNumber|appendDigit|inputNumber|setNumber)\b/i.test(js);
    if (digitButtonCount >= 3 && !hasDigitHandling) {
      issues.push({
        message: "Calculator has numeric buttons but no numeric-input handler. Number entry is not implemented.",
      });
    }

    if (/>\s*=\s*</.test(html) || /\b(?:equals|calculate|evaluateExpression|evaluate)\b/i.test(html + js)) {
      const evaluator = js.match(/\b(?:function\s+)?(evaluateExpression|evaluate|calculate|compute)\s*\([^)]*\)\s*\{([\s\S]*?)\}/i);
      if (evaluator) {
        const body = evaluator[2].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trim();
        if (!body) {
          issues.push({
            message: `Calculator evaluator "${evaluator[1]}()" is empty. "=" must perform a real calculation.`,
          });
        }
      }
    }

    if (/\bappendNumber\s*\(/i.test(js) && /\bbutton\.id\b/i.test(js)) {
      issues.push({
        message: "Calculator passes button.id into appendNumber(); use button.textContent/value instead so 7 becomes 7, not \"num7\".",
      });
    }

    if (/[+−×÷*/-]/.test(html) && /\bsetOperation\b/i.test(js)) {
      const opFn = js.match(/\b(?:function\s+)?setOperation\s*\([^)]*\)\s*\{([\s\S]*?)\}/i);
      if (opFn && /currentExpression\s*=\s*["']["']/.test(opFn[1])) {
        issues.push({
          message: "Calculator operation handler clears the current expression before preserving the operand/operator. This can make clicking + immediately show 0.",
        });
      }
    }
  }

  // CSS/HTML selector contract: a class/id used only in CSS is a strong
  // signal that the styling and markup drifted apart. Ignore CSS custom
  // properties and common pseudo/structural selectors.
  const css = Object.entries(files)
    .filter(([p]) => /\.css$/i.test(p))
    .map(([, c]) => c.replace(/\/\*[\s\S]*?\*\//g, ""))
    .join("\n");
  const htmlClasses = new Set<string>();
  const htmlIds = new Set<string>();
  for (const m of html.matchAll(/\bclass=["']([^"']+)["']/gi)) {
    for (const cls of m[1].split(/\s+/).filter(Boolean)) htmlClasses.add(cls);
  }
  for (const m of html.matchAll(/\bid=["']([^"']+)["']/gi)) htmlIds.add(m[1]);

  for (const m of css.matchAll(/\.([A-Za-z_-][\w-]*)|#([A-Za-z_-][\w-]*)/g)) {
    const cls = m[1];
    const id = m[2];
    if (cls && !htmlClasses.has(cls) && !/^(?:hover|focus|active|before|after|root|dark)$/i.test(cls)) {
      issues.push({ message: `CSS selector ".${cls}" does not match any class in the generated HTML.` });
    }
    if (id && !/^[0-9a-f]{3,8}$/i.test(id) && !htmlIds.has(id)) {
      issues.push({ message: `CSS selector "#${id}" does not match any id in the generated HTML.` });
    }
  }

  // Forms: if the HTML has a submit form and JS intercepts submit, require a
  // non-empty submit path rather than a dead preventDefault-only handler.
  if (/<form\b/i.test(html) && /\baddEventListener\s*\(\s*["']submit["']/i.test(js)) {
    if (!/\b(?:fetch|FormData|location\.|textContent|innerHTML|reset\s*\(|value\s*=|appendChild)\b/i.test(js)) {
      issues.push({
        message: "Form submit handler appears to prevent submission without any observable success/error/state action.",
      });
    }
  }

  return issues;
}

export function qaCheckFile(path: string, content: string): QAIssue[] {
  if (!content || !content.trim()) return [{ message: "File came back empty." }];

  if (hasToolCallArtifacts(content)) {
    return [{
      message: "Output contains internal tool-call/protocol syntax instead of plain file content. Return ONLY the raw file content.",
    }];
  }

  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "html" || ext === "htm") return checkHtml(content);
  if (ext === "css") return checkCss(content);
  if (ext === "js" || ext === "mjs") return checkJs(content);
  return [];
}
