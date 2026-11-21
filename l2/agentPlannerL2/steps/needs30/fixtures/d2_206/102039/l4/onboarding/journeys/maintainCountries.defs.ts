/// <mls fileReference="_102039_/l4/onboarding/journeys/maintainCountries.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const maintainCountriesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "maintainCountries",
  "business": {
    "actorRef": "companyOwner",
    "title": "Maintain countries",
    "goal": "Keep the module country list correct by adding, editing, inactivating and reactivating countries.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findCountry",
        "kind": "locate",
        "entity": "Country",
        "title": "Find a country",
        "description": "The owner searches the country list by ISO code or name."
      },
      {
        "stepId": "addCountry",
        "kind": "act",
        "entity": "Country",
        "effect": "create",
        "title": "Add a country",
        "description": "The owner adds a country with its two-letter ISO code and English name."
      },
      {
        "stepId": "editCountry",
        "kind": "act",
        "entity": "Country",
        "effect": "update",
        "title": "Edit a country",
        "description": "The owner corrects the code or English name of a country."
      },
      {
        "stepId": "inactivateCountry",
        "kind": "act",
        "entity": "Country",
        "effect": "transition",
        "transitionRef": "inactivateCountry",
        "title": "Inactivate a country",
        "description": "The owner inactivates a country so it is no longer offered for selection."
      },
      {
        "stepId": "reactivateCountry",
        "kind": "act",
        "entity": "Country",
        "effect": "transition",
        "transitionRef": "reactivateCountry",
        "title": "Reactivate a country",
        "description": "The owner reactivates an inactive country so it is offered again."
      }
    ],
    "outcome": {
      "statement": "The module country list reflects the owner's changes.",
      "evidence": [
        "New or edited countries appear with code and English name",
        "Inactive countries are not offered on the access and company screens",
        "Reactivated countries are offered again"
      ]
    }
  },
  "businessHash": "sha256:d494017babb81b826957bae915e7965cc7b0eacb26a4c755b541fa9702314bfc"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type MaintainCountriesJourneyType = typeof maintainCountriesJourney;

export default maintainCountriesJourney;
