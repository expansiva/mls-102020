/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n4-render/gate.ts" enhancement="_blank"/>

// n4-render gate (pure — unit-testable). Compilation is NOT pure, so its errors arrive as an input.
//
// The appearance rules here are MEASURED over the 147 real `ml-*.ts` molecules of mls-102040, not
// asserted (2026-07-29). Running these detectors over the library gives 0 / 5 / 0 failures:
// - inline `style=` appears in 28 of them and is almost always GEOMETRY (width/height/left/top/
//   transform/padding/flex). Banning `style=` would ban a normal pattern; the ban is therefore
//   PROPERTY-level, and only for LITERAL values — the single measured colour case is
//   `background-color:${item.color}`, driven by data, which stays legal. 0 molecules fail.
// - hex literals appear in 5, all charts, all inside a `palette` DATA array (chart series
//   defaults). So hex is rejected only where it styles markup, not where it is data.
// - Tailwind colour utilities appear in 5 (`text-white` ×2, `border-white`, `bg-black`,
//   `bg-black/70`). They ARE rejected: a hardcoded colour is exactly what makes a molecule
//   impossible to theme later — `bg-black/70` on a media overlay stays black in a light theme.

import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { NmGateIssue } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import { extractMlClassesFromTs } from '/_102020_/l2/aura/molecules/shared/moleculeInspect.js';

// Tailwind's named palette. `-white`/`-black` included: they are colours too.
const TW_PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const TW_COLOR_UTILITY = new RegExp(
  `(?:^|[\\s'"\`:])(?:(?:hover|focus|active|disabled|dark|group-hover|peer-focus|sm|md|lg|xl|2xl)+:)*` +
  `(?:bg|text|border|ring|divide|outline|decoration|placeholder|caret|accent|fill|stroke|shadow|from|via|to)-` +
  `(?:(?:${TW_PALETTE})-(?:50|100|200|300|400|500|600|700|800|900|950)|white|black)(?:\\/\\d+)?(?![\\w-])`,
  'g',
);

// Appearance properties inside an inline style attribute.
const STYLE_APPEARANCE = /(^|[;\s])(color|background|background-color|background-image|border-color|box-shadow|text-shadow|outline-color)\s*:/i;

export interface NmRenderGateOptions {
  compileErrors: string[];   // from modelTs.compilerResults.errors ([] when it compiles)
}

