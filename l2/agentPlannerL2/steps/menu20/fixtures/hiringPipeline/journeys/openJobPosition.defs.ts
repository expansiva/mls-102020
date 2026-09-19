/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/openJobPosition.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const openJobPositionJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "openJobPosition",
  "business": {
    "actorRef": "recruiter",
    "title": "Open a job position",
    "goal": "Make an approved hiring need available for applications under its responsible hiring manager.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "createJobPosition",
        "kind": "act",
        "entity": "JobPosition",
        "effect": "create",
        "title": "x",
        "description": "Open a job position with its title, department, description, headcount, and responsible hiring manager."
      }
    ],
    "outcome": {
      "statement": "The job position is open and can receive applications.",
      "evidence": [
        "An open job position shows its title, department, headcount, and responsible hiring manager."
      ]
    }
  },
  "businessHash": "sha256:7ac9c25de1f7cd87566ebeb5b5b0f0ddce28067ada2e671697289023b1accc97"
} as const satisfies Ns5JourneyArtifact;

export type OpenJobPositionJourneyType = typeof openJobPositionJourney;

export default openJobPositionJourney;
