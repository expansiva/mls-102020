/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_simulation.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "bespoke",
    "experience": "none"
  },
  "intent": "Try out the chosen agent before trusting it: see which tools it can or cannot use and why, for yourself or, as admin, for a chosen person or role, and test a sentence to see whether it asks for an action, which part of the tool tree it leads to and which actions it would take. Nothing is saved.",
  "sections": [
    {
      "id": "whatItCanSection",
      "priority": "primary",
      "purpose": "Shows which tools the agent may use and which are blocked, each with a plain reason (allowed, restricted for the person, not permitted for the role, removed from the release), so the actor understands the agent's real reach.",
      "organisms": [
        "whatItCan"
      ]
    },
    {
      "id": "whatItUnderstandsSection",
      "priority": "main",
      "purpose": "Lets the actor type a sample request and read how the agent interprets it: whether it asks for an action, the module and subject it points to, and the actions it would run, with a short explanation.",
      "organisms": [
        "whatItUnderstands"
      ]
    }
  ],
  "organisms": {
    "whatItCan": {
      "kind": "form",
      "text": "What it can: choose who to simulate for (yourself as a member; as admin, a person or a role) and see every tool by module, subject and action marked usable or blocked, with a one-line reason for each.",
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
      "text": "What it understands: type a sentence and see whether it asks for an action, which module and subject of the tool tree it leads to, which actions it would take, and a short explanation of how it was read.",
      "intents": []
    }
  },
  "molecules": {
    "whatItCan": [
      {
        "role": "Choose whether to simulate for a person or a role",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-radio-group"
      },
      {
        "role": "Pick the person to simulate for",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "Usable and blocked tools grouped by module and subject with reasons",
        "preferred": "groupviewtable--ml-grouping-table",
        "alternative": "groupviewtable--ml-advanced-data-table"
      },
      {
        "role": "Filter the verdicts by tool name",
        "preferred": "groupsearchcontent--ml-search-filters"
      },
      {
        "role": "Run the simulation",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "Explain that nothing is saved or that no tool is on",
        "preferred": "groupnotifyuser--ml-contextual-feedback",
        "alternative": "groupnotifyuser--ml-notify-banner"
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
        "role": "Module and subject path the sentence leads to",
        "preferred": "groupviewhierarchy--ml-hierarchy-tree"
      },
      {
        "role": "Actions the agent would take",
        "preferred": "groupviewdata--ml-vertical-record-list"
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
