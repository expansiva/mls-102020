/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/reviewMyPipeline.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reviewMyPipelineJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reviewMyPipeline",
  "business": {
    "actorRef": "hiringManager",
    "title": "Review my positions' pipeline",
    "goal": "Follow the progress of applications across the job positions I manage.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "findMyPositions",
        "kind": "locate",
        "entity": "JobPosition",
        "title": "Find my positions",
        "description": "The hiring manager lists the job positions she manages."
      },
      {
        "stepId": "inspectPosition",
        "kind": "inspect",
        "entity": "JobPosition",
        "title": "View position status",
        "description": "The hiring manager sees headcount, hires so far and whether the position is open or closed."
      },
      {
        "stepId": "inspectApplications",
        "kind": "inspect",
        "entity": "Application",
        "title": "View applications by stage",
        "description": "The hiring manager views the position's applications grouped by stage."
      }
    ],
    "outcome": {
      "statement": "The hiring manager knows where each application of her positions stands.",
      "evidence": [
        "Applications are shown by stage for each managed position",
        "Each position shows its filled and remaining headcount"
      ]
    }
  },
  "businessHash": "sha256:9f7a55fa88e41fcdf9ca5b9681194a64f5568b06842f8ea5d3fe384e877aa876"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReviewMyPipelineJourneyType = typeof reviewMyPipelineJourney;

export default reviewMyPipelineJourney;
