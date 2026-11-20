/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_configuration.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/settingsConsole/page21.md",
    "experience": "sectionedForm"
  },
  "intent": "Let the company admin see and change how people call the chosen agent, whether it is on and who is responsible for it, and read the agent's limits as the cm lists them, so the configuration is saved in the cm or the admin knows why a name was refused.",
  "sections": [
    {
      "id": "configurationSettings",
      "priority": "primary",
      "purpose": "The agent's editable configuration: the @name people type in a chat, whether the agent is on, and the responsible person, with a clear message when another active agent already uses the name.",
      "organisms": [
        "agentConfigurationForm"
      ]
    },
    {
      "id": "agentLimitsSection",
      "priority": "secondary",
      "purpose": "Read-only reference of the limits the cm applies to this agent, shown next to the settings so the admin sees them while configuring.",
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
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "agent on or off",
        "preferred": "groupenterboolean--ml-toggle-switch",
        "alternative": "groupenterboolean--ml-boolean-segmented"
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
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      }
    ]
  }
} as const;
