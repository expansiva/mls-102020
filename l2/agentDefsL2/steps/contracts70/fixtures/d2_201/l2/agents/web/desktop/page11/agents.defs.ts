/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agents.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/aiAssistedAuthoring/page21.md",
    "experience": "generateReviewShare"
  },
  "intent": "Give the company a single starting point for its virtual employees: see which drafts the cm has ready for review, browse every agent and draft with its situation, describe a new agent in plain words, and follow what happened to each request.",
  "sections": [
    {
      "id": "reviewQueue",
      "priority": "primary",
      "purpose": "Bring forward the drafts the cm has prepared and that are waiting for your review, plus the requests you are still describing, so nothing ready is left unattended.",
      "organisms": [
        "draftsInbox"
      ]
    },
    {
      "id": "agentsCollection",
      "priority": "main",
      "purpose": "Show every company agent and draft side by side so anyone can see who each agent talks to, whether it is on and who is responsible, and open it to work with it.",
      "organisms": [
        "agentsList"
      ]
    },
    {
      "id": "newVirtualEmployee",
      "priority": "secondary",
      "purpose": "Let the admin ask for a new virtual employee by describing it and its functions in plain words.",
      "organisms": [
        "newAgentForm"
      ]
    },
    {
      "id": "requestHistory",
      "priority": "secondary",
      "purpose": "Explain what happened to each request: sent, draft ready with suggested tools turned on, or refused with the reason.",
      "organisms": [
        "requestTimeline"
      ]
    }
  ],
  "organisms": {
    "draftsInbox": {
      "kind": "inbox",
      "text": "Drafts the cm has prepared and that are waiting for your review, and requests for new agents you are still describing; open a ready draft to review, simulate and activate or discard it.",
      "intents": [
        {
          "id": "openDraftReview",
          "kind": "navigate",
          "to": "draft_review"
        }
      ]
    },
    "agentsList": {
      "kind": "list",
      "text": "All company agents and drafts: name, who the agent talks to, whether it is on, who is responsible, and for drafts whether they are preparing, ready or refused with the reason. Open an agent to see its overview, activity or simulation, or, as admin, its behavior, tools and configuration; members can open their own conduct with an agent.",
      "intents": [
        {
          "id": "openAgentOverview",
          "kind": "navigate",
          "to": "agent_overview"
        },
        {
          "id": "openAgentActivity",
          "kind": "navigate",
          "to": "agent_activity"
        },
        {
          "id": "openAgentSimulation",
          "kind": "navigate",
          "to": "agent_simulation"
        },
        {
          "id": "openAgentBehavior",
          "kind": "navigate",
          "to": "agent_behavior"
        },
        {
          "id": "openAgentTools",
          "kind": "navigate",
          "to": "agent_tools"
        },
        {
          "id": "openAgentConfiguration",
          "kind": "navigate",
          "to": "agent_configuration"
        },
        {
          "id": "openMyConduct",
          "kind": "navigate",
          "to": "my_conduct"
        },
        {
          "id": "openReadyDraft",
          "kind": "navigate",
          "to": "draft_review"
        }
      ]
    },
    "newAgentForm": {
      "kind": "form",
      "text": "Create a new virtual employee: describe the agent and its functions in plain words and send it to the cm, which prepares a draft or refuses it.",
      "intents": [
        {
          "id": "sendNewAgentRequest",
          "kind": "submit"
        }
      ]
    },
    "requestTimeline": {
      "kind": "timeline",
      "text": "What happened to each request: sent, draft ready with suggested tools turned on, or refused with the reason given by the cm.",
      "intents": [
        {
          "id": "openDraftFromHistory",
          "kind": "navigate",
          "to": "draft_review"
        }
      ]
    }
  },
  "molecules": {
    "draftsInbox": [
      {
        "role": "pending drafts list",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      },
      {
        "role": "open draft for review",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-icon-button"
      }
    ],
    "agentsList": [
      {
        "role": "agents and drafts table",
        "preferred": "groupviewtable--ml-advanced-data-table",
        "alternative": "groupviewtable--ml-data-table"
      },
      {
        "role": "find an agent",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      },
      {
        "role": "filter by situation",
        "preferred": "groupselectone--ml-segmented-control",
        "alternative": "groupselectone--ml-select"
      },
      {
        "role": "on indicator",
        "preferred": "groupenterboolean--ml-toggle-icon"
      }
    ],
    "newAgentForm": [
      {
        "role": "agent description",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "send to the cm",
        "preferred": "grouptriggeraction--ml-button-standard"
      },
      {
        "role": "request sent confirmation",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ],
    "requestTimeline": [
      {
        "role": "request events",
        "preferred": "groupviewdata--ml-timeline-view",
        "alternative": "groupviewdata--ml-vertical-record-list"
      },
      {
        "role": "refusal reason details",
        "preferred": "groupexpandcontent--ml-readmore-expand",
        "alternative": "groupexpandcontent--ml-single-expand-content"
      }
    ]
  }
} as const;
