/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_tools.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/hierarchyTreeView/page21.md",
    "experience": "treeAndDetail"
  },
  "intent": "Let the company admin decide exactly which actions this agent may use. The page shows the whole tool catalog as a module, subject and action tree, with the agent's current choices ticked, and lists the tools the system turned on automatically.",
  "sections": [
    {
      "id": "toolChoices",
      "priority": "primary",
      "purpose": "The main work area. The admin browses every module, subject and action and ticks or unticks each one to set what this agent may do. Each action shows when it was chosen, who chose it and whether it has left the release.",
      "organisms": [
        "agentToolTree"
      ]
    },
    {
      "id": "automaticHistory",
      "priority": "secondary",
      "purpose": "Shows which tools were turned on without the admin, either suggested by a ready draft or chosen after a new release, so the admin knows where each choice came from. Automatic choices never override the admin's own choices.",
      "organisms": [
        "automaticToolChoices"
      ]
    }
  ],
  "organisms": {
    "agentToolTree": {
      "kind": "list",
      "text": "Tools grouped by module, subject and action, with readable names and descriptions. Each action shows when it was chosen and whether it was removed from the release. Tick an action to turn it on for this agent, or untick it to turn it off.",
      "intents": [
        {
          "id": "enableUnchosenTool",
          "kind": "submit"
        },
        {
          "id": "toggleToolChoice",
          "kind": "submit"
        }
      ]
    },
    "automaticToolChoices": {
      "kind": "timeline",
      "text": "Tools turned on automatically, newest first: suggested by a ready draft or chosen after a new release. Your own choices are never changed by these.",
      "intents": [
        {
          "id": "openToolCatalog",
          "kind": "navigate",
          "to": "tool_catalog"
        }
      ]
    }
  },
  "molecules": {
    "agentToolTree": [
      {
        "role": "module, subject and action tree",
        "preferred": "groupviewhierarchy--ml-hierarchy-tree",
        "alternative": "groupviewhierarchy--ml-hierarchy-tree-diagram"
      },
      {
        "role": "turn an action on or off for the agent",
        "preferred": "groupenterboolean--ml-checkbox-preference",
        "alternative": "groupenterboolean--ml-toggle-switch"
      }
    ],
    "automaticToolChoices": [
      {
        "role": "automatic choices ordered by time",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      }
    ]
  }
} as const;
