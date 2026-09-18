/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/shared/matriculaCatalogue.defs.ts" enhancement="_blank"/>

/**
 * uiScenary contract (page skeleton reads `scenaries[].value` as <Scene value>):
 *   scenaries[]: { value, kind: "base"|"detail"|"command", commandName?, preconditions: stateKey[] }
 *   preconditions = required route/selection inputs (skill rule 8). Unsatisfied → base, silently.
 *   URL `?scenary=` is a request; the shared setter is the source of truth.
 *   destructiveCommandIds never become scenes (confirmation stays a modal).
 */
export const definition = {
  "pageId": "matriculaCatalogue",
  "pageName": "Matrículas",
  "moduleName": "mensalidadesAcademia",
  "baseClassName": "MensalidadesAcademiaMatriculaCatalogueBase",
  "routePattern": "/mensalidadesAcademia/matriculaCatalogue",
  "sourceKind": "operation",
  "ownerIds": [
    "workspace:matriculaCatalogue",
    "contract:mensalidadesAcademia.matriculaCatalogue.qryListAluno",
    "contract:mensalidadesAcademia.matriculaCatalogue.qryListPlano",
    "contract:mensalidadesAcademia.matriculaCatalogue.cmdCreateMatricula"
  ],
  "operationIds": [
    "qryListAluno",
    "qryListPlano",
    "cmdCreateMatricula"
  ],
  "origin": {
    "source": "l4-journey",
    "workspaceId": "matriculaCatalogue",
    "workspaceKind": "operation",
    "actor": "recepcao",
    "entity": "Matricula",
    "owners": [
      {
        "kind": "operation",
        "id": "qryListAluno",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/matricularAluno.defs.ts"
      },
      {
        "kind": "operation",
        "id": "qryListPlano",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/matricularAluno.defs.ts"
      },
      {
        "kind": "operation",
        "id": "cmdCreateMatricula",
        "defPath": "_102047_/l4/mensalidadesAcademia/journeys/matricularAluno.defs.ts"
      }
    ],
    "microUserFlow": {
      "source": "l4/story.steps",
      "workflowSteps": [],
      "operations": [
        {
          "operationId": "qryListAluno",
          "commandName": "qryListAluno",
          "steps": []
        },
        {
          "operationId": "qryListPlano",
          "commandName": "qryListPlano",
          "steps": []
        },
        {
          "operationId": "cmdCreateMatricula",
          "commandName": "cmdCreateMatricula",
          "steps": []
        }
      ]
    }
  },
  "contractRef": {
    "tsPath": "_102047_/l2/mensalidadesAcademia/web/contracts/matriculaCatalogue.ts",
    "contracts": [
      {
        "commandName": "qryListAluno",
        "routeConst": "qryListAlunoRoute"
      },
      {
        "commandName": "qryListPlano",
        "routeConst": "qryListPlanoRoute"
      },
      {
        "commandName": "cmdCreateMatricula",
        "routeConst": "cmdCreateMatriculaRoute"
      }
    ]
  },
  "layoutRef": {
    "defPath": "_102047_/l2/mensalidadesAcademia/web/desktop/page11/matriculaCatalogue.defs.ts",
    "layoutId": "matricula-catalogue-workspace"
  },
  "states": [
    {
      "stateKey": "ui.matriculaCatalogue.status",
      "name": "status",
      "kind": "pageStatus",
      "defaultValue": ""
    },
    {
      "stateKey": "ui.matriculaCatalogue.scenary",
      "name": "uiScenary",
      "kind": "uiScenary",
      "defaultValue": "base",
      "valueSet": [
        "base",
        "createMatricula"
      ]
    },
    {
      "stateKey": "ui.matriculaCatalogue.action.qryListAluno.status",
      "name": "qryListAlunoState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "qryListAluno"
    },
    {
      "stateKey": "ui.matriculaCatalogue.input.qryListAluno.name",
      "name": "qryListAlunoName",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "qryListAluno",
        "direction": "input",
        "field": "name"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.matriculaCatalogue.input.qryListAluno.docId",
      "name": "qryListAlunoDocId",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "qryListAluno",
        "direction": "input",
        "field": "docId"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.matriculaCatalogue.data.qryListAluno",
      "name": "qryListAlunoData",
      "kind": "queryResult",
      "defaultValue": {
        "alunoItems": [],
        "total": 0
      },
      "contractRef": {
        "commandName": "qryListAluno",
        "direction": "output"
      },
      "outputShape": "paginated",
      "collection": true
    },
    {
      "stateKey": "ui.matriculaCatalogue.action.qryListPlano.status",
      "name": "qryListPlanoState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "qryListPlano"
    },
    {
      "stateKey": "ui.matriculaCatalogue.input.qryListPlano.name",
      "name": "qryListPlanoName",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "qryListPlano",
        "direction": "input",
        "field": "name"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.matriculaCatalogue.data.qryListPlano",
      "name": "qryListPlanoData",
      "kind": "queryResult",
      "defaultValue": {
        "planoItems": [],
        "total": 0
      },
      "contractRef": {
        "commandName": "qryListPlano",
        "direction": "output"
      },
      "outputShape": "paginated",
      "collection": true
    },
    {
      "stateKey": "ui.matriculaCatalogue.action.cmdCreateMatricula.status",
      "name": "cmdCreateMatriculaState",
      "kind": "actionStatus",
      "defaultValue": "idle",
      "valueSet": [
        "idle",
        "loading",
        "success",
        "error"
      ],
      "actionRef": "cmdCreateMatricula"
    },
    {
      "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.alunoId",
      "name": "cmdCreateMatriculaAlunoId",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "cmdCreateMatricula",
        "direction": "input",
        "field": "alunoId"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.planoId",
      "name": "cmdCreateMatriculaPlanoId",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "cmdCreateMatricula",
        "direction": "input",
        "field": "planoId"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.dataInicio",
      "name": "cmdCreateMatriculaDataInicio",
      "kind": "input",
      "defaultValue": "",
      "contractRef": {
        "commandName": "cmdCreateMatricula",
        "direction": "input",
        "field": "dataInicio"
      },
      "source": "userInput",
      "presentation": "form"
    },
    {
      "stateKey": "ui.matriculaCatalogue.output.cmdCreateMatricula",
      "name": "cmdCreateMatriculaOutput",
      "kind": "commandOutput",
      "defaultValue": null,
      "contractRef": {
        "commandName": "cmdCreateMatricula",
        "direction": "output"
      }
    },
    {
      "stateKey": "ui.matriculaCatalogue.action.cmdCreateMatricula.error",
      "name": "cmdCreateMatriculaError",
      "kind": "actionError",
      "defaultValue": "",
      "actionRef": "cmdCreateMatricula"
    }
  ],
  "actions": [
    {
      "actionId": "qryListAluno",
      "kind": "query",
      "methodName": "loadQryListAluno",
      "handlerName": "handleQryListAlunoClick",
      "commandRef": "qryListAluno",
      "routeKey": "mensalidadesAcademia.matriculaCatalogue.qryListAluno",
      "purpose": "qryListAluno",
      "inputStateKeys": [
        "ui.matriculaCatalogue.input.qryListAluno.name",
        "ui.matriculaCatalogue.input.qryListAluno.docId"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [],
      "outputStateKeys": [
        "ui.matriculaCatalogue.data.qryListAluno"
      ],
      "statusStateKey": "ui.matriculaCatalogue.action.qryListAluno.status"
    },
    {
      "actionId": "qryListPlano",
      "kind": "query",
      "methodName": "loadQryListPlano",
      "handlerName": "handleQryListPlanoClick",
      "commandRef": "qryListPlano",
      "routeKey": "mensalidadesAcademia.matriculaCatalogue.qryListPlano",
      "purpose": "qryListPlano",
      "inputStateKeys": [
        "ui.matriculaCatalogue.input.qryListPlano.name"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [],
      "outputStateKeys": [
        "ui.matriculaCatalogue.data.qryListPlano"
      ],
      "statusStateKey": "ui.matriculaCatalogue.action.qryListPlano.status"
    },
    {
      "actionId": "cmdCreateMatricula",
      "kind": "command",
      "methodName": "cmdCreateMatricula",
      "handlerName": "handleCmdCreateMatriculaClick",
      "commandRef": "cmdCreateMatricula",
      "routeKey": "mensalidadesAcademia.matriculaCatalogue.cmdCreateMatricula",
      "purpose": "cmdCreateMatricula",
      "inputStateKeys": [
        "ui.matriculaCatalogue.input.cmdCreateMatricula.alunoId",
        "ui.matriculaCatalogue.input.cmdCreateMatricula.planoId",
        "ui.matriculaCatalogue.input.cmdCreateMatricula.dataInicio"
      ],
      "routeParamInputStateKeys": [],
      "selectedEntityInputStateKeys": [],
      "outputStateKeys": [
        "ui.matriculaCatalogue.output.cmdCreateMatricula"
      ],
      "statusStateKey": "ui.matriculaCatalogue.action.cmdCreateMatricula.status",
      "errorStateKey": "ui.matriculaCatalogue.action.cmdCreateMatricula.error",
      "feedback": {
        "successMessageKey": "action.cmdCreateMatricula.success",
        "errorMessageKey": "action.cmdCreateMatricula.error",
        "dismissible": true
      },
      "clearInputStateKeys": [
        "ui.matriculaCatalogue.input.cmdCreateMatricula.alunoId",
        "ui.matriculaCatalogue.input.cmdCreateMatricula.planoId",
        "ui.matriculaCatalogue.input.cmdCreateMatricula.dataInicio"
      ],
      "refreshActionIds": [
        "qryListAluno",
        "qryListPlano"
      ]
    },
    {
      "actionId": "set.qryListAlunoName",
      "kind": "stateSetter",
      "methodName": "setQryListAlunoName",
      "handlerName": "handleQryListAlunoNameChange",
      "stateKey": "ui.matriculaCatalogue.input.qryListAluno.name"
    },
    {
      "actionId": "set.qryListAlunoDocId",
      "kind": "stateSetter",
      "methodName": "setQryListAlunoDocId",
      "handlerName": "handleQryListAlunoDocIdChange",
      "stateKey": "ui.matriculaCatalogue.input.qryListAluno.docId"
    },
    {
      "actionId": "set.qryListPlanoName",
      "kind": "stateSetter",
      "methodName": "setQryListPlanoName",
      "handlerName": "handleQryListPlanoNameChange",
      "stateKey": "ui.matriculaCatalogue.input.qryListPlano.name"
    },
    {
      "actionId": "set.cmdCreateMatriculaAlunoId",
      "kind": "stateSetter",
      "methodName": "setCmdCreateMatriculaAlunoId",
      "handlerName": "handleCmdCreateMatriculaAlunoIdChange",
      "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.alunoId"
    },
    {
      "actionId": "set.cmdCreateMatriculaPlanoId",
      "kind": "stateSetter",
      "methodName": "setCmdCreateMatriculaPlanoId",
      "handlerName": "handleCmdCreateMatriculaPlanoIdChange",
      "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.planoId"
    },
    {
      "actionId": "set.cmdCreateMatriculaDataInicio",
      "kind": "stateSetter",
      "methodName": "setCmdCreateMatriculaDataInicio",
      "handlerName": "handleCmdCreateMatriculaDataInicioChange",
      "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.dataInicio"
    }
  ],
  "scenaries": [
    {
      "value": "base",
      "kind": "base",
      "commandName": "qryListAluno",
      "preconditions": []
    },
    {
      "value": "createMatricula",
      "kind": "command",
      "commandName": "cmdCreateMatricula",
      "preconditions": []
    }
  ],
  "destructiveCommandIds": [],
  "initialLoads": [],
  "dataBindings": [
    {
      "id": "binding.matriculaCatalogue.qryListAluno",
      "source": "bff.qryListAluno",
      "command": "qryListAluno",
      "description": "qryListAluno",
      "kind": "query",
      "stateKey": "ui.matriculaCatalogue.data.qryListAluno",
      "inputStateKeys": [
        "ui.matriculaCatalogue.input.qryListAluno.name",
        "ui.matriculaCatalogue.input.qryListAluno.docId"
      ],
      "inputs": [
        {
          "name": "name",
          "stateKey": "ui.matriculaCatalogue.input.qryListAluno.name",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        },
        {
          "name": "docId",
          "stateKey": "ui.matriculaCatalogue.input.qryListAluno.docId",
          "source": "userInput",
          "required": false,
          "presentation": "form"
        }
      ],
      "selection": "single"
    },
    {
      "id": "binding.matriculaCatalogue.qryListPlano",
      "source": "bff.qryListPlano",
      "command": "qryListPlano",
      "description": "qryListPlano",
      "kind": "query",
      "stateKey": "ui.matriculaCatalogue.data.qryListPlano",
      "inputStateKeys": [
        "ui.matriculaCatalogue.input.qryListPlano.name"
      ],
      "inputs": [
        {
          "name": "name",
          "stateKey": "ui.matriculaCatalogue.input.qryListPlano.name",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        }
      ],
      "selection": "single"
    },
    {
      "id": "binding.matriculaCatalogue.cmdCreateMatricula",
      "source": "bff.cmdCreateMatricula",
      "command": "cmdCreateMatricula",
      "description": "cmdCreateMatricula",
      "kind": "command",
      "stateKey": "ui.matriculaCatalogue.output.cmdCreateMatricula",
      "inputStateKeys": [
        "ui.matriculaCatalogue.input.cmdCreateMatricula.alunoId",
        "ui.matriculaCatalogue.input.cmdCreateMatricula.planoId",
        "ui.matriculaCatalogue.input.cmdCreateMatricula.dataInicio"
      ],
      "inputs": [
        {
          "name": "alunoId",
          "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.alunoId",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        },
        {
          "name": "planoId",
          "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.planoId",
          "source": "userInput",
          "required": true,
          "presentation": "form"
        },
        {
          "name": "dataInicio",
          "stateKey": "ui.matriculaCatalogue.input.cmdCreateMatricula.dataInicio",
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
    "statePrefix": "ui.matriculaCatalogue",
    "stateKeys": [
      "ui.matriculaCatalogue.status",
      "ui.matriculaCatalogue.scenary",
      "ui.matriculaCatalogue.action.qryListAluno.status",
      "ui.matriculaCatalogue.input.qryListAluno.name",
      "ui.matriculaCatalogue.input.qryListAluno.docId",
      "ui.matriculaCatalogue.data.qryListAluno",
      "ui.matriculaCatalogue.action.qryListPlano.status",
      "ui.matriculaCatalogue.input.qryListPlano.name",
      "ui.matriculaCatalogue.data.qryListPlano",
      "ui.matriculaCatalogue.action.cmdCreateMatricula.status",
      "ui.matriculaCatalogue.input.cmdCreateMatricula.alunoId",
      "ui.matriculaCatalogue.input.cmdCreateMatricula.planoId",
      "ui.matriculaCatalogue.input.cmdCreateMatricula.dataInicio",
      "ui.matriculaCatalogue.output.cmdCreateMatricula",
      "ui.matriculaCatalogue.action.cmdCreateMatricula.error"
    ],
    "actionIds": [
      "qryListAluno",
      "qryListPlano",
      "cmdCreateMatricula",
      "set.qryListAlunoName",
      "set.qryListAlunoDocId",
      "set.qryListPlanoName",
      "set.cmdCreateMatriculaAlunoId",
      "set.cmdCreateMatriculaPlanoId",
      "set.cmdCreateMatriculaDataInicio"
    ]
  }
} as const;
