/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/shared/mensalidadeCatalogue.defs.ts" enhancement="_blank"/>

/**
 * uiScenary contract (page skeleton reads `scenaries[].value` as <Scene value>):
 *   scenaries[]: { value, kind: "base"|"detail"|"command", commandName?, preconditions: stateKey[] }
 *   preconditions = required route/selection inputs (skill rule 8). Unsatisfied → base, silently.
 *   URL `?scenary=` is a request; the shared setter is the source of truth.
 *   destructiveCommandIds never become scenes (confirmation stays a modal).
 */
export const definition = {
  "pageId": "mensalidadeCatalogue",
  "pageName": "Mensalidades e pagamentos",
  "moduleName": "mensalidadesAcademia",
  "baseClassName": "MensalidadesAcademiaMensalidadeCatalogueBase",
  "routePattern": "/mensalidadesAcademia/mensalidadeCatalogue",
  "sourceKind": "operation",
  "ownerIds": [
    "workspace:mensalidadeCatalogue",
    "contract:mensalidadesAcademia.mensalidadeCatalogue.qryListMensalidade",
    "contract:mensalidadesAcademia.mensalidadeCatalogue.qryGetMensalidade",
    "contract:mensalidadesAcademia.mensalidadeCatalogue.cmdCreatePagamento"
  ],
  "operationIds": [
    "qryListMensalidade",
    "qryGetMensalidade",
    "cmdCreatePagamento"
  ],
  "origin": {
    "source": "l4-journey",
    "workspaceId": "mensalidadeCatalogue",
    "workspaceKind": "operation",
    "actor": "recepcao",
    "entity": "Mensalidade",
    "owners": [
      {
        "kind": "operation",
        "id": "qryListMensalidade",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/registrarPagamentoMensalidade.defs.ts"
      },
      {
        "kind": "operation",
        "id": "qryGetMensalidade",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/registrarPagamentoMensalidade.defs.ts"
      },
      {
        "kind": "operation",
        "id": "cmdCreatePagamento",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/registrarPagamentoMensalidade.defs.ts"
      }
    ],
    "microUserFlow": {
      "source": "l4/story.steps",
      "workflowSteps": [],
      "operations": [
        {
          "operationId": "qryListMensalidade",
          "commandName": "qryListMensalidade",
          "steps": []
        },
        {
          "operationId": "qryGetMensalidade",
          "commandName": "qryGetMensalidade",
          "steps": []
        },
        {
          "operationId": "cmdCreatePagamento",
          "commandName": "cmdCreatePagamento",
          "steps": []
        }
      ]
    }
  },
  "contractRef": {
    "tsPath": "_102047_/l2/mensalidadesAcademia/web/contracts/mensalidadeCatalogue.ts",
    "contracts": [
      {
        "commandName": "qryListMensalidade",
        "routeConst": "qryListMensalidadeRoute"
      },
      {
        "commandName": "qryGetMensalidade",
        "routeConst": "qryGetMensalidadeRoute"
      },
      {
        "commandName": "cmdCreatePagamento",
        "routeConst": "cmdCreatePagamentoRoute"
      }
    ]
  },
  "layoutRef": {
    "defPath": "_102047_/l2/mensalidadesAcademia/web/desktop/page11/mensalidadeCatalogue.defs.ts",
    "layoutId": "mensalidade-catalogue-workspace"
  },
  "states": [
    {
      "stateKey": "ui.mensalidadeCatalogue.status",
      "name": "status",
      "kind": "pageStatus",
      "defaultValue": ""
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.scenary",
      "name": "uiScenary",
      "kind": "uiScenary",
      "defaultValue": "base",
      "valueSet": [
        "base",
        "detail",
        "createPagamento"
      ]
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.action.qryListMensalidade.status",
      "name": "qryListMensalidadeState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "qryListMensalidade"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.input.qryListMensalidade.matriculaId",
      "name": "qryListMensalidadeMatriculaId",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "qryListMensalidade",
        "direction": "input",
        "field": "matriculaId"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.input.qryListMensalidade.competencia",
      "name": "qryListMensalidadeCompetencia",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "qryListMensalidade",
        "direction": "input",
        "field": "competencia"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.data.qryListMensalidade",
      "name": "qryListMensalidadeData",
      "kind": "queryResult",
      "defaultValue": {
        "mensalidadeItems": [],
        "total": 0
      },
      "contractRef": {
        "commandName": "qryListMensalidade",
        "direction": "output"
      },
      "outputShape": "paginated",
      "collection": true
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.action.qryGetMensalidade.status",
      "name": "qryGetMensalidadeState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "qryGetMensalidade"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.input.qryGetMensalidade.id",
      "name": "qryGetMensalidadeId",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "qryGetMensalidade",
        "direction": "input",
        "field": "id"
      },
      "source": "selectedEntity",
      "presentation": "selection"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.data.qryGetMensalidade",
      "name": "qryGetMensalidadeData",
      "kind": "queryResult",
      "defaultValue": null,
      "contractRef": {
        "commandName": "qryGetMensalidade",
        "direction": "output"
      },
      "outputShape": "object",
      "collection": false
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.action.cmdCreatePagamento.status",
      "name": "cmdCreatePagamentoState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "cmdCreatePagamento"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.mensalidadeId",
      "name": "cmdCreatePagamentoMensalidadeId",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "cmdCreatePagamento",
        "direction": "input",
        "field": "mensalidadeId"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.dataPagamento",
      "name": "cmdCreatePagamentoDataPagamento",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "cmdCreatePagamento",
        "direction": "input",
        "field": "dataPagamento"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.valor",
      "name": "cmdCreatePagamentoValor",
      "kind": "input",
      "defaultValue": 0,
      "contractRef": {
        "commandName": "cmdCreatePagamento",
        "direction": "input",
        "field": "valor"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.formaPagamento",
      "name": "cmdCreatePagamentoFormaPagamento",
      "kind": "input",
      "defaultValue": "",
      "valueSet": [
        "cash",
        "pix",
        "debitCard",
        "creditCard",
        "bankTransfer"
      ],
      "contractRef": {
        "commandName": "cmdCreatePagamento",
        "direction": "input",
        "field": "formaPagamento"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.output.cmdCreatePagamento",
      "name": "cmdCreatePagamentoOutput",
      "kind": "commandOutput",
      "defaultValue": null,
      "contractRef": {
        "commandName": "cmdCreatePagamento",
        "direction": "output"
      }
    },
    {
      "stateKey": "ui.mensalidadeCatalogue.action.cmdCreatePagamento.error",
      "name": "cmdCreatePagamentoError",
      "kind": "actionError",
      "defaultValue": "",
      "actionRef": "cmdCreatePagamento"
    }
  ],
  "actions": [
    {
      "actionId": "qryListMensalidade",
      "kind": "query",
      "methodName": "loadQryListMensalidade",
      "handlerName": "handleQryListMensalidadeClick",
      "commandRef": "qryListMensalidade",
      "routeKey": "mensalidadesAcademia.mensalidadeCatalogue.qryListMensalidade",
      "purpose": "qryListMensalidade",
      "inputStateKeys": [
        "ui.mensalidadeCatalogue.input.qryListMensalidade.matriculaId",
        "ui.mensalidadeCatalogue.input.qryListMensalidade.competencia"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [],
      "outputStateKeys": [
        "ui.mensalidadeCatalogue.data.qryListMensalidade"
      ],
      "statusStateKey": "ui.mensalidadeCatalogue.action.qryListMensalidade.status"
    },
    {
      "actionId": "qryGetMensalidade",
      "kind": "query",
      "methodName": "loadQryGetMensalidade",
      "handlerName": "handleQryGetMensalidadeClick",
      "commandRef": "qryGetMensalidade",
      "routeKey": "mensalidadesAcademia.mensalidadeCatalogue.qryGetMensalidade",
      "purpose": "qryGetMensalidade",
      "inputStateKeys": [
        "ui.mensalidadeCatalogue.input.qryGetMensalidade.id"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [
        "ui.mensalidadeCatalogue.input.qryGetMensalidade.id"
      ],
      "outputStateKeys": [
        "ui.mensalidadeCatalogue.data.qryGetMensalidade"
      ],
      "statusStateKey": "ui.mensalidadeCatalogue.action.qryGetMensalidade.status"
    },
    {
      "actionId": "cmdCreatePagamento",
      "kind": "command",
      "methodName": "cmdCreatePagamento",
      "handlerName": "handleCmdCreatePagamentoClick",
      "commandRef": "cmdCreatePagamento",
      "routeKey": "mensalidadesAcademia.mensalidadeCatalogue.cmdCreatePagamento",
      "purpose": "cmdCreatePagamento",
      "inputStateKeys": [
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.mensalidadeId",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.dataPagamento",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.valor",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.formaPagamento"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [],
      "outputStateKeys": [
        "ui.mensalidadeCatalogue.output.cmdCreatePagamento"
      ],
      "statusStateKey": "ui.mensalidadeCatalogue.action.cmdCreatePagamento.status",
      "errorStateKey": "ui.mensalidadeCatalogue.action.cmdCreatePagamento.error",
      "feedback": {
        "successMessageKey": "action.cmdCreatePagamento.success",
        "errorMessageKey": "action.cmdCreatePagamento.error",
        "dismissible": true
      },
      "clearInputStateKeys": [
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.mensalidadeId",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.dataPagamento",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.valor",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.formaPagamento"
      ],
      "refreshActionIds": [
        "qryListMensalidade",
        "qryGetMensalidade"
      ]
    },
    {
      "actionId": "set.qryListMensalidadeMatriculaId",
      "kind": "stateSetter",
      "methodName": "setQryListMensalidadeMatriculaId",
      "handlerName": "handleQryListMensalidadeMatriculaIdChange",
      "stateKey": "ui.mensalidadeCatalogue.input.qryListMensalidade.matriculaId"
    },
    {
      "actionId": "set.qryListMensalidadeCompetencia",
      "kind": "stateSetter",
      "methodName": "setQryListMensalidadeCompetencia",
      "handlerName": "handleQryListMensalidadeCompetenciaChange",
      "stateKey": "ui.mensalidadeCatalogue.input.qryListMensalidade.competencia"
    },
    {
      "actionId": "set.qryGetMensalidadeId",
      "kind": "stateSetter",
      "methodName": "setQryGetMensalidadeId",
      "handlerName": "handleQryGetMensalidadeIdChange",
      "stateKey": "ui.mensalidadeCatalogue.input.qryGetMensalidade.id"
    },
    {
      "actionId": "set.cmdCreatePagamentoMensalidadeId",
      "kind": "stateSetter",
      "methodName": "setCmdCreatePagamentoMensalidadeId",
      "handlerName": "handleCmdCreatePagamentoMensalidadeIdChange",
      "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.mensalidadeId"
    },
    {
      "actionId": "set.cmdCreatePagamentoDataPagamento",
      "kind": "stateSetter",
      "methodName": "setCmdCreatePagamentoDataPagamento",
      "handlerName": "handleCmdCreatePagamentoDataPagamentoChange",
      "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.dataPagamento"
    },
    {
      "actionId": "set.cmdCreatePagamentoValor",
      "kind": "stateSetter",
      "methodName": "setCmdCreatePagamentoValor",
      "handlerName": "handleCmdCreatePagamentoValorChange",
      "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.valor"
    },
    {
      "actionId": "set.cmdCreatePagamentoFormaPagamento",
      "kind": "stateSetter",
      "methodName": "setCmdCreatePagamentoFormaPagamento",
      "handlerName": "handleCmdCreatePagamentoFormaPagamentoChange",
      "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.formaPagamento"
    }
  ],
  "scenaries": [
    {
      "value": "base",
      "kind": "base",
      "commandName": "qryListMensalidade",
      "preconditions": []
    },
    {
      "value": "detail",
      "kind": "detail",
      "commandName": "qryGetMensalidade",
      "preconditions": [
        "ui.mensalidadeCatalogue.input.qryGetMensalidade.id"
      ]
    },
    {
      "value": "createPagamento",
      "kind": "command",
      "commandName": "cmdCreatePagamento",
      "preconditions": []
    }
  ],
  "destructiveCommandIds": [],
  "initialLoads": [],
  "dataBindings": [
    {
      "id": "binding.mensalidadeCatalogue.qryListMensalidade",
      "source": "bff.qryListMensalidade",
      "command": "qryListMensalidade",
      "description": "qryListMensalidade",
      "kind": "query",
      "stateKey": "ui.mensalidadeCatalogue.data.qryListMensalidade",
      "inputStateKeys": [
        "ui.mensalidadeCatalogue.input.qryListMensalidade.matriculaId",
        "ui.mensalidadeCatalogue.input.qryListMensalidade.competencia"
      ],
      "inputs": [
        {
          "name": "matriculaId",
          "stateKey": "ui.mensalidadeCatalogue.input.qryListMensalidade.matriculaId",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        },
        {
          "name": "competencia",
          "stateKey": "ui.mensalidadeCatalogue.input.qryListMensalidade.competencia",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        }
      ],
      "selection": "single"
    },
    {
      "id": "binding.mensalidadeCatalogue.qryGetMensalidade",
      "source": "bff.qryGetMensalidade",
      "command": "qryGetMensalidade",
      "description": "qryGetMensalidade",
      "kind": "query",
      "stateKey": "ui.mensalidadeCatalogue.data.qryGetMensalidade",
      "inputStateKeys": [
        "ui.mensalidadeCatalogue.input.qryGetMensalidade.id"
      ],
      "inputs": [
        {
          "name": "id",
          "stateKey": "ui.mensalidadeCatalogue.input.qryGetMensalidade.id",
          "source": "selectedEntity",
          "required": true,
          "presentation": "selection"
        }
      ],
      "selection": "none"
    },
    {
      "id": "binding.mensalidadeCatalogue.cmdCreatePagamento",
      "source": "bff.cmdCreatePagamento",
      "command": "cmdCreatePagamento",
      "description": "cmdCreatePagamento",
      "kind": "command",
      "stateKey": "ui.mensalidadeCatalogue.output.cmdCreatePagamento",
      "inputStateKeys": [
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.mensalidadeId",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.dataPagamento",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.valor",
        "ui.mensalidadeCatalogue.input.cmdCreatePagamento.formaPagamento"
      ],
      "inputs": [
        {
          "name": "mensalidadeId",
          "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.mensalidadeId",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        },
        {
          "name": "dataPagamento",
          "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.dataPagamento",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        },
        {
          "name": "valor",
          "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.valor",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        },
        {
          "name": "formaPagamento",
          "stateKey": "ui.mensalidadeCatalogue.input.cmdCreatePagamento.formaPagamento",
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
    "statePrefix": "ui.mensalidadeCatalogue",
    "stateKeys": [
      "ui.mensalidadeCatalogue.status",
      "ui.mensalidadeCatalogue.scenary",
      "ui.mensalidadeCatalogue.action.qryListMensalidade.status",
      "ui.mensalidadeCatalogue.input.qryListMensalidade.matriculaId",
      "ui.mensalidadeCatalogue.input.qryListMensalidade.competencia",
      "ui.mensalidadeCatalogue.data.qryListMensalidade",
      "ui.mensalidadeCatalogue.action.qryGetMensalidade.status",
      "ui.mensalidadeCatalogue.input.qryGetMensalidade.id",
      "ui.mensalidadeCatalogue.data.qryGetMensalidade",
      "ui.mensalidadeCatalogue.action.cmdCreatePagamento.status",
      "ui.mensalidadeCatalogue.input.cmdCreatePagamento.mensalidadeId",
      "ui.mensalidadeCatalogue.input.cmdCreatePagamento.dataPagamento",
      "ui.mensalidadeCatalogue.input.cmdCreatePagamento.valor",
      "ui.mensalidadeCatalogue.input.cmdCreatePagamento.formaPagamento",
      "ui.mensalidadeCatalogue.output.cmdCreatePagamento",
      "ui.mensalidadeCatalogue.action.cmdCreatePagamento.error"
    ],
    "actionIds": [
      "qryListMensalidade",
      "qryGetMensalidade",
      "cmdCreatePagamento",
      "set.qryListMensalidadeMatriculaId",
      "set.qryListMensalidadeCompetencia",
      "set.qryGetMensalidadeId",
      "set.cmdCreatePagamentoMensalidadeId",
      "set.cmdCreatePagamentoDataPagamento",
      "set.cmdCreatePagamentoValor",
      "set.cmdCreatePagamentoFormaPagamento"
    ]
  }
} as const;
