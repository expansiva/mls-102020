/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/rejectApplication.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const rejectApplicationJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "rejectApplication",
  "business": {
    "actorRef": "recruiter",
    "title": "Reject an application",
    "goal": "Close an application that will not move forward, recording the reason for rejection.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "Find application",
        "description": "The recruiter finds the active application to be rejected."
      },
      {
        "stepId": "reviewApplication",
        "kind": "inspect",
        "entity": "Application",
        "title": "Review application",
        "description": "The recruiter reviews the application's current stage and history before rejecting it."
      },
      {
        "stepId": "reject",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "reject",
        "title": "Reject with reason",
        "description": "The recruiter rejects the application and records the rejection reason."
      }
    ],
    "outcome": {
      "statement": "The application is rejected with a recorded reason and leaves the active pipeline.",
      "evidence": [
        "The application shows the rejected stage",
        "The rejection reason is visible on the application"
      ]
    }
  },
  "businessHash": "sha256:87608e04429c132464b33b1abf2742cf3d120a15037b35aa017239073eae66d5"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RejectApplicationJourneyType = typeof rejectApplicationJourney;

export default rejectApplicationJourney;
