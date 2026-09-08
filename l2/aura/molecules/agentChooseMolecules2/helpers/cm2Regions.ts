/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.ts" enhancement="_blank"/>

// Deterministic region extraction. Pure — no I/O, no LLM: the caller reads the shared defs and the
// contract (helpers/cm2Shared) and passes the parsed values in.
//
// A REGION is the same unit agentChooseMolecules (the probe) means by the word: one interaction a
// single molecule could serve. The probe has an LLM invent them from free prose; here they are already
// final in the workspace's own data contract, so extraction is code, not a call — the funnel starts one
// level in, at "which group covers this region" (steps/c1-groups).
//
// ⚠️ THE SOURCE IS THE WORKSPACE SHARED DEFS, READ-ONLY (v3, 2026-09-08). v1 walked these same
// dataBindings on the PAGE's own defs; the page carries prose now and v2, reading only that prose,
// produced ONE region for a screen with 15 (measured: _102047_ page21/ticketCatalogue). The bindings
// did not disappear — they live once on `web/shared/{page}.defs.ts`, which is where the platform's own
// gates read them from. See helpers/cm2Shared.ts's header for the whole measurement. Nothing here or
// anywhere in this agent writes to the shared.
//
// FOUR REGION KINDS:
//
//   surface  — a `kind: 'query'` binding: the list/table/selector that shows (and may select) its rows.
//   entry    — an `inputs[]` entry with `presentation: 'form'`: the control the user fills in. On a
//              COMMAND it is a field of the record being written; on a QUERY it is a FILTER or a SORT
//              of the listing, which is a different choice (a search box, not a text field) and is
//              said so in the need line.
//   trigger  — a `kind: 'command'` binding ITSELF: the control the user activates to execute it.
//   page     — a need that serves the WHOLE page and belongs to no single binding. Today exactly one:
//              `page::feedback`, the success/error surface of the page's commands. Emitted only when
//              the page has at least one command binding, since every command declares an output state
//              and ONE notification surface serves them all.
//
// ⚠️ A QUERY'S OWN form inputs ARE regions (fixed 2026-09-08, caught by this file's own test). v1
// extracted entries from command inputs only, so on _102047_ ticketCatalogue the `search`, `sortBy` and
// `sortOrder` of `qryListTicket` — three controls the user types into, with groupSearchContent and
// groupSelectOne published for exactly them — produced nothing at all. A typed input is a typed input
// whichever kind of binding declares it.
//
// ⚠️ WHY `trigger` EXISTS. Measured in v1 by running the probe and this agent on the same file
// (_102046_ clientCatalogue/page21): the probe found 12 regions and this agent 7. THREE of the 5 it
// could not see were the buttons that execute cmdCreateClient / cmdUpdateClient / cmdDeleteClient — the
// probe routed all three to groupTriggerAction, a whole group this agent structurally could not reach.
// Worse, `cmdDeleteClient` had no `form` input at all (its only input is the selected id), so the
// entire command binding produced ZERO regions and vanished from the answer. A command's own trigger is
// as much a molecule-serving interaction as any field, and it is 100% derivable: every command binding
// has exactly one.
//
// THE REGION ID IS A LABEL, NOT AN ADDRESS. In v1 it doubled as the write-back address of a node in the
// page defs. Nothing is written into a definition any more (the run's only output is the target's
// pipeline), so the id is now just the c1→c2 join key and what the summary names. It stays derived from
// the binding so a reader can trace a choice back to the interaction that caused it:
//   surface -> `binding.id`            trigger -> `binding.id`
//   entry   -> `binding.id::inputName`  page    -> `page::<role>`
// A binding is either a query or a command, never both, so the first two share a form without
// ambiguity: on a query it means "the surface", on a command "the trigger".
//
// `selection`/`route` inputs are never regions — they are populated by selecting a row elsewhere or by
// the URL, never typed by hand, so there is nothing for a molecule to serve. But their EXISTENCE is
// stated in the surface region's need, because it is what makes a list a selector.

import { isRecord } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { Cm2ContractCommand, Cm2SharedDefinition } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Shared.js';

export const CM2_PAGE_REGION_PREFIX = 'page::';

export interface Cm2Region {
  id: string;
  need: string;
}

