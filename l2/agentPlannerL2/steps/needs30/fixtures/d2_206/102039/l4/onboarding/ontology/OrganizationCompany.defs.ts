/// <mls fileReference="_102039_/l4/onboarding/ontology/OrganizationCompany.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const onboardingEntityOrganizationCompany = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "onboarding",
  "entityId": "OrganizationCompany",
  "title": "Organization company",
  "description": "The company the platform already has for the signed-in login. The owner completes the missing name, legal name, country, document, address and contact; the company is prepared only when all required data is saved.",
  "displayField": "details.identification.name",
  "relationships": {
    "country": {
      "relationshipId": "companyCountry",
      "to": "Country",
      "via": "OrganizationCompany.countryCode",
      "cardinality": "N:1",
      "title": "Company country",
      "description": "The company's country, chosen from the module country list; never defaulted.",
      "mode": "fk"
    },
    "contacts": {
      "relationshipId": "companyHasContact",
      "to": "CompanyContact",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "Company contact",
      "description": "The contact channel that belongs to this company; repeating the save does not duplicate it."
    }
  },
  "capabilities": {
    "read.byId": "Reads the company the platform already has for the signed-in login by its id, so the owner sees what exists and what is missing on the preparation screen.",
    "edit.platformFields": "Saves the missing name, legal name, country, document and address of the company through the platform update; used by the company owner when preparing the company.",
    "link.contact": "Creates or reuses the company's contact channel and links it with HasContact, so saving again does not duplicate it; used by the company owner.",
    "listLinks": "Lists the contact channels already linked to the company so the preparation screen shows the existing contact instead of asking again.",
    "locate.byDocument": "Checks the typed company document against the platform before saving, so the owner is told when another record already holds it.",
    "audit": "Shows who changed the company data during preparation and when, through the platform audit.",
    "onboarding.companyReadiness": "Computes which required company data are still missing and whether the company is prepared; shown to the owner, while a member sees that only the owner can prepare it.",
    "onboarding.studioGuidance": "Once the company is prepared, shows the fixed guidance text with the link to create the first module in Studio; nothing about the modules is stored."
  },
  "rules": [
    "rule-company-legal-name-required",
    "rule-company-ein-unique-for-us",
    "rule-identity-never-in-namespace",
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "onlyOwnerPreparesCompany",
    "companyCountryNeverDefaulted",
    "companyContactNotDuplicated",
    "companyPreparedWhenRequiredSaved",
    "companyNotAskedAgainForExistingData",
    "authorityErrorDistinctFromValidation"
  ],
  "kind": "role",
  "subtype": "Company",
  "roleTag": "onboarding.OrganizationCompany",
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
        "description": "The company record the platform already has for the signed-in login, completed by the owner in onboarding.",
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
                    "value": "Company",
                    "title": "Company"
                  }
                ],
                "description": "Always Company for this role.",
                "title": "Subtype"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "The name people recognize the company by; asked only when the platform does not have it yet.",
                "title": "Company name"
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
                "description": "Platform status of the company record; read only in onboarding."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "EIN",
                    "title": "EIN"
                  },
                  {
                    "value": "CNPJ",
                    "title": "CNPJ"
                  },
                  {
                    "value": "VAT",
                    "title": "VAT"
                  },
                  {
                    "value": "NationalId",
                    "title": "National ID"
                  },
                  {
                    "value": "Other",
                    "title": "Other"
                  }
                ],
                "title": "Document type",
                "description": "Type of the company's national document (for example CNPJ, EIN, VAT); required to consider the company prepared."
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "The company's national document number; asked only when the platform does not have it yet.",
                "title": "Document number"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Two-letter ISO code of the company country, chosen from the module country list; an unknown country is never replaced by a default.",
                "title": "Company country"
              }
            },
            "description": "Platform identification of the company; onboarding only fills what is still missing."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "addresses": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "Address",
                "title": "Addresses",
                "description": "The company address completed during preparation; required to consider the company prepared."
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Summary of the contact channels linked to this company; the contact itself is a CompanyContact record and saving again does not duplicate it.",
                "title": "Contacts"
              }
            },
            "description": "Platform base data of the company used by onboarding."
          },
          "company": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "companyKind": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "LegalEntity",
                    "title": "Legal entity"
                  }
                ],
                "description": "The organization's company is a legal entity.",
                "title": "Company kind"
              },
              "legalName": {
                "type": "string",
                "required": true,
                "description": "Official registered name of the company; usually missing at first and asked during preparation.",
                "title": "Legal name"
              }
            },
            "description": "Company-specific platform data used by onboarding."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Fields promoted by the organization; read only here."
          },
          "onboarding": {
            "type": "object",
            "owner": "module",
            "fields": {
              "missingData": {
                "type": "string",
                "derived": true,
                "title": "Missing data",
                "description": "List of the required company data still not saved: name, legal name, country, document, address or contact."
              },
              "isPrepared": {
                "type": "boolean",
                "derived": true,
                "title": "Company prepared",
                "description": "True only when name, legal name, country, document, address and a contact of this company are all saved."
              }
            },
            "description": "Onboarding namespace; nothing of its own is stored about the company."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OnboardingEntityOrganizationCompanyType = typeof onboardingEntityOrganizationCompany;

export default onboardingEntityOrganizationCompany;
