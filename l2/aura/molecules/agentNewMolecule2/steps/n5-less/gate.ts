/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n5-less/gate.ts" enhancement="_blank"/>

// n5-less gate (pure — unit-testable). Adapted from the Variant's v3-less gate, minus the checks
// that only exist when there IS an origin sheet (geometry conservation, origin property scope) and
// plus the checks that only make sense for a molecule being created.
//
// MEASURED against BOTH validated corpora (2026-07-29) — the 147 neutral base sheets of mls-102040
// and the 84 themed sheets of mls-102054/102055 — which is what split this gate in two halves:
//
// neutral corpus (147):
// - 0 DEFINE `--ml-*` tokens; 146 CONSUME them. "Define the tokens you consume" is a THEMED rule;
//   requiring it here would fail every neutral molecule.
// - `transition` appears in only 51. An explicit motion stance is likewise a THEMED rule.
// - a colour literal OUTSIDE `var(--ml-…, fallback)` appears in 10, almost all the same hardcoded
//   red focus ring — a defect, so it IS rejected here.
// - `!important` appears in 41 — a pattern (beating a global Tailwind utility), NOT a defect. It is
//   deliberately NOT a gate code.
//
// themed corpus (84):
// - ALL 84 write colour literals directly (`box-shadow: 4px 4px 0 #000000`): a themed sheet IS the
//   theme's values. Applying the neutral literal rule there would reject 84 out of 84, so it is
//   applied ONLY when the project has no theme.
// - 0 use a universal selector, 0 use `:host` — both bans stand for either mode.

import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { NmGateIssue } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import {
  bareColorLiterals,
  declaresPortal,
  extractAbsoluteMlClasses,
  extractMlClassesFromLess,
  extractMlClassesFromTs,
  hasUniversalSelector,
  setsPositionOrOverflow,
} from '/_102020_/l2/aura/molecules/shared/moleculeInspect.js';

// Pure LAYOUT utilities only — `.animate-spin`/`.w-full` stay allowed: a sheet legitimately anchors
// on them (a mechanical spinner steps(), collapsed levels).
const TAILWIND_LAYOUT_SELECTORS = /\.(px-\d|py-\d|gap-\d|inline-flex\b)/;

export interface NmLessGateOptions {
  renderTs: string;   // the .ts written by n4-render: the source of truth for the class inventory
}

