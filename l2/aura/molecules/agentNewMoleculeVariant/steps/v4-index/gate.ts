/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/gate.ts" enhancement="_blank"/>

// Group-index invariants (pure). flow.json v4-index: NO retry — unexpected
// format means report, never guess.

import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { VGateIssue } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.js';

export function runIndexGate(updatedIndex: string, previousIndex: string, ctx: VariantContext): VGateIssue[] {
  const issues: VGateIssue[] = [];
  const importLine = `import '/_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}';`;

  const occurrences = updatedIndex.split(importLine).length - 1;
  if (occurrences !== 1) {
    issues.push({ code: 'import_count', message: `variant import must appear exactly once (found ${occurrences})` });
  }

  // Every previously registered molecule import must survive the update.
  const previousImports = previousIndex.match(/^import '\/_\d+_\/l2\/molecules\/[a-z0-9]+\/[a-z0-9-]+';\s*$/gm) || [];
  for (const line of previousImports) {
    if (!updatedIndex.includes(line.trim())) {
      issues.push({ code: 'import_lost', message: `previously registered import was lost: ${line.trim()}` });
    }
  }

  return issues;
}
