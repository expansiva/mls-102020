/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/JobPosition.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityJobPosition = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "JobPosition",
  "title": "Job Position",
  "description": "An opening published by a recruiter with title, department, description, headcount and hiring manager. It is open while hires are below the headcount and closes automatically when the headcount is filled; hires so far and remaining openings are derived from its applications.",
  "displayField": "title",
  "relationships": {
    "hiringManager": {
      "relationshipId": "jobPositionHiringManager",
      "to": "HiringManager",
      "via": "JobPosition.hiringManagerId",
      "cardinality": "N:1",
      "title": "Hiring manager",
      "description": "The hiring manager who owns the position and decides offers and hires for it.",
      "mode": "fk",
      "required": true
    },
    "applications": {
      "relationshipId": "applicationJobPosition",
      "to": "Application",
      "via": "Application.jobPositionId",
      "cardinality": "1:N",
      "title": "Applications",
      "description": "The applications candidates have made to this position.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "candidates": {
      "relationshipId": "candidatePositions",
      "to": "Candidate",
      "via": "Application",
      "cardinality": "N:N",
      "title": "Candidates",
      "description": "The candidates who applied to this position, found through its applications.",
      "mode": "throughTable",
      "path": "Candidate -> Application.candidateId -> Application.jobPositionId -> JobPosition",
      "derived": true,
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Opens one job position by its id, so the recruiter can review the position she just opened and the hiring manager can inspect it while deciding a hire.",
    "locate.byColumn": "Lists positions filtered by status, department or hiring manager and sorted by opening date. The recruiter uses it to find open positions; the hiring manager uses it to list the positions she manages.",
    "locate.byText": "Searches positions by part of the title or department, so the recruiter can find the open position a candidate is applying to.",
    "count": "Counts the positions that match a filter, such as open positions per department or per hiring manager, for list headers.",
    "listByForeignKey": "Lists every position of one hiring manager by hiringManagerId. This is what fills the hiring manager's pipeline view.",
    "create": "The recruiter opens a new position with its title, department, description, headcount and hiring manager, and it starts as open.",
    "update": "The recruiter corrects the title, department, description, headcount or hiring manager of a position.",
    "transition": "The application pipeline moves a position from open to closed once its headcount is filled. The guard for this lives in the module.",
    "transaction": "Writes the hire of an application and the closing of its position together, all or nothing, when that hire fills the headcount.",
    "read.mdmRecord": "Reads the hiring manager's master record that hiringManagerId points at, so position screens can show her name.",
    "comment": "Lets the recruiter and the hiring manager leave notes about a position."
  },
  "rules": [
    "positionHeadcountPositive",
    "closePositionWhenHeadcountFilled",
    "closedPositionAcceptsNoApplications",
    "hireRequiresRemainingOpening",
    "positionRequiresHiringManager"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "hiringPipeline_jobposition",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "title": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Title",
        "description": "Title of the job position. Recruiters and hiring managers search and sort positions by it.",
        "maxLength": 160
      },
      "department": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Department",
        "description": "Department the position belongs to. Position lists are filtered by it.",
        "maxLength": 120
      },
      "hiringManagerId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "HiringManager"
        ],
        "title": "Hiring manager",
        "description": "The hiring manager who decides offers and hires for this position. Her 'my positions' lists use this key."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "open",
            "title": "Open",
            "description": "Taking applications. Hires are still below the headcount."
          },
          {
            "value": "closed",
            "title": "Closed",
            "description": "The headcount is filled, so no new applications are taken."
          }
        ],
        "title": "Status",
        "description": "Whether the position is still taking candidates. It opens when the recruiter creates it and closes automatically once the headcount is filled."
      },
      "openedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Opened at",
        "description": "When the recruiter opened the position. Written by the system when the position is created, and used to sort position lists."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Everything else about the position that nobody filters by.",
        "fields": {
          "description": {
            "type": "text",
            "required": true,
            "title": "Description",
            "description": "Full description of the job: responsibilities, requirements and context."
          },
          "headcount": {
            "type": "integer",
            "required": true,
            "title": "Headcount",
            "description": "How many people this position will hire. The position closes automatically once this many applications have reached hired.",
            "min": 1
          },
          "hiresSoFar": {
            "type": "integer",
            "derived": true,
            "title": "Hires so far",
            "description": "Number of applications to this position that have reached the hired stage."
          },
          "remainingOpenings": {
            "type": "integer",
            "derived": true,
            "title": "Remaining openings",
            "description": "The position's headcount minus its hires so far, never less than zero."
          },
          "headcountFilled": {
            "type": "boolean",
            "derived": true,
            "title": "Headcount filled",
            "description": "True when the hires so far are equal to or greater than the position's headcount."
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "open",
      "reachedBy": "actor"
    },
    {
      "state": "closed",
      "reachedBy": "command"
    }
  ],
  "transitions": [
    {
      "transitionId": "close",
      "from": [
        "open"
      ],
      "to": "closed",
      "by": [],
      "description": "The application pipeline closes the position automatically as soon as hires reach the headcount. No person makes this move.",
      "payload": [],
      "ruleRefs": [
        "closePositionWhenHeadcountFilled"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type HiringPipelineEntityJobPositionType = typeof hiringPipelineEntityJobPosition;

export default hiringPipelineEntityJobPosition;
