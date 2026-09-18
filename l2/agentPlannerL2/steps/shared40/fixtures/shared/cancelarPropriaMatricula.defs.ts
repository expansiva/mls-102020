/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/shared/cancelarPropriaMatricula.defs.ts" enhancement="_blank"/>

/**
 * uiScenary contract (page skeleton reads `scenaries[].value` as <Scene value>):
 *   scenaries[]: { value, kind: "base"|"detail"|"command", commandName?, preconditions: stateKey[] }
 *   preconditions = required route/selection inputs (skill rule 8). Unsatisfied → base, silently.
 *   URL `?scenary=` is a request; the shared setter is the source of truth.
 *   destructiveCommandIds never become scenes (confirmation stays a modal).
 */
export const definition = {
  "pageId": "cancelarPropriaMatricula",
  "pageName": "Cancelar própria matrícula",
  "moduleName": "mensalidadesAcademia",
  "baseClassName": "MensalidadesAcademiaCancelarPropriaMatriculaBase",
  "routePattern": "/mensalidadesAcademia/cancelarPropriaMatricula",
  "sourceKind": "operation",
  "ownerIds": [
    "workspace:cancelarPropriaMatricula",
    "contract:mensalidadesAcademia.cancelarPropriaMatricula.qryListMatricula",
    "contract:mensalidadesAcademia.cancelarPropriaMatricula.qryGetMatricula",
    "contract:mensalidadesAcademia.cancelarPropriaMatricula.cmdCancelarMatricula"
  ],
  "operationIds": [
    "qryListMatricula",
    "qryGetMatricula",
    "cmdCancelarMatricula"
  ],
  "origin": {
    "source": "l4-journey",
    "workspaceId": "cancelarPropriaMatricula",
    "workspaceKind": "operation",
    "actor": "aluno",
    "entity": "Matricula",
    "owners": [
      {
        "kind": "operation",
        "id": "qryListMatricula",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/cancelarPropriaMatricula.defs.ts"
      },
      {
        "kind": "operation",
        "id": "qryGetMatricula",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/cancelarPropriaMatricula.defs.ts"
      },
      {
        "kind": "operation",
        "id": "cmdCancelarMatricula",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/cancelarPropriaMatricula.defs.ts"
      }
    ],
    "microUserFlow": {
      "source": "l4/story.steps",
      "workflowSteps": [],
      "operations": [
        {
          "operationId": "qryListMatricula",
          "commandName": "qryListMatricula",
          "steps": []
        },
        {
          "operationId": "qryGetMatricula",
          "commandName": "qryGetMatricula",
          "steps": []
        },
        {
          "operationId": "cmdCancelarMatricula",
          "commandName": "cmdCancelarMatricula",
          "steps": []
        }
      ]
    }
  },
  "contractRef": {
    "tsPath": "_102047_/l2/mensalidadesAcademia/web/contracts/cancelarPropriaMatricula.ts",
    "contracts": [
      {
        "commandName": "qryListMatricula",
        "routeConst": "qryListMatriculaRoute"
      },
      {
        "commandName": "qryGetMatricula",
        "routeConst": "qryGetMatriculaRoute"
      },
      {
        "commandName": "cmdCancelarMatricula",
        "routeConst": "cmdCancelarMatriculaRoute"
      }
    ]
  },
  "layoutRef": {
    "defPath": "_102047_/l2/mensalidadesAcademia/web/desktop/page11/cancelarPropriaMatricula.defs.ts",
    "layoutId": "cancelar-propria-matricula-workspace"
  },
  "states": [
    {
      "stateKey": "ui.cancelarPropriaMatricula.status",
      "name": "status",
      "kind": "pageStatus",
      "defaultValue": ""
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.scenary",
      "name": "uiScenary",
      "kind": "uiScenary",
      "defaultValue": "base",
      "valueSet": [
        "base",
        "detail"
      ]
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.action.qryListMatricula.status",
      "name": "qryListMatriculaState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "qryListMatricula"
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.data.qryListMatricula",
      "name": "qryListMatriculaData",
      "kind": "queryResult",
      "defaultValue": {
        "matriculaItems": [],
        "total": 0
      },
      "contractRef": {
        "commandName": "qryListMatricula",
        "direction": "output"
      },
      "outputShape": "paginated",
      "collection": true
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.action.qryGetMatricula.status",
      "name": "qryGetMatriculaState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "qryGetMatricula"
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.input.qryGetMatricula.id",
      "name": "qryGetMatriculaId",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "qryGetMatricula",
        "direction": "input",
        "field": "id"
      },
      "source": "selectedEntity",
      "presentation": "selection"
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.data.qryGetMatricula",
      "name": "qryGetMatriculaData",
      "kind": "queryResult",
      "defaultValue": null,
      "contractRef": {
        "commandName": "qryGetMatricula",
        "direction": "output"
      },
      "outputShape": "object",
      "collection": false
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.action.cmdCancelarMatricula.status",
      "name": "cmdCancelarMatriculaState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "cmdCancelarMatricula"
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.input.cmdCancelarMatricula.id",
      "name": "cmdCancelarMatriculaId",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "cmdCancelarMatricula",
        "direction": "input",
        "field": "id"
      },
      "source": "selectedEntity",
      "presentation": "selection"
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.output.cmdCancelarMatricula",
      "name": "cmdCancelarMatriculaOutput",
      "kind": "commandOutput",
      "defaultValue": null,
      "contractRef": {
        "commandName": "cmdCancelarMatricula",
        "direction": "output"
      }
    },
    {
      "stateKey": "ui.cancelarPropriaMatricula.action.cmdCancelarMatricula.error",
      "name": "cmdCancelarMatriculaError",
      "kind": "actionError",
      "defaultValue": "",
      "actionRef": "cmdCancelarMatricula"
    }
  ],
  "actions": [
    {
      "actionId": "qryListMatricula",
      "kind": "query",
      "methodName": "loadQryListMatricula",
      "handlerName": "handleQryListMatriculaClick",
      "commandRef": "qryListMatricula",
      "routeKey": "mensalidadesAcademia.cancelarPropriaMatricula.qryListMatricula",
      "purpose": "qryListMatricula",
      "inputStateKeys": [],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [],
      "outputStateKeys": [
        "ui.cancelarPropriaMatricula.data.qryListMatricula"
      ],
      "statusStateKey": "ui.cancelarPropriaMatricula.action.qryListMatricula.status"
    },
    {
      "actionId": "qryGetMatricula",
      "kind": "query",
      "methodName": "loadQryGetMatricula",
      "handlerName": "handleQryGetMatriculaClick",
      "commandRef": "qryGetMatricula",
      "routeKey": "mensalidadesAcademia.cancelarPropriaMatricula.qryGetMatricula",
      "purpose": "qryGetMatricula",
      "inputStateKeys": [
        "ui.cancelarPropriaMatricula.input.qryGetMatricula.id"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [
        "ui.cancelarPropriaMatricula.input.qryGetMatricula.id"
      ],
      "outputStateKeys": [
        "ui.cancelarPropriaMatricula.data.qryGetMatricula"
      ],
      "statusStateKey": "ui.cancelarPropriaMatricula.action.qryGetMatricula.status"
    },
    {
      "actionId": "cmdCancelarMatricula",
      "kind": "command",
      "methodName": "cmdCancelarMatricula",
      "handlerName": "handleCmdCancelarMatriculaClick",
      "commandRef": "cmdCancelarMatricula",
      "routeKey": "mensalidadesAcademia.cancelarPropriaMatricula.cmdCancelarMatricula",
      "purpose": "cmdCancelarMatricula",
      "inputStateKeys": [
        "ui.cancelarPropriaMatricula.input.cmdCancelarMatricula.id"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [
        "ui.cancelarPropriaMatricula.input.cmdCancelarMatricula.id"
      ],
      "outputStateKeys": [
        "ui.cancelarPropriaMatricula.output.cmdCancelarMatricula"
      ],
      "statusStateKey": "ui.cancelarPropriaMatricula.action.cmdCancelarMatricula.status",
      "errorStateKey": "ui.cancelarPropriaMatricula.action.cmdCancelarMatricula.error",
      "feedback": {
        "successMessageKey": "action.cmdCancelarMatricula.success",
        "errorMessageKey": "action.cmdCancelarMatricula.error",
        "dismissible": true
      },
      "clearInputStateKeys": [
        "ui.cancelarPropriaMatricula.input.cmdCancelarMatricula.id"
      ],
      "refreshActionIds": [
        "qryListMatricula",
        "qryGetMatricula"
      ]
    },
    {
      "actionId": "set.qryGetMatriculaId",
      "kind": "stateSetter",
      "methodName": "setQryGetMatriculaId",
      "handlerName": "handleQryGetMatriculaIdChange",
      "stateKey": "ui.cancelarPropriaMatricula.input.qryGetMatricula.id"
    },
    {
      "actionId": "set.cmdCancelarMatriculaId",
      "kind": "stateSetter",
      "methodName": "setCmdCancelarMatriculaId",
      "handlerName": "handleCmdCancelarMatriculaIdChange",
      "stateKey": "ui.cancelarPropriaMatricula.input.cmdCancelarMatricula.id"
    }
  ],
  "scenaries": [
    {
      "value": "base",
      "kind": "base",
      "commandName": "qryListMatricula",
      "preconditions": []
    },
    {
      "value": "detail",
      "kind": "detail",
      "commandName": "qryGetMatricula",
      "preconditions": [
        "ui.cancelarPropriaMatricula.input.qryGetMatricula.id"
      ]
    }
  ],
  "destructiveCommandIds": [
    "cmdCancelarMatricula"
  ],
  "initialLoads": [
    {
      "actionId": "qryListMatricula",
      "stateKey": "ui.cancelarPropriaMatricula.data.qryListMatricula"
    }
  ],
  "dataBindings": [
    {
      "id": "binding.cancelarPropriaMatricula.qryListMatricula",
      "source": "bff.qryListMatricula",
      "command": "qryListMatricula",
      "description": "qryListMatricula",
      "kind": "query",
      "stateKey": "ui.cancelarPropriaMatricula.data.qryListMatricula",
      "inputStateKeys": [],
      "inputs": [],
      "selection": "single"
    },
    {
      "id": "binding.cancelarPropriaMatricula.qryGetMatricula",
      "source": "bff.qryGetMatricula",
      "command": "qryGetMatricula",
      "description": "qryGetMatricula",
      "kind": "query",
      "stateKey": "ui.cancelarPropriaMatricula.data.qryGetMatricula",
      "inputStateKeys": [
        "ui.cancelarPropriaMatricula.input.qryGetMatricula.id"
      ],
      "inputs": [
        {
          "name": "id",
          "stateKey": "ui.cancelarPropriaMatricula.input.qryGetMatricula.id",
          "source": "selectedEntity",
          "required": true,
          "presentation": "selection"
        }
      ],
      "selection": "none"
    },
    {
      "id": "binding.cancelarPropriaMatricula.cmdCancelarMatricula",
      "source": "bff.cmdCancelarMatricula",
      "command": "cmdCancelarMatricula",
      "description": "cmdCancelarMatricula",
      "kind": "command",
      "stateKey": "ui.cancelarPropriaMatricula.output.cmdCancelarMatricula",
      "inputStateKeys": [
        "ui.cancelarPropriaMatricula.input.cmdCancelarMatricula.id"
      ],
      "inputs": [
        {
          "name": "id",
          "stateKey": "ui.cancelarPropriaMatricula.input.cmdCancelarMatricula.id",
          "source": "selectedEntity",
          "required": true,
          "presentation": "selection"
        }
      ],
      "selection": "none"
    }
  ],
  "businessContextRefs": [],
  "navigationRefs": [],
  "automation": {
    "statePrefix": "ui.cancelarPropriaMatricula",
    "stateKeys": [
      "ui.cancelarPropriaMatricula.status",
      "ui.cancelarPropriaMatricula.scenary",
      "ui.cancelarPropriaMatricula.action.qryListMatricula.status",
      "ui.cancelarPropriaMatricula.data.qryListMatricula",
      "ui.cancelarPropriaMatricula.action.qryGetMatricula.status",
      "ui.cancelarPropriaMatricula.input.qryGetMatricula.id",
      "ui.cancelarPropriaMatricula.data.qryGetMatricula",
      "ui.cancelarPropriaMatricula.action.cmdCancelarMatricula.status",
      "ui.cancelarPropriaMatricula.input.cmdCancelarMatricula.id",
      "ui.cancelarPropriaMatricula.output.cmdCancelarMatricula",
      "ui.cancelarPropriaMatricula.action.cmdCancelarMatricula.error"
    ],
    "actionIds": [
      "qryListMatricula",
      "qryGetMatricula",
      "cmdCancelarMatricula",
      "set.qryGetMatriculaId",
      "set.cmdCancelarMatriculaId"
    ]
  }
} as const;
