/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/tool_catalog.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/hierarchyTreeView/page21.md",
    "experience": "treeAndDetail"
  },
  "intent": "On a narrow screen (about 390px, still usable from 360px to 430px), let any organization member browse the tool catalog by module and subject in a single fluid column, see removed tools marked, check how many agents use each tool and follow recent catalog updates.",
  "sections": [
    {
      "id": "catalogTreeSection",
      "priority": "primary",
      "purpose": "Expand modules and subjects one at a time to read each action's name and description, with removed tools marked.",
      "organisms": [
        "toolCatalogTree"
      ]
    },
    {
      "id": "toolUsageSection",
      "priority": "main",
      "purpose": "A short stacked summary of how many agents use each tool.",
      "organisms": [
        "toolUsageHighlights"
      ]
    },
    {
      "id": "catalogUpdatesSection",
      "priority": "secondary",
      "purpose": "Recent catalog changes: tools added and tools marked removed, newest first.",
      "organisms": [
        "catalogUpdatesTimeline"
      ]
    }
  ],
  "organisms": {
    "toolUsageHighlights": {
      "kind": "highlights",
      "text": "Which agents use each tool: for each tool, the number of agents that have it turned on.",
      "intents": [
        {
          "id": "openAgents",
          "kind": "navigate",
          "to": "agents"
        }
      ]
    },
    "toolCatalogTree": {
      "kind": "list",
      "text": "All actions of the app modules and the cm tools, by module and subject, with readable names and descriptions. Removed tools are marked.",
      "intents": []
    },
    "catalogUpdatesTimeline": {
      "kind": "timeline",
      "text": "Catalog updates after a new module or release: tools added and tools marked removed.",
      "intents": []
    }
  },
  "molecules": {
    "toolUsageHighlights": [
      {
        "role": "tool usage summary",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewtable--ml-responsive-table"
      }
    ],
    "toolCatalogTree": [
      {
        "role": "module / subject / action tree",
        "preferred": "groupviewhierarchy--ml-hierarchy-tree",
        "alternative": "groupviewtable--ml-responsive-data-table"
      }
    ],
    "catalogUpdatesTimeline": [
      {
        "role": "catalog update events",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupexpandcontent--ml-accordion"
      }
    ]
  }
} as const;
