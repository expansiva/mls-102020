/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/Candidate.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityCandidate = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "Candidate",
  "title": "Candidate",
  "description": "A person registered or attached as a candidate for job applications in the hiring pipeline.",
  "displayField": "details.identification.name",
  "relationships": {
    "contactChannels": {
      "relationshipId": "candidateHasContact",
      "to": "CandidateContact",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "Candidate contact channels",
      "description": "Contact channels linked to the candidate through the platform HasContact relationship, including the email used for identification and communication.",
      "required": "When the candidate is registered or attached for recruiting",
      "role": "candidate"
    },
    "applications": {
      "relationshipId": "applicationCandidate",
      "to": "Application",
      "via": "Application.candidateId",
      "cardinality": "1:N",
      "title": "Candidate applications",
      "description": "Hiring applications that belong to this candidate.",
      "mode": "fk",
      "direction": "to",
      "required": "When an application is recorded for the candidate",
      "role": "candidate"
    }
  },
  "capabilities": {
    "read.byId": "Reads a candidate master record by its MDM identifier through the indexed record lookup for recruiters and hiring managers reviewing an application.",
    "locate.byName": "Finds candidates by typed name through the Person name index for recruiters registering or selecting a candidate.",
    "locate.byDocument": "Finds a candidate by national document during create-or-attach deduplication for recruiters.",
    "locate.byContact": "Finds the candidate owning an email or other contact channel for recruiters before registration and when starting an application.",
    "register.createOrAttach": "Creates a Person record when absent or attaches the existing person to the Candidate role by document or contact lookup for recruiters registering candidates.",
    "edit.platformFields": "Updates platform-owned candidate identification data through the master-record update route for recruiters maintaining candidate information.",
    "edit.moduleNamespace": "Updates the hiringPipeline recruitment source in the candidate module namespace for recruiters maintaining recruitment information.",
    "inactivate": "Inactivates or reactivates a candidate master record through the platform status action for recruiters when the record should no longer be used.",
    "link.contact": "Creates or links a ContactChannel through HasContact so the candidate has an email for identification and communication, used by recruiters.",
    "listLinks": "Lists the candidate's contact-channel and application-related links through the relationship service for recruiters and hiring managers reviewing the candidate.",
    "attach.document": "Stores and retrieves the candidate's resume as a platform-managed attachment by category for recruiters and hiring managers reviewing qualifications.",
    "audit": "Shows the platform audit trail of candidate master-data changes for authorized recruiters and hiring managers."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu",
    "candidateRequiresEmailContact"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "hiringPipeline.Candidate",
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
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Master person record used as a candidate in the hiring pipeline.",
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
                    "title": "Person",
                    "description": "A natural person."
                  }
                ],
                "description": "Platform subtype identifying this master record as a person.",
                "title": "Record subtype",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Name used by recruiters to identify the candidate.",
                "title": "Candidate name",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Active",
                    "description": "The record is active."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactive",
                    "description": "The record is inactive."
                  },
                  {
                    "value": "Merged",
                    "title": "Merged",
                    "description": "The record was merged into another master record."
                  },
                  {
                    "value": "Blocked",
                    "title": "Blocked",
                    "description": "The record is blocked by the platform."
                  }
                ],
                "title": "Master record status",
                "description": "Platform status that determines whether the candidate master record is active.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "SSN",
                    "title": "SSN",
                    "description": "United States Social Security Number."
                  },
                  {
                    "value": "EIN",
                    "title": "EIN",
                    "description": "United States Employer Identification Number."
                  },
                  {
                    "value": "Passport",
                    "title": "Passport",
                    "description": "Passport."
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Driver's license",
                    "description": "Driver's license."
                  },
                  {
                    "value": "NationalId",
                    "title": "National ID",
                    "description": "National identity document."
                  },
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Brazilian individual taxpayer registry."
                  },
                  {
                    "value": "CNPJ",
                    "title": "CNPJ",
                    "description": "Brazilian company registry."
                  },
                  {
                    "value": "VAT",
                    "title": "VAT",
                    "description": "VAT registration."
                  },
                  {
                    "value": "Other",
                    "title": "Other",
                    "description": "Another document type."
                  }
                ],
                "title": "Document type",
                "description": "National document type, when supplied to deduplicate the candidate.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "National document number, when supplied to deduplicate the candidate.",
                "title": "Document number",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Country that governs the candidate's document and applicable privacy rules.",
                "title": "Country code",
                "min": 0,
                "max": 0
              }
            },
            "description": "Platform identification data used to recognize and maintain the candidate."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Platform-derived summaries of contact channels linked to the candidate, including the email used for identification and communication.",
                "title": "Contact channels",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Platform-managed base data used by the hiring pipeline."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform person data; the hiring pipeline does not require additional person fields for a candidate."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Organization-promoted data that the hiring pipeline may read but does not define."
          },
          "hiringPipeline": {
            "type": "object",
            "owner": "module",
            "fields": {
              "source": {
                "type": "string",
                "required": true,
                "of": "Address",
                "title": "Recruitment source",
                "description": "How the candidate was sourced for recruitment, such as a referral, job board, agency, or careers site.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Hiring-pipeline-specific information about this candidate."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type HiringPipelineEntityCandidateType = typeof hiringPipelineEntityCandidate;

export default hiringPipelineEntityCandidate;
