/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_overview.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/readOnlyDetailPortal/page21.md",
    "experience": "summaryFirstStatement"
  },
  "intent": "On a narrow screen, show any member or admin, read only, what the chosen agent is, who it talks to, on whose behalf it acts, whether it is on and who is responsible for it. The content flows in a single column of about 390px and stays readable at 360px and 430px.",
  "sections": [
    {
      "id": "agentSummary",
      "priority": "primary",
      "purpose": "Put the @name and whether the agent is on at the top. Below them, stack the description, the people it serves, on whose behalf it acts and the responsible person, so the member understands the agent without scrolling sideways.",
      "organisms": [
        "agentOverviewDetail"
      ]
    }
  ],
  "organisms": {
    "agentOverviewDetail": {
      "kind": "detail",
      "text": "What the agent is, who it talks to, on whose behalf it acts and who is responsible for it. The text is in short stacked blocks that wrap in the narrow width. The @name and on/off status come first and the responsible person's name comes last. A link at the end opens the agent's activity.",
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
