/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/startApplicationScreening.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const startApplicationScreeningJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "startApplicationScreening",
  "business": {
    "actorRef": "recruiter",
    "title": "Start screening an application",
    "goal": "Associate a candidate with an open job position and begin screening.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateCandidateForApplication",
        "kind": "locate",
        "entity": "Candidate",
        "title": "x",
        "description": "Locate the candidate who is applying."
      },
      {
        "stepId": "inspectCandidateForApplication",
        "kind": "inspect",
        "entity": "Candidate",
        "title": "x",
        "description": "Review the candidate information and available resume."
      },
      {
        "stepId": "locateOpenJobPosition",
        "kind": "locate",
        "entity": "JobPosition",
        "title": "x",
        "description": "Locate the open job position for the application."
      },
      {
        "stepId": "inspectJobPositionRequirements",
        "kind": "inspect",
        "entity": "JobPosition",
        "title": "x",
        "description": "Review the job position and its remaining hiring need."
      },
      {
        "stepId": "createApplication",
        "kind": "act",
        "entity": "Application",
        "effect": "create",
        "title": "x",
        "description": "Record the candidate's application for the selected job position and start it in screening."
      }
    ],
    "outcome": {
      "statement": "The candidate has an application in the screening stage for the selected position.",
      "evidence": [
        "An application links the candidate to the job position.",
        "The application stage is screening."
      ]
    }
  },
  "businessHash": "sha256:867c6c9c9e21cd4daffc0e72d15b87ad25a87336ebbc4954136bc29f5dd97e36"
} as const satisfies Ns5JourneyArtifact;

export type StartApplicationScreeningJourneyType = typeof startApplicationScreeningJourney;

export default startApplicationScreeningJourney;
