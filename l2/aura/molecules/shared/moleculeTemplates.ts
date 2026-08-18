/// <mls fileReference="_102020_/l2/aura/molecules/shared/moleculeTemplates.ts" enhancement="_blank"/>

// SHARED deterministic string helpers for molecule artifacts (pure / node-testable).
// Consumed by agentNewMoleculeVariant/helpers/vTemplates and agentNewMolecule2/helpers/nmTemplates.
//
// Everything here answers the same question: which parts of a generated artifact must NOT
// come from the model. Three of them are lessons, not conveniences:
//
// 1. stripLeadingMlsHeader — the mls header is file IDENTITY. The old New Molecule flow parsed
//    the model's first line to decide WHERE to save the .ts, so a hallucinated project wrote to
//    the wrong path. Code owns the header; whatever the model wrote gets stripped first.
// 2. escapeSkillLiteral — the .defs.ts embeds markdown inside a template literal. An unescaped
//    backtick or `${` in that markdown does not compile, and nothing in the old flow checked it.
// 3. deriveMoleculeTag — the custom-element tag is DERIVED from the file path, never authored.

// ---- mls header ----

// Strip any leading `/// <mls ...>` line(s) the model emitted (and the blank line right after),
// so a deterministic header can replace them.
export function stripLeadingMlsHeader(content: string): string {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && (/^\s*\/\/\/\s*<mls\b/.test(lines[i]) || lines[i].trim() === '')) {
    // Stop consuming blank lines once a non-header, non-blank line is reached.
    if (lines[i].trim() === '' && i > 0 && !/^\s*\/\/\/\s*<mls\b/.test(lines[i - 1])) break;
    i++;
  }
  return lines.slice(i).join('\n');
}

// ---- tag derivation ----

// Port of utils.convertFileToTag for the NEW format (shortName carrying a '-', which every
// `ml-*` molecule does). Kept local instead of importing /_102020_/l2/utils.js so this module
// stays node-testable: that file imports the 102027 runtime.
export function toKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function deriveMoleculeTag(info: { shortName: string; folder?: string }): string {
  const kebabName = toKebab(info.shortName);
  const folder = info.folder || '';
  if (!folder) return kebabName;
  const parts = folder.split('/');
  const lastFolder = parts[parts.length - 1];
  return `${toKebab(lastFolder)}--${kebabName}`;
}

// ---- fileReference parsing ----

export interface MlsFileRef {
  project: number;
  level: number;
  folder: string;     // '' when the file sits at the level root
  shortName: string;
  extension: string;  // with the dot
}

// '_102040_/l2/molecules/groupviewmetric/ml-metric-card.ts' -> its parts.
// Returns null when the string is not a well-formed reference — callers report it as a gate
// error instead of guessing (a malformed reference is what wrote files to the wrong path).
export function parseMlsFileReference(reference: string): MlsFileRef | null {
  const match = /^_(\d+)_\/l(\d+)\/(.+)$/.exec((reference || '').trim());
  if (!match) return null;
  const rest = match[3];
  const lastSlash = rest.lastIndexOf('/');
  const folder = lastSlash >= 0 ? rest.slice(0, lastSlash) : '';
  const fileName = lastSlash >= 0 ? rest.slice(lastSlash + 1) : rest;
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return null;
  return {
    project: Number(match[1]),
    level: Number(match[2]),
    folder,
    shortName: fileName.slice(0, dot),
    extension: fileName.slice(dot),
  };
}

// The tag a fileReference implies, or '' when the reference is malformed.
export function tagFromFileReference(reference: string): string {
  const parsed = parseMlsFileReference(reference);
  return parsed ? deriveMoleculeTag(parsed) : '';
}

// ---- .defs.ts skill literal ----

// The `skill` markdown lives inside a template literal, so backticks and `${` must be escaped
// or the generated file does not compile.
export function escapeSkillLiteral(markdown: string): string {
  return markdown.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// The inverse of escapeSkillLiteral. Gates that inspect the CONTENT of a skill literal must
// unescape first: a markdown code fence survives escaping as `\`\`\`` and would otherwise slip past
// a content check that looks for backticks.
export function unescapeSkillLiteral(literalBody: string): string {
  return literalBody.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
}

// True when the markdown still carries a character that would break the template literal —
// i.e. a backtick or `${` that is not already escaped. Used by the .defs.ts gate.
export function hasUnescapedTemplateChars(literalBody: string): boolean {
  return /(^|[^\\])`/.test(literalBody) || /(^|[^\\])\$\{/.test(literalBody);
}

// ---- playground state ----

// The demo html carries a literal `playgroundDinamicState` placeholder that is replaced
// DETERMINISTICALLY by the state assembled from the model's examples (port of
// agentNewMoleculePlayground.generatePlaygroundState).
export interface MoleculeDemoExample {
  name: string;
  state: { stateName: string; value: string }[];
}

/**
 * The playground state widget, as the custom element is REGISTERED — `@customElement(...)` in
 * `playground/widgetPlaygroundState.ts`.
 *
 * ⚠️ MEASURED 2026-08-18, and it had already shipped. Two gates carried this as the SUFFIX
 * (`'widget-playground-state-102020'`) and tested it with `html.includes(...)`, which the truncated
 * tag satisfies. Across the six projects: **398 pages** carry the registered tag and **8** the
 * truncated one — 5 of those 8 are NM2 output that is otherwise perfect (12 instances, 6 example keys,
 * real state, header). `<widget-playground-state-102020>` is not a registered element, so it renders
 * nothing and EVERY `{{playground.*}}` binding on the page is dead.
 *
 * Same species as `slotIsExercised` accepting `slot="X"`: the check measured a substring, so the
 * measurement that blessed it ("146/146 carry the widget") could not see the prefix. Compare with
 * `pageHasStateWidget`, never with `includes` of a bare name.
 */
export const PLAYGROUND_STATE_WIDGET = 'aura--molecules--playground--widget-playground-state-102020';

/** The widget present AS A TAG — `<tag` followed by whitespace, `>` or `/`, never a longer name. */
export function pageHasStateWidget(html: string): boolean {
  return new RegExp(`<${PLAYGROUND_STATE_WIDGET}[\\s>/]`, 'i').test(html || '');
}

export const PLAYGROUND_STATE_PLACEHOLDER = 'playgroundDinamicState';

export function substituteDemoState(html: string, examples: MoleculeDemoExample[]): string {
  const playground: Record<string, Record<string, unknown>> = {};
  for (const scenario of examples) {
    for (const entry of scenario.state || []) {
      const parts = entry.stateName.split('.');
      if (parts.length !== 3 || parts[0] !== 'playground') continue;
      const key = parts[1];
      const prop = parts[2];
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry.value);
      } catch {
        parsed = entry.value;
      }
      if (!playground[key]) playground[key] = {};
      playground[key][prop] = parsed;
    }
  }
  return html.replace(PLAYGROUND_STATE_PLACEHOLDER, JSON.stringify({ playground }));
}
