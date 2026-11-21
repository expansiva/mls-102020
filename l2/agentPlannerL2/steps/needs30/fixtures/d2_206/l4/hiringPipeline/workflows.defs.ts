/// <mls fileReference="_102047_/l4/hiringPipeline/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "hiringPipeline",
  "processes": [
    {
      "processId": "applicationPipeline",
      "title": "Application hiring pipeline",
      "description": "An application moves from the recruiter's registration and screening through the interview, then to the hiring manager's offer and hire decisions, and ends as hired or rejected with a reason.",
      "trigger": {
        "kind": "manual",
        "actorRef": "recruiter"
      },
      "tasks": [
        {
          "taskId": "registerApplication",
          "kind": "human",
          "actorRef": "recruiter",
          "journeyRef": "registerCandidateApplication",
          "next": [
            "moveToInterview",
            "rejectApplication"
          ],
          "description": "The recruiter registers the candidate and records the application to an open position, which starts in screening."
        },
        {
          "taskId": "moveToInterview",
          "kind": "human",
          "actorRef": "recruiter",
          "journeyRef": "advanceToInterview",
          "next": [
            "decideOffer",
            "rejectApplication"
          ],
          "description": "The recruiter moves the screened application to interview and, once the interview is done, hands it to the position's hiring manager."
        },
        {
          "taskId": "decideOffer",
          "kind": "human",
          "actorRef": "hiringManager",
          "journeyRef": "decideOffer",
          "next": [
            "decideHire",
            "rejectApplication"
          ],
          "description": "The hiring manager decides whether the interviewed candidate gets an offer, or sends the application back to the recruiter to be rejected."
        },
        {
          "taskId": "decideHire",
          "kind": "human",
          "actorRef": "hiringManager",
          "journeyRef": "decideHire",
          "next": [
            "closeFilledPosition",
            "rejectApplication"
          ],
          "description": "The hiring manager decides whether the candidate in the offer stage is hired, or sends the application back to the recruiter to be rejected."
        },
        {
          "taskId": "closeFilledPosition",
          "kind": "mechanical",
          "entityRef": "JobPosition",
          "effect": "transition",
          "transitionRef": "close",
          "next": [],
          "description": "Once a hire fills the position's headcount, the system closes the job position automatically."
        },
        {
          "taskId": "rejectApplication",
          "kind": "human",
          "actorRef": "recruiter",
          "journeyRef": "rejectApplication",
          "next": [],
          "description": "The recruiter rejects the application that will not move forward and records the reason."
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
      "journeyId": "registerCandidateApplication",
      "inProcess": true,
      "processId": "applicationPipeline"
    },
    {
      "journeyId": "advanceToInterview",
      "inProcess": true,
      "processId": "applicationPipeline"
    },
    {
      "journeyId": "rejectApplication",
      "inProcess": true,
      "processId": "applicationPipeline"
    },
    {
      "journeyId": "decideOffer",
      "inProcess": true,
      "processId": "applicationPipeline"
    },
    {
      "journeyId": "decideHire",
      "inProcess": true,
      "processId": "applicationPipeline"
    },
    {
      "journeyId": "reviewMyPipeline",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type HiringPipelineWorkflowsType = typeof hiringPipelineWorkflows;

export default hiringPipelineWorkflows;
