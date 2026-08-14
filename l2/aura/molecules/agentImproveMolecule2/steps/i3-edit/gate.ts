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
  imGateFail,
  imGateOk,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import { deadShellMembers, offendingForeignWrite } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.js';
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
  }

  // Same delta rule for the compiler: a molecule that already fails to compile is not this run's
  // fault, but every error the edit ADDED is.
  const before = new Set(inputs.compileErrorsBefore);
  for (const error of inputs.compileErrors) {
    if (!before.has(error)) errors.push(issue('compile', error));
  }

  return errors.length ? imGateFail(...errors) : imGateOk();
}
