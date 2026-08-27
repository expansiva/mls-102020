/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts/createGate.ts" enhancement="_blank"/>

// s3-indexts creation-mode gate (pure — unit-testable). Structural checks only, same altitude as
// agentNewMolecule2/steps/n7-index/gate.ts (this agent's own precedent for an LLM-written showcase page).
//
// ⚠️ THE MOST IMPORTANT CHECK HERE IS reference_table_handwritten. The todo's own words: "a página tem
// de NASCER MIGRADA" — the model must not hand-write rows/headers/<table> markup for a later run to
// migrate. Every other check here mirrors n7-index's; this one is new to this gate specifically because
// n7-index's page is intentionally still hand-written (it was not itself migrated to the shared renderer).

import { NmGateIssue } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';

export interface SyCreateGateOptions {
  indexTag: string;
  headerRef: string;
  indexDefsReference: string;
  sharedTableReference: string;
  groupMoleculeShortNames: string[];
  /** Lowercase folder of the group — the tag prefix, needed to look for a real `<folder--shortName>` instance. */
  groupFolder: string;
}

export function runSyCreateIndexTsGate(indexTs: string, options: SyCreateGateOptions): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const content = indexTs || '';

  if (!content.trim()) return [{ code: 'empty', message: 'index.ts came out empty' }];
  if (content.includes('```')) {
    issues.push({ code: 'fence', message: 'index.ts must be raw TypeScript, without markdown fences' });
  }
  if (!content.includes(options.headerRef)) {
    issues.push({ code: 'header', message: `the index.ts header must reference ${options.headerRef}` });
  }
  if (!content.includes(`@customElement('${options.indexTag}')`)) {
    issues.push({ code: 'custom_element', message: `index.ts must declare @customElement('${options.indexTag}')` });
  }

  // ⚠️ IMPORTED AND SHOWN ARE TWO DIFFERENT CHECKS, and merging them into one `content.includes(name)`
  // made this gate pass THE DEFECT IT EXISTS TO CATCH. Measured 2026-08-27 against a fixture: a page that
  // imported `ml-b` and never instantiated it came back with zero issues, because the import line alone
  // satisfies `includes`. That is the 2026-08-05 defect verbatim — a molecule imported and never shown,
  // found by accident days later — and it is why `i6-index` carries the invariant at all.
  //
  // So: count the IMPORT (exactly once, never twice) and look for the INSTANCE outside the import lines.
  const withoutImports = content
    .split('\n')
    .filter(line => !/^\s*import\s/.test(line))
    .join('\n');

  const notImported: string[] = [];
  const importedTwice: string[] = [];
  const notShown: string[] = [];
  for (const shortName of options.groupMoleculeShortNames) {
    // matched by PATH END, so `ml-data-table` never counts an `ml-data-table-select` import as its own
    const importRe = new RegExp(`^\\s*import\\s+['"][^'"]*/${escapeForRegExp(shortName)}(?:\\.js)?['"];?\\s*$`, 'gm');
    const importCount = (content.match(importRe) || []).length;
    if (importCount === 0) notImported.push(shortName);
    else if (importCount > 1) importedTwice.push(shortName);
    if (!withoutImports.includes(`<${options.groupFolder}--${shortName}`)) notShown.push(shortName);
  }

  if (notImported.length) {
    issues.push({
      code: 'molecule_missing',
      message: `these molecules of the group are never imported: ${notImported.join(', ')} — the page must import every molecule of the group`,
    });
  }
  if (importedTwice.length) {
    issues.push({
      code: 'molecule_imported_twice',
      message: `these molecules are imported more than once: ${importedTwice.join(', ')} — exactly one import each`,
    });
  }
  if (notShown.length) {
    issues.push({
      code: 'molecule_not_shown',
      message: `these molecules are imported but never instantiated: ${notShown.join(', ')} — imported and never shown is a silent gap (the defect of 2026-08-05); every molecule needs a <${options.groupFolder}--…> instance on the page`,
    });
  }

  if (!content.includes(`from '${options.indexDefsReference}'`)) {
    issues.push({ code: 'defs_import', message: `index.ts must import { molecules, scenarios } from '${options.indexDefsReference}'` });
  }
  if (!content.includes(`from '${options.sharedTableReference}'`)) {
    issues.push({ code: 'shared_import', message: `index.ts must import { renderCatalogReferenceTable } from '${options.sharedTableReference}'` });
  }

  // ⚠️ THE PAGE MUST BE BORN MIGRATED (todo §3). renderReferenceTable() must be EXACTLY the 3-line
  // delegating call — never a hand-written table for a later run to fix.
  if (!content.includes('renderCatalogReferenceTable(molecules, scenarios)')) {
    issues.push({
      code: 'reference_table_not_delegated',
      message: "renderReferenceTable() must return renderCatalogReferenceTable(molecules, scenarios) — do not hand-write the reference table",
    });
  }
  if (/<table[\s>]/i.test(content) || /\bheaders\s*\.map\(/.test(content) || /\bconst\s+rows\s*[:=]/.test(content)) {
    issues.push({
      code: 'reference_table_handwritten',
      message: 'index.ts must not hand-write the reference table (<table>, headers.map(...), or a rows array) — the markup and data both come from renderCatalogReferenceTable/index.defs.ts',
    });
  }

  return issues;
}

/** A molecule short name is plain, but never trust it into a RegExp unescaped. */
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
