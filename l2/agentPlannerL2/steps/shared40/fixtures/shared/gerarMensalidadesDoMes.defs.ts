/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/shared/gerarMensalidadesDoMes.defs.ts" enhancement="_blank"/>

/**
 * uiScenary contract (page skeleton reads `scenaries[].value` as <Scene value>):
 *   scenaries[]: { value, kind: "base"|"detail"|"command", commandName?, preconditions: stateKey[] }
 *   preconditions = required route/selection inputs (skill rule 8). Unsatisfied → base, silently.
 *   URL `?scenary=` is a request; the shared setter is the source of truth.
 *   destructiveCommandIds never become scenes (confirmation stays a modal).
 */
export const definition = {
  "pageId": "gerarMensalidadesDoMes",
  "pageName": "Gerar mensalidades do mês",
  "moduleName": "mensalidadesAcademia",
  "baseClassName": "MensalidadesAcademiaGerarMensalidadesDoMesBase",
  "routePattern": "/mensalidadesAcademia/gerarMensalidadesDoMes",
  "sourceKind": "operation",
  "ownerIds": [
    "workspace:gerarMensalidadesDoMes",
    "contract:mensalidadesAcademia.gerarMensalidadesDoMes.cmdGerarMensalidadesDoMes"
  ],
  "operationIds": [
    "cmdGerarMensalidadesDoMes"
  ],
  "origin": {
    "source": "l4-journey",
    "workspaceId": "gerarMensalidadesDoMes",
    "workspaceKind": "operation",
    "actor": "gerencia",
    "entity": "Mensalidade",
    "owners": [
      {
        "kind": "operation",
        "id": "cmdGerarMensalidadesDoMes",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/gerarMensalidadesDoMes.defs.ts"
      }
    ],
    "microUserFlow": {
      "source": "l4/story.steps",
      "workflowSteps": [],
      "operations": [
        {
          "operationId": "cmdGerarMensalidadesDoMes",
          "commandName": "cmdGerarMensalidadesDoMes",
          "steps": []
        }
      ]
    }
  },
  "contractRef": {
    "tsPath": "_102047_/l2/mensalidadesAcademia/web/contracts/gerarMensalidadesDoMes.ts",
    "contracts": [
      {
        "commandName": "cmdGerarMensalidadesDoMes",
        "routeConst": "cmdGerarMensalidadesDoMesRoute"
      }
    ]
  },
  "layoutRef": {
    "defPath": "_102047_/l2/mensalidadesAcademia/web/desktop/page11/gerarMensalidadesDoMes.defs.ts",
    "layoutId": "gerar-mensalidades-do-mes-workspace"
  },
  "states": [
    {
      "stateKey": "ui.gerarMensalidadesDoMes.status",
      "name": "status",
      "kind": "pageStatus",
      "defaultValue": ""
    },
    {
      "stateKey": "ui.gerarMensalidadesDoMes.scenary",
      "name": "uiScenary",
      "kind": "uiScenary",
      "defaultValue": "base",
      "valueSet": [
        "base",
        "gerarMensalidadesDoMes"
      ]
    },
    {
      "stateKey": "ui.gerarMensalidadesDoMes.action.cmdGerarMensalidadesDoMes.status",
      "name": "cmdGerarMensalidadesDoMesState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "cmdGerarMensalidadesDoMes"
    },
    {
      "stateKey": "ui.gerarMensalidadesDoMes.input.cmdGerarMensalidadesDoMes.competencia",
      "name": "cmdGerarMensalidadesDoMesCompetencia",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "cmdGerarMensalidadesDoMes",
        "direction": "input",
        "field": "competencia"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.gerarMensalidadesDoMes.output.cmdGerarMensalidadesDoMes",
      "name": "cmdGerarMensalidadesDoMesOutput",
      "kind": "commandOutput",
      "defaultValue": null,
      "contractRef": {
        "commandName": "cmdGerarMensalidadesDoMes",
        "direction": "output"
      }
    },
    {
      "stateKey": "ui.gerarMensalidadesDoMes.action.cmdGerarMensalidadesDoMes.error",
      "name": "cmdGerarMensalidadesDoMesError",
      "kind": "actionError",
      "defaultValue": "",
      "actionRef": "cmdGerarMensalidadesDoMes"
    }
  ],
  "actions": [
    {
      "actionId": "cmdGerarMensalidadesDoMes",
      "kind": "command",
      "methodName": "cmdGerarMensalidadesDoMes",
      "handlerName": "handleCmdGerarMensalidadesDoMesClick",
      "commandRef": "cmdGerarMensalidadesDoMes",
      "routeKey": "mensalidadesAcademia.gerarMensalidadesDoMes.cmdGerarMensalidadesDoMes",
      "purpose": "cmdGerarMensalidadesDoMes",
      "inputStateKeys": [
        "ui.gerarMensalidadesDoMes.input.cmdGerarMensalidadesDoMes.competencia"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [],
      "outputStateKeys": [
        "ui.gerarMensalidadesDoMes.output.cmdGerarMensalidadesDoMes"
      ],
      "statusStateKey": "ui.gerarMensalidadesDoMes.action.cmdGerarMensalidadesDoMes.status",
      "errorStateKey": "ui.gerarMensalidadesDoMes.action.cmdGerarMensalidadesDoMes.error",
      "feedback": {
        "successMessageKey": "action.cmdGerarMensalidadesDoMes.success",
        "errorMessageKey": "action.cmdGerarMensalidadesDoMes.error",
        "dismissible": true
      },
      "clearInputStateKeys": [
        "ui.gerarMensalidadesDoMes.input.cmdGerarMensalidadesDoMes.competencia"
      ]
    },
    {
      "actionId": "set.cmdGerarMensalidadesDoMesCompetencia",
      "kind": "stateSetter",
      "methodName": "setCmdGerarMensalidadesDoMesCompetencia",
      "handlerName": "handleCmdGerarMensalidadesDoMesCompetenciaChange",
      "stateKey": "ui.gerarMensalidadesDoMes.input.cmdGerarMensalidadesDoMes.competencia"
    }
  ],
  "scenaries": [
    {
      "value": "base",
      "kind": "base",
      "commandName": "",
      "preconditions": []
    },
    {
      "value": "gerarMensalidadesDoMes",
      "kind": "command",
      "commandName": "cmdGerarMensalidadesDoMes",
      "preconditions": []
    }
  ],
  "destructiveCommandIds": [],
  "initialLoads": [],
  "dataBindings": [
    {
      "id": "binding.gerarMensalidadesDoMes.cmdGerarMensalidadesDoMes",
      "source": "bff.cmdGerarMensalidadesDoMes",
      "command": "cmdGerarMensalidadesDoMes",
      "description": "cmdGerarMensalidadesDoMes",
      "kind": "command",
      "stateKey": "ui.gerarMensalidadesDoMes.output.cmdGerarMensalidadesDoMes",
      "inputStateKeys": [
        "ui.gerarMensalidadesDoMes.input.cmdGerarMensalidadesDoMes.competencia"
      ],
      "inputs": [
        {
          "name": "competencia",
          "stateKey": "ui.gerarMensalidadesDoMes.input.cmdGerarMensalidadesDoMes.competencia",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        }
      ],
      "selection": "none"
    }
  ],
  "businessContextRefs": [],
  "navigationRefs": [],
  "automation": {
    "statePrefix": "ui.gerarMensalidadesDoMes",
    "stateKeys": [
      "ui.gerarMensalidadesDoMes.status",
      "ui.gerarMensalidadesDoMes.scenary",
      "ui.gerarMensalidadesDoMes.action.cmdGerarMensalidadesDoMes.status",
      "ui.gerarMensalidadesDoMes.input.cmdGerarMensalidadesDoMes.competencia",
      "ui.gerarMensalidadesDoMes.output.cmdGerarMensalidadesDoMes",
      "ui.gerarMensalidadesDoMes.action.cmdGerarMensalidadesDoMes.error"
    ],
    "actionIds": [
      "cmdGerarMensalidadesDoMes",
      "set.cmdGerarMensalidadesDoMesCompetencia"
    ]
  }
} as const;
