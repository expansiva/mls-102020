/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n6-demo/gate.ts" enhancement="_blank"/>

// n6-demo gate (pure — unit-testable). Runs on the model's html BEFORE the deterministic state
// substitution, so the `playgroundDinamicState` placeholder must still be there.
//
// MEASURED over the 146 real playground pages of mls-102040 (2026-07-29):
// - 146/146 carry the playground state widget → required;
// - 0/146 contain a document tag (<!DOCTYPE/<html>/<head>/<body>/<style>/<link>) or a <script> →
//   both bans hold;
// - 1/146 contains a <footer> → the ban holds (it is the outlier the Variant's P2 lesson names);
// - tag uses: median 12, minimum 6, and 0 pages below 6 → requiring at least one instance per
//   declared example (floor 6) matches what the library actually does.
//
// Note the appearance rules of n4-render/n5-less do NOT apply here: this is a demo PAGE, not a
// component. The library's own pages use `bg-white dark:bg-slate-900` and coloured headings.

import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { NmGateIssue } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import { PLAYGROUND_STATE_PLACEHOLDER, type MoleculeDemoExample } from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';

export const NM_MIN_DEMO_EXAMPLES = 6;

/**
 * Slot content written as an ATTRIBUTE — `<div slot="Label">` — which does nothing in this library.
 *
 * ⚠️ MEASURED 2026-08-17/18. This project has **no Shadow DOM**, so a molecule reads its slots BY TAG
 * NAME: `moleculeBase.getSlotContent(tag)` is `getSnapshot().querySelector(tag)`, and the mutation
 * observer compares `tagName` against `slotTags`. `<div slot="Label">` matches neither. It renders, it
 * does not crash, and the slot is simply empty.
 *
 * It shipped because the wrong form was INSTRUCTED: this step's prompt gave
 * `<div slot="Label">Revenue</div>` as the example, and two molecules generated on two different days,
 * in two different groups, came out with 68 occurrences of it and zero named tags. Across the 671 index
 * and playground files of the six projects, those two are the ONLY ones — the other 22.903 slot uses
 * are named tags.
 *
 * `slot="name"` is standard practice for web components WITH Shadow DOM, which is exactly why it leaks
 * in. Same shape as the `nothing` sentinel that reappeared in five generations of code: a platform
 * habit arriving in a library that does not use it.
 */
export function findAttributeSlots(html: string): string[] {
  const names = new Set<string>();
  for (const m of (html || '').matchAll(/slot\s*=\s*['"]([A-Za-z][\w-]*)['"]/g)) names.add(m[1]);
  return [...names];
}
export const NM_STATE_WIDGET = 'widget-playground-state-102020';

export function runNm2DemoGate(
  html: string,
  examples: MoleculeDemoExample[],
  plan: MoleculePlan,
  ctx: MoleculeContext,
): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const content = html || '';

  if (!content.trim()) return [{ code: 'empty', message: 'the demo page came out empty' }];
  if (content.includes('```')) {
    issues.push({ code: 'fence', message: 'the html contains markdown fences — return raw HTML only' });
  }

  // The demo is a FRAGMENT (a playground page inside the Studio), never a full document, and styling
  // comes from Tailwind + the molecule's own sheet — not from an inline <style> or an external link.
  if (/<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>]|<style[\s>]|<link[\s>]/i.test(content)) {
    issues.push({
      code: 'document',
      message: 'the demo must be a FRAGMENT, not a full HTML document — remove <!DOCTYPE>/<html>/<head>/<body>/<style>/<link>',
    });
  }
  // Slot content by attribute is inert here — see findAttributeSlots. Named tags or nothing.
  const attributeSlots = findAttributeSlots(content);
  if (attributeSlots.length) {
    issues.push({
      code: 'slot_as_attribute',
      message: `slot content is written as an attribute (${attributeSlots.map(n => `slot="${n}"`).join(', ')}) and this library has NO Shadow DOM — a molecule reads its slots by TAG NAME, so those render empty. Write <${attributeSlots[0]}>…</${attributeSlots[0]}> instead`,
    });
  }

  if (/<script[\s>]/i.test(content)) {
    issues.push({ code: 'script', message: 'the demo page must not contain <script> tags' });
  }
  if (/<footer[\s>]/i.test(content)) {
    issues.push({ code: 'footer', message: 'the demo must not add a <footer>/attribution — emit only the playground structure (container, header, state widget, demo cards)' });
  }

  if (!content.includes(NM_STATE_WIDGET)) {
    issues.push({
      code: 'state_widget',
      message: `the demo must include the playground state widget ('aura--molecules--playground--${NM_STATE_WIDGET}') before the demo cards`,
    });
  }
  if (!content.includes(PLAYGROUND_STATE_PLACEHOLDER)) {
    issues.push({
      code: 'state_placeholder',
      message: `the state widget must carry state='${PLAYGROUND_STATE_PLACEHOLDER}' — code replaces that literal token with the real state after generation`,
    });
  }

  if (examples.length < NM_MIN_DEMO_EXAMPLES) {
    issues.push({
      code: 'examples_count',
      message: `at least ${NM_MIN_DEMO_EXAMPLES} distinct examples are required (found ${examples.length})`,
    });
  }

  // Every declared example must actually appear on the page. Floor of 6 because that is the library's
  // minimum, so a page with 6 examples but 2 cards is caught.
  const tagUses = content.split(`<${plan.tag}`).length - 1;
  const expected = Math.max(NM_MIN_DEMO_EXAMPLES, examples.length);
  if (tagUses < expected) {
    issues.push({
      code: 'tag_uses',
      message: `<${plan.tag}> must appear at least once per declared example (${expected} expected, found ${tagUses})`,
    });
  }

  // Malformed state entries are silently dropped by the substitution, so the binding they were meant
  // to feed would render dead.
  const stateKeys = new Set<string>();
  for (const example of examples) {
    for (const entry of example.state || []) {
      const parts = (entry.stateName || '').split('.');
      if (parts.length !== 3 || parts[0] !== 'playground') {
        issues.push({
          code: 'state_shape',
          message: `example '${example.name}' has the state name '${entry.stateName}' — it must be 'playground.<exampleKey>.<property>'`,
        });
        continue;
      }
      stateKeys.add(parts[1]);
    }
  }

  // A binding whose key no example produces renders empty on the page.
  const boundKeys = new Set<string>();
  for (const match of content.matchAll(/\{\{\s*playground\.([A-Za-z0-9_$]+)\./g)) boundKeys.add(match[1]);
  const orphans = [...boundKeys].filter(key => !stateKeys.has(key));
  if (orphans.length) {
    issues.push({
      code: 'state_binding',
      message: `these bindings have no matching example state and would render empty: ${orphans.map(key => `playground.${key}`).join(', ')}`,
    });
  }

  // A themed project's demo page must provide the theme's background contract — glass is invisible on
  // white. With no theme there is no such requirement (the library's pages use a neutral Tailwind
  // background), and nothing theme-related may appear at all.
  if (ctx.theme.present && ctx.theme.info) {
    const backgroundCss = ctx.theme.info.background.css.replace(/\s+/g, ' ').replace(/;$/, '').trim();
    const normalized = content.replace(/\s+/g, ' ');
    if (backgroundCss && !normalized.includes(backgroundCss)) {
      issues.push({
        code: 'background',
        message: `the page container must carry the theme background exactly: '${ctx.theme.info.background.css}'`,
      });
    }
  }

  return issues;
}
