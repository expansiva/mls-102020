/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_activity.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/auditTrail/page21.md",
    "experience": "chronologicalLog"
  },
  "intent": "Show everything the chosen agent did, newest first, so any organization member can see how it has been working: when it ran, how long it took, what it cost, which actions it performed and how they turned out, whether a person had to take over, who called it, and a link to open the conversation.",
  "sections": [
    {
      "id": "activityHistory",
      "priority": "primary",
      "purpose": "The agent's full history of runs, newest first. Each run can be opened to show its actions and their results.",
      "organisms": [
        "executionTimeline"
      ]
    }
  ],
  "organisms": {
    "executionTimeline": {
      "kind": "timeline",
      "text": "What the agent did, newest first. Each entry shows when the run started, how long it took, what it cost, who called the agent and whether a person took over. Opening an entry lists every action with its result (succeeded, failed or refused) and a short note. There is also a link to open the conversation where the run happened.",
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
        "preferred": "groupexpandcontent--ml-collapsible-panel",
        "alternative": "groupexpandcontent--ml-accordion"
      },
      {
        "role": "Moves through older runs",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ]
  }
} as const;
