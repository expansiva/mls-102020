/// <mls fileReference="_102039_/l4/onboarding/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "onboarding",
  "businessDomain": "Onboarding of a company's app: welcomes signed-in people, lets each organization member complete their own access (name, country and privacy consent), lets the company owner prepare the company, maintain the module country list and the privacy text versions, and review the organization people with what is still missing.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "onboarding",
    "description": "Branch details.onboarding of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "OrganizationMember",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "OrganizationCompany",
      "kind": "role",
      "subtype": "Company"
    },
    {
      "entityId": "CompanyContact",
      "kind": "role",
      "subtype": "ContactChannel"
    },
    {
      "entityId": "Country",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "PrivacyTextVersion",
      "kind": "entity",
      "class": "core"
    }
  ],
  "relationships": [
    {
      "relationshipId": "memberCountry",
      "from": "OrganizationMember",
      "to": "Country",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The person's country, chosen from the module's active country list; an unknown country is never replaced by a default.",
      "field": "OrganizationMember.countryCode"
    },
    {
      "relationshipId": "companyCountry",
      "from": "OrganizationCompany",
      "to": "Country",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The company's country, chosen from the module country list; an unknown country is never replaced by a default.",
      "field": "OrganizationCompany.countryCode"
    },
    {
      "relationshipId": "memberAcceptedVersion",
      "from": "OrganizationMember",
      "to": "PrivacyTextVersion",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The privacy text version code the person accepted, recorded on the person with when and how.",
      "field": "OrganizationMember.details.person.privacyConsent.consentVersion"
    },
    {
      "relationshipId": "companyHasContact",
      "from": "OrganizationCompany",
      "to": "CompanyContact",
      "type": "oneToMany",
      "required": false,
      "mode": "mdmRelationship",
      "description": "The contact channel that belongs to this company; repeating the save does not duplicate it.",
      "catalogType": "HasContact"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type OnboardingOntologyIndexType = typeof onboardingOntologyIndex;

export default onboardingOntologyIndex;
