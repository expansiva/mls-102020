/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/draft_review.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/aiAssistedAuthoring/page21.md",
    "experience": "generateReviewShare"
  },
  "intent": "On a narrow screen around 390px, which should also work at 360px and 430px, let the company admin read the ready draft and adjust its suggested tools. They can then try it and activate or discard it, all in one fluid column.",
  "sections": [
    {
      "id": "draftReview",
      "priority": "primary",
      "purpose": "Start with the draft's @name and what the agent is, who it talks to and on whose behalf it acts. Longer texts such as the proposed behavior open on request.",
      "organisms": [
        "draftSummary"
      ]
    },
    {
      "id": "draftToolsSection",
      "priority": "main",
      "purpose": "Show the suggested tools grouped by module and subject, opening one group at a time, so the admin can turn each tool on or off with a thumb.",
      "organisms": [
        "draftTools"
      ]
    },
    {
      "id": "draftTrySection",
      "priority": "secondary",
      "purpose": "Let the admin try the draft with a person, a role or a sample sentence and read the results stacked below. Nothing is saved.",
      "organisms": [
        "draftSimulation"
      ]
    },
    {
      "id": "draftDecisionSection",
      "priority": "primary",
      "purpose": "Keep the final decision within reach at the end of the review: activate the agent or discard the draft.",
      "organisms": [
        "draftDecision"
      ]
    }
  ],
  "organisms": {
    "draftSummary": {
      "kind": "detail",
      "text": "The ready draft: the @name of the new agent, what it is, who it talks to, on whose behalf it acts and the behavior the cm proposes. It also shows the original description and who requested it and when.",
      "intents": []
    },
    "draftTools": {
      "kind": "list",
      "text": "Tools suggested for the draft, grouped by module and subject, with readable names and descriptions. Each one has a checkbox to turn it on or off. Tools removed from the release are marked, and the list shows who made each choice.",
      "intents": [
        {
          "id": "saveDraftTools",
          "kind": "submit"
        }
      ]
    },
    "draftSimulation": {
      "kind": "form",
      "text": "Try the draft. Pick a person or role to see which tools it can or cannot use and why. Or type a sentence to see whether it asks for an action, which part of the tree it points to and which actions it would take.",
      "intents": []
    },
    "draftDecision": {
      "kind": "actions",
      "text": "Activate the agent so it starts working with the reviewed tools, or discard the draft so it no longer shows as ready.",
      "intents": [
        {
          "id": "activateDraft",
          "kind": "submit"
        },
        {
          "id": "discardDraft",
          "kind": "submit"
        },
        {
          "id": "backToAgents",
          "kind": "navigate",
          "to": "agents"
        }
      ]
    }
  },
  "molecules": {
    "draftSummary": [
      {
        "role": "draft identity card",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-profile-card"
      }
    ],
    "draftTools": [
      {
        "role": "module groups, one open at a time",
        "preferred": "groupexpandcontent--ml-accordion",
        "alternative": "groupexpandcontent--ml-collapsible-panel"
      },
      {
        "role": "module / subject / action tool tree with checkboxes",
        "preferred": "groupselectmany--ml-tree-multi-select",
        "alternative": "groupselectmany--ml-multi-checkbox-list"
      }
    ],
    "draftSimulation": [
      {
        "role": "choose what to simulate for: person or role",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-radio-group"
      },
      {
        "role": "person or role picker",
        "preferred": "groupselectone--ml-select-one-autocomplete",
        "alternative": "groupselectone--ml-combobox"
      },
      {
        "role": "sample sentence",
        "preferred": "groupentertext--ml-multiline-text",
        "alternative": "groupentertext--ml-enter-text"
      },
      {
        "role": "run the simulation",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "tool verdicts and understood actions",
        "preferred": "groupviewdata--ml-vertical-record-list"
      }
    ],
    "draftDecision": [
      {
        "role": "activate or discard",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-button-standard"
      }
    ]
  }
} as const;
