/// <mls fileReference="_102047_/l2/agents/web/shared/my_conduct.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "agentId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:conductSummary",
        "persist": false,
        "required": true
      }
    }
  },
  "requests": {
    "getMyConduct": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "conduct"
      ]
    },
    "listMyConductHistory": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "history"
      ]
    },
    "sendConductChange": {
      "kind": "cmd",
      "trigger": "sendConductChange",
      "returns": [
        "conduct"
      ],
      "writes": "PersonalConduct.update"
    }
  },
  "states": {
    "conduct": {
      "source": "getMyConduct.conduct",
      "description": "The signed-in member's personal conduct with one agent: the agent, how it currently behaves for that member, and the version of the conduct as the cm keeps it.",
      "organisms": [
        "conductChange",
        "conductSummary"
      ]
    },
    "history": {
      "source": "listMyConductHistory.history",
      "description": "the list of One earlier change the member made to their own conduct with an agent: when, who and a one-line summary.",
      "organisms": [
        "conductSummary"
      ]
    }
  },
  "journeys": [
    {
      "step": "changeMyConduct/findMyAgent",
      "organisms": [],
      "continuesIn": "agents"
    },
    {
      "step": "changeMyConduct/readMyConduct",
      "organisms": [
        "conductSummary"
      ]
    },
    {
      "step": "changeMyConduct/changeConduct",
      "organisms": [
        "conductChange"
      ]
    }
  ],
  "rules": [
    "conductOnlyForAgentActingOnBehalf",
    "ownConductOnly"
  ],
  "access": {
    "actors": [
      "companyAdmin",
      "organizationMember"
    ],
    "grants": [
      "adminManageAgents",
      "adminOwnConduct",
      "memberSeeAgents",
      "memberOwnConduct"
    ]
  }
} as const;
