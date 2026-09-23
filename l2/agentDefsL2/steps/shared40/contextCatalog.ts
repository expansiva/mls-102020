/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/contextCatalog.ts" enhancement="_blank"/>

import { readSourceText } from '/_102035_/l2/solution/fs.js';
import type { D2SharedContextPort } from '/_102020_/l2/agentDefsL2/steps/shared40/context.js';

export const d2SharedContextPort: D2SharedContextPort = {
  async readText(reference: string): Promise<string | null> {
    const normalized = reference.startsWith('l2/') ? `_${Number(mls.actualProject || 0)}_/${reference}` : reference;
    const match = /^_(\d+)_\/l([24])\/(.+)\/([^/]+)(\.(?:ts|md|json))$/.exec(normalized);
    if (!match) throw new Error(`D2_SHARED_CONTEXT_REF_INVALID: ${reference}`);
    try { return await readSourceText({ project: Number(match[1]), level: Number(match[2]) as 2 | 4, folder: match[3], shortName: match[4], extension: match[5] }); }
    catch { return null; }
  },
};
