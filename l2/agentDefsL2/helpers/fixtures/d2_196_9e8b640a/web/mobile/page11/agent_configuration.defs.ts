/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_configuration.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/settingsConsole/page21.md",
    "experience": "sectionedForm"
  },
  "intent": "On a narrow screen of about 390px (still usable at 360px and 430px), let the company admin change the chosen agent's @name, on/off state and responsible person, then read its limits further down, so the configuration is saved in the cm or the admin knows why a name was refused.",
  "sections": [
    {
      "id": "configurationSettings",
      "priority": "primary",
      "purpose": "The editable settings come first, stacked in one fluid column: the @name, the on/off switch and the responsible person, with the save action and any message about a refused name kept close to the fields.",
      "organisms": [
        "agentConfigurationForm"
      ]
    },
    {
      "id": "agentLimitsSection",
      "priority": "secondary",
      "purpose": "The cm's limits for this agent, read only, below the settings as a compact stacked list.",
      "organisms": [
        "agentLimits"
      ]
    }
  ],
  "organisms": {
    "agentConfigurationForm": {
      "kind": "form",
      "text": "The @name people use to call the agent in a chat, whether it is on or off, and the responsible person chosen from the organization's users. Saving sends the changes to the cm; if another active agent already uses the name, you are told so and nothing changes.",
      "intents": [
        {
          "id": "saveConfiguration",
          "kind": "submit"
        }
      ]
    },
    "agentLimits": {
      "kind": "detail",
      "text": "The agent's limits as the cm lists them: each limit's name and its current value, for reference only.",
      "intents": []
    }
  },
  "molecules": {
    "agentConfigurationForm": [
      {
        "role": "agent @name",
        "preferred": "groupentertext--ml-floating-text-input",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "agent on or off",
        "preferred": "groupenterboolean--ml-toggle-switch",
        "alternative": "groupenterboolean--ml-toggle-icon"
      },
      {
        "role": "responsible person picker",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "name refused or saved message",
        "preferred": "groupnotifyuser--ml-contextual-feedback",
        "alternative": "groupnotifyuser--ml-toast-notification"
      }
    ],
    "agentLimits": [
      {
        "role": "list of limits with their values",
        "preferred": "groupviewdata--ml-vertical-record-list"
      }
    ]
  }
} as const;
