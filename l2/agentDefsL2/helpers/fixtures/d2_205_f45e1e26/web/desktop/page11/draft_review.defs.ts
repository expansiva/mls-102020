/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/draft_review.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/aiAssistedAuthoring/page21.md",
    "experience": "generateReviewShare"
  },
  "intent": "Let the company admin check the draft the cm prepared for a new virtual employee before it goes to work. The page shows who the agent would be, adjusts the suggested tools, tries what the agent can do and understands, and then activates or discards the draft.",
  "sections": [
    {
      "id": "draftReview",
      "priority": "primary",
      "purpose": "Show who the new agent is, what it will do, who it talks to and on whose behalf it acts, so the admin knows exactly what they are approving.",
      "organisms": [
        "draftSummary"
      ]
    },
    {
      "id": "draftToolsSection",
      "priority": "main",
      "purpose": "Let the admin see the tools the cm suggested, grouped by module and subject, and turn each one on or off. The automatic choice never overrides these choices.",
      "organisms": [
        "draftTools"
      ]
    },
    {
      "id": "draftTrySection",
      "priority": "secondary",
      "purpose": "Let the admin try the draft before deciding. They can pick a person or role to see which tools the agent could use, or type a sentence to see how the agent reads it. Nothing is saved.",
      "organisms": [
        "draftSimulation"
      ]
    },
    {
      "id": "draftDecisionSection",
      "priority": "primary",
      "purpose": "Close the review: put the agent to work or discard the draft.",
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
        "preferred": "groupviewcard--ml-profile-card",
        "alternative": "groupviewcard--ml-vertical-card"
      }
    ],
    "draftTools": [
      {
        "role": "module / subject / action tool tree with checkboxes",
        "preferred": "groupselectmany--ml-tree-multi-select",
        "alternative": "groupselectmany--ml-multi-checkbox-list"
      },
      {
        "role": "module groups that can be opened together",
        "preferred": "groupexpandcontent--ml-collapsible-panel",
        "alternative": "groupexpandcontent--ml-accordion"
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
        "preferred": "groupselectone--ml-combobox",
        "alternative": "groupselectone--ml-select-one-autocomplete"
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
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      }
    ],
    "draftDecision": [
      {
        "role": "activate or discard",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-split-button"
      }
    ]
  }
} as const;
