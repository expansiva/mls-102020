/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/registerCandidate.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registerCandidateJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registerCandidate",
  "business": {
    "actorRef": "recruiter",
    "title": "Register a candidate",
    "goal": "Create or attach the candidate's master record so it can be used in hiring applications.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateCandidate",
        "kind": "locate",
        "entity": "Candidate",
        "title": "x",
        "description": "Look up the person by available identifying contact information before registration."
      },
      {
        "stepId": "registerCandidateRecord",
        "kind": "act",
        "entity": "Candidate",
        "effect": "create",
        "title": "x",
        "description": "Create or attach the candidate record, record the recruitment source, and associate the candidate's resume through the platform-managed attachment service."
      }
    ],
    "outcome": {
      "statement": "The candidate is available as a single master record for hiring activities.",
      "evidence": [
        "A candidate record displays the person's name and email.",
        "The candidate has a recruitment source and an associated resume attachment."
      ]
    }
  },
  "businessHash": "sha256:ac9932e3a53930b0f1f07970077edb9268c8ec95e72ab3380deb27a2fed90bae"
} as const satisfies Ns5JourneyArtifact;

export type RegisterCandidateJourneyType = typeof registerCandidateJourney;

export default registerCandidateJourney;
