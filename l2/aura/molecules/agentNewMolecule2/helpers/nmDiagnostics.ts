/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmDiagnostics.ts" enhancement="_blank"/>

// Turns TypeScript diagnostics into something a model can act on. PURE — no stor, no monaco.
//
// Why this exists (F2, 2026-07-31). The compiler hands back byte OFFSETS:
//
//   {"file":{"fileName":"…"},"start":13424,"length":7,"messageText":"Cannot find name 'require'.",
//    "category":1,"code":2580}
//
// The retry used to receive that JSON verbatim, and a model cannot map "byte 13424" onto the file it
// just wrote. The old flow did better: besides the raw errors it sent `monaco.editor.getModelMarkers`,
// which carry startLineNumber/startColumn (agentNewMoleculeFix.ts:95-98). Rather than depend on the
// markers being populated — `compile()` is documented as NOT updating editor errors — the offset is
// resolved against the source we just wrote, which is always available at the call site.
//
// Output, per diagnostic:
//
//   line 412, col 25 — TS2580: Cannot find name 'require'.
//     const { nothing } = require('lit') as typeof import('lit');
//                         ^^^^^^^

export interface NmDiagnosticLike {
  start?: number;
  length?: number;
  code?: number;
  messageText?: unknown;
}

// `messageText` is either a string or a nested DiagnosticMessageChain.
export function flattenMessageText(messageText: unknown, depth = 0): string {
  if (typeof messageText === 'string') return messageText;
  if (!messageText || typeof messageText !== 'object' || depth > 8) return '';
  const chain = messageText as { messageText?: unknown; next?: unknown };
  const head = typeof chain.messageText === 'string' ? chain.messageText : '';
  const next = Array.isArray(chain.next) ? chain.next : chain.next ? [chain.next] : [];
  const tail = next.map(item => flattenMessageText(item, depth + 1)).filter(Boolean);
  return [head, ...tail].filter(Boolean).join(' -> ');
}

// 1-based line and column of a byte offset, plus the text of that line.
export function resolvePosition(source: string, offset: number): { line: number; column: number; text: string } {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  const before = source.slice(0, safeOffset);
  const line = before.split('\n').length;
  const lineStart = before.lastIndexOf('\n') + 1;
  const lineEndRelative = source.slice(lineStart).indexOf('\n');
  const lineEnd = lineEndRelative === -1 ? source.length : lineStart + lineEndRelative;
  return { line, column: safeOffset - lineStart + 1, text: source.slice(lineStart, lineEnd) };
}

// Longest line kept in the excerpt. A minified or very long line would otherwise flood the retry
// prompt; the caret is what locates the problem, not the whole line.
const MAX_EXCERPT = 160;

export function formatCompileDiagnostics(diagnostics: NmDiagnosticLike[], source: string): string[] {
  return diagnostics.map(diagnostic => {
    const message = flattenMessageText(diagnostic.messageText) || 'unknown compiler error';
    const code = typeof diagnostic.code === 'number' ? `TS${diagnostic.code}: ` : '';
    if (typeof diagnostic.start !== 'number' || !source) return `${code}${message}`;

    const { line, column, text } = resolvePosition(source, diagnostic.start);
    const width = Math.max(1, Math.min(diagnostic.length || 1, Math.max(1, text.length - column + 1)));
    const excerpt = text.length > MAX_EXCERPT ? `${text.slice(0, MAX_EXCERPT)}…` : text;
    const caretVisible = column <= MAX_EXCERPT;
    const caret = caretVisible ? `\n  ${' '.repeat(column - 1)}${'^'.repeat(width)}` : '';
    return `line ${line}, col ${column} — ${code}${message}\n  ${excerpt}${caret}`;
  });
}
