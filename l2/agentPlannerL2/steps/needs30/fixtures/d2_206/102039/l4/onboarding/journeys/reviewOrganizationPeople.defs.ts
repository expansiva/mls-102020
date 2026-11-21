/// <mls fileReference="_102039_/l4/onboarding/journeys/reviewOrganizationPeople.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reviewOrganizationPeopleJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reviewOrganizationPeople",
  "business": {
    "actorRef": "companyOwner",
    "title": "Review organization people",
    "goal": "See the organization users with their status and what is still missing, and know who resolves each pending item.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listPeople",
        "kind": "locate",
        "entity": "OrganizationMember",
        "title": "Search organization people",
        "description": "The owner lists organization users from the platform user list, searching by name and filtering by status, paginated."
      },
      {
        "stepId": "inspectPerson",
        "kind": "inspect",
        "entity": "OrganizationMember",
        "title": "See pending items",
        "description": "The owner sees the person's name, read-only login e-mail, status and each pending item with its reachable action or who resolves it."
      }
    ],
    "outcome": {
      "statement": "The owner knows which people still have pending items and who resolves each one.",
      "evidence": [
        "The list shows name, login e-mail, status and missing items",
        "Each pending item shows an action or the responsible party",
        "An empty list is shown differently from an error"
      ]
    }
  },
  "businessHash": "sha256:4f875cb29554242d4447f4d7784ad42c6152350ee6baf613293fabe6594faf54"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReviewOrganizationPeopleJourneyType = typeof reviewOrganizationPeopleJourney;

export default reviewOrganizationPeopleJourney;
