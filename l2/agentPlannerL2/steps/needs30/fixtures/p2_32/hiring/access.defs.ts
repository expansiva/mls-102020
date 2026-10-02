/// <mls fileReference="_102047_/l4/hiringPipeline/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const hiringPipelineAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "hiringPipeline",
  "actors": [
    {
      "actorId": "recruiter",
      "kind": "internal",
      "origin": "named",
      "title": "Recruiter",
      "description": "Opens job positions, registers candidates, manages applications through screening and interview, and records rejections.",
      "personEntity": ""
    },
    {
      "actorId": "hiringManager",
      "kind": "internal",
      "origin": "named",
      "title": "Hiring Manager",
      "description": "Decides offers and hiring outcomes for applications to the positions they manage.",
      "personEntity": "HiringManager"
    }
  ],
  "grants": [
    {
      "grantId": "recruiterCandidateRegistry",
      "actorRef": "recruiter",
      "title": "Manage candidate and hiring manager records",
      "description": "Allows recruiters to identify, register, and review candidates and to select responsible hiring managers for job positions.",
      "entityRefs": [
        "Candidate",
        "CandidateContact",
        "HiringManager"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Candidate, contact-channel, and hiring-manager records in the organization that recruiters use for recruitment work."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Recruiters may view candidate identification, contact summaries, person and promoted information, recruitment source, candidate email-channel details, and hiring-manager identification needed for recruiting.",
        "allowedFields": [
          "Candidate.id",
          "Candidate.version",
          "Candidate.details.identification",
          "Candidate.details.base",
          "Candidate.details.person",
          "Candidate.details.general",
          "Candidate.details.hiringPipeline",
          "CandidateContact.id",
          "CandidateContact.version",
          "CandidateContact.details.identification",
          "CandidateContact.details.contactChannel",
          "HiringManager.id",
          "HiringManager.version",
          "HiringManager.details.identification"
        ]
      }
    },
    {
      "grantId": "recruiterPositionsAndApplications",
      "actorRef": "recruiter",
      "title": "Manage job positions and applications",
      "description": "Allows recruiters to open job positions, manage applications through screening and interview, and record rejection outcomes across the organization.",
      "entityRefs": [
        "JobPosition",
        "Application"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All job positions and applications in the organization are available to recruiters for recruitment operations."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Recruiters may view all job-position and application fields needed to manage hiring needs, application stages, and rejection reasons."
      }
    },
    {
      "grantId": "hiringManagerManagedPositions",
      "actorRef": "hiringManager",
      "title": "Review managed positions and decide application outcomes",
      "description": "Allows hiring managers to review applications for positions assigned to them and make offer and hiring decisions.",
      "entityRefs": [
        "JobPosition",
        "Application"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Only job positions whose responsible hiring manager is the session person, and applications for those positions.",
        "anchorEntity": "HiringManager"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Hiring managers may view position requirements and headcount information plus the candidate, position, and current stage of applications they manage; rejection reasons remain available to recruiters.",
        "allowedFields": [
          "JobPosition.id",
          "JobPosition.version",
          "JobPosition.title",
          "JobPosition.hiringManagerId",
          "JobPosition.status",
          "JobPosition.details",
          "Application.id",
          "Application.version",
          "Application.candidateId",
          "Application.jobPositionId",
          "Application.status"
        ]
      }
    },
    {
      "grantId": "hiringManagerCandidatesForManagedPositions",
      "actorRef": "hiringManager",
      "title": "Review candidates for managed positions",
      "description": "Allows hiring managers to review candidate information for applications associated with their job positions before making offer and hiring decisions.",
      "entityRefs": [
        "Candidate"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Only candidates reached through applications for job positions whose responsible hiring manager is the session person.",
        "anchorEntity": "HiringManager"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Hiring managers may view candidate identification, contact summaries, person and promoted information, and recruitment source for candidates under consideration for their managed positions.",
        "allowedFields": [
          "Candidate.id",
          "Candidate.version",
          "Candidate.details.identification",
          "Candidate.details.base",
          "Candidate.details.person",
          "Candidate.details.general",
          "Candidate.details.hiringPipeline"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type HiringPipelineAccessType = typeof hiringPipelineAccess;

export default hiringPipelineAccess;
