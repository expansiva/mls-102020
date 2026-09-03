/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/fixtures/recordInStoreServiceAttendance.workspace.ts" enhancement="_blank"/>

export const recordInStoreServiceAttendanceWorkspace = {
  "workspaceId": "recordInStoreServiceAttendance",
  "title": "Registrar atendimento presencial do pet",
  "actors": [
    "administradorPetShop"
  ],
  "kind": "workflow",
  "entity": "ServiceExecution",
  "workflowId": "serviceExecutionLifecycle",
  "bffCalls": [
    {
      "bffId": "qryLocateConfirmedServiceAppointment",
      "kind": "query",
      "uses": [
        {
          "operationId": "locateConfirmedServiceAppointment"
        }
      ],
      "input": [],
      "output": {
        "kind": "list",
        "fields": [
          {
            "name": "serviceAppointmentId",
            "from": "locateConfirmedServiceAppointment.$items.serviceAppointmentId",
            "type": "string",
            "required": true
          },
          {
            "name": "status",
            "from": "locateConfirmedServiceAppointment.$items.status",
            "type": "string",
            "required": true
          },
          {
            "name": "petId",
            "from": "locateConfirmedServiceAppointment.$items.petId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceId",
            "from": "locateConfirmedServiceAppointment.$items.serviceId",
            "type": "string",
            "required": true
          },
          {
            "name": "requestedStartAt",
            "from": "locateConfirmedServiceAppointment.$items.requestedStartAt",
            "type": "string",
            "required": true
          },
          {
            "name": "requestedEndAt",
            "from": "locateConfirmedServiceAppointment.$items.requestedEndAt",
            "type": "string",
            "required": true
          },
          {
            "name": "refusalReason",
            "from": "locateConfirmedServiceAppointment.$items.refusalReason",
            "type": "string",
            "required": false
          }
        ]
      },
      "route": "petShop.recordInStoreServiceAttendance.qryLocateConfirmedServiceAppointment"
    },
    {
      "bffId": "cmdRegisterPetArrival",
      "kind": "command",
      "uses": [
        {
          "operationId": "registerPetArrival"
        }
      ],
      "input": [
        {
          "name": "serviceAppointmentServiceAppointmentId",
          "from": "registerPetArrival.serviceAppointmentServiceAppointmentId",
          "required": true,
          "source": "selectedEntity",
          "sourceRef": "qryLocateConfirmedServiceAppointment",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "serviceExecutionId",
            "from": "registerPetArrival.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceAppointmentId",
            "from": "registerPetArrival.serviceAppointmentId",
            "type": "string",
            "required": true
          },
          {
            "name": "status",
            "from": "registerPetArrival.status",
            "type": "string",
            "required": true
          },
          {
            "name": "arrivedAt",
            "from": "registerPetArrival.arrivedAt",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceStartedAt",
            "from": "registerPetArrival.serviceStartedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "completedAt",
            "from": "registerPetArrival.completedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "pickedUpAt",
            "from": "registerPetArrival.pickedUpAt",
            "type": "string",
            "required": false
          }
        ]
      },
      "route": "petShop.recordInStoreServiceAttendance.cmdRegisterPetArrival"
    },
    {
      "bffId": "cmdRegisterServiceStart",
      "kind": "command",
      "uses": [
        {
          "operationId": "registerServiceStart"
        }
      ],
      "input": [
        {
          "name": "serviceAppointmentServiceAppointmentId",
          "from": "registerServiceStart.serviceAppointmentServiceAppointmentId",
          "required": true,
          "source": "selectedEntity",
          "sourceRef": "qryLocateConfirmedServiceAppointment",
          "type": "string"
        },
        {
          "name": "serviceExecutionServiceExecutionId",
          "from": "registerServiceStart.serviceExecutionServiceExecutionId",
          "required": true,
          "source": "selectedEntity",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "serviceExecutionId",
            "from": "registerServiceStart.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceAppointmentId",
            "from": "registerServiceStart.serviceAppointmentId",
            "type": "string",
            "required": true
          },
          {
            "name": "status",
            "from": "registerServiceStart.status",
            "type": "string",
            "required": true
          },
          {
            "name": "arrivedAt",
            "from": "registerServiceStart.arrivedAt",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceStartedAt",
            "from": "registerServiceStart.serviceStartedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "completedAt",
            "from": "registerServiceStart.completedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "pickedUpAt",
            "from": "registerServiceStart.pickedUpAt",
            "type": "string",
            "required": false
          }
        ]
      },
      "route": "petShop.recordInStoreServiceAttendance.cmdRegisterServiceStart"
    },
    {
      "bffId": "cmdRegisterServiceCompletion",
      "kind": "command",
      "uses": [
        {
          "operationId": "registerServiceCompletion"
        }
      ],
      "input": [
        {
          "name": "serviceAppointmentServiceAppointmentId",
          "from": "registerServiceCompletion.serviceAppointmentServiceAppointmentId",
          "required": true,
          "source": "selectedEntity",
          "sourceRef": "qryLocateConfirmedServiceAppointment",
          "type": "string"
        },
        {
          "name": "serviceExecutionServiceExecutionId",
          "from": "registerServiceCompletion.serviceExecutionServiceExecutionId",
          "required": true,
          "source": "selectedEntity",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "serviceExecutionId",
            "from": "registerServiceCompletion.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceAppointmentId",
            "from": "registerServiceCompletion.serviceAppointmentId",
            "type": "string",
            "required": true
          },
          {
            "name": "status",
            "from": "registerServiceCompletion.status",
            "type": "string",
            "required": true
          },
          {
            "name": "arrivedAt",
            "from": "registerServiceCompletion.arrivedAt",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceStartedAt",
            "from": "registerServiceCompletion.serviceStartedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "completedAt",
            "from": "registerServiceCompletion.completedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "pickedUpAt",
            "from": "registerServiceCompletion.pickedUpAt",
            "type": "string",
            "required": false
          }
        ]
      },
      "route": "petShop.recordInStoreServiceAttendance.cmdRegisterServiceCompletion"
    },
    {
      "bffId": "cmdRegisterInStorePayment",
      "kind": "command",
      "uses": [
        {
          "operationId": "registerInStorePayment"
        }
      ],
      "input": [
        {
          "name": "serviceExecutionServiceExecutionId",
          "from": "registerInStorePayment.serviceExecutionServiceExecutionId",
          "required": true,
          "source": "selectedEntity",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "inStorePaymentId",
            "from": "registerInStorePayment.inStorePaymentId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceExecutionId",
            "from": "registerInStorePayment.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "status",
            "from": "registerInStorePayment.status",
            "type": "string",
            "required": true
          },
          {
            "name": "confirmedAt",
            "from": "registerInStorePayment.confirmedAt",
            "type": "string",
            "required": true
          }
        ]
      },
      "route": "petShop.recordInStoreServiceAttendance.cmdRegisterInStorePayment"
    },
    {
      "bffId": "cmdRegisterPetPickup",
      "kind": "command",
      "uses": [
        {
          "operationId": "registerPetPickup"
        }
      ],
      "input": [
        {
          "name": "serviceAppointmentServiceAppointmentId",
          "from": "registerPetPickup.serviceAppointmentServiceAppointmentId",
          "required": true,
          "source": "selectedEntity",
          "sourceRef": "qryLocateConfirmedServiceAppointment",
          "type": "string"
        },
        {
          "name": "serviceExecutionServiceExecutionId",
          "from": "registerPetPickup.serviceExecutionServiceExecutionId",
          "required": true,
          "source": "selectedEntity",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "serviceExecutionId",
            "from": "registerPetPickup.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceAppointmentId",
            "from": "registerPetPickup.serviceAppointmentId",
            "type": "string",
            "required": true
          },
          {
            "name": "status",
            "from": "registerPetPickup.status",
            "type": "string",
            "required": true
          },
          {
            "name": "arrivedAt",
            "from": "registerPetPickup.arrivedAt",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceStartedAt",
            "from": "registerPetPickup.serviceStartedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "completedAt",
            "from": "registerPetPickup.completedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "pickedUpAt",
            "from": "registerPetPickup.pickedUpAt",
            "type": "string",
            "required": false
          }
        ]
      },
      "route": "petShop.recordInStoreServiceAttendance.cmdRegisterPetPickup"
    },
    {
      "bffId": "cmdHandoffCompletedService",
      "kind": "command",
      "uses": [
        {
          "operationId": "handoffCompletedService"
        }
      ],
      "input": [
        {
          "name": "serviceExecutionServiceExecutionId",
          "from": "handoffCompletedService.serviceExecutionServiceExecutionId",
          "required": true,
          "source": "selectedEntity",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "serviceExecutionId",
            "from": "handoffCompletedService.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceAppointmentId",
            "from": "handoffCompletedService.serviceAppointmentId",
            "type": "string",
            "required": true
          },
          {
            "name": "status",
            "from": "handoffCompletedService.status",
            "type": "string",
            "required": true
          },
          {
            "name": "arrivedAt",
            "from": "handoffCompletedService.arrivedAt",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceStartedAt",
            "from": "handoffCompletedService.serviceStartedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "completedAt",
            "from": "handoffCompletedService.completedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "pickedUpAt",
            "from": "handoffCompletedService.pickedUpAt",
            "type": "string",
            "required": false
          }
        ]
      },
      "route": "petShop.recordInStoreServiceAttendance.cmdHandoffCompletedService"
    }
  ],
  "sections": [
    {
      "sectionId": "locateConfirmedServiceAppointment",
      "intent": "Um agendamento confirmado está selecionado para o atendimento presencial.",
      "organisms": [
        {
          "role": "primarySurface",
          "dataSource": "qryLocateConfirmedServiceAppointment",
          "usage": "picker"
        }
      ]
    },
    {
      "sectionId": "registerPetArrival",
      "intent": "A execução do serviço é aberta com o registro de que o pet foi levado à loja.",
      "organisms": [
        {
          "role": "primarySurface",
          "action": "cmdRegisterPetArrival"
        }
      ]
    },
    {
      "sectionId": "registerServiceStart",
      "intent": "A execução passa a indicar que o serviço do pet foi iniciado.",
      "organisms": [
        {
          "role": "primarySurface",
          "action": "cmdRegisterServiceStart"
        }
      ]
    },
    {
      "sectionId": "registerServiceCompletion",
      "intent": "A execução passa a indicar que o serviço foi concluído.",
      "organisms": [
        {
          "role": "primarySurface",
          "action": "cmdRegisterServiceCompletion"
        }
      ]
    },
    {
      "sectionId": "registerInStorePayment",
      "intent": "A confirmação do pagamento presencial do atendimento fica registrada.",
      "organisms": [
        {
          "role": "primarySurface",
          "action": "cmdRegisterInStorePayment"
        }
      ]
    },
    {
      "sectionId": "registerPetPickup",
      "intent": "A execução registra que o cliente buscou o pet na loja.",
      "organisms": [
        {
          "role": "primarySurface",
          "action": "cmdRegisterPetPickup"
        }
      ]
    },
    {
      "sectionId": "handoffCompletedService",
      "intent": "O atendimento concluído fica disponível para consulta pelo cliente no site.",
      "organisms": [
        {
          "role": "contextualAction",
          "action": "cmdHandoffCompletedService"
        }
      ]
    }
  ],
  "operationIds": [
    "handoffCompletedService",
    "locateConfirmedServiceAppointment",
    "registerInStorePayment",
    "registerPetArrival",
    "registerPetPickup",
    "registerServiceCompletion",
    "registerServiceStart"
  ],
  "purpose": "Registrar a chegada, o início, a conclusão, a retirada e o pagamento presencial de um serviço confirmado.",
  "presentation": {
    "categoryRef": "processWizard",
    "confidence": 10,
    "classificationNote": "Derived from the journey tier of the approved E8 model; the category is structural, not a guess."
  },
  "sliceHash": "sha256:151f986f"
} as const;

export default recordInStoreServiceAttendanceWorkspace;
