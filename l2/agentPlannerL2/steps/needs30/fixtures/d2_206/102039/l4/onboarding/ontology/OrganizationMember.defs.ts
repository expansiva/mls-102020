/// <mls fileReference="_102039_/l4/onboarding/ontology/OrganizationMember.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingEntityOrganizationMember = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "onboarding",
  "entityId": "OrganizationMember",
  "title": "Organization member",
  "description": "The signed-in person the platform already has for the login, an organization user (the owner is one too). The module completes only the missing name and country and records the privacy consent on the person; it never creates a second person, never links another e-mail and shows the login e-mail read-only.",
  "displayField": "details.identification.name",
  "relationships": {
    "country": {
      "relationshipId": "memberCountry",
      "to": "Country",
      "via": "OrganizationMember.countryCode",
      "cardinality": "N:1",
      "title": "Country",
      "description": "The person's country from the module's active country list; never defaulted.",
      "mode": "fk"
    },
    "acceptedVersion": {
      "relationshipId": "memberAcceptedVersion",
      "to": "PrivacyTextVersion",
      "via": "OrganizationMember.details.person.privacyConsent.consentVersion",
      "cardinality": "N:1",
      "title": "Accepted privacy text version",
      "description": "The privacy text version the person accepted, recorded with when and how.",
      "mode": "fk",
      "required": "when the person's country requires privacy consent"
    }
  },
  "capabilities": {
    "read.byId": "Reads the signed-in person resolved by the platform session to open the welcome screen and show what is still missing; also used by the owner to inspect one person.",
    "locate.byLogin": "The platform resolves the session person from the login e-mail so repeating, refreshing or returning from another browser always reaches the same person.",
    "locate.users": "Lists organization users for the owner with name, read-only login e-mail, status and what is missing, searching by name, filtering by status and paginating by cursor.",
    "register.self": "When the signed-in person does not exist yet, the platform self-registration links the login to one Person; the module never creates a second person nor links another e-mail.",
    "accessRequest.read": "Shows the person that another record already uses their e-mail as a contact and that the owner must release the access on the platform, so they can come back later.",
    "edit.platformFields": "Saves only the missing name and country and the explicit privacy acceptance with when, how and the version code, from Complete my access.",
    "locate.byName": "Supports the owner's name search in the organization people list.",
    "statusHistory.read": "Lets the owner see when a person's platform status changed while reviewing organization people.",
    "audit": "Keeps who saved the name, country and consent and when, readable through the platform audit module."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-person-privacy-consent-required-br-eu",
    "noSecondPerson",
    "loginEmailReadOnly",
    "onlyMissingDataAsked",
    "unknownCountryNeverDefaulted",
    "countryFromActiveList",
    "consentFollowsEditedCountry",
    "consentNeverAutoAccepted",
    "reacceptOnNewPrivacyVersion",
    "accessCompleteByPlatformRule",
    "dataEntryGrantsNoAuthority",
    "listingProvesNoInvitation"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "onboarding.OrganizationMember",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "The platform record of the signed-in person, an organization user. The module completes only the missing name and country and records the privacy acceptance.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Person",
                    "title": "Person"
                  }
                ],
                "description": "Always Person for an organization member.",
                "title": "Subtype"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "The person's name. Asked on Complete my access only when the platform does not have it yet; used to search the organization people list.",
                "title": "Name"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Active"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactive"
                  },
                  {
                    "value": "Merged",
                    "title": "Merged"
                  },
                  {
                    "value": "Blocked",
                    "title": "Blocked"
                  }
                ],
                "title": "Status",
                "description": "Platform status of the person, shown and filtered in the organization people list. Never written by the module."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Two-letter ISO code of the person's country, chosen from the module's active country list. Asked only when missing; an unknown country is never replaced by a default, and it decides whether privacy consent is required.",
                "title": "Country"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Created at",
                "description": "When the platform created the person record."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Updated at",
                "description": "When the person record was last saved; lets the screen show what was already saved after a refresh or another browser."
              }
            },
            "description": "Platform index fields of the person, read and completed by the onboarding screens."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform base data of the person. The onboarding module keeps none of it: personal phone and other contacts are not asked here."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "The person's explicit acceptance of the module's current privacy text, recorded when the country requires it. Empty, invalid or revoked consent does not complete access; a valid one for the current version is not asked again.",
                "title": "Privacy consent",
                "fields": {
                  "consentVersion": {
                    "type": "string",
                    "title": "Accepted version",
                    "description": "Version code of the privacy text the person accepted; points at a published privacy text version."
                  },
                  "consentedAt": {
                    "type": "timestamp",
                    "title": "Accepted at",
                    "description": "When the person ticked and saved the acceptance."
                  },
                  "channel": {
                    "type": "string",
                    "title": "How accepted",
                    "description": "How the acceptance was given, such as the explicit checkbox on the Complete my access screen on desktop or mobile."
                  },
                  "revokedAt": {
                    "type": "timestamp",
                    "title": "Revoked at",
                    "description": "When the consent was revoked; a revoked consent does not complete access."
                  }
                }
              }
            },
            "description": "Platform natural-person branch; the module uses only the privacy consent."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Fields promoted by the organization; read only, not declared by this module."
          },
          "onboarding": {
            "type": "object",
            "owner": "module",
            "fields": {
              "loginEmail": {
                "type": "string",
                "derived": true,
                "title": "Login e-mail",
                "description": "The person's login e-mail, read from the platform login and shown read-only; it is never typed nor stored by the module."
              },
              "consentRequired": {
                "type": "boolean",
                "derived": true,
                "title": "Consent required",
                "description": "True when the platform rule says the country being edited requires privacy consent; follows the country on screen, before saving."
              },
              "consentValid": {
                "type": "boolean",
                "derived": true,
                "title": "Consent valid",
                "description": "The person has a privacy acceptance that is not empty, not revoked and was given for the current published privacy text version; an acceptance of an earlier version is no longer valid."
              },
              "missingItems": {
                "type": "text",
                "derived": true,
                "title": "What is still missing",
                "description": "List of minimum data still missing for this person: name, country, or acceptance of the current privacy text when the country requires it; each item says whether the person completes it or the owner must release the access on the platform."
              },
              "accessComplete": {
                "type": "boolean",
                "derived": true,
                "title": "Access complete",
                "description": "Access is complete by the platform rule: name and country filled in and, when the country requires it, a valid consent for the current privacy text version; the screen and the session agree on it after saving."
              }
            },
            "description": "Namespace of the onboarding module. Empty: everything the module needs about the person lives in the platform layers."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OnboardingEntityOrganizationMemberType = typeof onboardingEntityOrganizationMember;

export default onboardingEntityOrganizationMember;
