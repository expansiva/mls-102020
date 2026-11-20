/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agents.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/aiAssistedAuthoring/page21.md",
    "experience": "generateReviewShare"
  },
  "intent": "On a narrow screen (around 390px, still fine at 360px and 430px), show first the drafts waiting for review, then the agents and drafts as a stacked list you can scroll, with a short box for describing a new virtual employee and the history of requests below.",
  "sections": [
    {
      "id": "reviewQueue",
      "priority": "primary",
      "purpose": "Put the drafts waiting for review at the top so the admin can open a ready one with one tap.",
      "organisms": [
        "draftsInbox"
      ]
    },
    {
      "id": "agentsCollection",
      "priority": "main",
      "purpose": "Show agents and drafts as stacked entries with name, who it talks to, on or off, responsible person and draft situation, and open any of them.",
      "organisms": [
        "agentsList"
      ]
    },
    {
      "id": "newVirtualEmployee",
      "priority": "secondary",
      "purpose": "Let the admin describe a new agent in plain words and send it to the cm from the phone.",
      "organisms": [
        "newAgentForm"
      ]
    },
    {
      "id": "requestHistory",
      "priority": "secondary",
      "purpose": "Keep the history of requests within reach, with refusal reasons that open only when tapped.",
      "organisms": [
        "requestTimeline"
      ]
    }
  ],
  "organisms": {
    "draftsInbox": {
      "kind": "inbox",
      "text": "Drafts the cm has prepared and that are waiting for your review, and requests for new agents you are still describing; tap a ready draft to review it.",
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
      "text": "All company agents and drafts: name, who the agent talks to, whether it is on, who is responsible, and for drafts whether they are preparing, ready or refused with the reason. Tap to open the agent's overview, activity, simulation, behavior, tools, configuration or your own conduct, depending on your role.",
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
        "preferred": "groupviewdata--ml-vertical-record-list"
      },
      {
        "role": "open draft for review",
        "preferred": "grouptriggeraction--ml-button-standard"
      }
    ],
    "agentsList": [
      {
        "role": "agents and drafts list",
        "preferred": "groupviewtable--ml-responsive-data-table",
        "alternative": "groupviewtable--ml-responsive-table"
      },
      {
        "role": "find an agent",
        "preferred": "groupsearchcontent--ml-search-bar"
      },
      {
        "role": "filter by situation",
        "preferred": "groupselectone--ml-select-dropdown",
        "alternative": "groupselectone--ml-segmented-control"
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
        "preferred": "groupnotifyuser--ml-toast-notification"
      }
    ],
    "requestTimeline": [
      {
        "role": "request events",
        "preferred": "groupviewdata--ml-timeline-view"
      },
      {
        "role": "refusal reason details",
        "preferred": "groupexpandcontent--ml-readmore-expand"
      }
    ]
  }
} as const;
