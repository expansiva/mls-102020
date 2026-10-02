/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/Application.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityApplication = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "Application",
  "title": "Application",
  "description": "A candidate's application to a job position, progressed through screening, interview, offer, hiring, or rejection.",
  "displayField": "id",
  "relationships": {
    "candidate": {
      "relationshipId": "applicationCandidate",
      "to": "Candidate",
      "via": "Application.candidateId",
      "cardinality": "N:1",
      "title": "Applicant",
      "description": "The candidate who submitted this application.",
      "mode": "fk",
      "required": "Always",
      "role": "applicant"
    },
    "jobPosition": {
      "relationshipId": "applicationJobPosition",
      "to": "JobPosition",
      "via": "Application.jobPositionId",
      "cardinality": "N:1",
      "title": "Applied-for job position",
      "description": "The job position for which this application was submitted.",
      "mode": "fk",
      "required": "Always",
      "role": "applied-for position"
    }
  },
  "capabilities": {
    "read.byId": "Reads one application by its id so recruiters and hiring managers can review its candidate, position, and stage.",
    "locate.byColumn": "Lists applications by indexed candidate, job position, or stage so recruiters and hiring managers can find the applications they are responsible for.",
    "count": "Counts applications matching indexed filters so the module can determine how many candidates have been hired for a job position.",
    "listByForeignKey": "Lists applications for a candidate or job position through its foreign key so the related record screen can show its applications.",
    "create": "Creates an application in screening for a candidate and an open job position when a recruiter starts screening.",
    "transition": "Moves an application through screening, interview, offer, hired, or rejected under the transition rules and the authorized actor.",
    "uniqueKey": "Prevents a candidate from having more than one application for the same job position using the candidate and job-position key.",
    "transaction": "Atomically records a hire and closes the job position when that hire fills its required headcount.",
    "read.mdmRecord": "Reads the master candidate record referenced by an application so recruiters and hiring managers can view the candidate's name and available resume."
  },
  "rules": [
    "applicationUniqueCandidatePosition",
    "applicationRequiresOpenPosition",
    "applicationStageOrder",
    "hiringManagerManagesPosition",
    "jobPositionHasRemainingHeadcount",
    "closePositionWhenHeadcountFilled",
    "rejectionReasonRequired"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "hiringPipeline_application",
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
      "candidateId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Candidate"
        ],
        "title": "Candidate",
        "description": "The candidate submitting this application.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "jobPositionId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "JobPosition"
        ],
        "title": "Job position",
        "description": "The job position to which the candidate is applying.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "values": [
          {
            "value": "screening",
            "title": "Screening",
            "description": "The recruiter is screening the application."
          },
          {
            "value": "interview",
            "title": "Interview",
            "description": "The candidate has advanced to interview."
          },
          {
            "value": "offer",
            "title": "Offer",
            "description": "The hiring manager has approved making an offer."
          },
          {
            "value": "hired",
            "title": "Hired",
            "description": "The candidate has been hired for the job position."
          },
          {
            "value": "rejected",
            "title": "Rejected",
            "description": "The application has been declined with a recorded reason."
          }
        ],
        "title": "Application stage",
        "description": "The current stage of the candidate's application.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Application details",
        "description": "Information recorded specifically for this application.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "rejectionReason": {
            "type": "text",
            "of": "ContactSummary",
            "title": "Rejection reason",
            "description": "Why the application was rejected.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "candidateId",
      "jobPositionId"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "screening",
      "reachedBy": "actor"
    },
    {
      "state": "interview",
      "reachedBy": "actor"
    },
    {
      "state": "offer",
      "reachedBy": "actor"
    },
    {
      "state": "hired",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "moveToInterview",
      "from": [
        "screening"
      ],
      "to": "interview",
      "by": [
        "recruiter"
      ],
      "payload": [],
      "description": "Advance a screened application to interview.",
      "ruleRefs": [
        "applicationStageOrder"
      ]
    },
    {
      "transitionId": "moveToOffer",
      "from": [
        "interview"
      ],
      "to": "offer",
      "by": [
        "hiringManager"
      ],
      "payload": [],
      "description": "Approve an offer for an interviewed candidate in a position managed by the hiring manager.",
      "ruleRefs": [
        "applicationStageOrder",
        "hiringManagerManagesPosition"
      ]
    },
    {
      "transitionId": "moveToHired",
      "from": [
        "offer"
      ],
      "to": "hired",
      "by": [
        "hiringManager"
      ],
      "payload": [],
      "description": "Hire an offered candidate while the job position still has hiring capacity.",
      "ruleRefs": [
        "applicationStageOrder",
        "hiringManagerManagesPosition",
        "jobPositionHasRemainingHeadcount",
        "closePositionWhenHeadcountFilled"
      ]
    },
    {
      "transitionId": "rejectApplication",
      "from": [
        "screening",
        "interview",
        "offer"
      ],
      "to": "rejected",
      "by": [
        "recruiter"
      ],
      "payload": [
        "details.rejectionReason"
      ],
      "description": "Reject an application and record the reason it will not proceed.",
      "ruleRefs": [
        "rejectionReasonRequired"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type HiringPipelineEntityApplicationType = typeof hiringPipelineEntityApplication;

export default hiringPipelineEntityApplication;
