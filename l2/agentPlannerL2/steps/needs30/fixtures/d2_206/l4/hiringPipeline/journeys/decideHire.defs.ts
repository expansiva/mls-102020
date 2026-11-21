/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/decideHire.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const decideHireJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "decideHire",
  "business": {
    "actorRef": "hiringManager",
    "title": "Decide on hiring",
    "goal": "Decide whether a candidate in the offer stage is hired for one of my positions, taking the position's remaining headcount into account.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "Find application in offer",
        "description": "The hiring manager finds an application in the offer stage among her positions."
      },
      {
        "stepId": "reviewOffer",
        "kind": "inspect",
        "entity": "Application",
        "title": "Review offer",
        "description": "The hiring manager reviews the application and the offer extended to the candidate."
      },
      {
        "stepId": "checkHeadcount",
        "kind": "inspect",
        "entity": "JobPosition",
        "title": "Check remaining headcount",
        "description": "The hiring manager checks the position's headcount, hires so far and remaining openings."
      },
      {
        "stepId": "chooseHire",
        "kind": "decide",
        "entity": "Application",
        "title": "Hire or decline",
        "description": "The hiring manager chooses between hiring the candidate or declining."
      },
      {
        "stepId": "hire",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "hire",
        "title": "Mark as hired",
        "description": "When she chooses to hire, the application moves to hired; if the position's headcount is now filled, the position closes automatically."
      },
      {
        "stepId": "returnToRecruiter",
        "kind": "handoff",
        "entity": "Application",
        "title": "Return to recruiter",
        "description": "When she declines, the application goes back to the recruiter to be rejected with a reason.",
        "handoffTo": "recruiter"
      }
    ],
    "outcome": {
      "statement": "The candidate is hired, or the application is returned to the recruiter for rejection; a position with filled headcount is closed.",
      "evidence": [
        "The application shows the hired stage",
        "The position shows as closed when its headcount is filled",
        "The recruiter sees declined applications to reject"
      ]
    }
  },
  "businessHash": "sha256:5a48310270575173b7c014125ad21258b4e0cb563a905d2ce13b072612ec9df8"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type DecideHireJourneyType = typeof decideHireJourney;

export default decideHireJourney;
