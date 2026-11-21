/// <mls fileReference="_102039_/l4/onboarding/ontology/CompanyContact.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingEntityCompanyContact = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "onboarding",
  "entityId": "CompanyContact",
  "title": "Company contact",
  "description": "The contact channel that belongs to the company, linked by HasContact; saving again does not duplicate it.",
  "displayField": "details.identification.name",
  "relationships": {
    "company": {
      "relationshipId": "companyHasContact",
      "to": "OrganizationCompany",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Company that owns this contact",
      "description": "The company this contact channel belongs to, linked by HasContact; repeating the save does not duplicate the link.",
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Reads the company contact by its id when the prepare-the-company screen loads the contacts already linked to the company, so the owner is not asked again.",
    "locate.byContact": "Finds an existing contact channel with the same type and value before saving, so repeating the prepare-the-company save reuses it instead of creating a duplicate.",
    "register.createOrAttach": "Creates the company contact channel only when no channel with that type and value exists, and attaches the onboarding role tag; used by the company owner when preparing the company.",
    "edit.platformFields": "Lets the company owner correct the type or value of the company contact while preparing the company.",
    "link": "Links the contact channel to the company with HasContact when the owner saves it, only once per company.",
    "listLinks": "Lists the contact channels linked to the company so the prepare-the-company screen shows what is already saved and what is missing.",
    "unlink": "Closes the HasContact link when the owner replaces the company contact, keeping its history.",
    "inactivate": "Takes a company contact out of use without deleting it, at the owner's request."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-contact-value-unique-per-type",
    "rule-document-shape-validated",
    "rule-delete-blocked-by-relationships",
    "companyContactNotDuplicated",
    "onlyOwnerPreparesCompany",
    "unknownCountryNeverDefaulted"
  ],
  "kind": "role",
  "subtype": "ContactChannel",
  "roleTag": "onboarding.CompanyContact",
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
        "description": "The JSONB document, as a map of groups (see groups).",
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
                    "value": "ContactChannel",
                    "title": "Contact channel"
                  }
                ],
                "description": "Always ContactChannel for the company contact.",
                "title": "Subtype"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "How the company contact is recognised in the onboarding screen, such as the main company e-mail or phone.",
                "title": "Contact name"
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
                "description": "Platform status of the company contact; an inactive contact is not shown as the company contact."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "ISO 3166-1 alpha-2 country of the company contact, taken from the company country chosen in the module country list; never replaced by a default.",
                "title": "Country"
              }
            },
            "description": "Platform identification of the company contact channel."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform base data of the contact; nothing of it is asked in onboarding."
          },
          "contactChannel": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contactType": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "Phone",
                    "title": "Phone"
                  },
                  {
                    "value": "Email",
                    "title": "E-mail"
                  },
                  {
                    "value": "WhatsApp",
                    "title": "WhatsApp"
                  }
                ],
                "title": "Contact type",
                "description": "Kind of company contact the owner provides."
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "The company phone, e-mail or WhatsApp number; saving again with the same type and value reuses the existing contact instead of duplicating it.",
                "title": "Contact"
              },
              "isVerified": {
                "type": "boolean",
                "required": true,
                "title": "Verified",
                "description": "Whether the platform has verified this company contact; read-only in onboarding."
              }
            },
            "description": "The contact that belongs to the company, asked when preparing the company."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Fields promoted by the organization; read only."
          },
          "onboarding": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OnboardingEntityCompanyContactType = typeof onboardingEntityCompanyContact;

export default onboardingEntityCompanyContact;
