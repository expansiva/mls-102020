/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.ts" enhancement="_blank"/>

// Deterministic region extraction from a page's `definition` (dataBindings[]/inputs[]) plus the
// sibling contract's field types. Pure — no I/O, no LLM.
//
// A REGION here is the same unit agentChooseMolecules (the probe) means by the word: one interaction a
// single molecule could serve. The probe has an LLM invent regions from free prose; here they are
// already final in the page's own data contract, so extraction is code, not a call — the funnel starts
// one level in, at "which group covers this region" (steps/c1-groups).
//
// FOUR REGION KINDS. The first two were here from the start; the last two were added 2026-09-04:
//
//   surface  — a `kind: 'query'` binding: the list/table/selector that shows (and may select) its rows.
//   entry    — an `inputs[]` entry with `presentation: 'form'`: the control the user types into.
//   trigger  — a `kind: 'command'` binding ITSELF: the control the user activates to execute it.
//   page     — a need that serves the WHOLE page and belongs to no single binding. Today exactly one:
//              `page::feedback`, the success/error surface of the page's commands. Emitted only when
//              the page has at least one command binding, since every command declares an output state
//              and ONE notification surface serves them all. The probe routed this to groupNotifyUser
//              (ml-toast-notification) and this agent could not reach that group at all before.
//
// ⚠️ WHY `trigger` EXISTS. Measured by running the probe and this agent on the same file
// (_102046_ clientCatalogue/page21): the probe found 12 regions and this agent 7. Of the 5 it could not
// see, THREE were the buttons that execute cmdCreateClient / cmdUpdateClient / cmdDeleteClient — the
// probe routed all three to groupTriggerAction, a whole group this agent structurally could not reach.
// Worse, `cmdDeleteClient` has no `form` input at all (its only input is the selected id), so the
// entire command binding produced ZERO regions and vanished from the answer. A command's own trigger is
// as much a molecule-serving interaction as any field, and it is 100% derivable: every command binding
// has exactly one.
//
// The region `id` doubles as the write-back address (helpers/cm2DefsPatch.applyMoleculeChoices walks it
// back to the same node):
//   surface -> `binding.id`            (molecule ON the query binding)
//   trigger -> `binding.id`            (molecule ON the command binding)
//   entry   -> `binding.id::inputName` (molecule ON that input)
//   page    -> `page::<role>`          (an entry of the ROOT `pageMolecules[]` array)
// A binding is either a query or a command, never both, so the first two can share the address without
// ambiguity: on a query binding `molecule` means "the surface", on a command binding "the trigger".
// The `page::` prefix cannot collide with any of them — every binding id this platform generates
// starts with `binding.`.
//
// `selection`/`route` inputs are never regions — they are populated by selecting a row elsewhere or by
// the URL, never typed by hand, so there is nothing for a molecule to serve. But their EXISTENCE is
// stated in the surface region's need (see below), because it is what makes a list a selector.

import { isRecord } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { CM2_PAGE_REGION_PREFIX, Cm2ContractCommand } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.js';
import { countSelectionInputs } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2PageContext.js';

export interface Cm2Region {
  id: string;
  need: string;
}

export function extractRegions(definitionJson: Record<string, unknown>, contractTypes: Record<string, Cm2ContractCommand>): Cm2Region[] {
  const regions: Cm2Region[] = [];
  const bindings = Array.isArray(definitionJson.dataBindings) ? definitionJson.dataBindings : [];
  // Page-wide fact, computed once: a list whose rows feed a command's selected id is a SELECTOR, not a
  // passive table — and that is what separates groupSelectOne from groupViewTable for the same query.
  const pageSelectionInputs = countSelectionInputs(definitionJson);
  /** Command descriptions, in order — the page-level feedback region names what it reports on. */
  const commandLabels: string[] = [];

  for (const bindingRaw of bindings) {
    if (!isRecord(bindingRaw)) continue;
    const id = typeof bindingRaw.id === 'string' ? bindingRaw.id : '';
    const command = typeof bindingRaw.command === 'string' ? bindingRaw.command : '';
    const description = typeof bindingRaw.description === 'string' ? bindingRaw.description : '';
    if (!id) continue;

    if (bindingRaw.kind === 'query') {
      const outputFields = Object.keys(contractTypes[command]?.output || {});
      const need = [
        description || `query '${command}'`,
        outputFields.length ? `returns fields: ${outputFields.join(', ')}` : '',
        pageSelectionInputs > 0
          ? `the user has to be able to PICK ONE row here: ${pageSelectionInputs} command input(s) of this page are populated by selecting a row (source: selectedEntity/selection) and are never typed, so this surface is a SELECTOR, not a passive listing`
          : '',
      ].filter(Boolean).join(' — ');
      regions.push({ id, need });
      continue;
    }

    if (bindingRaw.kind !== 'command') continue;
    const inputs = Array.isArray(bindingRaw.inputs) ? bindingRaw.inputs : [];
    // Counted once per command: a command with ONE form field is a single decision, one with five is a
    // form — that changes which sibling fits, and it is a fact the defs already states.
    const formInputs = inputs.filter(item => isRecord(item) && item.presentation === 'form');
    const selectionInputs = inputs.filter(item => isRecord(item) && (item.source === 'selectedEntity' || item.source === 'selection'));

    commandLabels.push(description || command || id);

    // The trigger: one per command binding, ALWAYS — including a command with no typed field at all,
    // which used to make the whole binding invisible (see this file's header).
    regions.push({
      id,
      need: [
        description || `command '${command}'`,
        'the control the user ACTIVATES to execute this command — an action/trigger control, never a data-entry field',
        formInputs.length ? `${formInputs.length} typed field(s) are submitted with it` : 'it submits no typed field of its own',
        selectionInputs.length ? `${selectionInputs.length} of its input(s) come from a row already selected on this page` : '',
      ].filter(Boolean).join(' — '),
    });

    for (const inputRaw of formInputs) {
      if (!isRecord(inputRaw)) continue;
      const inputName = typeof inputRaw.name === 'string' ? inputRaw.name : '';
      if (!inputName) continue;
      // Never inferred from the field name — an undeclared type is honestly 'unknown', not a guess
      // (agentChooseMolecules's own rule: "with no declared value set, use text rather than inventing").
      const type = contractTypes[command]?.input?.[inputName] || 'unknown';
      const facts = [
        `type: ${type}`,
        inputRaw.required === true ? 'required' : 'optional',
        `${formInputs.length} typed field(s) in this command`,
      ].join(', ');
      regions.push({
        id: `${id}::${inputName}`,
        need: `${description || `field of command '${command}'`} — field '${inputName}' (${facts}).`,
      });
    }
  }

  // The page-level feedback surface: emitted only when there IS a command to report on.
  if (commandLabels.length) {
    regions.push({
      id: `${CM2_PAGE_REGION_PREFIX}feedback`,
      need: [
        `success/error feedback for the ${commandLabels.length} command(s) of this page (${commandLabels.join('; ')})`,
        'every one of them declares an output state',
        'ONE surface serves them all — this need is not tied to any single field or trigger, and it is the whole page\'s',
      ].join(' — '),
    });
  }

  return regions;
}
