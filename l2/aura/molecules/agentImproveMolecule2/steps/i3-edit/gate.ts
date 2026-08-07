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
import { offendingForeignWrite } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.js';
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
  /** Route C only: the shell's parent, which must never be written. */
  parentReference: string | null;
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