export function runNm2LessGate(
  less: string,
  plan: MoleculePlan,
  ctx: MoleculeContext,
  options: NmLessGateOptions,
): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const content = less || '';

  if (!content.trim()) return [{ code: 'empty', message: 'the stylesheet came out empty' }];
  if (content.includes('```')) {
    issues.push({ code: 'fence', message: 'the stylesheet contains markdown fences — return raw LESS only' });
  }

  // Safety net for the header the CODE prepends: guards a regression and a model that smuggled a
  // second header into the body.
  const headers = content.match(/^\s*\/\/\/\s*<mls\b[^\n]*/gm) || [];
  const correctRef = `_${ctx.destination.project}_/l2/molecules/${plan.group}/${plan.shortName}.less`;
  if (headers.length !== 1 || !headers[0].includes(correctRef)) {
    issues.push({ code: 'header', message: `the sheet must carry exactly one mls header referencing ${correctRef} (found ${headers.length})` });
  }

  const open = (content.match(/\{/g) || []).length;
  const close = (content.match(/\}/g) || []).length;
  if (open !== close) {
    issues.push({ code: 'braces', message: `unbalanced braces: ${open} '{' vs ${close} '}'` });
  }

  if (!content.includes(plan.tag)) {
    issues.push({ code: 'scope', message: `the sheet must be scoped under the molecule tag '${plan.tag}'` });
  }

  // The portal panel is rendered into document.body, OUTSIDE the tag, so its rules need a TOP-LEVEL
  // selector list. Nesting it compiles to a descendant selector and the panel gets no styling.
  const portal = declaresPortal(options.renderTs);
  const portalSelector = `div[data-widget="${plan.tag}"]`;
  if (portal && !content.includes(portalSelector)) {
    issues.push({ code: 'portal_scope', message: `this molecule declares a portal: the sheet must ALSO scope '${portalSelector}', at top level` });
  }
  if (!portal && content.includes('data-widget')) {
    issues.push({ code: 'portal_extra', message: 'this molecule has no portal — do not use a data-widget selector' });
  }

  const inventory = new Set(extractMlClassesFromTs(options.renderTs));
  const unknown = extractMlClassesFromLess(content).filter(cls => !inventory.has(cls));
  if (unknown.length) {
    issues.push({
      code: 'unknown_classes',
      message: `these .ml-* classes are not emitted by the molecule's render (invented?): ${unknown.join(', ')} — style ONLY the classes the .ts emits`,
    });
  }

  if (TAILWIND_LAYOUT_SELECTORS.test(content)) {
    issues.push({ code: 'tailwind_layout', message: 'never redefine Tailwind LAYOUT utilities (px-*, py-*, gap-*, inline-flex) as selectors — layout is global and comes from the markup' });
  }

  // Render-owned positioning: setting position/overflow on an element the render placed with
  // absolute/fixed drops it into normal flow (full width) and clips its decorations.
  const repositioned = extractAbsoluteMlClasses(options.renderTs).filter(cls => setsPositionOrOverflow(content, cls));
  if (repositioned.length) {
    issues.push({
      code: 'position_override',
      message: `these elements are positioned by the render (absolute/fixed) — do NOT set position/overflow on them (it drops them into normal flow → full width / clipped decorations): ${repositioned.join(', ')}. ::before/::after overlays may position themselves; use 'box-shadow: inset ...' for specular edges.`,
    });
  }

  // Light DOM (StateLitElement has no Shadow DOM): these selectors match nothing and the rule is
  // silently dead.
  const shadowSelector = content.match(/:host(-context)?\b|::slotted\s*\(/);
  if (shadowSelector) {
    issues.push({
      code: 'shadow_dom_selector',
      message: `'${shadowSelector[0]}' matches nothing: these components render in light DOM, so the scope root is the tag itself ('${plan.tag} { ... }') — move those declarations to the tag scope`,
    });
  }

  if (hasUniversalSelector(content)) {
    issues.push({
      code: 'universal_selector',
      message: 'never use a universal selector (`*`) in a molecule sheet — it wipes inherited animation (the SVG spinner) and leaks outside the component scope; apply the motion stance to the classes you style',
    });
  }

  // The two halves below are DIFFERENT because their validated corpora are different, and each was
  // measured (see the header comment and the CHANGELOG):
  //
  // - A NEUTRAL sheet exists to be overridden by a future theme, so every appearance value goes
  //   through a token: `color: var(--ml-on-surface, #1c1b1f)`, literal as the FALLBACK. That is 146
  //   of the 147 base sheets; a bare literal is a defect (10 of 147, almost all the same hardcoded
  //   red focus ring).
  // - A THEMED sheet IS the final appearance for that theme, so literals are its values — all 84
  //   validated themed sheets of mls-102054/102055 write them (`box-shadow: 4px 4px 0 #000000`).
  //   Applying the neutral rule there would reject 84 out of 84. Instead it gets the same two checks
  //   the sibling v3-less gate applies: carry the token values, and state a motion stance.
  if (ctx.theme.present) {
    if (!/--ml-[\w-]+\s*:/.test(content)) {
      issues.push({ code: 'tokens', message: 'a themed sheet must DEFINE the --ml-* tokens the molecule consumes, with the values from the theme token table' });
    }
    if (!/transition|animation/.test(content)) {
      issues.push({ code: 'motion', message: 'a themed sheet must take an explicit motion stance (the theme skill says which — `transition: none` is a valid stance)' });
    }
  } else {
    const bare = bareColorLiterals(content);
    if (bare.length) {
      issues.push({
        code: 'color_literal',
        message: `these colours are hardcoded outside a token: ${bare.slice(0, 6).join(', ')} — in a project with no theme every appearance value must be written as var(--ml-<token>, <literal>), so a theme can override it later`,
      });
    }
    if (!/var\(\s*--ml-/.test(content)) {
      issues.push({
        code: 'token_consumption',
        message: 'the sheet consumes no --ml-* token — appearance must come from tokens (146 of the 147 base sheets do), otherwise the molecule can never be themed',
      });
    }
  }

  return issues;
}
