/// <mls fileReference="_102039_/l4/onboarding/ontology/Country.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingEntityCountry = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "onboarding",
  "entityId": "Country",
  "title": "Country",
  "description": "The module's own country list, with the two-letter ISO code and the English name, shown in the user language and maintained by the company owner (add, edit, inactivate, reactivate). Only active countries are offered for selection.",
  "displayField": "name",
  "relationships": {
    "members": {
      "relationshipId": "memberCountry",
      "to": "OrganizationMember",
      "via": "OrganizationMember.countryCode",
      "cardinality": "1:N",
      "title": "People of this country",
      "description": "Organization members whose country is this one; an unknown country is never replaced by a default.",
      "mode": "fk",
      "direction": "to"
    },
    "companies": {
      "relationshipId": "companyCountry",
      "to": "OrganizationCompany",
      "via": "OrganizationCompany.countryCode",
      "cardinality": "1:N",
      "title": "Companies of this country",
      "description": "The company whose country is this one; an unknown company country is never replaced by a default.",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Reads one country by its id when a screen already holds it, such as the edit form of the owner.",
    "locate.byColumn": "Lists countries filtered by status and ordered by name, paged; the member and the owner see only active countries when choosing a country, and the owner sees every country when maintaining the list.",
    "locate.byText": "Finds countries whose ISO code or English name contains the typed text, for the owner's search box and the country picker.",
    "count": "Counts the countries a filter matches, for the total shown on the owner's country list header.",
    "listByForeignKey": "Resolves many country codes at once to fill the country names on the organization people list and the company screen without one query per line.",
    "create": "Adds a new country with its two-letter ISO code and English name, active; used by the company owner.",
    "update": "Corrects the ISO code or English name of a country; used by the company owner.",
    "transition": "Moves a country between active and inactive through inactivateCountry and reactivateCountry; used only by the company owner.",
    "uniqueKey": "Refuses a second country with the same ISO code, enforced by the engine on create and on edit."
  },
  "rules": [
    "onlyOwnerMaintainsCountries",
    "onlyActiveCountryOffered",
    "countryIsoCodeUnique",
    "countryIsoCodeFormat",
    "unknownCountryNeverDefaulted"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "onboarding_country",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "isoCode": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "ISO code",
        "description": "Two-letter ISO 3166-1 alpha-2 code of the country, in upper case. People and companies point at the country by this code; it is unique in the list and searched by the owner.",
        "pattern": "^[A-Z]{2}$",
        "maxLength": 2
      },
      "name": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "English name",
        "description": "English name of the country as kept in the module list; searched by name and used to order the list. The screen shows it in the user language.",
        "maxLength": 120
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "active",
            "title": "Active",
            "description": "Offered for selection."
          },
          {
            "value": "inactive",
            "title": "Inactive",
            "description": "Kept in the list but no longer offered for selection."
          }
        ],
        "title": "Status",
        "description": "Whether the country is offered for selection. Only active countries are offered to people and to the company."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Everything about the country that nobody filters by. Today nothing besides the indexed code, name and status is asked for.",
        "fields": {
          "displayName": {
            "type": "string",
            "derived": true,
            "title": "Name in the user language",
            "description": "The country name shown in the language of the person using the screen, translated from the two-letter ISO code; when no translation is known the English name is shown."
          }
        }
      }
    }
  },
  "initialData": "Every ISO 3166-1 country, with its two-letter code and English name, active.",
  "uniqueKeys": [
    [
      "isoCode"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "active",
      "reachedBy": "actor"
    },
    {
      "state": "inactive",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "inactivateCountry",
      "from": [
        "active"
      ],
      "to": "inactive",
      "by": [
        "companyOwner"
      ],
      "description": "The company owner inactivates a country so it is no longer offered for selection; people and companies that already point at it keep their country.",
      "payload": [],
      "ruleRefs": [
        "onlyOwnerMaintainsCountries",
        "onlyActiveCountryOffered"
      ]
    },
    {
      "transitionId": "reactivateCountry",
      "from": [
        "inactive"
      ],
      "to": "active",
      "by": [
        "companyOwner"
      ],
      "description": "The company owner reactivates an inactive country so it is offered for selection again.",
      "payload": [],
      "ruleRefs": [
        "onlyOwnerMaintainsCountries"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OnboardingEntityCountryType = typeof onboardingEntityCountry;

export default onboardingEntityCountry;
