/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_overview.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/readOnlyDetailPortal/page21.md",
    "experience": "summaryFirstStatement"
  },
  "intent": "Show any organization member or admin, read only, what the chosen agent is, who it talks to, on whose behalf it acts, whether it is on and who is responsible for it. This tells them what the agent is for before they look at what it did.",
  "sections": [
    {
      "id": "agentSummary",
      "priority": "primary",
      "purpose": "Show who the agent is at a glance and what it is for: its @name, whether it is on, a plain description of what it does, the people it serves, on whose behalf it acts and the person responsible for it.",
      "organisms": [
        "agentOverviewDetail"
      ]
    }
  ],
  "organisms": {
    "agentOverviewDetail": {
      "kind": "detail",
      "text": "What the agent is, who it talks to, on whose behalf it acts and who is responsible for it. The @name and whether it is on come first, then the plain-language description, the people it serves, whether it acts in its own name or for a person, and the name of the responsible person. Everything is read only, and a link opens the agent's activity to see what it has been doing.",
      "intents": [
        {
          "id": "seeAgentActivity",
          "kind": "navigate",
          "to": "agent_activity"
        }
      ]
    }
  },
  "molecules": {}
} as const;
