/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/fixtures/locateConfirmedServiceAppointment.operation.ts" enhancement="_blank"/>

export const operationLocateConfirmedServiceAppointment = {
  "operationId": "locateConfirmedServiceAppointment",
  "title": "Localizar agendamento confirmado",
  "actors": [
    "administradorPetShop"
  ],
  "entity": "ServiceAppointment",
  "kind": "query",
  "reads": [
    "ServiceAppointment"
  ],
  "writes": [],
  "rulesApplied": [
    "onlyConfirmedAppointmentsCanStartService"
  ],
  "story": {
    "actor": "administradorPetShop",
    "goal": "Localizar agendamento confirmado",
    "steps": [
      "Localizar agendamento confirmado",
      "Um agendamento confirmado está selecionado para o atendimento presencial."
    ],
    "outcome": "Um agendamento confirmado está selecionado para o atendimento presencial."
  },
  "accessPattern": {
    "kind": "list",
    "description": "Localizar agendamento confirmado",
    "entity": "ServiceAppointment",
    "keyField": "ServiceAppointment.serviceAppointmentId",
    "pagination": "none",
    "selection": "single",
    "output": [
      "ServiceAppointment.serviceAppointmentId",
      "ServiceAppointment.status",
      "ServiceAppointment.petId",
      "ServiceAppointment.serviceId",
      "ServiceAppointment.requestedStartAt",
      "ServiceAppointment.requestedEndAt",
      "ServiceAppointment.refusalReason"
    ]
  },
  "outputShape": {
    "kind": "list",
    "fields": [
      {
        "name": "serviceAppointmentId",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceAppointment.serviceAppointmentId"
      },
      {
        "name": "status",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceAppointment.status"
      },
      {
        "name": "petId",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceAppointment.petId"
      },
      {
        "name": "serviceId",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceAppointment.serviceId"
      },
      {
        "name": "requestedStartAt",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceAppointment.requestedStartAt"
      },
      {
        "name": "requestedEndAt",
        "type": "string",
        "required": true,
        "fieldRef": "ServiceAppointment.requestedEndAt"
      },
      {
        "name": "refusalReason",
        "type": "string",
        "required": false,
        "fieldRef": "ServiceAppointment.refusalReason"
      }
    ]
  },
  "inputs": [],
  "pageId": "recordInStoreServiceAttendance",
  "commandName": "qryLocateConfirmedServiceAppointment",
  "bffName": "qryLocateConfirmedServiceAppointment"
} as const;

export default operationLocateConfirmedServiceAppointment;
