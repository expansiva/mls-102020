/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/Candidate.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityCandidate = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "Candidate",
  "title": "Candidate",
  "description": "A person who applies to job positions. The name is the platform record; the e-mail is a linked contact channel; the resume link and the source of the candidate are kept in the module namespace. An existing person is reused instead of duplicated.",
  "displayField": "details.identification.name",
  "relationships": {
    "applications": {
      "relationshipId": "applicationCandidate",
      "to": "Application",
      "via": "Application.candidateId",
      "cardinality": "1:N",
      "title": "Applications",
      "description": "The applications this candidate has made to job positions.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "emails": {
      "relationshipId": "candidateEmail",
      "to": "CandidateEmail",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "E-mail",
      "description": "The candidate's e-mail address, a contact channel linked by HasContact.",
      "required": true,
      "role": "HasContact"
    },
    "positions": {
      "relationshipId": "candidatePositions",
      "to": "JobPosition",
      "via": "Application",
      "cardinality": "N:N",
      "title": "Positions applied to",
      "description": "The job positions the candidate applied to, read through the applications.",
      "mode": "throughTable",
      "path": "Candidate -> Application.candidateId -> Application.jobPositionId -> JobPosition",
      "derived": true
    }
  },
  "capabilities": {
    "read.byId": "Loads the candidate by id so the recruiter and the hiring manager see name, e-mail, resume link and source on an application.",
    "locate.byName": "The recruiter searches candidates by name before registering, to reuse an existing one.",
    "locate.byContact": "The recruiter finds an existing candidate by e-mail during registration, so the same person is not duplicated.",
    "locate.byDocument": "When a national document is known, the recruiter finds the candidate by it to deduplicate.",
    "register.createOrAttach": "The recruiter registers a candidate: the person is reused when found by document or e-mail, created otherwise, and tagged hiringPipeline.Candidate.",
    "edit.platformFields": "The recruiter corrects the candidate's name, aliases or privacy consent.",
    "edit.moduleNamespace": "The recruiter updates the candidate's resume link and source.",
    "link.contact": "The recruiter records the candidate's e-mail as a contact channel linked with HasContact.",
    "listLinks": "The candidate screen lists the candidate's e-mail and linked records.",
    "inactivate": "The recruiter inactivates a candidate who should no longer be considered, keeping the history; it can be reactivated.",
    "attach.document": "The recruiter stores a resume file or other document against the candidate when it is not a published link.",
    "comment": "Recruiters and hiring managers leave notes about the candidate.",
    "tag": "The recruiter labels candidates (for example by skill) inside the hiringPipeline namespace.",
    "statusHistory.read": "Shows when the candidate record was inactivated or reactivated, and by whom.",
    "audit": "Shows who changed the candidate's data and when."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-delete-blocked-by-relationships",
    "rule-person-privacy-consent-required-br-eu",
    "candidateEmailRequired",
    "candidateReusedNotDuplicated"
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
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "The platform record of the person who applies to job positions, with the hiringPipeline namespace.",
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
                "description": "Always Person for a candidate.",
                "title": "Subtype"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "The candidate's name as the recruiter registers it; the name shown in application lists.",
                "title": "Full name"
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
                "title": "Record status",
                "description": "Whether the candidate record is in use; an inactive candidate is kept for history."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  "SSN",
                  "EIN",
                  "Passport",
                  "DriversLicense",
                  "NationalId",
                  "CPF",
                  "CNPJ",
                  "VAT",
                  "Other"
                ],
                "title": "Document type",
                "description": "Type of national document, when the recruiter has it; used to avoid duplicate candidates."
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "National document number of the candidate, when known; used for deduplication.",
                "title": "Document number"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Country of the candidate, which decides the document and privacy rules that apply.",
                "title": "Country"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Roles of the record; carries hiringPipeline.Candidate once registered.",
                "title": "Module roles"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Registered at",
                "description": "When the person record was created."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Updated at",
                "description": "When the person record was last changed."
              }
            },
            "description": "How the candidate is recognised and filtered across the organization."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Other names the candidate goes by, such as a maiden name or nickname, helping recruiters find an existing candidate.",
                "title": "Other names"
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Summary of the candidate's contact channels; the candidate's e-mail appears here once linked.",
                "title": "Contacts"
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Compact keys kept by the platform for the candidate's links, including contacts.",
                "title": "Relationship keys"
              },
              "notes": {
                "type": "string",
                "maxLength": 1000,
                "title": "Notes",
                "description": "General remarks about the candidate."
              }
            },
            "description": "What every record has, whatever its subtype."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "The candidate's consent to having personal data processed, required for residents of Brazil and the EU.",
                "title": "Privacy consent"
              }
            },
            "description": "Natural-person data of the platform; the hiring pipeline asks for none of it."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Fields promoted by the organization; read only by this module."
          },
          "hiringPipeline": {
            "type": "object",
            "owner": "module",
            "fields": {
              "resumeLink": {
                "type": "string",
                "required": true,
                "title": "Resume link",
                "description": "Web address where the candidate's resume is published (for example an online profile or a shared document), as given at registration.",
                "pattern": "^https?://\\S+$",
                "maxLength": 2048
              },
              "source": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "careerSite",
                    "title": "Career site"
                  },
                  {
                    "value": "jobBoard",
                    "title": "Job board"
                  },
                  {
                    "value": "linkedIn",
                    "title": "LinkedIn"
                  },
                  {
                    "value": "referral",
                    "title": "Referral"
                  },
                  {
                    "value": "agency",
                    "title": "Agency"
                  },
                  {
                    "value": "event",
                    "title": "Event"
                  },
                  {
                    "value": "other",
                    "title": "Other"
                  }
                ],
                "title": "Source",
                "description": "Where the candidate came from, as recorded by the recruiter."
              }
            },
            "description": "What the hiring pipeline knows about the candidate and nobody else needs."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type HiringPipelineEntityCandidateType = typeof hiringPipelineEntityCandidate;

export default hiringPipelineEntityCandidate;
