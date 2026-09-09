/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/gate.ts" enhancement="_blank"/>

// Gate for the edit (pure — compilation is not pure, so its errors arrive as an input).
//
// THE RULE THAT SHAPES THIS FILE: judge the DELTA, never the file. The appearance detectors below
// are the same ones n4-render uses, but n4-render is judging a file it just created, where every
// finding is its own. Here the file predates the run. A molecule that already hardcodes `bg-black`
// must not block a padding fix — the user asked for a padding fix. So every detector runs TWICE,
// before and after, and only what the edit ADDED is an error.
//
// This is the same "introduced vs pre-existing" split as helpers/imCoherence, and the same reason:
// blocking on pre-existing debt would freeze the agent on molecules nobody asked to repair
// (flow.json.principles, last one).

import {
  ImArtifactKind,
  ImGateResult,
  ImRoute,
  imGateFail,
  imGateOk,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import { deadShellMembers, offendingForeignWrite } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.js';
import { diffSurface, groupVocabulary, readSurface } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';
import { divergentTokenFallbacks, geometryAliasTokens, normalizeTokenValue, tokenFallbacks } from '/_102020_/l2/aura/molecules/shared/moleculeInspect.js';
import { GEOMETRY_REGISTRY } from '/_102020_/l2/aura/molecules/skills/moleculeGeometry.js';
import { mlsHeaderOf } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/applyEdits.js';
import {
  findBaseInternals,
  findLiteralStyleAppearance,
  findRedundantCaseSelectors,
  findRenderSideEffects,
  findTailwindColorUtilities,
  findTopLevelFunctions,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n4-render/gate.js';

export interface ImEditedFile {
  kind: ImArtifactKind;
  reference: string;
  before: string;
  after: string;
  /** True when the file did not exist before this run. */
  created: boolean;
}

export interface ImEditGateInputs {
  files: ImEditedFile[];
  currentProject: number;
  /** On a shell: the parent, which must never be written. Null when the molecule is not a shell. */
  parentReference: string | null;
  /**
   * On a shell: the parent's source, read-only, so the gate can tell an override from an invention.
   * Empty when the molecule is not a shell or the parent could not be read — the dead-member check
   * then does not run, because without the parent every member of the shell looks invented.
   */
  parentSource: string;
  /**
   * The route this edit is executing. Only route A may move the public surface, and it does so
   * through a human checkpoint; on B and C a surface movement is a definition change made without one.
   */
  route: ImRoute;
  /**
   * The GROUP contract's text, for `groupVocabulary`. Empty when it could not be read — the surface
   * check then admits everything, because unmeasured must not mean forbidden.
   */
  groupSkill: string;
  /** From compileStorTs / compileStorLess on the AFTER content. */
  compileErrors: string[];
  /** The same compilers on the BEFORE content — read lazily, only when `compileErrors` is non-empty. */
  compileErrorsBefore: string[];
}

function issue(code: string, message: string): string {
  return `${code}: ${message}`;
}

/** Findings the edit ADDED. A finding that was already there is not this run's business. */
function introduced(detector: (source: string) => string[], file: ImEditedFile): string[] {
  const before = new Set(file.created ? [] : detector(file.before));
  return detector(file.after).filter(found => !before.has(found));
}

/**
 * The delta rule at line granularity: the lines this edit put in the file.
 *
 * The dead-member check needs it because deadness is a property of the FILE, not of the edit. A
 * shell that already carried a dead member must not block an unrelated fix — but an edit that
 * declares one, or that writes to one, is building on sand and has to be told so.
 */
function introducedLines(file: ImEditedFile): string[] {
  if (file.created) return file.after.split('\n');
  const before = new Map<string, number>();
  for (const line of file.before.split('\n')) {
    const key = line.trim();
    before.set(key, (before.get(key) || 0) + 1);
  }
  const out: string[] = [];
  for (const line of file.after.split('\n')) {
    const left = before.get(line.trim()) || 0;
    if (left > 0) before.set(line.trim(), left - 1);
    else out.push(line);
  }
  return out;
}

/**
 * Surface movements this edit introduced that the route is not allowed to make.
 *
 * ADDING something the group contract already names is a defect fix — the molecule was missing what
 * it was supposed to declare. Adding something the group never names is an invention. REMOVING is
 * never a repair: a promise that disappears breaks pages already written against it, and that is
 * route A whatever the intention.
 */
function introducedDefinition(file: ImEditedFile, inputs: ImEditGateInputs): string[] {
  if (inputs.route === 'A' || file.created) return [];
  const diff = diffSurface(readSurface(file.before), readSurface(file.after));
  const vocabulary = groupVocabulary(inputs.groupSkill);
  const out: string[] = [];

  const added: Array<[string, string[]]> = [
    ['slot', diff.addedSlots],
    ['property', diff.addedProperties],
    ['event', diff.addedEvents],
  ];
  for (const [kind, names] of added) {
    for (const name of names) {
      // No group contract read = nothing measured. Admit, and say nothing: refusing on an absent
      // measurement is the failure mode this agent keeps deciding against.
      if (!inputs.groupSkill.trim() || vocabulary.has(name)) continue;
      out.push(
        issue(
          'definition_changed',
          `the edit adds the public ${kind} '${name}', which the group contract does not declare — that is a change to what this molecule PROMISES, and it needs the route A checkpoint, not an edit. If the request is really about something the group already defines, use that name exactly: the contract is case-sensitive`,
        ),
      );
    }
  }

  const removed: Array<[string, string[]]> = [
    ['slot', diff.removedSlots],
    ['property', diff.removedProperties],
    ['event', diff.removedEvents],
  ];
  for (const [kind, names] of removed) {
    for (const name of names) {
      out.push(
        issue(
          'definition_removed',
          `the edit removes the public ${kind} '${name}' — every page already written against it breaks, and no repair needs that. It is route A, through the checkpoint`,
        ),
      );
    }
  }

  return out;
}

/**
 * The same token read with two different fallbacks — but only the divergence this edit CREATED.
 *
 * `divergentTokenFallbacks` returns objects, and `introduced()` compares strings, so the finding is
 * folded into one stable key per token. Two things make it stable, and both are the delta rule:
 *
 * - the values are SORTED. The detector returns them in order of APPEARANCE in the file, so inserting
 *   a line above an existing site would reorder the key, `introduced()` would see a string it never
 *   saw before, and a PRE-EXISTING divergence would be reported as this run's;
 * - the values are NORMALIZED (`#fff` == `#ffffff`). The detector keeps the FIRST spelling it meets,
 *   so a new site written `#FFF` above one written `#ffffff` would likewise mint a new key.
 *
 * Real case in the library: `grouptriggeraction/ml-pagination-control.less` reads
 * `--ml-pagination-press-shadow` as `rgba(0,0,0,0.08)` and `rgba(0,0,0,0.1)`. Judging the FILE would
 * block every edit to that molecule; judging the delta lets an unrelated fix through and still
 * catches a divergence the fix itself introduces.
 */
function introducedFallbackDivergence(file: ImEditedFile): string[] {
  const keyOf = (found: { token: string; values: string[] }): string =>
    `${found.token} ${found.values.map(normalizeTokenValue).sort().join(' ')}`;
  const keys = (source: string): string[] => divergentTokenFallbacks(source).map(keyOf);
  const byKey = new Map(divergentTokenFallbacks(file.after).map(found => [keyOf(found), found]));

  const out: string[] = [];
  for (const key of introduced(keys, file)) {
    const found = byKey.get(key);
    if (!found) continue;
    out.push(
      issue(
        'fallback_divergence',
        `'${found.token}' is read with ${found.values.length} different fallbacks (${found.values.map(value => `"${value}"`).join(' vs ')}) — the fallback is what renders with NO design system, so one token must mean one value. Two sites needing two values are two different CONCEPTS: give the diverging site a different role, or leave it on its '--ml-*' token (emit no edit for that site). Do NOT unify by changing a fallback — that is an unrequested visual change`,
      ),
    );
  }
  return out;
}

/**
 * A RENAME that also changes the VALUE — decision #2 of planejamento.md, never defended in code until
 * now: renaming a token keeps the fallback the sheet already rendered with. A value-only change on the
 * SAME token is legitimate route-B work (the user may ask for a darker helper text), so this only fires
 * when the NAME changed together with the VALUE — widening it to catch a value change alone would
 * refuse every honest colour request.
 *
 * DELTA BY CONSTRUCTION — no `introduced()` wrapper: the finding only exists by comparing before and
 * after directly, so there is no pre-existing version of it to subtract. If the edit added or removed a
 * declaration the counts differ and the gate stays silent rather than guess an alignment between the
 * two lists.
 *
 * Measured on the groupEnterMoney pilot's run 4: `--ml-outline-focus, #3b82f6` became
 * `--border-default-focus, #e2e8f0` — the name changed AND the value changed, losing the field's focus
 * highlight. `harness/probe-gates-papel.mjs` reproduces 0 accusations across the library's `before ===
 * after` pairs and 1 on that synthetic mutation.
 */
function renamedFallbackChanged(file: ImEditedFile): string[] {
  const before = tokenFallbacks(file.before);
  const after = tokenFallbacks(file.after);
  if (before.length !== after.length) return [];
  const out: string[] = [];
  for (let i = 0; i < before.length; i++) {
    const was = before[i];
    const now = after[i];
    if (was.token === now.token) continue;
    if (was.fallback === null || now.fallback === null) continue;
    if (normalizeTokenValue(was.fallback) === normalizeTokenValue(now.fallback)) continue;
    out.push(
      issue(
        'fallback_renamed',
        `'${was.token}' was renamed to '${now.token}' and its fallback changed ("${was.fallback}" -> "${now.fallback}") — a rename must keep the value the sheet already rendered with no design system, or the migration changes the appearance nobody asked to change. Keep the old fallback under the new name; if the role you want cannot carry that value, the site is a holdout and stays on its '--ml-*' token`,
      ),
    );
  }
  return out;
}

/**
 * A role read inside a `:focus`/`:focus-within`/`:focus-visible` block that does not itself NAME a
 * focus role — chosen because its VALUE happened to match what the border needed, not because of what
 * the role is FOR. Real case in the pilot: `ml-enter-money-br.less` read `--selected-border` inside a
 * focus block because its value (`#3b82f6`) matched — but "selected" and "focused" are different
 * concepts, and a design system may restyle them independently.
 *
 * An `--ml-*` holdout is always allowed: it is exactly what `ml-currency-input`'s pilot run produced
 * when the right role (`--ml-outline-focus`) has no DS equivalent to migrate to.
 */
function focusRoleMismatches(less: string): string[] {
  const lines = less.split('\n');
  const sitesByLine = new Map<number, Array<{ token: string; fallback: string | null }>>();
  for (const site of tokenFallbacks(less)) {
    if (!sitesByLine.has(site.line)) sitesByLine.set(site.line, []);
    sitesByLine.get(site.line)!.push(site);
  }

  const found: string[] = [];
  let depth = 0;
  const focusScopeDepths: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    const opensFocusScope = /:focus(-within|-visible)?[^{]*\{/.test(line);

    // `|| opensFocusScope` is the ONE-LINE block: `&:focus { color: var(--selected-text, #3b82f6); }`
    // opens and closes the scope on this very line, so the stack is still empty when its sites are
    // examined. MEASURED 2026-09-09: the library carries 14 single-line `:focus` blocks, all of them in
    // groupselectmany and grouprateitem — two of the biggest groups still to migrate. They read `--ml-*`
    // today, so the detector reported 0 either way and the blindness was invisible to its validation.
    if (focusScopeDepths.length || opensFocusScope) {
      for (const site of sitesByLine.get(lineNo) || []) {
        if (site.fallback === null) continue;
        if (site.token.startsWith('--ml-')) continue; // a holdout is always a valid choice
        if (site.token.startsWith('--focus-') || /-focus$/.test(site.token)) continue;
        found.push(site.token);
      }
    }

    for (const char of line) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        if (focusScopeDepths.length && focusScopeDepths[focusScopeDepths.length - 1] === depth) {
          focusScopeDepths.pop();
        }
        depth--;
      }
    }
    if (opensFocusScope) focusScopeDepths.push(depth);
  }

  return found;
}

/**
 * `focusRoleMismatches`, but only the mismatch this edit INTRODUCED — same delta rule as
 * `introducedGeometryAlias`: a molecule that already carries the mismatch is not this run's business,
 * but one the edit itself creates is.
 */
function introducedFocusRoleMismatch(file: ImEditedFile): string[] {
  return introduced(focusRoleMismatches, file).map(token =>
    issue(
      'focus_role_mismatch',
      `'${token}' is read inside a :focus block, and it does not name a focus role — a role is chosen by the PLACE it paints, never by the value that happens to match. Use a '*-focus' or 'focus-*' role, or leave the site on its '--ml-*' token when no focus role of the design system can carry this value`,
    ),
  );
}

/**
 * A coined token whose suffix aliases a SHARED geometry concept (skills/moleculeGeometry) — but only
 * the alias this edit INTRODUCED. Real molecule in the library that forces the delta rule here:
 * `ml-button-group.less` (mls-102053-temp) already carries `--ml-button-group-spinner-size` and
 * `-duration`. Judging the whole file would block any future edit to that molecule; judging the delta
 * still catches a NEW alias the edit itself coins, and it is exactly this molecule that exercises it.
 *
 * Each finding is `'${token} ${concept}'` — the token and concept are read verbatim off the match, so
 * unlike introducedFallbackDivergence there is nothing to sort: two edits producing the same alias
 * always produce the same key, independent of what else changed in the file.
 */
function introducedGeometryAlias(file: ImEditedFile): string[] {
  const keys = (source: string): string[] =>
    geometryAliasTokens(source, GEOMETRY_REGISTRY.map(concept => concept.concept)).map(({ token, concept }) => `${token} ${concept}`);
  return introduced(keys, file).map(key => {
    const [token, concept] = key.split(' ');
    return issue(
      'geometry_alias',
      `'${token}' renames a shared geometry concept the library already has a name for — use '--ml-${concept}' instead of coining a molecule-prefixed alias`,
    );
  });
}

export function runImEditGate(inputs: ImEditGateInputs): ImGateResult {
  const errors: string[] = [];

  if (!inputs.files.length) return imGateFail(issue('no_change', 'the step wrote nothing'));

  // Structurally impossible through applyEdits — an op names an artifact KIND, which resolves to a
  // path in the current project. Asserted anyway: it is THE invariant of the whole agent, and the
  // day someone adds a free-form path field this is the check that catches it.
  const foreign = offendingForeignWrite(inputs.files.map(file => file.reference), inputs.currentProject);
  if (foreign) {
    errors.push(issue('foreign_write', `'${foreign}' is outside project ${inputs.currentProject} — this agent never writes into another project`));
  }
  if (inputs.parentReference) {
    const parent = inputs.parentReference.replace(/^_?/, '').replace(/^\//, '');
    for (const file of inputs.files) {
      if (file.reference.replace(/^_?/, '').replace(/^\//, '') === parent) {
        errors.push(
          issue(
            'parent_write',
            `'${file.reference}' is the PARENT of this shell — an inherited molecule is fixed in its own file, never in the base`,
          ),
        );
      }
    }
  }

  for (const file of inputs.files) {
    if (!file.after.trim()) {
      errors.push(issue('empty', `${file.kind} came out empty`));
      continue;
    }
    if (/```/.test(file.after) && !/```/.test(file.before)) {
      errors.push(issue('fence', `${file.kind} carries a markdown code fence — submit raw file content`));
    }

    // The header identifies the file to the Studio. Losing it orphans the artifact, and it is the
    // one thing a replace can destroy while looking perfectly reasonable.
    const headerBefore = mlsHeaderOf(file.before);
    const headerAfter = mlsHeaderOf(file.after);
    if (!file.created && headerBefore && headerAfter !== headerBefore) {
      errors.push(
        issue('header', `${file.kind}: the mls header changed — it must survive byte-for-byte.\n  was: ${headerBefore}\n  now: ${headerAfter || '(gone)'}`),
      );
    }
    if (file.created && !headerAfter) {
      errors.push(issue('header', `${file.kind}: a created file needs its mls header`));
    }

    if (file.kind === 'ts') {
      for (const utility of introduced(findTailwindColorUtilities, file)) {
        errors.push(issue('appearance_class', `'${utility}' hardcodes a colour — appearance belongs to the .less through an ml-* semantic class`));
      }
      for (const declaration of introduced(findLiteralStyleAppearance, file)) {
        errors.push(issue('appearance_style', `inline style sets appearance with a literal value ('${declaration}') — inline style is for geometry only`));
      }
      for (const found of introduced(findRenderSideEffects, file)) {
        errors.push(issue('render_side_effect', `render() must be pure — it ${found}. Move it to updated()`));
      }
      for (const selector of introduced(findRedundantCaseSelectors, file)) {
        errors.push(issue('selector_duplicate', `'${selector}' spells the same tag twice — type selectors are case-insensitive in HTML documents`));
      }
      for (const member of introduced(findBaseInternals, file)) {
        errors.push(issue('base_internals', `'${member}' is internal plumbing of the base class — do not drive it from the molecule`));
      }
      // A DEFINITION CHANGE ON A ROUTE THAT DOES NOT DO THOSE. Route A moves the public surface and
      // asks a human first; B and C repair or restyle what the molecule already promises. Measured
      // 2026-08-14 on `ml-currency-input`: asked for a label and help text — which the group defines
      // as the slots `Label` and `Helper` — a route B run added public properties `label` and
      // `helper` instead, and nothing stopped it. The .defs.ts was not touched, so the molecule ended
      // with two public properties its contract does not mention.
      //
      // DECLARING a name the group already knows is NOT that, and must keep passing: a molecule that
      // was missing something its own contract promised is repaired by declaring it, and that repair
      // moves the surface. The group's vocabulary is what separates a repair from an invention — note
      // that the group contract is a UNION across variants, so it says what MAY be declared here, not
      // what must be.
      for (const error of introducedDefinition(file, inputs)) errors.push(error);

      // AN OVERRIDE THAT OVERRIDES NOTHING. Only on a shell, and only for what this edit touched:
      // the member has to be absent from the parent AND read by no one. See deadShellMembers for the
      // run that produced `protected copiedDurationMs = 3000` against a parent holding the duration
      // in a module constant — it compiled, so nothing else here could have caught it.
      if (inputs.parentSource) {
        const touchedLines = introducedLines(file);
        for (const member of deadShellMembers(file.after, inputs.parentSource)) {
          if (!touchedLines.some(line => new RegExp(`\\b${member}\\b`).test(line))) continue;
          errors.push(
            issue(
              'dead_member',
              `'${member}' does not exist in the parent and nothing reads it — declaring or assigning it changes no behaviour. Override a member the parent actually declares, or report that the change cannot be made from this shell`,
            ),
          );
        }
      }

      for (const helper of introduced(findTopLevelFunctions, file)) {
        errors.push(
          issue(
            'helper_outside_class',
            `'${helper}' is declared outside the class — a molecule is the class and nothing else. To omit an attribute import 'nothing' from 'lit'`,
          ),
        );
      }
    }

    // ONE TOKEN, ONE FALLBACK — the rule the shared skills/tokenVocabulary states and, until now, the
    // NM2 gate alone defended. It arrives here (the NM2 one stays) because i3-edit now receives the
    // canonical value table too (skills/canonicalFallbacks): the step that used to read values out of
    // a doc section is now the likeliest producer of a divergence, and was the one without the net.
    //
    // DELTA, not file: see introducedFallbackDivergence for the molecule already in the library whose
    // pre-existing divergence would otherwise freeze every edit to it.
    if (file.kind === 'less') {
      for (const error of introducedFallbackDivergence(file)) errors.push(error);

      // G1 — a RENAME that changed the VALUE too. Not wrapped in introduced(): see
      // renamedFallbackChanged for why this finding only exists as a before/after comparison.
      for (const error of renamedFallbackChanged(file)) errors.push(error);

      // G2 — a role chosen by its VALUE instead of its PLACE, inside a :focus scope. Same delta rule
      // as introducedGeometryAlias below: a molecule that already carries the mismatch is not this
      // run's fault, but one the edit itself creates is.
      for (const error of introducedFocusRoleMismatch(file)) errors.push(error);

      // Same delta rule, same reason: a molecule that already coined an alias of a shared geometry
      // concept is not this run's fault, but an alias the edit ITSELF introduces is.
      for (const error of introducedGeometryAlias(file)) errors.push(error);
    }
  }

  // Same delta rule for the compiler: a molecule that already fails to compile is not this run's
  // fault, but every error the edit ADDED is.
  const before = new Set(inputs.compileErrorsBefore);
  for (const error of inputs.compileErrors) {
    if (!before.has(error)) errors.push(issue('compile', error));
  }

  return errors.length ? imGateFail(...errors) : imGateOk();
}
