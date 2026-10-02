/// <mls fileReference="_102047_/l4/hiringPipeline/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';

export const hiringPipelineRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "hiringPipeline",
  "rules": {
    "closePositionWhenHeadcountFilled": "A job position closes automatically when its filled headcount reaches its defined headcount.",
    "applicationStageOrder": "An application may progress from screening to interview, then offer, then hired, or may be rejected from screening, interview, or offer.",
    "hiringManagerManagesPosition": "An offer or hiring decision may be made only by the hiring manager responsible for the application's job position.",
    "jobPositionHasRemainingHeadcount": "An application may be hired only when its job position has remaining headcount.",
    "rejectionReasonRequired": "A rejected application must include a rejection reason.",
    "ruleForeignNamespaceRefused": "Hiring-pipeline data must not be written in another module's namespace.",
    "ruleDocumentShapeValidated": "A candidate's supplied identification document must conform to its declared document type and country.",
    "ruleIdentityNeverInNamespace": "A candidate's platform identity data must not be stored in the hiring-pipeline namespace.",
    "rulePersonPrivacyConsentRequiredBrEu": "A candidate requires applicable privacy consent when governed by Brazilian or European privacy rules.",
    "candidateRequiresEmailContact": "A candidate must have an email contact channel.",
    "ruleContactValueUniquePerType": "A contact-channel value must be unique within its contact-channel type.",
    "applicationUniqueCandidatePosition": "A candidate may have at most one application for the same job position.",
    "applicationRequiresOpenPosition": "An application may be created only for an open job position."
  }
} as const satisfies Ns5RulesArtifactV2;

export type HiringPipelineRulesType = typeof hiringPipelineRules;

export default hiringPipelineRules;
