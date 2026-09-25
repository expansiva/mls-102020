/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/categoryCatalog.ts" enhancement="_blank"/>

import { readSourceText } from '/_102035_/l2/solution/fs.js';
import type { D2PageSkillPort } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';

export const d2PageSkillPort: D2PageSkillPort = {
  async readText(reference: string): Promise<string | null> {
    const match = /^_(\d+)_\/l([24])\/(.+)\/([^/]+)(\.(?:ts|md|json))$/.exec(reference);
    if (!match) throw new Error(`D2_PAGE_SKILL_REF_INVALID: ${reference}`);
    try { return await readSourceText({ project: Number(match[1]), level: Number(match[2]) as 2 | 4, folder: match[3], shortName: match[4], extension: match[5] }); }
    catch { return null; }
  },
};
