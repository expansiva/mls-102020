/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/my_conduct.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/settingsConsole/page21.md",
    "experience": "sectionedForm"
  },
  "intent": "On a narrow screen around 390px wide (also usable at 360px and 430px), show your current conduct with the chosen agent first. Below it, place a short field to say what should change. Keep your change history folded until you open it.",
  "sections": [
    {
      "id": "currentConduct",
      "priority": "primary",
      "purpose": "Read at a glance how the agent behaves for you today. Open your earlier changes only when you need them.",
      "organisms": [
        "conductSummary"
      ]
    },
    {
      "id": "changeConduct",
      "priority": "main",
      "purpose": "Type in plain words what should change for you and send it with one tap. Only your own conduct is updated.",
      "organisms": [
        "conductChange"
      ]
    }
  ],
  "organisms": {
    "conductSummary": {
      "kind": "detail",
      "text": "How this agent behaves for you when it acts on your behalf. The page shows the agent's @name, your current conduct in plain language and a folded history of your own changes, with when and a one-line summary.",
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
      "text": "Change how the agent behaves for you. Write what should change and send it. Only your own conduct changes.",
      "intents": [
        {
          "id": "sendConductChange",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "conductSummary": [
      {
        "role": "current conduct card with agent name and plain-language summary",
        "preferred": "groupviewcard--ml-vertical-card"
      },
      {
        "role": "folded history of my own changes",
        "preferred": "groupexpandcontent--ml-single-expand-content",
        "alternative": "groupexpandcontent--ml-accordion"
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
