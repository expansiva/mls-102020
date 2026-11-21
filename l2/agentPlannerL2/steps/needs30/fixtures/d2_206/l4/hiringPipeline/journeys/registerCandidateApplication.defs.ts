/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/registerCandidateApplication.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registerCandidateApplicationJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registerCandidateApplication",
  "business": {
    "actorRef": "recruiter",
    "title": "Register a candidate and an application",
    "goal": "Register a candidate with name, email, resume link and source, and record the candidate's application to an open position.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registerCandidate",
        "kind": "act",
        "entity": "Candidate",
        "effect": "create",
        "title": "Register candidate",
        "description": "The recruiter registers the candidate with name, email, resume link and source; an existing candidate is reused instead of duplicated."
      },
      {
        "stepId": "findPosition",
        "kind": "locate",
        "entity": "JobPosition",
        "title": "Find open position",
        "description": "The recruiter searches for the open position the candidate is applying to."
      },
      {
        "stepId": "createApplication",
        "kind": "act",
        "entity": "Application",
        "effect": "create",
        "title": "Record application",
        "description": "The recruiter records the candidate's application to the position, which starts in the screening stage."
      }
    ],
    "outcome": {
      "statement": "The candidate is registered and has an application in screening for the chosen position.",
      "evidence": [
        "The candidate appears in the candidate list",
        "The application appears in the position's pipeline in the screening stage"
      ]
    }
  },
  "businessHash": "sha256:5bc2ba5be1d9d7542d023a0480e47a3290269e61a101485c1833157498c0175c"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegisterCandidateApplicationJourneyType = typeof registerCandidateApplicationJourney;

export default registerCandidateApplicationJourney;
