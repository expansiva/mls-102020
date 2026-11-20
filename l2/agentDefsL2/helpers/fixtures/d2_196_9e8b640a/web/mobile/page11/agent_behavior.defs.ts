/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_behavior.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/aiAssistedAuthoring/page21.md",
    "experience": "generateReviewShare"
  },
  "intent": "On a narrow screen, show the admin how the chosen agent behaves today and let them ask for a change in plain words. Below that, show a short history of changes where any change can be picked for undo. Content flows in one column around 390px and stays usable from 360px to 430px.",
  "sections": [
    {
      "id": "behaviorNow",
      "priority": "primary",
      "purpose": "Show the one-line summary first and the full behavior text below it, so the admin can read where they start without leaving the page.",
      "organisms": [
        "currentBehavior"
      ]
    },
    {
      "id": "askForChange",
      "priority": "main",
      "purpose": "Show the change box right after the current behavior so the admin can write and send a request, or confirm an undo picked from the history, without scrolling far.",
      "organisms": [
        "behaviorChangeRequest"
      ]
    },
    {
      "id": "changeHistory",
      "priority": "secondary",
      "purpose": "List past changes below the change box as short entries, each with who, when, a summary and a way to pick it for undo.",
      "organisms": [
        "behaviorHistory"
      ]
    }
  ],
  "organisms": {
    "currentBehavior": {
      "kind": "detail",
      "text": "How the agent behaves today, in plain language: the one-line summary on top and the full behavior text below.",
      "intents": []
    },
    "behaviorChangeRequest": {
      "kind": "form",
      "text": "What do you want to change? Write in plain words how the agent should behave differently, or confirm undoing the change picked below, and send it. The cm updates the behavior.",
      "intents": [
        {
          "id": "requestBehaviorChange",
          "kind": "submit"
        }
      ]
    },
    "behaviorHistory": {
      "kind": "timeline",
      "text": "History of changes, newest first: who, when and a one-line summary. Undone changes are marked. Tap undo on another change to bring it into the change box and confirm it there.",
      "intents": []
    }
  },
  "molecules": {
    "currentBehavior": [
      {
        "role": "behavior summary card",
        "preferred": "groupviewcard--ml-vertical-card"
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
        "preferred": "grouptriggeraction--ml-icon-button",
        "alternative": "grouptriggeraction--ml-kebab-action-trigger"
      }
    ]
  }
} as const;
