/// <mls fileReference="_102047_/l4/hiringPipeline/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "hiringPipeline",
  "rules": {
    "positionHeadcountPositive": "A job position's headcount must be a whole number greater than zero.",
    "positionRequiresHiringManager": "A job position must have an active hiring manager to be opened.",
    "closePositionWhenHeadcountFilled": "A job position closes automatically, in the same operation as the hire, as soon as its number of hired applications reaches its headcount.",
    "closedPositionAcceptsNoApplications": "A closed job position accepts no new applications.",
    "applicationOnlyToOpenPosition": "An application can only be recorded against a job position whose status is open.",
    "onePerCandidatePerPosition": "A candidate can have at most one application to the same job position.",
    "candidateEmailRequired": "A candidate must be registered with an e-mail address, along with a name, resume link and source.",
    "candidateReusedNotDuplicated": "Before a new candidate is registered, an existing candidate with the same e-mail address or national document is reused instead of creating a duplicate.",
    "applicationStartsInScreening": "A new application always starts in the screening stage.",
    "stageSequenceEnforced": "An application moves only from screening to interview, from interview to offer and from offer to hired, and can be rejected from screening, interview or offer.",
    "finalStagesAreTerminal": "An application that is hired or rejected cannot move to any other stage.",
    "onlyPositionManagerDecides": "Only the hiring manager of the application's job position can extend an offer or hire the candidate; all other pipeline actions are performed by the recruiter.",
    "hireRequiresRemainingHeadcount": "A candidate can only be hired while the job position is open and its headcount is not yet filled.",
    "hireRequiresRemainingOpening": "A hire is allowed only when the job position's remaining openings are greater than zero at the moment of hiring.",
    "rejectionRequiresReason": "An application can only be rejected when a rejection reason is recorded, together with the stage it was in when rejected.",
    "hiresSoFarCalculation": "A job position's hires so far equal the number of its applications in the hired stage.",
    "remainingOpeningsCalculation": "A job position's remaining openings equal its headcount minus its hires so far, never less than zero.",
    "headcountFilledCalculation": "A job position's headcount is filled when its hires so far are equal to or greater than its headcount.",
    "applicationActiveCalculation": "An application is active while it is in screening, interview or offer, and inactive once hired or rejected.",
    "daysInStageCalculation": "An application's days in stage equal the number of days from when it entered its current stage up to today."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type HiringPipelineRulesType = typeof hiringPipelineRules;

export default hiringPipelineRules;
