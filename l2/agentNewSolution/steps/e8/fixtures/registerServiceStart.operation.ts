/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/fixtures/registerServiceStart.operation.ts" enhancement="_blank"/>

export const operationRegisterServiceStart = {
  "operationId": "registerServiceStart",
  "title": "Registrar início do serviço",
  "actors": [
    "administradorPetShop"
  ],
  "entity": "ServiceExecution",
  "kind": "commandInput",
  "reads": [
    "ServiceAppointment",
    "ServiceExecution"
  ],
  "writes": [
    "ServiceExecution"
  ],
  "rulesApplied": [
    "onlyConfirmedAppointmentsCanStartService"
  ],
  "story": {
    "actor": "administradorPetShop",
    "goal": "Registrar início do serviço",
    "steps": [
      "Registrar início do serviço",
      "A execução passa a indicar que o serviço do pet foi iniciado."
    ],
    "outcome": "A execução passa a indicar que o serviço do pet foi iniciado."
  },
  "accessPattern": {
    "kind": "commandInput",
    "description": "Registrar início do serviço",
    "entity": "ServiceExecution",
    "keyField": "ServiceExecution.serviceExecutionId",
    "pagination": "none",
    "selection": "none",
    "output": [
      "ServiceExecution.serviceExecutionId",
      "ServiceExecution.serviceAppointmentId",
      "ServiceExecution.status",
      "ServiceExecution.arrivedAt",
      "ServiceExecution.serviceStartedAt",
      "ServiceExecution.completedAt",
      "ServiceExecution.pickedUpAt"
    ]
  },
  "outputShape": {
    "kind": "object",
    "fields": [
      {
        "name": "serviceExecutionId",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceExecution.serviceExecutionId"
      },
      {
        "name": "serviceAppointmentId",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceExecution.serviceAppointmentId"
      },
      {
        "name": "status",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceExecution.status"
      },
      {
        "name": "arrivedAt",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceExecution.arrivedAt"
      },
      {
        "name": "serviceStartedAt",
        "type": "string",
        "required": false,
        "fieldRef": "ServiceExecution.serviceStartedAt"
      },
      {
        "name": "completedAt",
        "type": "string",
        "required": false,
        "fieldRef": "ServiceExecution.completedAt"
      },
      {
        "name": "pickedUpAt",
        "type": "string",
        "required": false,
        "fieldRef": "ServiceExecution.pickedUpAt"
      }
    ]
  },
  "inputs": [
    {
      "inputId": "serviceAppointmentServiceAppointmentId",
      "fieldRef": "ServiceAppointment.serviceAppointmentId",
      "required": true,
      "source": "selectedEntity",
      "description": "Solicitação de agendamento"
    },
    {
      "inputId": "serviceExecutionServiceExecutionId",
      "fieldRef": "ServiceExecution.serviceExecutionId",
      "required": true,
      "source": "selectedEntity",
      "description": "Execução de serviço"
    }
  ],
  "pageId": "recordInStoreServiceAttendance",
  "commandName": "cmdRegisterServiceStart",
  "bffName": "cmdRegisterServiceStart"
} as const;

export default operationRegisterServiceStart;
