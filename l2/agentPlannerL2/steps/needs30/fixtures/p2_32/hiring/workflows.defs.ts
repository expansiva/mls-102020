/// <mls fileReference="_102047_/l4/hiringPipeline/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "hiringPipeline",
  "processes": [
    {
      "processId": "applicationDecisionProcess",
      "title": "Application decision process",
      "description": "Coordinates hiring-manager decisions after an application reaches interview and routes declined applications to the recruiter for closure.",
      "trigger": {
        "kind": "event",
        "event": "Application.moveToInterview"
      },
      "tasks": [
        {
          "taskId": "decideOffer",
          "kind": "human",
          "actorRef": "hiringManager",
          "journeyRef": "decideOffer",
          "next": [
            "decideHiringOutcome",
            "recordApplicationRejection"
          ],
          "description": "The hiring manager decides whether to make an offer, advancing successful applications or referring declined applications for rejection recording."
        },
        {
          "taskId": "decideHiringOutcome",
          "kind": "human",
          "actorRef": "hiringManager",
          "journeyRef": "decideHiringOutcome",
          "next": [
            "recordApplicationRejection"
          ],
          "description": "The hiring manager decides the outcome of an offered application and refers any declined application for rejection recording."
        },
        {
          "taskId": "recordApplicationRejection",
          "kind": "human",
          "actorRef": "recruiter",
          "journeyRef": "recordApplicationRejection",
          "next": [],
          "description": "The recruiter records the rejection reason and closes the declined application."
        }
      ]
    },
    {
      "processId": "closeFilledPositionProcess",
      "title": "Close filled job position",
      "description": "Automatically closes a job position when a hire fills its required headcount.",
      "trigger": {
        "kind": "event",
        "event": "Application.moveToHired"
      },
      "tasks": [
        {
          "taskId": "closeFilledPosition",
          "kind": "mechanical",
          "entityRef": "JobPosition",
          "effect": "transition",
          "transitionRef": "closeFilledPosition",
          "next": [],
          "description": "The system closes the related job position when its filled headcount reaches the required headcount."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "openJobPosition",
      "inProcess": false
    },
    {
      "journeyId": "registerCandidate",
      "inProcess": false
    },
    {
      "journeyId": "startApplicationScreening",
      "inProcess": false
    },
    {
      "journeyId": "advanceApplicationToInterview",
      "inProcess": false
    },
    {
      "journeyId": "decideOffer",
      "inProcess": true,
      "processId": "applicationDecisionProcess"
    },
    {
      "journeyId": "decideHiringOutcome",
      "inProcess": true,
      "processId": "applicationDecisionProcess"
    },
    {
      "journeyId": "recordApplicationRejection",
      "inProcess": true,
      "processId": "applicationDecisionProcess"
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type HiringPipelineWorkflowsType = typeof hiringPipelineWorkflows;

export default hiringPipelineWorkflows;
