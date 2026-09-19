/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const hiringPipelineOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "businessDomain": "Hiring pipeline management for job positions and candidate applications.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "hiringPipeline",
    "description": "Branch details.hiringPipeline of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Candidate",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "CandidateContact",
      "kind": "role",
      "subtype": "ContactChannel"
    },
    {
      "entityId": "HiringManager",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "JobPosition",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Application",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "candidateHasContact",
      "from": "Candidate",
      "to": "CandidateContact",
      "type": "oneToMany",
      "required": true,
      "mode": "mdmRelationship",
      "description": "A candidate has one or more contact channels, including the email used for identification and communication.",
      "catalogType": "HasContact"
    },
    {
      "relationshipId": "jobPositionHiringManager",
      "from": "JobPosition",
      "to": "HiringManager",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Each job position is assigned to one responsible hiring manager, who decides offers and hiring outcomes.",
      "field": "JobPosition.hiringManagerId"
    },
    {
      "relationshipId": "applicationCandidate",
      "from": "Application",
      "to": "Candidate",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Each application belongs to the candidate who applied for the position.",
      "field": "Application.candidateId"
    },
    {
      "relationshipId": "applicationJobPosition",
      "from": "Application",
      "to": "JobPosition",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Each application is submitted for one job position.",
      "field": "Application.jobPositionId"
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type HiringPipelineOntologyIndexType = typeof hiringPipelineOntologyIndex;

export default hiringPipelineOntologyIndex;
