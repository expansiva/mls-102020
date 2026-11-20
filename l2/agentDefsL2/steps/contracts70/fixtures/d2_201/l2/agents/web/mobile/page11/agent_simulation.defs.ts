/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_simulation.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "bespoke",
    "experience": "none"
  },
  "intent": "On a narrow screen (about 390px, still usable at 360px and 430px), check the chosen agent quickly: first see which tools it can or cannot use and why, then type a sentence to see how it reads it. The content flows in one column, and nothing is saved.",
  "sections": [
    {
      "id": "whatItCanSection",
      "priority": "primary",
      "purpose": "A stacked list of tools marked usable or blocked, each with its reason, after a compact choice of who to simulate for. This tells the actor at a glance what the agent can really do.",
      "organisms": [
        "whatItCan"
      ]
    },
    {
      "id": "whatItUnderstandsSection",
      "priority": "main",
      "purpose": "A sentence box followed by the result: whether an action is asked, the module and subject it leads to, and the actions, read top to bottom.",
      "organisms": [
        "whatItUnderstands"
      ]
    }
  ],
  "organisms": {
    "whatItCan": {
      "kind": "form",
      "text": "What it can: choose who to simulate for (yourself as a member; as admin, a person or a role) and scroll through each tool marked usable or blocked, with a short reason.",
      "intents": [
        {
          "id": "openToolCatalog",
          "kind": "navigate",
          "to": "tool_catalog"
        }
      ]
    },
    "whatItUnderstands": {
      "kind": "form",
      "text": "What it understands: type a sentence and read whether it asks for an action, the module and subject it leads to, the actions it would take, and a short explanation.",
      "intents": []
    }
  },
  "molecules": {
    "whatItCan": [
      {
        "role": "Choose whether to simulate for a person or a role",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-select"
      },
      {
        "role": "Pick the person to simulate for",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "Usable and blocked tools with reasons on a narrow screen",
        "preferred": "groupviewtable--ml-responsive-data-table",
        "alternative": "groupviewtable--ml-responsive-table"
      },
      {
        "role": "Run the simulation",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "Explain that nothing is saved or that no tool is on",
        "preferred": "groupnotifyuser--ml-contextual-feedback"
      }
    ],
    "whatItUnderstands": [
      {
        "role": "Type the sample sentence",
        "preferred": "groupentertext--ml-multiline-text",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "Test the sentence",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "Actions the agent would take",
        "preferred": "groupviewdata--ml-vertical-record-list"
      },
      {
        "role": "Module and subject path the sentence leads to",
        "preferred": "groupviewhierarchy--ml-hierarchy-tree"
      },
      {
        "role": "While the cm reads the sentence",
        "preferred": "groupshowprogress--ml-indeterminate-spinner"
      },
      {
        "role": "Say whether the sentence asks for an action",
        "preferred": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
