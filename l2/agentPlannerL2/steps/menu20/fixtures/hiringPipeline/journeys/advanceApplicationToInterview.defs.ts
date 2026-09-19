/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/advanceApplicationToInterview.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const advanceApplicationToInterviewJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "advanceApplicationToInterview",
  "business": {
    "actorRef": "recruiter",
    "title": "Advance an application to interview",
    "goal": "Move a screened candidate forward to the interview stage.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateScreeningApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "x",
        "description": "Locate the application in screening."
      },
      {
        "stepId": "inspectScreeningApplication",
        "kind": "inspect",
        "entity": "Application",
        "title": "x",
        "description": "Review the candidate, position, and screening information."
      },
      {
        "stepId": "inspectCandidateQualifications",
        "kind": "inspect",
        "entity": "Candidate",
        "title": "x",
        "description": "Review the candidate's qualifications and available resume before advancing the application."
      },
      {
        "stepId": "moveToInterview",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "moveToInterview",
        "title": "x",
        "description": "Move the application from screening to interview."
      }
    ],
    "outcome": {
      "statement": "The application is ready for interview review.",
      "evidence": [
        "The application stage is interview."
      ]
    }
  },
  "businessHash": "sha256:f6bcc6cba6436263bb01c55b9be1ef93f6c54236885ea313170380681207914c"
} as const satisfies Ns5JourneyArtifact;

export type AdvanceApplicationToInterviewJourneyType = typeof advanceApplicationToInterviewJourney;

export default advanceApplicationToInterviewJourney;
