/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/decideOffer.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const decideOfferJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "decideOffer",
  "business": {
    "actorRef": "hiringManager",
    "title": "Decide on an offer",
    "goal": "Decide whether an interviewed candidate for one of my positions receives an offer.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findApplication",
        "kind": "locate",
        "entity": "Application",
        "title": "Find interviewed application",
        "description": "The hiring manager finds an application in the interview stage among the positions she manages."
      },
      {
        "stepId": "reviewCandidate",
        "kind": "inspect",
        "entity": "Application",
        "title": "Review candidate",
        "description": "The hiring manager reviews the candidate's resume link, source and application history."
      },
      {
        "stepId": "chooseOffer",
        "kind": "decide",
        "entity": "Application",
        "title": "Offer or decline",
        "description": "The hiring manager chooses between extending an offer or declining the candidate."
      },
      {
        "stepId": "extendOffer",
        "kind": "act",
        "entity": "Application",
        "effect": "transition",
        "transitionRef": "extendOffer",
        "title": "Move to offer",
        "description": "When she chooses to offer, the hiring manager moves the application to the offer stage."
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
      "statement": "The application is either in the offer stage or returned to the recruiter for rejection.",
      "evidence": [
        "The application shows the offer stage, or",
        "The recruiter sees the application flagged for rejection"
      ]
    }
  },
  "businessHash": "sha256:1c66b35ec085084fd368eafbffa6e0d404690f20ca310517e6f9d7e6e471a3e9"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type DecideOfferJourneyType = typeof decideOfferJourney;

export default decideOfferJourney;
