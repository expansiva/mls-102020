/// <mls fileReference="_102047_/l4/hiringPipeline/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "hiringPipeline",
  "title": "Hiring Pipeline",
  "userLanguage": "en",
  "productLanguages": [
    "en"
  ],
  "defaultLanguage": "en",
  "sourcePrompt": "create the hiringPipeline module, in English. recruiters open job positions with title, department, description and headcount. candidates are registered with name, email, resume link and source. a candidate applies to a position and the application moves through stages: screening, interview, offer, then hired or rejected (with a reason). the hiring manager of the position decides offer and hired; the recruiter does everything else. a position closes automatically when its headcount is filled. profiles: recruiter and hiring manager."
} as const satisfies Ns5ModuleArtifact;

export type HiringPipelineModuleType = typeof hiringPipelineModule;

export default hiringPipelineModule;
