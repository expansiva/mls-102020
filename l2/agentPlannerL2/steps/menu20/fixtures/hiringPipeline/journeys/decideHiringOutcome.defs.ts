/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/decideHiringOutcome.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const decideHiringOutcomeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "decideHiringOutcome",
  "business": {
    "actorRef": "hiringManager",
    "title": "Decide the hiring outcome",
    "goal": "Decide whether a candidate with an offer is hired.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateOfferedApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "x",
        "description": "Locate the application in the offer stage for a position managed by the hiring manager."
      },
      {
        "stepId": "inspectOfferedApplication",
        "kind": "inspect",
        "entity": "Application",
        "title": "x",
        "description": "Review the offered candidate and job position before the final hiring decision."
      },
      {
        "stepId": "inspectPositionHeadcount",
        "kind": "inspect",
        "entity": "JobPosition",
        "title": "x",
        "description": "Review the position's remaining hiring need before confirming a hire."
      },
      {
        "stepId": "selectHiringDecision",
        "kind": "decide",
        "entity": "Application",
        "title": "x",
        "description": "Choose whether to hire the candidate or decline the application."
      },
      {
        "stepId": "moveToHired",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "moveToHired",
        "title": "x",
        "description": "When hiring is selected, move the application from offer to hired; filling the position's headcount closes the position automatically."
      },
      {
        "stepId": "referDeclinedOffer",
        "kind": "handoff",
        "entity": "Application",
        "title": "x",
        "description": "When hiring is declined, refer the application to the recruiter to record the rejection reason.",
        "handoffTo": "recruiter"
      }
    ],
    "outcome": {
      "statement": "The offered candidate is either hired or referred for rejection processing.",
      "evidence": [
        "For a hire decision, the application stage is hired.",
        "When the final hire fills the position headcount, the job position is closed automatically.",
        "For a decline decision, the recruiter receives the application for rejection processing."
      ]
    }
  },
  "businessHash": "sha256:2a4e9575290825e9aad529124d80c348a605d4994d5f0bb163c37c1d46c16bdb"
} as const satisfies Ns5JourneyArtifact;

export type DecideHiringOutcomeJourneyType = typeof decideHiringOutcomeJourney;

export default decideHiringOutcomeJourney;
