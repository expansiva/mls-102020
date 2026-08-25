/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/fixtures/attachPetServiceImage.workspace.ts" enhancement="_blank"/>

export const attachPetServiceImageWorkspace = {
  "workspaceId": "attachPetServiceImage",
  "title": "Anexar imagem do atendimento do pet",
  "actors": [
    "clienteResponsavel"
  ],
  "kind": "operation",
  "entity": "ServiceImage",
  "bffCalls": [
    {
      "bffId": "qryLocatePet",
      "kind": "query",
      "uses": [
        {
          "operationId": "locatePet"
        }
      ],
      "input": [],
      "output": {
        "kind": "list",
        "fields": [
          {
            "name": "petId",
            "from": "locatePet.$items.petId",
            "type": "string",
            "required": true
          },
          {
            "name": "name",
            "from": "locatePet.$items.name",
            "type": "string",
            "required": true
          }
        ]
      },
      "route": "petShop.attachPetServiceImage.qryLocatePet"
    },
    {
      "bffId": "qryLocateServiceExecution",
      "kind": "query",
      "uses": [
        {
          "operationId": "locateServiceExecution"
        }
      ],
      "input": [],
      "output": {
        "kind": "list",
        "fields": [
          {
            "name": "serviceExecutionId",
            "from": "locateServiceExecution.$items.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceAppointmentId",
            "from": "locateServiceExecution.$items.serviceAppointmentId",
            "type": "string",
            "required": true
          },
          {
            "name": "status",
            "from": "locateServiceExecution.$items.status",
            "type": "string",
            "required": true
          },
          {
            "name": "arrivedAt",
            "from": "locateServiceExecution.$items.arrivedAt",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceStartedAt",
            "from": "locateServiceExecution.$items.serviceStartedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "completedAt",
            "from": "locateServiceExecution.$items.completedAt",
            "type": "string",
            "required": false
          },
          {
            "name": "pickedUpAt",
            "from": "locateServiceExecution.$items.pickedUpAt",
            "type": "string",
            "required": false
          }
        ]
      },
      "route": "petShop.attachPetServiceImage.qryLocateServiceExecution"
    },
    {
      "bffId": "cmdDecideImageMoment",
      "kind": "command",
      "uses": [
        {
          "operationId": "decideImageMoment"
        }
      ],
      "input": [
        {
          "name": "petPetId",
          "from": "decideImageMoment.petPetId",
          "required": true,
          "source": "selectedEntity",
          "sourceRef": "qryCustomerPicker",
          "type": "string"
        },
        {
          "name": "serviceExecutionServiceExecutionId",
          "from": "decideImageMoment.serviceExecutionServiceExecutionId",
          "required": true,
          "source": "selectedEntity",
          "sourceRef": "qryLocateServiceExecution",
          "type": "string"
        },
        {
          "name": "serviceImageServiceImageId",
          "from": "decideImageMoment.serviceImageServiceImageId",
          "required": true,
          "source": "selectedEntity",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "serviceImageId",
            "from": "decideImageMoment.serviceImageId",
            "type": "string",
            "required": true
          },
          {
            "name": "petId",
            "from": "decideImageMoment.petId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceExecutionId",
            "from": "decideImageMoment.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "imageMoment",
            "from": "decideImageMoment.imageMoment",
            "type": "string",
            "required": true
          },
          {
            "name": "mediaReference",
            "from": "decideImageMoment.mediaReference",
            "type": "string",
            "required": true
          }
        ]
      },
      "route": "petShop.attachPetServiceImage.cmdDecideImageMoment"
    },
    {
      "bffId": "cmdAttachServiceImage",
      "kind": "command",
      "uses": [
        {
          "operationId": "attachServiceImage"
        }
      ],
      "input": [
        {
          "name": "petPetId",
          "from": "attachServiceImage.petPetId",
          "required": true,
          "source": "selectedEntity",
          "sourceRef": "qryCustomerPicker",
          "type": "string"
        },
        {
          "name": "serviceExecutionServiceExecutionId",
          "from": "attachServiceImage.serviceExecutionServiceExecutionId",
          "required": true,
          "source": "selectedEntity",
          "sourceRef": "qryLocateServiceExecution",
          "type": "string"
        },
        {
          "name": "serviceImageServiceImageId",
          "from": "attachServiceImage.serviceImageServiceImageId",
          "required": true,
          "source": "selectedEntity",
          "type": "string"
        },
        {
          "name": "imageMoment",
          "from": "attachServiceImage.imageMoment",
          "required": true,
          "source": "userInput",
          "type": "string"
        },
        {
          "name": "mediaReference",
          "from": "attachServiceImage.mediaReference",
          "required": true,
          "source": "userInput",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "serviceImageId",
            "from": "attachServiceImage.serviceImageId",
            "type": "string",
            "required": true
          },
          {
            "name": "petId",
            "from": "attachServiceImage.petId",
            "type": "string",
            "required": true
          },
          {
            "name": "serviceExecutionId",
            "from": "attachServiceImage.serviceExecutionId",
            "type": "string",
            "required": true
          },
          {
            "name": "imageMoment",
            "from": "attachServiceImage.imageMoment",
            "type": "string",
            "required": true
          },
          {
            "name": "mediaReference",
            "from": "attachServiceImage.mediaReference",
            "type": "string",
            "required": true
          }
        ]
      },
      "route": "petShop.attachPetServiceImage.cmdAttachServiceImage"
    },
    {
      "bffId": "qryCustomerPicker",
      "kind": "query",
      "uses": [
        {
          "operationId": "listCustomer"
        }
      ],
      "input": [],
      "output": {
        "kind": "list",
        "fields": [
          {
            "name": "customerId",
            "from": "listCustomer.$items.customerId",
            "type": "string",
            "required": true
          },
          {
            "name": "platformUserId",
            "from": "listCustomer.$items.platformUserId",
            "type": "string",
            "required": true
          },
          {
            "name": "fullName",
            "from": "listCustomer.$items.fullName",
            "type": "string",
            "required": true
          }
        ]
      },
      "route": "petShop.attachPetServiceImage.qryCustomerPicker"
    }
  ],
  "sections": [
    {
      "sectionId": "locatePet",
      "intent": "Um pet da lista pessoal do cliente está selecionado.",
      "organisms": [
        {
          "role": "primarySurface",
          "dataSource": "qryLocatePet",
          "usage": "picker"
        }
      ]
    },
    {
      "sectionId": "locateServiceExecution",
      "intent": "Uma execução de serviço do pet está selecionada para receber a imagem.",
      "organisms": [
        {
          "role": "primarySurface",
          "dataSource": "qryLocateServiceExecution",
          "usage": "picker"
        }
      ]
    },
    {
      "sectionId": "decideImageMoment",
      "intent": "A imagem é identificada como registro de antes ou de depois do serviço.",
      "organisms": [
        {
          "role": "primarySurface",
          "action": "cmdDecideImageMoment"
        },
        {
          "role": "filterControl",
          "dataSource": "qryCustomerPicker",
          "usage": "picker"
        }
      ]
    },
    {
      "sectionId": "attachServiceImage",
      "intent": "A imagem opcional fica anexada ao atendimento selecionado.",
      "organisms": [
        {
          "role": "primarySurface",
          "action": "cmdAttachServiceImage"
        }
      ]
    }
  ],
  "operationIds": [
    "attachServiceImage",
    "decideImageMoment",
    "listCustomer",
    "locatePet",
    "locateServiceExecution"
  ],
  "purpose": "Adicionar opcionalmente uma imagem de antes ou depois de um serviço de um pet.",
  "presentation": {
    "categoryRef": "approvalWorkflow",
    "confidence": 10,
    "classificationNote": "Derived from the journey tier of the approved E8 model; the category is structural, not a guess."
  },
  "sliceHash": "sha256:c88db383"
} as const;

export default attachPetServiceImageWorkspace;
