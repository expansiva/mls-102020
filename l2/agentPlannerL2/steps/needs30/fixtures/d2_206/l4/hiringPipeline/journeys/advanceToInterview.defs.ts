/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/advanceToInterview.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const advanceToInterviewJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "advanceToInterview",
  "business": {
    "actorRef": "recruiter",
    "title": "Move an application to interview",
    "goal": "Advance a screened application to the interview stage and hand it to the hiring manager once the interview is done.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "Find application",
        "description": "The recruiter finds the application in screening by candidate or position."
      },
      {
        "stepId": "reviewApplication",
        "kind": "inspect",
        "entity": "Application",
        "title": "Review screening",
        "description": "The recruiter reviews the candidate's resume link, source and the position requirements."
      },
      {
        "stepId": "moveToInterview",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "advanceToInterview",
        "title": "Move to interview",
        "description": "The recruiter moves the application from screening to the interview stage."
      },
      {
        "stepId": "handToManager",
        "kind": "handoff",
        "entity": "Application",
        "title": "Send to hiring manager",
        "description": "The interviewed application is handed to the position's hiring manager to decide on an offer.",
        "handoffTo": "hiringManager"
      }
    ],
    "outcome": {
      "statement": "The application is in the interview stage and awaits the hiring manager's offer decision.",
      "evidence": [
        "The application shows the interview stage",
        "The application appears in the hiring manager's pending decisions"
      ]
    }
  },
  "businessHash": "sha256:ca576286724c628ae88221cb25ef24dbcdf945cc9dec85a73ddea75c507f7df2"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AdvanceToInterviewJourneyType = typeof advanceToInterviewJourney;

export default advanceToInterviewJourney;
