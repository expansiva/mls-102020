/// <mls fileReference="_102039_/l4/onboarding/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "onboarding",
  "actors": [
    {
      "actorId": "companyOwner",
      "kind": "internal",
      "origin": "named",
      "title": "Company owner",
      "description": "The person the platform already recognizes as owner of the company. Prepares the company data, maintains the module country list and the privacy text versions, and views the organization people with what is still missing. Is also an organization member.",
      "personEntity": "OrganizationMember"
    },
    {
      "actorId": "organizationMember",
      "kind": "internal",
      "origin": "named",
      "title": "Organization member",
      "description": "Every authenticated person accepted into the organization, including the owner. Completes their own access by filling in only the missing name and country and accepting the current privacy text when the country requires it.",
      "personEntity": "OrganizationMember"
    }
  ],
  "grants": [
    {
      "grantId": "memberOwnAccess",
      "actorRef": "organizationMember",
      "title": "My own access",
      "description": "The signed-in person reads and completes only their own record: missing name and country, privacy acceptance, read-only login e-mail and what is still missing.",
      "entityRefs": [
        "OrganizationMember"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Only the person whose login is the session login.",
        "anchorEntity": "OrganizationMember"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole own record; the login e-mail and status stay read-only."
      }
    },
    {
      "grantId": "memberChooseCountry",
      "actorRef": "organizationMember",
      "title": "Choose my country",
      "description": "The person picks their country from the module's active country list, shown in the user language.",
      "entityRefs": [
        "Country"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only countries whose status is active are offered for selection."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Code, English name and translated display name for selection.",
        "allowedFields": [
          "Country.isoCode",
          "Country.name",
          "Country.details.displayName"
        ]
      }
    },
    {
      "grantId": "memberReadPrivacyText",
      "actorRef": "organizationMember",
      "title": "Read the current privacy text",
      "description": "The person reads the current published privacy text and its version before accepting it.",
      "entityRefs": [
        "PrivacyTextVersion"
      ],
      "dataScope": {
        "mode": "custom",
        "description": "Only the current version: published and with no later published version. Drafts are never visible."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Text, version code and publication data; the owner's change note and draft status are not shown.",
        "allowedFields": [
          "PrivacyTextVersion.versionCode",
          "PrivacyTextVersion.publishedAt",
          "PrivacyTextVersion.details.text",
          "PrivacyTextVersion.details.isProvisional",
          "PrivacyTextVersion.details.isCurrent"
        ]
      }
    },
    {
      "grantId": "ownerOwnAccess",
      "actorRef": "companyOwner",
      "title": "Owner's own access",
      "description": "The owner is also an organization member and completes their own access like any person.",
      "entityRefs": [
        "OrganizationMember"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Only the owner's own person record.",
        "anchorEntity": "OrganizationMember"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole own record; login e-mail and status stay read-only."
      }
    },
    {
      "grantId": "ownerPrepareCompany",
      "actorRef": "companyOwner",
      "title": "Prepare the company",
      "description": "The owner reads and completes the company data and its contact channel without duplicating the contact.",
      "entityRefs": [
        "OrganizationCompany",
        "CompanyContact"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "The company of the organization and the contact that belongs to it."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The whole company and contact records, including what is still missing and whether the company is prepared."
      }
    },
    {
      "grantId": "ownerMaintainCountries",
      "actorRef": "companyOwner",
      "title": "Maintain countries",
      "description": "The owner searches, adds, edits, inactivates and reactivates countries of the module list.",
      "entityRefs": [
        "Country"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Every country of the module list, active or inactive."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "All country fields."
      }
    },
    {
      "grantId": "ownerPublishPrivacyText",
      "actorRef": "companyOwner",
      "title": "Publish privacy text",
      "description": "The owner sees every privacy text version, writes a new draft and publishes it as the current version; published versions are never changed.",
      "entityRefs": [
        "PrivacyTextVersion"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Every privacy text version of the organization, drafts and published."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "All version fields, including status and change note."
      }
    },
    {
      "grantId": "ownerReviewPeople",
      "actorRef": "companyOwner",
      "title": "Review organization people",
      "description": "The owner lists organization users with name, read-only login e-mail, status and what is still missing; being listed grants no authority.",
      "entityRefs": [
        "OrganizationMember"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Every organization user from the platform user list."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Name, login e-mail, status, country and pending items; the person's consent record details are not shown.",
        "allowedFields": [
          "OrganizationMember.details.identification.name",
          "OrganizationMember.details.identification.status",
          "OrganizationMember.details.identification.countryCode",
          "OrganizationMember.details.identification.updatedAt",
          "OrganizationMember.details.onboarding.loginEmail",
          "OrganizationMember.details.onboarding.missingItems",
          "OrganizationMember.details.onboarding.accessComplete",
          "OrganizationMember.details.onboarding.consentValid"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type OnboardingAccessType = typeof onboardingAccess;

export default onboardingAccess;
