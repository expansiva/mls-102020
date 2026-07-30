/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/steps/t3-generate/gate.ts" enhancement="_blank"/>

// t3-generate gate (pure — unit-testable). The generated theme.ts is a SOURCE STRING
// that is not on disk yet, so the gate statically reads the three exports out of it
// (no eval) and hands the reconstructed module to the SHARED contract validator —
// the same validateVThemeModule the molecule agents use when they READ a theme.
// flow.json t3-generate: retry 1 with these errors in context.

import { validateVThemeModule } from '/_102020_/l2/aura/molecules/shared/vThemeContract.js';
import { NtThemeSummary } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';
import { NtGateIssue } from '/_102020_/l2/aura/molecules/agentNewTheme/steps/t1-plan/gate.js';

export interface NtParsedTheme {
  module: Record<string, unknown> | null;   // { themeInfo, skill, examples } as data
  skill: string;
  errors: string[];
}

export interface NtThemeGateInputs {
  themeTs: string;
  summary: NtThemeSummary | null;
  destProject: number;
}

// Statically reads `export const themeInfo = { ... };`, `export const skill = \`...\`;`
// and `export const examples = [...];` from the generated source. The prompt pins the
// exact skeleton, so a parse failure is a real defect the retry can fix.
export function parseThemeSource(source: string): NtParsedTheme {
  const errors: string[] = [];
  const infoBlock = readObjectLiteral(source, 'themeInfo');
  if (!infoBlock) errors.push('cannot read `export const themeInfo = { ... };` — keep the exact skeleton (one field per line, single-quoted values)');

  const skill = readTemplateLiteral(source, 'skill');
  if (skill === null) errors.push('cannot read `export const skill = `...`;` — the skill must be one template literal (inner backticks escaped as \\`)');

  const examplesBlock = readArrayLiteral(source, 'examples');
  if (examplesBlock === null) errors.push('cannot read `export const examples = [];`');

  if (errors.length) return { module: null, skill: skill || '', errors };

  const background = infoBlock ? sliceBraceBlock(infoBlock, 'background') : null;
  const module: Record<string, unknown> = {
    themeInfo: {
      name: readField(infoBlock as string, 'name'),
      suffix: readField(infoBlock as string, 'suffix'),
      displayName: readField(infoBlock as string, 'displayName'),
      description: readField(infoBlock as string, 'description'),
      background: {
        kind: background ? readField(background, 'kind') : undefined,
        css: background ? readField(background, 'css') : undefined,
        note: background ? readField(background, 'note') : undefined,
      },
    },
    skill: skill as string,
    examples: parseExamples(examplesBlock as string),
  };
  return { module, skill: skill as string, errors: [] };
}

export function runThemeGate(inputs: NtThemeGateInputs): NtGateIssue[] {
  const issues: NtGateIssue[] = [];
  const content = inputs.themeTs || '';

  if (!content.trim()) return [{ code: 'empty', message: 'themeTs is empty' }];
  if (content.includes('```')) {
    issues.push({ code: 'fence', message: 'themeTs contains markdown fences — return raw TypeScript only' });
  }

  // The header is a metadata contract: exactly one, pointing at the destination file.
  const headers = content.match(/^\s*\/\/\/\s*<mls\b[^\n]*/gm) || [];
  const expectedRef = `_${inputs.destProject}_/l2/skills/theme.ts`;
  if (headers.length !== 1 || !headers[0].includes(expectedRef)) {
    issues.push({ code: 'header', message: `the file must carry exactly one mls header referencing ${expectedRef} (found ${headers.length})` });
  }

  // A theme is a self-contained data module: the molecule agents import() it directly.
  if (/^\s*import\s/m.test(content)) {
    issues.push({ code: 'import', message: 'the theme must be a self-contained data module — no import statements' });
  }

  const parsed = parseThemeSource(content);
  for (const error of parsed.errors) issues.push({ code: 'parse', message: error });

  if (parsed.module) {
    const validation = validateVThemeModule(parsed.module);
    for (const error of validation.errors) issues.push({ code: 'contract', message: error });

    const info = parsed.module.themeInfo as Record<string, unknown>;
    const name = String(info.name || '');
    const suffix = String(info.suffix || '');
    if (name && suffix && suffix !== `-${name}`) {
      issues.push({ code: 'suffix', message: `themeInfo.suffix must be '-' + themeInfo.name (expected '-${name}', got '${suffix}')` });
    }
    const examples = parsed.module.examples;
    if (Array.isArray(examples) && examples.length) {
      issues.push({ code: 'examples', message: 'examples must start EMPTY — reference molecules are registered later, after visual approval' });
    }
    issues.push(...checkSummary(inputs.summary, info, parsed.skill));
  }

  return issues;
}

