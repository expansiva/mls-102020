/// <mls fileReference="_102039_/l4/onboarding/journeys/completeMyAccess.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const completeMyAccessJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "completeMyAccess",
  "business": {
    "actorRef": "organizationMember",
    "title": "Complete my access",
    "goal": "Fill in only the missing name and country, accept the current privacy text when the country requires it, and reach the modules I may use.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "openMyAccess",
        "kind": "inspect",
        "entity": "OrganizationMember",
        "title": "See what is missing",
        "description": "The person opens the welcome screen and sees their read-only login e-mail and which minimum data are still missing; if everything is complete they go straight to their modules."
      },
      {
        "stepId": "chooseCountry",
        "kind": "locate",
        "entity": "Country",
        "title": "Choose my country",
        "description": "The person picks their country from the module's active country list shown in the user language; an unknown country is never replaced by a default."
      },
      {
        "stepId": "readPrivacyText",
        "kind": "inspect",
        "entity": "PrivacyTextVersion",
        "title": "Read privacy text",
        "description": "When the platform rule says the chosen country requires privacy consent, the person reads the current published privacy text and its version next to an unchecked acceptance."
      },
      {
        "stepId": "saveMyAccess",
        "kind": "act",
        "entity": "OrganizationMember",
        "effect": "update",
        "title": "Save my data",
        "description": "The person saves the missing name and country and, when required, the explicit acceptance recorded with when, how and the accepted version code; the screen then shows what was saved, what is pending and whether access is complete."
      }
    ],
    "outcome": {
      "statement": "The person's minimum data and any required consent are saved and access is complete by the platform rule, or the person sees exactly what is still pending.",
      "evidence": [
        "The person record shows name and country from the module country list",
        "When required, the consent records date, method and the current privacy version code",
        "The screen and the session agree that access is complete and the person reaches their modules"
      ]
    }
  },
  "businessHash": "sha256:b63a1228596ae357f38d26acdd180d2de4721d13ef8a4c38e2b53c2f3323a837"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CompleteMyAccessJourneyType = typeof completeMyAccessJourney;

export default completeMyAccessJourney;