export function extractRegions(shared: Cm2SharedDefinition, contractTypes: Record<string, Cm2ContractCommand>): Cm2Region[] {
  const regions: Cm2Region[] = [];
  const bindings = shared.dataBindings;
  // Page-wide fact, computed once: a list whose rows feed a command's selected id is a SELECTOR, not a
  // passive table — and that is what separates groupSelectOne from groupViewTable for the same query.
  const pageSelectionInputs = countSelectionInputs(bindings);
  /** Command descriptions, in order — the page-level feedback region names what it reports on. */
  const commandLabels: string[] = [];

  for (const binding of bindings) {
    const id = typeof binding.id === 'string' ? binding.id : '';
    const command = typeof binding.command === 'string' ? binding.command : '';
    const description = typeof binding.description === 'string' ? binding.description : '';
    if (!id) continue;

    const isQuery = binding.kind === 'query';
    const isCommand = binding.kind === 'command';
    if (!isQuery && !isCommand) continue;

    const inputs = Array.isArray(binding.inputs) ? binding.inputs.filter(isRecord) : [];
    // Counted once per binding: a command with ONE form field is a single decision, one with five is a
    // form — that changes which sibling fits, and it is a fact the defs already states.
    const formInputs = inputs.filter(item => item.presentation === 'form');
    const selectionInputs = inputs.filter(item => item.source === 'selectedEntity' || item.source === 'selection');

    if (isQuery) {
      const outputFields = Object.keys(contractTypes[command]?.output || {});
      regions.push({
        id,
        need: [
          description || `query '${command}'`,
          outputFields.length ? `returns fields: ${outputFields.join(', ')}` : '',
          // The DECLARED column labels of this list. This is the discriminating evidence v1 never had:
          // a need line that says only "Listar Chamado — returns fields: ..." matches every group's
          // catch-all scenario row, which is what made c2 flip-flop between 11 near-siblings.
          columnLabels(shared.i18n, command),
          pageSelectionInputs > 0
            ? `the user has to be able to PICK ONE row here: ${pageSelectionInputs} command input(s) of this page are populated by selecting a row (source: selectedEntity/selection) and are never typed, so this surface is a SELECTOR, not a passive listing`
            : '',
        ].filter(Boolean).join(' — '),
      });
    } else {
      const destructive = shared.destructiveCommandIds.includes(command);
      commandLabels.push(description || command || id);

      // The trigger: one per command binding, ALWAYS — including a command with no typed field at all,
      // which used to make the whole binding invisible (see this file's header).
      regions.push({
        id,
        need: [
          description || `command '${command}'`,
          'the control the user ACTIVATES to execute this command — an action/trigger control, never a data-entry field',
          // DECLARED by the shared as destructive (destructiveCommandIds), never inferred from the name.
          destructive ? 'this command is DECLARED DESTRUCTIVE by this workspace: its trigger has to read as one, and it is the action a confirmation would guard' : '',
          formInputs.length ? `${formInputs.length} typed field(s) are submitted with it` : 'it submits no typed field of its own',
          selectionInputs.length ? `${selectionInputs.length} of its input(s) come from a row already selected on this page` : '',
        ].filter(Boolean).join(' — '),
      });
    }

    for (const input of formInputs) {
      const inputName = typeof input.name === 'string' ? input.name : '';
      if (!inputName) continue;
      // Never inferred from the field name — an undeclared type is honestly 'unknown', not a guess
      // (agentChooseMolecules's own rule: "with no declared value set, use text rather than inventing").
      const type = contractTypes[command]?.input?.[inputName] || 'unknown';
      const facts = [
        `type: ${type}`,
        input.required === true ? 'required' : 'optional',
        // 'systemDefault' means the value exists but the user does not type it freely — a real
        // discriminator between an open input and a constrained one, and it is declared.
        typeof input.source === 'string' && input.source !== 'userInput' ? `value source: ${input.source}` : '',
        isQuery
          ? `${formInputs.length} such control(s) on this listing`
          : `${formInputs.length} typed field(s) in this command`,
      ].filter(Boolean).join(', ');
      const label = fieldLabel(shared.i18n, command, inputName, isQuery);
      // A filter of a listing and a field of a record are not the same choice, and the need line is all
      // the next call sees — so it says which one this is.
      const opening = isQuery
        ? `${description || `listing '${command}'`} — this control FILTERS OR SORTS that listing, it does not write a record: '${inputName}' (${facts}).`
        : `${description || `field of command '${command}'`} — field '${inputName}' (${facts}).`;
      regions.push({
        id: `${id}::${inputName}`,
        need: [opening, label ? `Its declared label on screen: '${label}'.` : ''].filter(Boolean).join(' '),
      });
    }
  }

  // The page-level feedback surface: emitted only when there IS a command to report on.
  if (commandLabels.length) {
    regions.push({
      id: `${CM2_PAGE_REGION_PREFIX}feedback`,
      need: [
        `success/error feedback for the ${commandLabels.length} command(s) of this page (${commandLabels.join('; ')})`,
        'every one of them declares an output state, and this workspace already declares the success and error message of each',
        'ONE surface serves them all — this need is not tied to any single field or trigger, and it is the whole page\'s',
      ].join(' — '),
    });
  }

  return regions;
}

/**
 * 'intent.<command>.list.column.<field>.label' — the DECLARED heading of each column of this list.
 * What the user actually reads, in the module's own language, which is exactly what tells a dense
 * operational table apart from a two-column summary.
 */
function columnLabels(i18n: Record<string, string>, command: string): string {
  if (!command) return '';
  const prefix = `intent.${command}.list.column.`;
  const labels: string[] = [];
  for (const [key, value] of Object.entries(i18n)) {
    if (key.startsWith(prefix) && key.endsWith('.label') && value) labels.push(value);
  }
  return labels.length ? `its declared columns on screen: ${labels.join(', ')}` : '';
}

/**
 * The declared label of one typed control: 'intent.<command>.form.field.<name>.label' for a command
 * field, 'intent.<command>.list.filter.<name>.label' for a listing's own filter/sort control.
 */
function fieldLabel(i18n: Record<string, string>, command: string, inputName: string, isQuery: boolean): string {
  if (!command || !inputName) return '';
  const key = isQuery
    ? `intent.${command}.list.filter.${inputName}.label`
    : `intent.${command}.form.field.${inputName}.label`;
  return i18n[key] || '';
}

/** Exported: the surface region's need line states this same fact, and one source of truth beats two. */
export function countSelectionInputs(bindings: Array<Record<string, unknown>>): number {
  let count = 0;
  for (const binding of bindings) {
    if (!Array.isArray(binding.inputs)) continue;
    for (const input of binding.inputs) {
      if (isRecord(input) && (input.source === 'selectedEntity' || input.source === 'selection')) count += 1;
    }
  }
  return count;
}
