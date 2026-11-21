/// <mls fileReference="_102047_/l4/hiringPipeline/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "hiringPipeline",
  "actors": [
    {
      "actorId": "recruiter",
      "kind": "internal",
      "origin": "named",
      "title": "Recruiter",
      "description": "Opens job positions, registers candidates and their applications, and moves applications through screening and interview stages or rejects them with a reason.",
      "personEntity": ""
    },
    {
      "actorId": "hiringManager",
      "kind": "internal",
      "origin": "named",
      "title": "Hiring Manager",
      "description": "The manager of a job position, who decides whether an application moves to offer and whether the candidate is hired.",
      "personEntity": "HiringManager"
    }
  ],
  "grants": [
    {
      "grantId": "recruiterPositionsAndApplications",
      "actorRef": "recruiter",
      "title": "Manage job positions and applications",
      "description": "The recruiter opens job positions, records applications, moves them through screening and interview, and rejects them with a reason, across the whole organization.",
      "entityRefs": [
        "JobPosition",
        "Application"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All job positions and applications of the organization."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The recruiter reads every field of positions and applications."
      }
    },
    {
      "grantId": "recruiterCandidates",
      "actorRef": "recruiter",
      "title": "Register and review candidates",
      "description": "The recruiter registers candidates with name, e-mail, resume link and source, reusing an existing candidate instead of duplicating it.",
      "entityRefs": [
        "Candidate",
        "CandidateEmail"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All candidates and their e-mail records in the organization."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "The recruiter reads the whole candidate record and its e-mail contact channel."
      }
    },
    {
      "grantId": "recruiterHiringManagers",
      "actorRef": "recruiter",
      "title": "Choose the hiring manager of a position",
      "description": "The recruiter looks up hiring managers to assign one to each job position and to hand interviewed applications to her.",
      "entityRefs": [
        "HiringManager"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "All hiring managers of the organization."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Only the manager's name, status and contact summary.",
        "allowedFields": [
          "HiringManager.details.identification.name",
          "HiringManager.details.identification.status",
          "HiringManager.details.base.contacts"
        ]
      }
    },
    {
      "grantId": "hiringManagerMyPositions",
      "actorRef": "hiringManager",
      "title": "My job positions",
      "description": "The hiring manager sees the job positions she manages, with headcount, hires so far and remaining openings.",
      "entityRefs": [
        "JobPosition"
      ],
      "dataScope": {
        "mode": "assigned",
        "description": "Job positions whose hiring manager is the signed-in manager.",
        "anchorEntity": "HiringManager"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Every field of her positions."
      }
    },
    {
      "grantId": "hiringManagerMyApplications",
      "actorRef": "hiringManager",
      "title": "Applications to my positions",
      "description": "The hiring manager reviews applications to her positions and decides offer and hire.",
      "entityRefs": [
        "Application"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Applications whose job position is managed by the signed-in manager.",
        "anchorEntity": "HiringManager"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Every field of the applications to her positions."
      }
    },
    {
      "grantId": "hiringManagerCandidates",
      "actorRef": "hiringManager",
      "title": "Candidates of my positions",
      "description": "The hiring manager reviews the name, resume link and source of candidates who applied to her positions.",
      "entityRefs": [
        "Candidate"
      ],
      "dataScope": {
        "mode": "related",
        "description": "Candidates who have an application to a job position managed by the signed-in manager.",
        "anchorEntity": "Candidate"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Name, status, contact summary, resume link and source; national document and privacy data are not shown.",
        "allowedFields": [
          "Candidate.details.identification.name",
          "Candidate.details.identification.status",
          "Candidate.details.base.contacts",
          "Candidate.details.hiringPipeline"
        ]
      }
    },
    {
      "grantId": "hiringManagerOwnRecord",
      "actorRef": "hiringManager",
      "title": "My manager record",
      "description": "The hiring manager sees her own record in the hiring pipeline.",
      "entityRefs": [
        "HiringManager"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Only the signed-in manager's own record.",
        "anchorEntity": "HiringManager"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Her whole record."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type HiringPipelineAccessType = typeof hiringPipelineAccess;

export default hiringPipelineAccess;