export function runNm2RenderGate(
  source: string,
  plan: MoleculePlan,
  ctx: MoleculeContext,
  options: NmRenderGateOptions,
): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const text = (source || '').replace(/^﻿/, '');

  if (!text.trim()) return [{ code: 'empty', message: 'the molecule .ts came out empty' }];

  if (/```/.test(text)) {
    issues.push({ code: 'fence', message: 'the file carries a markdown code fence — submit raw TypeScript' });
  }

  const headers = text.match(/^\s*\/\/\/\s*<mls\b.*$/gm) || [];
  if (headers.length !== 1) {
    issues.push({ code: 'header', message: `expected exactly one mls header, found ${headers.length}` });
  } else if (!headers[0].includes(`_${ctx.destination.project}_/l2/molecules/${plan.group}/${plan.shortName}.ts`)) {
    issues.push({ code: 'header', message: `the mls header must reference this file's destination — got ${headers[0].trim()}` });
  }

  const customElement = /@customElement\(\s*['"`]([^'"`]+)['"`]\s*\)/.exec(text);
  if (!customElement) {
    issues.push({ code: 'tag_missing', message: 'no @customElement(...) registration found' });
  } else if (customElement[1] !== plan.tag) {
    issues.push({ code: 'tag_mismatch', message: `the tag must be the one derived from the path: expected '${plan.tag}', got '${customElement[1]}'` });
  }

  if (!new RegExp(`extends\\s+${ctx.base.className}\\b`).test(text)) {
    issues.push({ code: 'base_extends', message: `the molecule class must extend ${ctx.base.className}` });
  }
  if (!text.includes(ctx.base.importPath)) {
    issues.push({ code: 'base_import', message: `${ctx.base.className} must be imported from '${ctx.base.importPath}'` });
  }

  // THE discipline check, and the reason it exists: a molecule that paints itself cannot be pulled
  // into another theme by agentNewMoleculeVariant later. Nothing checks this in the old flow.
  const mlClasses = extractMlClassesFromTs(text);
  if (!mlClasses.length) {
    issues.push({
      code: 'discipline',
      message: 'the render emits no ml-* semantic class — the molecule would not be themeable, and agentNewMoleculeVariant could never derive it',
    });
  }

  for (const utility of findTailwindColorUtilities(text)) {
    issues.push({
      code: 'appearance_class',
      message: `'${utility}' hardcodes a colour — appearance belongs to the .less through an ml-* semantic class`,
    });
  }

  for (const declaration of findLiteralStyleAppearance(text)) {
    issues.push({
      code: 'appearance_style',
      message: `inline style sets appearance with a literal value ('${declaration}') — inline style is for geometry only`,
    });
  }

  // The three checks below were added after the first Studio run (2026-07-30), and each one is
  // MEASURED over the 231 real molecules of mls-102040/102053/102054/102055: all three detectors
  // fire 0 times there, so they reject inventions of the model and nothing the library does.
  // (The same measurement KILLED three other rules I had planned — requiring `super.firstUpdated`,
  // `super.updated` and `super.handleIcaStateChange` would reject 46/46, 48/54 and 51/51 real
  // molecules. Not calling super is the library's uniform convention; see the control file.)

  const sideEffect = findRenderSideEffects(text);
  for (const found of sideEffect) {
    issues.push({
      code: 'render_side_effect',
      message: `render() must be pure — it ${found}. Move it to updated() (which is what the library does for is-editing propagation)`,
    });
  }

  for (const selector of findRedundantCaseSelectors(text)) {
    issues.push({
      code: 'selector_duplicate',
      message: `'${selector}' spells the same tag twice — type selectors are case-insensitive in HTML documents, so the second form is dead`,
    });
  }

  for (const member of findBaseInternals(text)) {
    issues.push({
      code: 'base_internals',
      message: `'${member}' is internal plumbing of the base class — do not drive it from the molecule; derive what you need in render() from the snapshot readers (getSlot/getSlots/getSlotContent)`,
    });
  }

  for (const helper of findTopLevelFunctions(text)) {
    issues.push({
      code: 'helper_outside_class',
      message: `'${helper}' is declared outside the class — a molecule is the class and nothing else. If you need to omit an attribute, import 'nothing' from 'lit' and write attr=\${value || nothing}; a local sentinel returning null, undefined or '' renders attr="" instead of removing it`,
    });
  }

  for (const error of options.compileErrors) {
    issues.push({ code: 'compile', message: error });
  }

  return issues;
}

// ---- checks added by the first-run review (see the block above) ----

// The body of `render()`, by brace counting. Returns '' when there is no render().
export function extractRenderBody(source: string): string {
  const match = /(?:^|\n)\s*(?:private |public |async )*render\s*\([^)]*\)\s*(?::[^{]+)?\{/.exec(source);
  if (!match) return '';
  let index = match.index + match[0].length;
  let depth = 1;
  while (index < source.length && depth > 0) {
    if (source[index] === '{') depth++;
    else if (source[index] === '}') depth--;
    index++;
  }
  return source.slice(match.index + match[0].length, index - 1);
}

// A render that schedules a timer or touches the DOM is not a pure function of the state: it runs on
// EVERY update. The first generated molecule called `propagateEditingInRenderedCells()` — a
// requestAnimationFrame doing setAttribute on descendants — from inside render().
export function findRenderSideEffects(source: string): string[] {
  const body = extractRenderBody(source);
  if (!body) return [];
  const found: string[] = [];
  const timer = /\b(requestAnimationFrame|setTimeout|setInterval)\s*\(/.exec(body);
  if (timer) found.push(`schedules ${timer[1]}(...)`);
  const dom = /this\.(setAttribute|removeAttribute|querySelector|querySelectorAll|appendChild)\s*\(/.exec(body);
  if (dom) found.push(`calls this.${dom[1]}(...)`);
  return found;
}

// `'tablecell, TableCell'` and `querySelector('x') || this.querySelector('X')`: in an HTML document a
// type selector is ASCII case-insensitive, so the second spelling can never match anything the first
// missed. The model emitted both forms throughout, which reads as distrust of the parser.
export function findRedundantCaseSelectors(source: string): string[] {
  const found = new Set<string>();
  for (const literal of source.match(/['"][A-Za-z]+\s*,\s*[A-Za-z]+['"]/g) || []) {
    const [left, right] = literal.slice(1, -1).split(',').map(part => part.trim());
    if (left && right && left !== right && left.toLowerCase() === right.toLowerCase()) found.add(literal.slice(1, -1));
  }
  const chain = /querySelector(?:All)?\(\s*['"]([A-Za-z]+)['"]\s*\)\s*\|\|\s*(?:this\.)?querySelector(?:All)?\(\s*['"]([A-Za-z]+)['"]\s*\)/g;
  for (const match of source.matchAll(chain)) {
    if (match[1] !== match[2] && match[1].toLowerCase() === match[2].toLowerCase()) found.add(`${match[1]} || ${match[2]}`);
  }
  return [...found];
}

// Base-class plumbing the molecule must not drive. `_mutationLock` and `_onSlotTagsChanged` exist so
// the observer can suppress itself; a molecule that flips them is reordering the hidden light DOM —
// irreversible (the authored order is lost) and coupled to the base's internals. 0/231 real
// molecules touch them; the library sorts in memory over the snapshot instead.
export function findBaseInternals(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.match(/\b_(?:mutationLock|onSlotTagsChanged)\b/g) || []) found.add(match);
  return [...found];
}

// A molecule is the class and nothing else. Anything declared at column 0 that is CALLABLE is a
// helper the model invented instead of using the platform.
//
// The rule exists because of one specific, RECURRING invention: a local `nothing` sentinel for
// omitting attributes. Four generations produced it across BOTH flows, and it is not a prompt
// problem — the shipped library carries two of them (measured 2026-07-31):
//
//   ml-number-range-slider.ts:917     function nothingAttr(): string { return ''; }        (old flow)
//   ml-number-interval-inputs.ts:664  function nothingAttr(): any { return undefined; }    (old flow)
//   ml-data-grid-33                   function nothingAttr(): null { return null; }        (nm2)
//   ml-general-text-input-teste       function nothingAttr(): undefined { … }              (nm2, after
//                                     the skill was rewritten to forbid it explicitly)
//
// All four COMPILE and all four are wrong: Lit only removes an attribute for the `nothing` sentinel;
// null/undefined/'' render `attr=""`, which for `aria-*` and `maxlength` changes behaviour. A fifth
// generation reached for `require('lit')` and did not compile at all.
//
// MEASURED over the 231 real molecules with THIS function: 2 hits, and both are the defect above.
//
// Only `function` DECLARATIONS are detected, on purpose. An earlier version also flagged a top-level
// `const … =>`, and running it over the corpus rejected 32 of 231 — because the stored molecules have
// COLLAPSED INDENTATION (method bodies sit at column 0 or one space), so `^` cannot tell "top level"
// from "inside a method" and `const items = …map(el => …)` matched. A column anchor is not a reliable
// scope signal in these files, so the loose branch was removed rather than kept with 30 false
// positives. `function` at column 0 does not suffer from this: the corpus has exactly two, both wrong.
//
// Known blind spot: `const nothingAttr = () => undefined;` at top level would pass. Accepted — all
// five observed inventions used a `function` declaration. The i18n `const message_en = {…}` and
// `type MessageType` are data, not callables, and were never matched by either branch.
export function findTopLevelFunctions(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(/^(?:export\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) {
    found.add(`${match[1]}()`);
  }
  return [...found];
}

// The inventory the .less may style. SHARED with n5-less (shared/moleculeInspect), which needs the
// exact same reading of "which classes does this render emit" — two copies would let the subset check
// disagree with the discipline check.
export { extractMlClassesFromTs as collectMlClasses };

export function findTailwindColorUtilities(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.match(TW_COLOR_UTILITY) || []) {
    found.add(match.replace(/^[\s'"`:]+/, ''));
  }
  return [...found].sort();
}

// Appearance declarations inside an inline style attribute, but ONLY with a literal value: a
// data-driven `background-color:${item.color}` is legitimate (measured in the library).
export function findLiteralStyleAppearance(source: string): string[] {
  const found = new Set<string>();
  // style="..." / style='...' / style=${`...`} — each declaration is inspected on its own, so a
  // geometry declaration sitting next to an interpolated colour does not hide it.
  for (const attr of source.match(/style\s*=\s*(?:"[^"]*"|'[^']*'|\$\{`[^`]*`\}|`[^`]*`)/g) || []) {
    for (const declaration of extractStyleValue(attr).split(';')) {
      const trimmed = declaration.trim();
      if (!trimmed || !STYLE_APPEARANCE.test(trimmed)) continue;
      if (trimmed.includes('${')) continue; // data-driven value
      found.add(trimmed);
    }
  }
  return [...found];
}

function extractStyleValue(attr: string): string {
  let value = attr.slice(attr.indexOf('=') + 1).trim();
  if (value.startsWith('${') && value.endsWith('}')) value = value.slice(2, -1).trim();
  const quote = value.charAt(0);
  if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote)) value = value.slice(1, -1);
  return value;
}
