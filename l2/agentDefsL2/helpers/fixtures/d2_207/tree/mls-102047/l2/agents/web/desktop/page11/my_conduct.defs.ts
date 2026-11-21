/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/my_conduct.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/settingsConsole/page21.md",
    "experience": "sectionedForm"
  },
  "intent": "Show the signed-in person how the chosen agent behaves for them when it acts on their behalf, with the history of their own changes, and let them say in plain words what should change, without affecting anyone else.",
  "sections": [
    {
      "id": "currentConduct",
      "priority": "primary",
      "purpose": "Read how the agent behaves for you today when it acts on your behalf.",
      "organisms": [
        "conductSummary"
      ]
    },
    {
      "id": "changeConduct",
      "priority": "main",
      "purpose": "Write what you want the agent to do differently for you and send it, so only your own conduct is updated.",
      "organisms": [
        "conductChange"
      ]
    },
    {
      "id": "conductHistory",
      "priority": "secondary",
      "purpose": "Look back over your own earlier changes, newest first, with when each happened and a one-line summary.",
      "organisms": [
        "conductHistory"
      ]
    }
  ],
  "organisms": {
    "conductSummary": {
      "kind": "detail",
      "text": "How this agent behaves for you when it acts on your behalf. The page shows the agent's @name, on whose behalf it acts and your current conduct in plain language.",
      "intents": [
        {
          "id": "openAgentOverview",
          "kind": "navigate",
          "to": "agent_overview"
        }
      ]
    },
    "conductChange": {
      "kind": "form",
      "text": "Change how the agent behaves for you. Describe the change in plain words and send it. Only your own conduct changes, and the change appears in your history.",
      "intents": [
        {
          "id": "sendConductChange",
          "kind": "submit"
        }
      ]
    },
    "conductHistory": {
      "kind": "timeline",
      "text": "Your past changes to this agent's conduct, newest first: when each was made and a one-line summary. Only your own changes are listed.",
      "intents": []
    }
  },
  "molecules": {
    "conductSummary": [
      {
        "role": "current conduct card with agent name and plain-language summary",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      },
      {
        "role": "longer explanation of the current conduct opened on demand",
        "preferred": "groupexpandcontent--ml-readmore-expand",
        "alternative": "groupexpandcontent--ml-collapsible-panel"
      }
    ],
    "conductChange": [
      {
        "role": "what do you want to change, in plain words",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "send the change",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "confirm the change was applied or explain a refusal",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
