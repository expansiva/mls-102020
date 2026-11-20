/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/person_restrictions.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/userAccessManagement/page21.md",
    "experience": "memberDirectory"
  },
  "intent": "Let the company admin choose a person of the organization and mark which tools that person may not use through any agent, so no agent offers those tools when the person calls it.",
  "sections": [
    {
      "id": "choosePersonSection",
      "priority": "primary",
      "purpose": "Find and pick the person whose tools you want to restrict, recognised by name and login e-mail.",
      "organisms": [
        "personPicker"
      ]
    },
    {
      "id": "restrictionsSection",
      "priority": "main",
      "purpose": "Review the tools already blocked for the chosen person and tick or untick each tool, seeing where it sits in the catalog, when it was marked and whether it left the release.",
      "organisms": [
        "blockedToolsChecklist"
      ]
    }
  ],
  "organisms": {
    "personPicker": {
      "kind": "list",
      "text": "Choose a person from the organization, shown by name with their login e-mail, so you restrict the right person.",
      "intents": []
    },
    "blockedToolsChecklist": {
      "kind": "list",
      "text": "Tools the chosen person may not use through any agent: the tool, where it sits by module and subject, when it was marked and whether it left the release; tick or untick each one and save.",
      "intents": [
        {
          "id": "saveRestrictions",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "personPicker": [
      {
        "role": "choose the person by typing their name",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      }
    ],
    "blockedToolsChecklist": [
      {
        "role": "tick the blocked tools in the module / subject / action tree",
        "preferred": "groupselectmany--ml-tree-multi-select",
        "alternative": "groupselectmany--ml-table-multi-select"
      }
    ]
  }
} as const;
