/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_tools.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/hierarchyTreeView/page21.md",
    "experience": "treeAndDetail"
  },
  "intent": "On a narrow screen (about 390px, also usable from 360px to 430px), the company admin goes through the agent's tool tree one module and subject at a time and ticks the actions the agent may use. Below the tree, a short history shows which tools were turned on automatically.",
  "sections": [
    {
      "id": "toolChoices",
      "priority": "primary",
      "purpose": "Expandable module and subject groups fill the screen width. Each action has a large tick target, its readable name, a short description, when it was chosen and a mark if it was removed from the release.",
      "organisms": [
        "agentToolTree"
      ]
    },
    {
      "id": "automaticHistory",
      "priority": "secondary",
      "purpose": "A short stacked history below the tree. It explains which tools a ready draft or a new release turned on, without overriding the admin's choices.",
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
        "preferred": "groupviewhierarchy--ml-hierarchy-tree"
      },
      {
        "role": "turn an action on or off for the agent",
        "preferred": "groupenterboolean--ml-toggle-switch",
        "alternative": "groupenterboolean--ml-checkbox-preference"
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
