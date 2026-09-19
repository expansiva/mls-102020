/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/HiringManager.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityHiringManager = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "HiringManager",
  "title": "Hiring Manager",
  "description": "A person responsible for a job position and authorized to decide its offers and hiring outcomes.",
  "displayField": "details.identification.name",
  "relationships": {
    "jobPositions": {
      "relationshipId": "jobPositionHiringManager",
      "to": "JobPosition",
      "via": "JobPosition.hiringManagerId",
      "cardinality": "1:N",
      "title": "Job positions managed",
      "description": "Job positions for which this hiring manager is the responsible decision-maker for offers and hiring outcomes.",
      "mode": "fk",
      "direction": "to",
      "required": "Never; a hiring manager may be registered before being assigned to a job position.",
      "role": "responsible hiring manager"
    }
  },
  "capabilities": {
    "read.byId": "Reads a hiring manager by known master-record id through the MDM index and document store for recruiters and hiring managers viewing a responsible manager.",
    "locate.byName": "Finds a hiring manager by typed name through the Person name index for recruiters assigning a manager to a job position.",
    "locate.byTag": "Lists people carrying the hiringPipeline.HiringManager role tag through the indexed MDM tag lookup for recruiters choosing an eligible hiring manager.",
    "register.createOrAttach": "Creates a Person when absent or attaches the Hiring Manager role to the existing person through document or contact matching for recruiters setting up position responsibility.",
    "edit.platformFields": "Updates platform-owned identification data through the MDM person update route for recruiters maintaining a hiring manager record.",
    "inactivate": "Inactivates or reactivates the hiring-manager master record through the platform status operation for recruiters when the person must no longer be assigned to positions.",
    "statusHistory.read": "Shows master-record status changes through MDM status history for recruiters reviewing whether a hiring manager is active.",
    "audit": "Shows who changed the hiring-manager master record and when through the MDM audit log for recruiters investigating record maintenance."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
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
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Platform person record read by the hiring pipeline for a person who manages job positions.",
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
                "description": "Platform-derived subtype identifying this master record as a person.",
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
                "description": "Name used by recruiters to identify the hiring manager when assigning responsibility for a job position.",
                "title": "Name",
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
                    "description": "The person is active."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactive",
                    "description": "The person is inactive."
                  },
                  {
                    "value": "Merged",
                    "title": "Merged",
                    "description": "The record was merged into another person."
                  },
                  {
                    "value": "Blocked",
                    "title": "Blocked",
                    "description": "The person is blocked."
                  }
                ],
                "title": "Status",
                "description": "Platform-derived master-record status that indicates whether this hiring manager can be used.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Platform identification data used to recognize the hiring manager."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform base data for the person; no base fields are specific to the hiring-manager role."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Platform natural-person data; no person fields beyond identification are used by this role."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Organization-promoted data read from the platform registry; this module does not declare fields here."
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

export type HiringPipelineEntityHiringManagerType = typeof hiringPipelineEntityHiringManager;

export default hiringPipelineEntityHiringManager;
