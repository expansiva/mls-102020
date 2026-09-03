/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.ts" enhancement="_blank"/>

// Admission gate for the variant pipeline (pure — unit-testable).
// flow.json v1-bootstrap: NO retry; failures are readable and immediate.

import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';

export interface VGateIssue {
  code: string;
  message: string;
}

export interface VBootstrapInputs {
  themeErrors: string[];        // loadVTheme errors ([] when theme loaded)
  originRefError?: string;      // parseOriginRef error
  originTsFound: boolean;
  originLessFound: boolean;
  collisions: string[];         // display paths of already-existing destination files
  context: VariantContext | null; // assembled context (null when assembly was impossible)
}

export function runBootstrapGate(inputs: VBootstrapInputs): VGateIssue[] {
  const issues: VGateIssue[] = [];

  for (const themeError of inputs.themeErrors) {
    issues.push({ code: 'theme', message: themeError });
  }
  if (inputs.originRefError) {
    issues.push({ code: 'origin_ref', message: inputs.originRefError });
  }
  if (!inputs.originRefError && !inputs.originTsFound) {
    issues.push({
      code: 'origin_unreadable',
      message: 'origin molecule .ts not readable — the origin project must be a declared dependency of the current project',
    });
  }
  if (inputs.originTsFound && !inputs.originLessFound) {
    issues.push({
      code: 'origin_less_missing',
      message: 'origin molecule has no .less — the class inventory would be incomplete; confirm the origin reference',
    });
  }
  for (const collision of inputs.collisions) {
    issues.push({ code: 'collision', message: `destination file already exists: ${collision} — use Improve Molecule to change an existing variant` });
  }

  const ctx = inputs.context;
  if (ctx) {
    if (!ctx.origin.className) {
      issues.push({ code: 'origin_class', message: 'could not extract the exported class name from the origin .ts' });
    }
    if (ctx.origin.mlClassInventory.length === 0) {
      issues.push({
        code: 'discipline',
        message: 'origin molecule emits NO ml-* semantic classes — it does not follow the derivable-markup discipline; deriving blindly is forbidden (see analysis §10)',
      });
    }
    if (!/^[a-z0-9]+$/.test(ctx.variant.group)) {
      issues.push({ code: 'group', message: `invalid group folder '${ctx.variant.group}'` });
    }
  } else if (!issues.length) {
    issues.push({ code: 'context', message: 'context could not be assembled' });
  }

  return issues;
}
