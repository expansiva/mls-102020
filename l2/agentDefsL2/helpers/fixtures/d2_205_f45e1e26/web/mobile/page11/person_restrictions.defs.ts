/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/person_restrictions.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/userAccessManagement/page21.md",
    "experience": "memberDirectory"
  },
  "intent": "On a narrow screen around 390px (also usable at 360px and 430px), let the company admin pick a person and tick the tools that person may not use through any agent, one step after the other.",
  "sections": [
    {
      "id": "choosePersonSection",
      "priority": "primary",
      "purpose": "Search and pick the person at the top, with name and login e-mail, before anything else.",
      "organisms": [
        "personPicker"
      ]
    },
    {
      "id": "restrictionsSection",
      "priority": "main",
      "purpose": "Below the chosen person, a fluid checklist of tools grouped by module and subject where blocked tools appear ticked; each entry shows when it was marked and whether it left the release.",
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
        "role": "tick the blocked tools grouped by module and subject",
        "preferred": "groupselectmany--ml-tree-multi-select",
        "alternative": "groupselectmany--ml-multi-checkbox-list"
      }
    ]
  }
} as const;
