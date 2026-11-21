/// <mls fileReference="_102047_/l4/hiringPipeline/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const hiringPipelineJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "hiringPipeline",
  "journeys": [
    {
      "journeyId": "openJobPosition",
      "actorRef": "recruiter",
      "title": "Open a job position"
    },
    {
      "journeyId": "registerCandidateApplication",
      "actorRef": "recruiter",
      "title": "Register a candidate and an application"
    },
    {
      "journeyId": "advanceToInterview",
      "actorRef": "recruiter",
      "title": "Move an application to interview"
    },
    {
      "journeyId": "rejectApplication",
      "actorRef": "recruiter",
      "title": "Reject an application"
    },
    {
      "journeyId": "decideOffer",
      "actorRef": "hiringManager",
      "title": "Decide on an offer"
    },
    {
      "journeyId": "decideHire",
      "actorRef": "hiringManager",
      "title": "Decide on hiring"
    },
    {
      "journeyId": "reviewMyPipeline",
      "actorRef": "hiringManager",
      "title": "Review my positions' pipeline"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type HiringPipelineJourneyIndexType = typeof hiringPipelineJourneyIndex;

export default hiringPipelineJourneyIndex;
