/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/JobPosition.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityJobPosition = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "JobPosition",
  "title": "Job Position",
  "description": "An approved hiring need opened for applications, with a responsible hiring manager and a defined headcount.",
  "displayField": "title",
  "relationships": {
    "hiringManager": {
      "relationshipId": "jobPositionHiringManager",
      "to": "HiringManager",
      "via": "JobPosition.hiringManagerId",
      "cardinality": "N:1",
      "title": "Responsible hiring manager",
      "description": "The hiring manager assigned to this position and authorized to decide offers and hiring outcomes.",
      "mode": "fk",
      "required": "when the job position is opened"
    },
    "applications": {
      "relationshipId": "applicationJobPosition",
      "to": "Application",
      "via": "Application.jobPositionId",
      "cardinality": "1:N",
      "title": "Applications",
      "description": "The applications submitted for this job position.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads a job position by its row id so recruiters and hiring managers can review its hiring need.",
    "locate.byColumn": "Lists job positions by indexed status or responsible hiring manager so recruiters find open positions and hiring managers find positions they manage.",
    "locate.byText": "Finds job positions by text in the indexed title so recruiters can locate a position by name.",
    "count": "Counts job positions matching a status or responsible hiring manager filter for hiring pipeline lists.",
    "listByForeignKey": "Lists job positions for a responsible hiring manager through the hiring manager foreign key.",
    "create": "Creates an open job position with its title, department, description, headcount, and responsible hiring manager when a recruiter opens a hiring need.",
    "update": "Updates the maintained details of an open job position when a recruiter needs to correct its hiring need information.",
    "transition": "Moves an open job position to closed through the automatic filled-headcount process.",
    "read.mdmRecord": "Reads the responsible hiring manager master record from the hiring manager foreign key for position review and decision scope."
  },
  "rules": [
    "closePositionWhenHeadcountFilled"
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
        "of": "Address",
        "title": "Job title",
        "description": "The title used to identify the job position in lists and searches.",
        "maxLength": 200,
        "min": 0,
        "max": 0
      },
      "hiringManagerId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "HiringManager"
        ],
        "title": "Responsible hiring manager",
        "description": "The hiring manager responsible for offers and hiring decisions for this position.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "Address",
        "values": [
          {
            "value": "open",
            "title": "Open",
            "description": "The position is available for applications."
          },
          {
            "value": "closed",
            "title": "Closed",
            "description": "The position is closed after its headcount is filled."
          }
        ],
        "title": "Position status",
        "description": "Whether the job position is open for applications or closed because its headcount has been filled.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Job position details",
        "description": "The descriptive information and hiring need for this job position.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "department": {
            "type": "string",
            "required": true,
            "of": "Address",
            "title": "Department",
            "description": "The department requesting this job position.",
            "maxLength": 200,
            "min": 0,
            "max": 0
          },
          "description": {
            "type": "text",
            "required": true,
            "of": "Address",
            "title": "Position description",
            "description": "The responsibilities and requirements of the job position.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "headcount": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Headcount",
            "description": "The number of candidates to hire for this position.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          },
          "filledHeadcount": {
            "type": "integer",
            "derived": true,
            "title": "Filled headcount",
            "description": "The number of applications for this position that are in the hired stage."
          },
          "remainingHeadcount": {
            "type": "integer",
            "derived": true,
            "title": "Remaining headcount",
            "description": "The job position headcount minus the number of applications for this position that are in the hired stage."
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
      "transitionId": "closeFilledPosition",
      "from": [
        "open"
      ],
      "to": "closed",
      "by": [],
      "description": "Close the job position automatically when the required headcount has been hired.",
      "ruleRefs": [
        "closePositionWhenHeadcountFilled"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type HiringPipelineEntityJobPositionType = typeof hiringPipelineEntityJobPosition;

export default hiringPipelineEntityJobPosition;
