/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts/createGate.ts" enhancement="_blank"/>

// s3-indexts creation-mode gate (pure — unit-testable). Structural checks only, same altitude as
// agentNewMolecule2/steps/n7-index/gate.ts (this agent's own precedent for an LLM-written showcase page).
//
// ⚠️ THE MOST IMPORTANT CHECK HERE IS reference_table_handwritten. The todo's own words: "a página tem
// de NASCER MIGRADA" — the model must not hand-write rows/headers/<table> markup for a later run to
// migrate. Every other check here mirrors n7-index's; this one is new to this gate specifically because
// n7-index's page is intentionally still hand-written (it was not itself migrated to the shared renderer).

import { NmGateIssue } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import { syMoleculesNotShown } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syMigrateIndexTs.js';
import { contractItemsMissing, contractItemsUsed, usageContractItems } from '/_102020_/l2/aura/molecules/shared/usageContract.js';
import { SyGroupDifferentiators } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDifferentiators.js';

// ⚠️ THRESHOLDS, AND WHY THEY ARE NOT 1 (measured 2026-09-14 on groupViewTable).
// `contract_not_demonstrated` used to fire only at ZERO items. The mold hands the model an envelope of
// `name`/`.value`/`@change`, and `value` + `change` ARE contract items — so every page cleared the gate
// with exactly those two, out of 34. A showcase of 13 identical cards passed. A floor has to sit ABOVE
// what the envelope gives for free, which is why the minimum is 4 and not 3.
const MIN_CONTRACT_ITEMS = 4;
// Distinct events actually bound in the page. The whole library emits 39; the 31 showcases demonstrated
// 2. Groups that emit fewer than this are held to what they emit, never to a number they cannot reach.
const MIN_DISTINCT_EVENTS = 3;

export interface SyCreateGateOptions {
  indexTag: string;
  headerRef: string;
  indexDefsReference: string;
  sharedTableReference: string;
  groupMoleculeShortNames: string[];
  /** Lowercase folder of the group — the tag prefix, needed to look for a real `<folder--shortName>` instance. */
  groupFolder: string;
  /** The group's usage skill text (or the loader's degraded placeholder). Empty/degraded skips the check. */
  groupUsageSkill?: string;
  /**
   * What separates the group's molecules, read from their own files (helpers/syDifferentiators.ts).
   * Absent = the three checks that depend on it are skipped, never guessed.
   */
  differentiators?: SyGroupDifferentiators;
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
  // So: count the IMPORT (exactly once, never twice) and look for the INSTANCE outside the import lines
  // — syMoleculesNotShown (helpers/syMigrateIndexTs.ts), shared with the G4 regeneration trigger.
  const notImported: string[] = [];
  const importedTwice: string[] = [];
  for (const shortName of options.groupMoleculeShortNames) {
    // matched by PATH END, so `ml-data-table` never counts an `ml-data-table-select` import as its own
    const importRe = new RegExp(`^\\s*import\\s+['"][^'"]*/${escapeForRegExp(shortName)}(?:\\.js)?['"];?\\s*$`, 'gm');
    const importCount = (content.match(importRe) || []).length;
    if (importCount === 0) notImported.push(shortName);
    else if (importCount > 1) importedTwice.push(shortName);
  }
  const notShown = syMoleculesNotShown(content, options.groupFolder, options.groupMoleculeShortNames);

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

  // ⚠️ THE PAGE MUST BE BORN MIGRATED (the brief §3). renderReferenceTable() must be EXACTLY the 3-line
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

  // The showcase must demonstrate the molecule's OWN contract (usage skill Properties/Events), not just
  // the mold's envelope (name/value/isEditing/@change). See shared/usageContract.ts for why.
  const contract = usageContractItems(options.groupUsageSkill || '');
  if (contract.size) {
    const used = contractItemsUsed(content, options.groupFolder, contract).length;
    const floor = Math.min(MIN_CONTRACT_ITEMS, contract.size);
    if (used < floor) {
      const sample = contractItemsMissing(options.groupUsageSkill || '', content, options.groupFolder).slice(0, 5).join(', ');
      issues.push({
        code: 'contract_not_demonstrated',
        message: `the showcase uses ${used} of the group's ${contract.size} contract items — at least ${floor} are required, and the mold's envelope (name/value/@change) already accounts for two of them; read the usage skill's Properties and Events tables and wire what actually separates these molecules — e.g. ${sample}`,
      });
    }
  }

  issues.push(...differentiatorIssues(content, options));

  return issues;
}

/**
 * The three checks that need the molecules' own files. Each one caught a real defect in the showcase
 * that was hand-written as this gate's reference (2026-09-14).
 */
function differentiatorIssues(content: string, options: SyCreateGateOptions): NmGateIssue[] {
  const group = options.differentiators;
  if (!group || !group.molecules.length) return [];
  const issues: NmGateIssue[] = [];

  // 1. EVENTS. A card that binds nothing but `@change` proves the element exists, not what it does.
  const bound = new Set([...content.matchAll(/@([A-Za-z][\w-]*)=\$\{/g)].map(m => m[1]));
  const emitted = group.allEvents.filter(name => bound.has(name));
  const floor = Math.min(MIN_DISTINCT_EVENTS, group.allEvents.length);
  if (group.allEvents.length && emitted.length < floor) {
    const missing = group.allEvents.filter(name => !bound.has(name)).slice(0, 6).join(', ');
    issues.push({
      code: 'events_not_wired',
      message: `the showcase binds ${emitted.length} of the ${group.allEvents.length} events these molecules emit — at least ${floor} distinct ones are required, each on the molecule that emits it; not wired: ${missing}`,
    });
  }

  // 2. THE ON-SWITCH. Read with hasAttribute(...) by exactly one molecule: without it that molecule
  // renders as a plain sibling and the card is a lie. Measured: `groupable` absent = EMPTY group
  // selector; `showRowTotal` unset = no totals at all.
  // Matched as an ATTRIBUTE, never as a word: `\b total \b` hits `p.total` and `brl(p.total)` in any
  // realistic dataset and reports the switch as set when it never was. The optional `?`/`.` prefix is
  // Lit's own binding syntax (`?groupable=\${…}`, `.showRowTotal=\${true}`).
  const asAttribute = (name: string) => new RegExp(`[\\s?.]${escapeForRegExp(name)}(?=[\\s=>])`);
  const switchesMissing = group.distinguishingSwitches.filter(name => !asAttribute(name).test(content));
  if (switchesMissing.length) {
    issues.push({
      code: 'feature_switch_unset',
      message: `these attributes are read by exactly ONE molecule of the group and turn its whole feature on — the showcase never sets them, so that molecule renders like every other card: ${switchesMissing.join(', ')}`,
    });
  }

  // 3. THE ACTION VERB. Same defect, different door: `ml-record-form-table` opens its record form only
  // for <RowAction action="open">, and `open` is in no contract table.
  const actionsMissing = group.distinguishingActions.filter(verb => !new RegExp(`action=["']${escapeForRegExp(verb)}["']`).test(content));
  if (actionsMissing.length) {
    issues.push({
      code: 'action_verb_unused',
      message: `exactly one molecule of the group answers to each of these action verbs, and the feature they unlock has no other way in — add <RowAction action="…"> for: ${actionsMissing.join(', ')}`,
    });
  }

  return issues;
}

/** A molecule short name is plain, but never trust it into a RegExp unescaped. */
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
