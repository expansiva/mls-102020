/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/tool_catalog.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/hierarchyTreeView/page21.md",
    "experience": "treeAndDetail"
  },
  "intent": "Show everyone in the organization the full tool catalog that agents can use: every action from the app modules and the cm, by module and subject, how many agents use each one, which tools have left the release and how the catalog changed with each new module or release.",
  "sections": [
    {
      "id": "catalogTreeSection",
      "priority": "primary",
      "purpose": "Browse all actions of the app modules and the cm tools by module and subject, in plain words, with removed tools clearly marked.",
      "organisms": [
        "toolCatalogTree"
      ]
    },
    {
      "id": "toolUsageSection",
      "priority": "main",
      "purpose": "See at a glance which tools agents rely on, by how many agents have each tool turned on.",
      "organisms": [
        "toolUsageHighlights"
      ]
    },
    {
      "id": "catalogUpdatesSection",
      "priority": "secondary",
      "purpose": "Follow how the catalog changed after a new module or release: which tools were added and which were marked removed.",
      "organisms": [
        "catalogUpdatesTimeline"
      ]
    }
  ],
  "organisms": {
    "toolUsageHighlights": {
      "kind": "highlights",
      "text": "Which agents use each tool: for each tool, how many agents have it turned on, so you can see which tools matter most.",
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
      "text": "All actions of the app modules and the cm tools, by module and subject, each with its readable name and description. Tools that left the release are marked removed.",
      "intents": []
    },
    "catalogUpdatesTimeline": {
      "kind": "timeline",
      "text": "Catalog updates after a new module or release: tools added to the catalog and tools marked removed, newest first.",
      "intents": []
    }
  },
  "molecules": {
    "toolUsageHighlights": [
      {
        "role": "tool usage summary",
        "preferred": "groupviewdata--ml-card-grid",
        "alternative": "groupviewtable--ml-data-table-minimal"
      }
    ],
    "toolCatalogTree": [
      {
        "role": "module / subject / action tree",
        "preferred": "groupviewhierarchy--ml-hierarchy-tree",
        "alternative": "groupviewtable--ml-grouping-table"
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
