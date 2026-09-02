/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.ts" enhancement="_blank"/>

// Deterministic region extraction from a page's `definition` (dataBindings[]/inputs[]) plus the
// sibling contract's field types. Pure — no I/O, no LLM.
//
// A REGION here is the same unit agentChooseMolecules (the probe) means by the word: one interaction a
// single molecule could serve. The probe has an LLM invent regions from free prose; here they are
// already final in the page's own data contract, so extraction is code, not a call — the funnel starts
// one level in, at "which group covers this region" (steps/c1-groups).
//
// `id` doubles as the region's join key AND the write-back address (helpers/cm2DefsPatch.applyMoleculeChoices
// walks it back to the same dataBinding/input): a `query` binding's own `id`, or `${binding.id}::${input.name}`
// for one of its `form` inputs. `selection`/`route` inputs are never regions — they are populated by
// selecting a row elsewhere or by the URL, never typed by hand, so there is nothing for a molecule to serve.

import { isRecord } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { Cm2ContractCommand } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.js';

export interface Cm2Region {
  id: string;
  need: string;
}

export function extractRegions(definitionJson: Record<string, unknown>, contractTypes: Record<string, Cm2ContractCommand>): Cm2Region[] {
  const regions: Cm2Region[] = [];
  const bindings = Array.isArray(definitionJson.dataBindings) ? definitionJson.dataBindings : [];

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
      ].filter(Boolean).join(' — ');
      regions.push({ id, need });
      continue;
    }

    if (bindingRaw.kind !== 'command' || !Array.isArray(bindingRaw.inputs)) continue;
    for (const inputRaw of bindingRaw.inputs) {
      if (!isRecord(inputRaw) || inputRaw.presentation !== 'form') continue;
      const inputName = typeof inputRaw.name === 'string' ? inputRaw.name : '';
      if (!inputName) continue;
      // Never inferred from the field name — an undeclared type is honestly 'unknown', not a guess
      // (agentChooseMolecules's own rule: "with no declared value set, use text rather than inventing").
      const type = contractTypes[command]?.input?.[inputName] || 'unknown';
      const need = `${description || `field of command '${command}'`} — field '${inputName}' (type: ${type}).`;
      regions.push({ id: `${id}::${inputName}`, need });
    }
  }

  return regions;
}
