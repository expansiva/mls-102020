/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/HiringManager.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityHiringManager = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "HiringManager",
  "title": "Hiring Manager",
  "description": "The person who manages a job position and decides offers and hires for its applications. Her positions and their applications are scoped to her through the position's hiring manager.",
  "displayField": "details.identification.name",
  "relationships": {
    "jobPositions": {
      "relationshipId": "jobPositionHiringManager",
      "to": "JobPosition",
      "via": "JobPosition.hiringManagerId",
      "cardinality": "1:N",
      "title": "Managed job positions",
      "description": "The job positions this person manages; each position has exactly one hiring manager, and her positions and their applications are scoped to her through it.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads the hiring manager by mdmId to show her name on job positions and applications, for recruiters and hiring managers.",
    "locate.byName": "Finds a hiring manager by typed name when a recruiter assigns the manager of a job position.",
    "locate.byLogin": "Resolves the signed-in hiring manager from her login e-mail so her positions and applications are scoped to her.",
    "register.createOrAttach": "Creates the person when absent and attaches the hiringPipeline.HiringManager role, when a recruiter names a manager for a position.",
    "edit.platformFields": "Lets a recruiter correct the hiring manager's name and other platform fields.",
    "inactivate": "Takes a hiring manager out of use so she is no longer offered for new positions, and reactivates her when needed; used by recruiters.",
    "link.contact": "Adds an e-mail or phone of the hiring manager as a ContactChannel linked by HasContact, maintained by recruiters.",
    "listLinks": "Shows the hiring manager's level-1 relationships and contacts on her record screen.",
    "invite.login": "Gives the hiring manager a login so she can decide offers and hires on her own positions; issued by a recruiter.",
    "comment": "Lets recruiters leave notes on the hiring manager's record.",
    "audit": "Shows who changed the hiring manager's record and when, for an administrator."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-delete-blocked-by-relationships",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "hiringPipeline.HiringManager",
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
        "description": "The master record of the person who manages job positions, as the platform stores it.",
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
                "description": "Always Person for a hiring manager.",
                "title": "Subtype"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Full name of the hiring manager, shown when choosing the manager of a job position.",
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
                "description": "Whether this manager is active; an inactive manager is not offered for new positions."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Country whose legal rules apply to this person (ISO 3166-1 alpha-2).",
                "title": "Country"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Module roles of the record, including hiringPipeline.HiringManager.",
                "title": "Module roles"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Created at",
                "description": "When the record was created."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Updated at",
                "description": "When the record was last changed."
              }
            },
            "description": "Platform identification of the hiring manager."
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
                "description": "Summary of the contact channels linked to the hiring manager, used to reach her about decisions.",
                "title": "Contacts"
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Compact keys recomputed by the engine on every link and unlink.",
                "title": "Relationship keys"
              }
            },
            "description": "What every record carries; here only the derived contact summary is read."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Natural-person branch; nothing in it is needed by this module."
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

export type HiringPipelineEntityHiringManagerType = typeof hiringPipelineEntityHiringManager;

export default hiringPipelineEntityHiringManager;
