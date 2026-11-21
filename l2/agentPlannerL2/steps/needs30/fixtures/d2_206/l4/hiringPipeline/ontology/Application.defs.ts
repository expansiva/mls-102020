/// <mls fileReference="_102047_/l4/hiringPipeline/ontology/Application.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineEntityApplication = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "hiringPipeline",
  "entityId": "Application",
  "title": "Application",
  "description": "A candidate's application to a job position, moving through the stages screening, interview, offer, then hired or rejected with a rejection reason.",
  "displayField": "code",
  "relationships": {
    "jobPosition": {
      "relationshipId": "applicationJobPosition",
      "to": "JobPosition",
      "via": "Application.jobPositionId",
      "cardinality": "N:1",
      "title": "Job position applied to",
      "description": "Each application is made to one job position.",
      "mode": "fk",
      "required": true
    },
    "candidate": {
      "relationshipId": "applicationCandidate",
      "to": "Candidate",
      "via": "Application.candidateId",
      "cardinality": "N:1",
      "title": "Applying candidate",
      "description": "Each application belongs to one candidate.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Opens one application by its id so the recruiter or the hiring manager can review it before acting.",
    "locate.byColumn": "Lists applications filtered by stage, position or candidate and ordered by applied or stage-change date, for the recruiter's work queue and the hiring manager's pipeline of her positions.",
    "locate.byText": "Finds an application by typing part of its application number in the search box of the recruiter's list.",
    "count": "Counts applications per stage for a position, showing the hiring manager how her pipeline is distributed.",
    "listByForeignKey": "Lists the applications of one job position or of one candidate, so a position screen shows its applicants grouped by stage and a candidate screen shows her applications.",
    "create": "Records a candidate's application to an open position, starting in screening; used by the recruiter.",
    "update": "Lets the recruiter correct the notes of an active application.",
    "transition": "Moves the application between stages: the recruiter advances to interview or rejects with a reason, the hiring manager extends the offer and hires.",
    "uniqueKey": "Refuses a second application of the same candidate to the same position and a repeated application number.",
    "transaction": "Hires the candidate and closes the job position together when its headcount is filled, all or nothing.",
    "read.mdmRecord": "Reads the candidate's name, email, resume link and source from the master record behind the candidate column, for every list and review screen.",
    "sequence.next": "Issues the application number when the recruiter records the application.",
    "comment": "Lets the recruiter and the hiring manager leave notes on the application while discussing interview and offer.",
    "statusHistory.read": "Shows when the application changed stage and who moved it, for the review of its history by recruiter and hiring manager."
  },
  "rules": [
    "applicationOnlyToOpenPosition",
    "onePerCandidatePerPosition",
    "rejectionRequiresReason",
    "onlyPositionManagerDecides",
    "hireRequiresRemainingHeadcount",
    "closePositionWhenHeadcountFilled",
    "finalStagesAreTerminal"
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
      "code": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "derived": true,
        "title": "Application number",
        "description": "Number people quote to refer to the application, issued by the platform sequence when the application is recorded.",
        "maxLength": 30
      },
      "jobPositionId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "JobPosition"
        ],
        "title": "Job position",
        "description": "The job position the candidate applies to; it also defines the hiring manager who decides offer and hire."
      },
      "candidateId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Candidate"
        ],
        "title": "Candidate",
        "description": "The candidate who applies; name, email, resume link and source are read from the candidate's master record."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "screening",
            "title": "Screening"
          },
          {
            "value": "interview",
            "title": "Interview"
          },
          {
            "value": "offer",
            "title": "Offer"
          },
          {
            "value": "hired",
            "title": "Hired"
          },
          {
            "value": "rejected",
            "title": "Rejected"
          }
        ],
        "title": "Stage",
        "description": "Current stage of the application in the hiring pipeline."
      },
      "appliedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Applied at",
        "description": "Moment the application was recorded; lists are ordered by it."
      },
      "stageChangedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Stage changed at",
        "description": "Moment the application last entered its current stage; used to sort the pipeline and find stalled applications."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Everything else about the application.",
        "fields": {
          "notes": {
            "type": "text",
            "title": "Notes",
            "description": "Free notes the recruiter records when registering or reviewing the application.",
            "maxLength": 4000
          },
          "interview": {
            "type": "object",
            "title": "Interview",
            "description": "What happened when the application moved to interview.",
            "fields": {
              "movedAt": {
                "type": "timestamp",
                "derived": true,
                "title": "Moved to interview at",
                "description": "Moment the recruiter moved the application to interview."
              },
              "movedBy": {
                "type": "record",
                "derived": true,
                "to": [
                  "Person"
                ],
                "title": "Moved by",
                "description": "The recruiter who moved the application to interview."
              }
            }
          },
          "offer": {
            "type": "object",
            "title": "Offer",
            "description": "The offer extended by the hiring manager.",
            "fields": {
              "extendedAt": {
                "type": "timestamp",
                "derived": true,
                "title": "Offer extended at",
                "description": "Moment the hiring manager moved the application to offer."
              },
              "decidedBy": {
                "type": "record",
                "derived": true,
                "to": [
                  "HiringManager"
                ],
                "title": "Offer decided by",
                "description": "The hiring manager who extended the offer."
              },
              "notes": {
                "type": "text",
                "title": "Offer notes",
                "description": "What the hiring manager wants recorded about the offer.",
                "maxLength": 2000
              }
            }
          },
          "hire": {
            "type": "object",
            "title": "Hire",
            "description": "The hiring decision.",
            "fields": {
              "hiredAt": {
                "type": "timestamp",
                "derived": true,
                "title": "Hired at",
                "description": "Moment the hiring manager hired the candidate."
              },
              "decidedBy": {
                "type": "record",
                "derived": true,
                "to": [
                  "HiringManager"
                ],
                "title": "Hire decided by",
                "description": "The hiring manager who hired the candidate."
              }
            }
          },
          "rejection": {
            "type": "object",
            "title": "Rejection",
            "description": "Why and when the application was rejected; filled when it is rejected.",
            "fields": {
              "reason": {
                "type": "text",
                "required": true,
                "title": "Rejection reason",
                "description": "The reason the application did not move forward, required to reject.",
                "maxLength": 1000
              },
              "rejectedAt": {
                "type": "timestamp",
                "derived": true,
                "title": "Rejected at",
                "description": "Moment the application was rejected."
              },
              "stageAtRejection": {
                "type": "enum",
                "derived": true,
                "values": [
                  {
                    "value": "screening",
                    "title": "Screening"
                  },
                  {
                    "value": "interview",
                    "title": "Interview"
                  },
                  {
                    "value": "offer",
                    "title": "Offer"
                  }
                ],
                "title": "Stage at rejection",
                "description": "Stage the application was in when it was rejected."
              }
            }
          },
          "isActive": {
            "type": "boolean",
            "derived": true,
            "title": "Active",
            "description": "The application is still in screening, interview or offer, neither hired nor rejected."
          },
          "daysInStage": {
            "type": "integer",
            "derived": true,
            "title": "Days in current stage",
            "description": "Number of days since the application entered its current stage, counted up to today."
          },
          "remainingOpenings": {
            "type": "integer",
            "derived": true,
            "title": "Remaining openings of the position",
            "description": "Headcount of the application's job position minus the applications already hired for that position."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "code"
    ],
    [
      "jobPositionId",
      "candidateId"
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
      "transitionId": "advanceToInterview",
      "from": [
        "screening"
      ],
      "to": "interview",
      "by": [
        "recruiter"
      ],
      "description": "The recruiter moves a screened application to the interview stage.",
      "payload": [],
      "ruleRefs": [
        "finalStagesAreTerminal"
      ]
    },
    {
      "transitionId": "extendOffer",
      "from": [
        "interview"
      ],
      "to": "offer",
      "by": [
        "hiringManager"
      ],
      "description": "The hiring manager of the position decides to extend an offer to the interviewed candidate.",
      "payload": [
        "details.offer.notes"
      ],
      "ruleRefs": [
        "onlyPositionManagerDecides"
      ]
    },
    {
      "transitionId": "hire",
      "from": [
        "offer"
      ],
      "to": "hired",
      "by": [
        "hiringManager"
      ],
      "description": "The hiring manager of the position hires the candidate; when the position's headcount is filled the position closes automatically in the same operation.",
      "payload": [],
      "ruleRefs": [
        "onlyPositionManagerDecides",
        "hireRequiresRemainingHeadcount",
        "closePositionWhenHeadcountFilled"
      ]
    },
    {
      "transitionId": "reject",
      "from": [
        "screening",
        "interview",
        "offer"
      ],
      "to": "rejected",
      "by": [
        "recruiter",
        "hiringManager"
      ],
      "description": "The application is closed with a rejection reason; normally recorded by the recruiter, including when the hiring manager declines an offer or a hire and hands it back.",
      "payload": [
        "details.rejection.reason"
      ],
      "ruleRefs": [
        "rejectionRequiresReason",
        "finalStagesAreTerminal"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type HiringPipelineEntityApplicationType = typeof hiringPipelineEntityApplication;

export default hiringPipelineEntityApplication;
