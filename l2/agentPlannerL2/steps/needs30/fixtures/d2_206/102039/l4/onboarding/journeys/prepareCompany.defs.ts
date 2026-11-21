/// <mls fileReference="_102039_/l4/onboarding/journeys/prepareCompany.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const prepareCompanyJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "prepareCompany",
  "business": {
    "actorRef": "companyOwner",
    "title": "Prepare the company",
    "goal": "Complete the missing company data so the company is prepared and then follow the guidance to create the first module in Studio.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "openCompany",
        "kind": "inspect",
        "entity": "OrganizationCompany",
        "title": "See company data",
        "description": "The owner opens the company preparation screen and sees what the platform already has and which required data are still missing."
      },
      {
        "stepId": "chooseCompanyCountry",
        "kind": "locate",
        "entity": "Country",
        "title": "Choose company country",
        "description": "The owner picks the company country from the module country list; an unknown country is never replaced by a default."
      },
      {
        "stepId": "saveCompany",
        "kind": "act",
        "entity": "OrganizationCompany",
        "effect": "update",
        "title": "Save company data",
        "description": "The owner saves the missing name, legal name, country, document, address and contact of this company without duplicating the contact on repetition."
      },
      {
        "stepId": "viewGuidance",
        "kind": "inspect",
        "entity": "OrganizationCompany",
        "title": "Follow Studio guidance",
        "description": "Once all required data are saved, the screen shows the fixed guidance text with the link to create the first module in Studio."
      }
    ],
    "outcome": {
      "statement": "The company has all required data saved and is prepared.",
      "evidence": [
        "The company shows name, legal name, country, document, address and one contact",
        "The company is marked as prepared",
        "The guidance text with the Studio link is displayed"
      ]
    }
  },
  "businessHash": "sha256:c5bf7c3e13097ae33b1502355a4398c128423bd9ab88a1508b01a09b340fdb82"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type PrepareCompanyJourneyType = typeof prepareCompanyJourney;

export default prepareCompanyJourney;
