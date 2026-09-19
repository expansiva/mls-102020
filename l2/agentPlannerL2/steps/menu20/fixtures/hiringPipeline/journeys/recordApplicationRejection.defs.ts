/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/recordApplicationRejection.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const recordApplicationRejectionJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "recordApplicationRejection",
  "business": {
    "actorRef": "recruiter",
    "title": "Record an application rejection",
    "goal": "Close a declined application with its rejection reason.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateApplicationForRejection",
        "kind": "locate",
        "entity": "Application",
        "title": "x",
        "description": "Locate the application that will not proceed."
      },
      {
        "stepId": "inspectApplicationForRejection",
        "kind": "inspect",
        "entity": "Application",
        "title": "x",
        "description": "Review the application and its current stage before recording the outcome."
      },
      {
        "stepId": "inspectPositionForRejection",
        "kind": "inspect",
        "entity": "JobPosition",
        "title": "x",
        "description": "Review the position context before recording the rejection."
      },
      {
        "stepId": "recordRejection",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "rejectApplication",
        "title": "x",
        "description": "Move the application to rejected and record the rejection reason."
      }
    ],
    "outcome": {
      "statement": "The application is rejected with an explained outcome.",
      "evidence": [
        "The application stage is rejected.",
        "The application displays a rejection reason."
      ]
    }
  },
  "businessHash": "sha256:b00cff1cff5458af8c65de4506b890cc771f342b05d1ad2f4399be8c809065cd"
} as const satisfies Ns5JourneyArtifact;

export type RecordApplicationRejectionJourneyType = typeof recordApplicationRejectionJourney;

export default recordApplicationRejectionJourney;
