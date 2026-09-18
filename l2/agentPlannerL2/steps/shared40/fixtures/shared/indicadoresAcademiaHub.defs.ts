/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/shared/indicadoresAcademiaHub.defs.ts" enhancement="_blank"/>

/**
 * uiScenary contract (page skeleton reads `scenaries[].value` as <Scene value>):
 *   scenaries[]: { value, kind: "base"|"detail"|"command", commandName?, preconditions: stateKey[] }
 *   preconditions = required route/selection inputs (skill rule 8). Unsatisfied → base, silently.
 *   URL `?scenary=` is a request; the shared setter is the source of truth.
 *   destructiveCommandIds never become scenes (confirmation stays a modal).
 */
export const definition = {
  "pageId": "indicadoresAcademiaHub",
  "pageName": "Indicadores da academia",
  "moduleName": "mensalidadesAcademia",
  "baseClassName": "MensalidadesAcademiaIndicadoresAcademiaHubBase",
  "routePattern": "/mensalidadesAcademia/indicadoresAcademiaHub",
  "sourceKind": "landing",
  "ownerIds": [
    "workspace:indicadoresAcademiaHub",
    "contract:mensalidadesAcademia.indicadoresAcademiaHub.qryInspectMensalidade"
  ],
  "operationIds": [
    "qryInspectMensalidade"
  ],
  "origin": {
    "source": "l4-journey",
    "workspaceId": "indicadoresAcademiaHub",
    "workspaceKind": "landing",
    "actor": "gerencia",
    "entity": "Mensalidade",
    "owners": [
      {
        "kind": "operation",
        "id": "qryInspectMensalidade",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/acompanharIndicadoresAcademia.defs.ts"
      }
    ],
    "microUserFlow": {
      "source": "l4/story.steps",
      "workflowSteps": [],
      "operations": [
        {
          "operationId": "qryInspectMensalidade",
          "commandName": "qryInspectMensalidade",
          "steps": []
        }
      ]
    }
  },
  "contractRef": {
    "tsPath": "_102047_/l2/mensalidadesAcademia/web/contracts/indicadoresAcademiaHub.ts",
    "contracts": [
      {
        "commandName": "qryInspectMensalidade",
        "routeConst": "qryInspectMensalidadeRoute"
      }
    ]
  },
  "layoutRef": {
    "defPath": "_102047_/l2/mensalidadesAcademia/web/desktop/page11/indicadoresAcademiaHub.defs.ts",
    "layoutId": "indicadores-academia-hub-workspace"
  },
  "states": [
    {
      "stateKey": "ui.indicadoresAcademiaHub.status",
      "name": "status",
      "kind": "pageStatus",
      "defaultValue": ""
    },
    {
      "stateKey": "ui.indicadoresAcademiaHub.scenary",
      "name": "uiScenary",
      "kind": "uiScenary",
      "defaultValue": "base",
      "valueSet": [
        "base"
      ]
    },
    {
      "stateKey": "ui.indicadoresAcademiaHub.action.qryInspectMensalidade.status",
      "name": "qryInspectMensalidadeState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "qryInspectMensalidade"
    },
    {
      "stateKey": "ui.indicadoresAcademiaHub.input.qryInspectMensalidade.competencia",
      "name": "qryInspectMensalidadeCompetencia",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "qryInspectMensalidade",
        "direction": "input",
        "field": "competencia"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.indicadoresAcademiaHub.data.qryInspectMensalidade",
      "name": "qryInspectMensalidadeData",
      "kind": "queryResult",
      "defaultValue": null,
      "contractRef": {
        "commandName": "qryInspectMensalidade",
        "direction": "output"
      },
      "outputShape": "object",
      "collection": false
    }
  ],
  "actions": [
    {
      "actionId": "qryInspectMensalidade",
      "kind": "query",
      "methodName": "loadQryInspectMensalidade",
      "handlerName": "handleQryInspectMensalidadeClick",
      "commandRef": "qryInspectMensalidade",
      "routeKey": "mensalidadesAcademia.indicadoresAcademiaHub.qryInspectMensalidade",
      "purpose": "qryInspectMensalidade",
      "inputStateKeys": [
        "ui.indicadoresAcademiaHub.input.qryInspectMensalidade.competencia"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [],
      "outputStateKeys": [
        "ui.indicadoresAcademiaHub.data.qryInspectMensalidade"
      ],
      "statusStateKey": "ui.indicadoresAcademiaHub.action.qryInspectMensalidade.status"
    },
    {
      "actionId": "set.qryInspectMensalidadeCompetencia",
      "kind": "stateSetter",
      "methodName": "setQryInspectMensalidadeCompetencia",
      "handlerName": "handleQryInspectMensalidadeCompetenciaChange",
      "stateKey": "ui.indicadoresAcademiaHub.input.qryInspectMensalidade.competencia"
    }
  ],
  "scenaries": [
    {
      "value": "base",
      "kind": "base",
      "commandName": "qryInspectMensalidade",
      "preconditions": []
    }
  ],
  "destructiveCommandIds": [],
  "initialLoads": [],
  "dataBindings": [
    {
      "id": "binding.indicadoresAcademiaHub.qryInspectMensalidade",
      "source": "bff.qryInspectMensalidade",
      "command": "qryInspectMensalidade",
      "description": "qryInspectMensalidade",
      "kind": "query",
      "stateKey": "ui.indicadoresAcademiaHub.data.qryInspectMensalidade",
      "inputStateKeys": [
        "ui.indicadoresAcademiaHub.input.qryInspectMensalidade.competencia"
      ],
      "inputs": [
        {
          "name": "competencia",
          "stateKey": "ui.indicadoresAcademiaHub.input.qryInspectMensalidade.competencia",
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
    "statePrefix": "ui.indicadoresAcademiaHub",
    "stateKeys": [
      "ui.indicadoresAcademiaHub.status",
      "ui.indicadoresAcademiaHub.scenary",
      "ui.indicadoresAcademiaHub.action.qryInspectMensalidade.status",
      "ui.indicadoresAcademiaHub.input.qryInspectMensalidade.competencia",
      "ui.indicadoresAcademiaHub.data.qryInspectMensalidade"
    ],
    "actionIds": [
      "qryInspectMensalidade",
      "set.qryInspectMensalidadeCompetencia"
    ]
  }
} as const;
