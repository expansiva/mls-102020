/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/CandidateEmail.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityCandidateEmail = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "CandidateEmail",
  "title": "Candidate e-mail",
  "description": "The e-mail address of a candidate, kept as a contact channel record linked to the candidate and used to find an existing candidate.",
  "displayField": "details.identification.name",
  "relationships": {
    "candidate": {
      "relationshipId": "candidateEmail",
      "to": "Candidate",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Candidate who owns this e-mail",
      "description": "HasContact link from the candidate to this e-mail record.",
      "direction": "to",
      "required": true,
      "role": "email"
    }
  },
  "capabilities": {
    "read.byId": "Reads the candidate's e-mail record by id when the candidate screen shows its contacts; used by recruiters and hiring managers.",
    "locate.byContact": "Finds the candidate who already owns a typed e-mail address, so the recruiter does not register the same candidate twice.",
    "register.createOrAttach": "Creates the e-mail record when the address is new, or attaches the hiringPipeline role to the existing one, when the recruiter registers a candidate.",
    "edit.platformFields": "Lets the recruiter correct the candidate's e-mail address or its verification flag.",
    "inactivate": "Takes an e-mail address the candidate no longer uses out of use without deleting it; the recruiter can reactivate it.",
    "link": "Links the e-mail record to its candidate with HasContact when the recruiter registers the candidate.",
    "unlink": "Closes the HasContact link when the address no longer belongs to the candidate, keeping its history.",
    "listLinks": "Shows which candidate the e-mail belongs to, on the candidate screen.",
    "audit": "Shows who changed the candidate's e-mail address and when."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-contact-value-unique-per-type",
    "rule-delete-blocked-by-relationships",
    "rule-document-shape-validated"
  ],
  "kind": "role",
  "subtype": "ContactChannel",
  "roleTag": "hiringPipeline.CandidateEmail",
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
                "description": "Always ContactChannel for a candidate e-mail.",
                "title": "Subtype"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "How recruiters recognise this e-mail record, usually the address itself.",
                "title": "Label"
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
                "description": "Whether this e-mail is still in use for the candidate."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "ISO 3166-1 alpha-2 country the record belongs to.",
                "title": "Country"
              }
            },
            "description": "Index columns of the contact channel record."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform base data of the record; nothing kept for this role."
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
                    "value": "Email",
                    "title": "E-mail"
                  }
                ],
                "title": "Contact type",
                "description": "Always an e-mail for a candidate e-mail."
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "The candidate's e-mail address, used to find an existing candidate before registering a new one.",
                "title": "E-mail address",
                "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
                "maxLength": 254
              },
              "isVerified": {
                "type": "boolean",
                "required": true,
                "title": "Verified",
                "description": "Whether the candidate's e-mail address has been verified."
              },
              "verifiedAt": {
                "type": "timestamp",
                "title": "Verified at",
                "description": "When the e-mail address was verified."
              }
            },
            "description": "The candidate's e-mail address as a contact channel."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Fields promoted by the organization; read only."
          },
          "hiringPipeline": {
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

export type HiringPipelineEntityCandidateEmailType = typeof hiringPipelineEntityCandidateEmail;

export default hiringPipelineEntityCandidateEmail;
