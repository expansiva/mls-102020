/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/openJobPosition.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const openJobPositionJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "openJobPosition",
  "business": {
    "actorRef": "recruiter",
    "title": "Open a job position",
    "goal": "Publish a new job position with its title, department, description, headcount and hiring manager so candidates can apply to it.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "createPosition",
        "kind": "act",
        "entity": "JobPosition",
        "effect": "create",
        "title": "Open job position",
        "description": "The recruiter enters the title, department, description, headcount and hiring manager, and the position opens."
      },
      {
        "stepId": "reviewPosition",
        "kind": "inspect",
        "entity": "JobPosition",
        "title": "Review open position",
        "description": "The recruiter checks the opened position and its remaining headcount."
      }
    ],
    "outcome": {
      "statement": "A new job position is open and ready to receive applications.",
      "evidence": [
        "The position appears in the list of open positions",
        "The position shows its hiring manager and headcount"
      ]
    }
  },
  "businessHash": "sha256:40e908a76119a039efb7ffb15fcbbb04d00bccbf0f995621711478eb9b8ad7aa"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type OpenJobPositionJourneyType = typeof openJobPositionJourney;

export default openJobPositionJourney;
