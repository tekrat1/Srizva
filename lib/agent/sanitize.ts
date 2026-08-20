/**
 * Some free/low-tier OpenRouter models don't respect "return raw file
 * content only" and instead emit their internal tool-calling protocol as
 * plain text, e.g.:
 *
 *   <|tool_call_start|>[write(file='index.html', content='<!DOCTYPE html>...
 *
 * If that leaks into a generated file, the preview shows the literal
 * protocol tokens instead of the page (and any real code trailing it can
 * be broken/truncated). This module detects and strips that pattern so a
 * clean file reaches QA, the preview, and the downloaded ZIP.
 */

const TOOL_TOKEN_RE = /<\|[a-zA-Z0-9_]+\|>/;
const TOOL_TOKEN_GLOBAL_RE = /<\|[a-zA-Z0-9_]+\|>/g;

// Matches a pseudo function-call wrapper like:
//   [write(file='index.html', content='...')]
//   write(path="index.html", content="...")
const CALL_WRAPPER_RE = /^\s*\[?\s*(?:write|create_file|edit_file)\s*\(([\s\S]*)\)\s*\]?\s*$/i;

// First point in the text that looks like real file content starts
// (HTML doctype/tag, a JS/TS statement, or a CSS rule opening brace).
const BODY_START_RE =
  /(<!DOCTYPE|<html[\s>]|^\s*(?:import|export|const|let|var|function|class)\b|^[.#a-zA-Z][^\n{]*\{)/im;

export function hasToolCallArtifacts(content: string): boolean {
  if (!content) return false;
  return TOOL_TOKEN_RE.test(content) || CALL_WRAPPER_RE.test(content.trim());
}

export function sanitizeToolCallArtifacts(raw: string): string {
  if (!raw) return raw;
  let text = raw;

  // Strip bare protocol tokens like <|tool_call_start|>, <|tool_call_end|>.
  text = text.replace(TOOL_TOKEN_GLOBAL_RE, "");

  // Unwrap a pseudo function-call envelope, pulling out the `content=`
  // argument if present.
  const wrapped = text.trim().match(CALL_WRAPPER_RE);
  if (wrapped) {
    const inner = wrapped[1];
    const contentArg = inner.match(/content\s*=\s*['"]([\s\S]*)['"]\s*,?\s*$/);
    text = contentArg ? contentArg[1] : inner;
  }

  // Drop any leftover preamble before the actual file body starts.
  const bodyMatch = text.search(BODY_START_RE);
  if (bodyMatch > 0) {
    text = text.slice(bodyMatch);
  }

  return text.trim();
}