// The structured summary drives theme.html and the step view, so it must describe the
// theme that was actually generated — not a second, divergent story.
function checkSummary(summary: NtThemeSummary | null, info: Record<string, unknown>, skill: string): NtGateIssue[] {
  const issues: NtGateIssue[] = [];
  if (!summary) return [{ code: 'summary', message: 'the structured summary is missing' }];

  if (summary.name !== info.name) {
    issues.push({ code: 'summary_name', message: `summary.name '${summary.name}' does not match themeInfo.name '${String(info.name)}'` });
  }
  const background = (info.background || {}) as Record<string, unknown>;
  if (summary.background?.kind !== background.kind) {
    issues.push({ code: 'summary_background', message: `summary.background.kind '${String(summary.background?.kind)}' does not match themeInfo.background.kind '${String(background.kind)}'` });
  }
  if (normalizeCss(summary.background?.css) !== normalizeCss(background.css)) {
    issues.push({ code: 'summary_background_css', message: 'summary.background.css must be exactly themeInfo.background.css' });
  }
  if (!summary.palette?.length) {
    issues.push({ code: 'summary_palette', message: 'summary.palette must list the theme colors (token + label + color)' });
  }
  if (!summary.signature?.length) {
    issues.push({ code: 'summary_signature', message: 'summary.signature must list the layout aspects (corners, border, shadow, motion, ...)' });
  }
  // T4: an overlay painted the same color as the page has no hierarchy — only its border
  // separates it, and the user reads it as part of the page. Compared only when the page
  // background is a single flat color (a gradient/image backdrop has no single value).
  // T27: the overlay token is `--ml-surface-overlay`; `--ml-surface-dim` is the RECESSED
  // surface (rails, footers, empty states — 316 reads in the base sheets), so it is only the
  // fallback here, for themes that still carry the older meaning.
  const palette = summary.palette || [];
  const overlay = palette.find(swatch => swatch.token === '--ml-surface-overlay')
    || palette.find(swatch => swatch.token === '--ml-surface-dim');
  const pageColor = singleColorLiteral(String(background.css ?? ''));
  if (overlay && pageColor && normalizeColor(overlay.color) === pageColor) {
    issues.push({
      code: 'overlay_contrast',
      message: `${overlay.token} (the overlay surface) is the same color as the page background (${overlay.color}) — panels, dropdowns and modals would have no hierarchy against the page; pick a visibly distinct step`,
    });
  }

  const tokensSection = sliceSection(skill, '## 2. Tokens', '## 3. Canonical CSS Rules');
  for (const swatch of summary.palette || []) {
    if (!swatch.token.startsWith('--ml-')) {
      issues.push({ code: 'palette_token', message: `palette token '${swatch.token}' must be a --ml-* token` });
      continue;
    }
    if (tokensSection && !tokensSection.includes(swatch.token)) {
      issues.push({ code: 'palette_unknown', message: `palette token '${swatch.token}' is not declared in the "## 2. Tokens" table` });
    }
  }
  return issues;
}

// ---- static source readers (no eval) ----

function readObjectLiteral(source: string, exportName: string): string | null {
  const open = source.search(new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*\\{`));
  if (open < 0) return null;
  return balancedBlock(source, source.indexOf('{', open), '{', '}');
}

function readArrayLiteral(source: string, exportName: string): string | null {
  const open = source.search(new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*\\[`));
  if (open < 0) return null;
  return balancedBlock(source, source.indexOf('[', open), '[', ']');
}

// Body of a template literal export, up to the first UNESCAPED closing backtick.
function readTemplateLiteral(source: string, exportName: string): string | null {
  const match = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*\``).exec(source);
  if (!match) return null;
  const start = match.index + match[0].length;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '\\') {
      i++;
      continue;
    }
    if (source[i] === '`') return source.slice(start, i);
  }
  return null;
}

// The `background: { ... }` sub-block of an object literal body.
function sliceBraceBlock(block: string, key: string): string | null {
  const match = new RegExp(`${key}\\s*:\\s*\\{`).exec(block);
  if (!match) return null;
  return balancedBlock(block, block.indexOf('{', match.index), '{', '}');
}

function balancedBlock(source: string, open: number, openChar: string, closeChar: string): string | null {
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === openChar) depth++;
    else if (source[i] === closeChar && --depth === 0) return source.slice(open + 1, i);
  }
  return null;
}

// `key: 'value'` / `key: "value"` (a trailing TypeScript cast is tolerated).
function readField(block: string, key: string): string | undefined {
  const single = new RegExp(`(?:^|[,{\\s])${key}\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(block);
  if (single) return unescapeLiteral(single[1]);
  const double = new RegExp(`(?:^|[,{\\s])${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(block);
  if (double) return unescapeLiteral(double[1]);
  return undefined;
}

function parseExamples(block: string): Array<{ pattern?: string; ref?: string }> {
  const entries: Array<{ pattern?: string; ref?: string }> = [];
  const objects = block.match(/\{[^{}]*\}/g) || [];
  for (const item of objects) {
    entries.push({ pattern: readField(item, 'pattern'), ref: readField(item, 'ref') });
  }
  return entries;
}

function unescapeLiteral(value: string): string {
  return value.replace(/\\(['"\\])/g, '$1');
}

function sliceSection(skill: string, from: string, to: string): string {
  const start = skill.indexOf(from);
  if (start < 0) return '';
  const end = skill.indexOf(to, start);
  return end > start ? skill.slice(start, end) : skill.slice(start);
}

function normalizeCss(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().replace(/;$/, '');
}

// The single flat color a page background resolves to, or '' when there is more than one
// (gradient) / none (image, named color). Only a single value can be compared safely.
function singleColorLiteral(css: string): string {
  const colors = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || [];
  if (colors.length !== 1) return '';
  return normalizeColor(colors[0]);
}

// '#FFF' and '#ffffff' are the same color; rgb() spacing is irrelevant.
function normalizeColor(value: string): string {
  const color = (value || '').trim().toLowerCase();
  const hex = color.match(/^#([0-9a-f]{3})$/);
  if (hex) return `#${hex[1].split('').map(ch => ch + ch).join('')}`;
  return color.replace(/\s+/g, '');
}
