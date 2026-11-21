/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_behavior.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/aiAssistedAuthoring/page21.md",
    "experience": "generateReviewShare"
  },
  "intent": "Show the admin how the chosen agent behaves today. Let them ask in plain words for a different behavior, and show every change with who made it, when and a short summary, so they can undo any change from the same place.",
  "sections": [
    {
      "id": "behaviorNow",
      "priority": "primary",
      "purpose": "Show the agent's current behavior in plain language so the admin knows where they start before asking for a change.",
      "organisms": [
        "currentBehavior"
      ]
    },
    {
      "id": "askForChange",
      "priority": "main",
      "purpose": "Give the admin one place to describe in their own words how the agent should behave differently, or to confirm undoing a change picked from the history, and send it to the cm.",
      "organisms": [
        "behaviorChangeRequest"
      ]
    },
    {
      "id": "changeHistory",
      "priority": "secondary",
      "purpose": "Show what changed over time so the admin can see what led to today's behavior and pick a change that did not work out to undo.",
      "organisms": [
        "behaviorHistory"
      ]
    }
  ],
  "organisms": {
    "currentBehavior": {
      "kind": "detail",
      "text": "How the agent behaves today, in plain language: a one-line summary followed by the full behavior text as the cm keeps it.",
      "intents": []
    },
    "behaviorChangeRequest": {
      "kind": "form",
      "text": "What do you want to change? Tell the agent in plain words how it should behave differently, or confirm undoing the change picked from the history. The cm updates the behavior, and the new text appears above.",
      "intents": [
        {
          "id": "requestBehaviorChange",
          "kind": "submit"
        }
      ]
    },
    "behaviorHistory": {
      "kind": "timeline",
      "text": "History of changes, newest first: who made each change, when, and a one-line summary. Undone changes are marked. Choose undo on any other change to bring it into the change box and confirm it there.",
      "intents": []
    }
  },
  "molecules": {
    "currentBehavior": [
      {
        "role": "behavior summary card",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      }
    ],
    "behaviorChangeRequest": [
      {
        "role": "plain-language change request",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "send change or confirm undo",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "change result feedback",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ],
    "behaviorHistory": [
      {
        "role": "change history",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      },
      {
        "role": "pick a change to undo",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-icon-button"
      },
      {
        "role": "undone change marker",
        "preferred": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
