/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_activity.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/auditTrail/page21.md",
    "experience": "chronologicalLog"
  },
  "intent": "On a narrow screen (about 390px wide, and still usable at 360px and 430px), show what the chosen agent did, newest first, so a member can quickly check its recent runs and open the conversation behind any of them.",
  "sections": [
    {
      "id": "activityHistory",
      "priority": "primary",
      "purpose": "A single column of runs, newest first. Each run shows when it happened, how long it took, what it cost and whether a person took over. Its actions and results open only when needed.",
      "organisms": [
        "executionTimeline"
      ]
    }
  ],
  "organisms": {
    "executionTimeline": {
      "kind": "timeline",
      "text": "What the agent did, newest first. Each compact entry shows when the run started, how long it took, what it cost, who called the agent and whether a person took over. Tapping an entry shows each action with its result and a short note, plus a link to open the conversation.",
      "intents": []
    }
  },
  "molecules": {
    "executionTimeline": [
      {
        "role": "Runs ordered by start time, newest first",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      },
      {
        "role": "Opens the actions and results of one run",
        "preferred": "groupexpandcontent--ml-accordion",
        "alternative": "groupexpandcontent--ml-single-expand-content"
      },
      {
        "role": "Moves through older runs",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ]
  }
} as const;
