/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/decideOffer.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const decideOfferJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "decideOffer",
  "business": {
    "actorRef": "hiringManager",
    "title": "Decide whether to make an offer",
    "goal": "Make the hiring decision for an interviewed candidate assigned to the manager's position.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "locateInterviewApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "x",
        "description": "Locate the interviewed application for a position managed by the hiring manager."
      },
      {
        "stepId": "inspectInterviewApplication",
        "kind": "inspect",
        "entity": "Application",
        "title": "x",
        "description": "Review the interviewed candidate and the job position."
      },
      {
        "stepId": "inspectCandidateForOffer",
        "kind": "inspect",
        "entity": "Candidate",
        "title": "x",
        "description": "Review the candidate's qualifications and available resume before making the offer decision."
      },
      {
        "stepId": "selectOfferDecision",
        "kind": "decide",
        "entity": "Application",
        "title": "x",
        "description": "Choose whether to make an offer or decline the candidate."
      },
      {
        "stepId": "moveToOffer",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "moveToOffer",
        "title": "x",
        "description": "When an offer is selected, move the application from interview to offer."
      },
      {
        "stepId": "referDeclinedCandidate",
        "kind": "handoff",
        "entity": "Application",
        "title": "x",
        "description": "When the candidate is declined, refer the application to the recruiter to record the rejection reason.",
        "handoffTo": "recruiter"
      }
    ],
    "outcome": {
      "statement": "An interviewed candidate is either advanced to offer or referred for rejection processing.",
      "evidence": [
        "For an offer decision, the application stage is offer.",
        "For a decline decision, the recruiter receives the application for rejection processing."
      ]
    }
  },
  "businessHash": "sha256:2ab1e944d198bcc863c62f49b7f7c6886fae94f758a1c403fb237526585d555b"
} as const satisfies Ns5JourneyArtifact;

export type DecideOfferJourneyType = typeof decideOfferJourney;

export default decideOfferJourney;
