/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.ts" enhancement="_blank"/>

import {
  discoverChCatalog,
  readChGroupCatalog,
  readChLevel1,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { chExtractCatalogModule } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chExtract.js';
import { chFileRefFromImport } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { nmFileExists, readStorText } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import type { D2MoleculeCatalogPort, D2UsageContractRead } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';

export const d2MoleculeCatalogPort: D2MoleculeCatalogPort = {
  discover: discoverChCatalog,
  readLevel1: readChLevel1,
  readGroup: readChGroupCatalog,
  readUsageContract,
};

async function readUsageContract(reference: string): Promise<{ contract: D2UsageContractRead | null; error: string }> {
  const trace: string[] = [];
  const info = chFileRefFromImport(reference);
  if (!info) trace.push(`'${reference}' is not a project reference`);
  else if (!nmFileExists(info)) trace.push('it is not in this project');
  else {
    const extracted = chExtractCatalogModule(await readStorText(info, false));
    const skill = extracted.module?.skill;
    if (skill?.trim()) return { contract: { reference, via: 'stor', skill }, error: '' };
    trace.push(`the file in this project has no readable skill text (${extracted.error})`);
  }

  try {
    const mod = await import(reference) as { skill?: unknown };
    if (typeof mod.skill === 'string' && mod.skill.trim()) {
      return { contract: { reference, via: 'published', skill: mod.skill }, error: '' };
    }
    trace.push("the published module exports no 'skill' text");
  } catch (error) {
    trace.push(`the published project does not serve it (${error instanceof Error ? error.message : String(error)})`);
  }
  return { contract: null, error: `${reference} could not be read: ${trace.join('; ')}.` };
}
