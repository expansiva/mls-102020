/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/CandidateContact.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityCandidateContact = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "CandidateContact",
  "title": "Candidate Contact Channel",
  "description": "A contact channel linked to a candidate, including the email used to identify and communicate with the candidate.",
  "displayField": "details.contactChannel.value",
  "relationships": {
    "candidate": {
      "relationshipId": "candidateHasContact",
      "to": "Candidate",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Candidate owner",
      "description": "The candidate who owns this email contact channel through the platform HasContact relationship.",
      "direction": "to",
      "required": "always",
      "role": "Has contact"
    }
  },
  "capabilities": {
    "read.byId": "Reads a candidate email contact channel by its master-data id through indexed retrieval for recruiters and hiring managers viewing candidate information.",
    "locate.byContact": "Finds the contact channel that owns a supplied email through the platform contact lookup so recruiters can avoid registering the same candidate email twice.",
    "register.createOrAttach": "Creates an email contact channel when absent or attaches the hiringPipeline candidate-contact role when it already exists, using the email value, for recruiters registering candidates.",
    "edit.platformFields": "Updates the platform-owned name or email contact data for an active candidate contact channel through the master-data update route for recruiters maintaining candidate records.",
    "inactivate": "Inactivates or reactivates a candidate email contact channel through its platform status for recruiters when the email must no longer be used.",
    "link": "Links a candidate contact channel to its candidate with the versioned HasContact relationship for recruiters registering or maintaining candidates.",
    "unlink": "Closes the candidate-to-contact HasContact relationship while preserving its history for recruiters correcting a candidate record.",
    "listLinks": "Lists the candidate relationship and its validity for a candidate contact channel on candidate record screens used by recruiters and hiring managers.",
    "audit": "Shows the platform audit trail of changes to a candidate email contact channel for authorized hiring-pipeline administrators."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-contact-value-unique-per-type"
  ],
  "kind": "role",
  "subtype": "ContactChannel",
  "roleTag": "hiringPipeline.CandidateContact",
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
        "description": "Master-data contact channel used to identify and communicate with a candidate in the hiring pipeline.",
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
                    "title": "Contact channel",
                    "description": "A platform contact-channel master record."
                  }
                ],
                "description": "Platform-derived subtype identifying this master record as a contact channel.",
                "title": "Record subtype",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 255,
                "description": "Human-readable name for the candidate email contact channel.",
                "title": "Contact channel name",
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
                    "description": "The contact channel is available for use."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactive",
                    "description": "The contact channel is no longer used."
                  },
                  {
                    "value": "Merged",
                    "title": "Merged",
                    "description": "The contact channel was merged into another master record."
                  },
                  {
                    "value": "Blocked",
                    "title": "Blocked",
                    "description": "The contact channel is blocked by the platform."
                  }
                ],
                "title": "MDM status",
                "description": "Platform-managed activity status of the candidate contact channel.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Platform identification data for this contact channel."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform base data; this role does not use additional base fields."
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
                    "title": "Email",
                    "description": "An email address used to identify and communicate with the candidate."
                  }
                ],
                "title": "Contact type",
                "description": "The channel type used to communicate with the candidate; this role uses email only.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "Email address used to identify and communicate with the candidate.",
                "title": "Candidate email address",
                "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
                "maxLength": 254,
                "min": 0,
                "max": 0
              }
            },
            "description": "Platform contact-channel data for the candidate email."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Organization-promoted data read by this module; its schema is managed by the organization."
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
} as const satisfies Ns5OntologyEntityV3;

export type HiringPipelineEntityCandidateContactType = typeof hiringPipelineEntityCandidateContact;

export default hiringPipelineEntityCandidateContact;
