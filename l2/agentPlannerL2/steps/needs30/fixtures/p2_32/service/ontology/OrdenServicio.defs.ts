/// <mls fileReference="_102047_/l4/ordenServicio/ontology/OrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityOrdenServicio = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "ordenServicio",
  "entityId": "OrdenServicio",
  "title": "Orden de servicio",
  "description": "Atención técnica de un aparato desde su recepción, análisis y presupuesto hasta su rechazo, reparación y entrega final.",
  "displayField": "serviceOrderNumber",
  "relationships": {
    "customer": {
      "relationshipId": "serviceOrderCustomer",
      "to": "Cliente",
      "via": "OrdenServicio.customerId",
      "cardinality": "N:1",
      "title": "Cliente de la orden",
      "description": "Cliente que entregó el aparato, consulta únicamente sus propias órdenes y decide sobre el presupuesto.",
      "mode": "fk",
      "required": "siempre",
      "role": "cliente"
    },
    "device": {
      "relationshipId": "serviceOrderDevice",
      "to": "Aparato",
      "via": "OrdenServicio.deviceId",
      "cardinality": "N:1",
      "title": "Aparato de la orden",
      "description": "Aparato recibido que se diagnostica, repara, entrega o deja disponible para retiro.",
      "mode": "fk",
      "required": "siempre",
      "role": "aparato recibido"
    }
  },
  "capabilities": {
    "read.byId": "Lee una orden por su identificador para mostrar su información según los permisos de quien la consulta.",
    "locate.byColumn": "Lista órdenes filtradas por número, estado, cliente o aparato para que recepción, técnica y portal encuentren las órdenes pertinentes.",
    "count": "Cuenta las órdenes que cumplen los filtros aplicados para mostrar totales en los listados del módulo.",
    "listByForeignKey": "Lista las órdenes asociadas a un cliente o a un aparato mediante sus claves foráneas, respetando el alcance de acceso.",
    "create": "Crea la orden al recibir el aparato, vinculando cliente y aparato, registrando el defecto informado e iniciándola en análisis; la usa la recepcionista.",
    "update": "Actualiza el diagnóstico, las piezas con costos internos, el valor presupuestado y las anotaciones o reparación registrada; la usa el técnico según el estado de la orden.",
    "transition": "Cambia el estado de la orden al emitir, aprobar o rechazar el presupuesto, marcarla lista o finalizar la entrega; lo usan los actores autorizados en cada transición.",
    "uniqueKey": "Garantiza que no existan dos órdenes con el mismo número consecutivo de orden.",
    "read.mdmRecord": "Lee los registros maestros vinculados de cliente y aparato para mostrar sus datos sin copiarlos en la orden.",
    "sequence.next": "Emite el siguiente número consecutivo de orden al abrir una recepción; lo usa el módulo para identificar la orden.",
    "attach.document": "Adjunta fotos de recepción y otros documentos de soporte a la orden por categoría; lo usan recepción y personal técnico autorizado."
  },
  "rules": [
    "receptionRequiresCustomerDeviceAndDefect",
    "emitBudgetRequiresAnalysis",
    "customerCanDecideOwnBudget",
    "repairRequiresApprovedBudget",
    "repairCompletionRequiresWorkRecorded",
    "deliveryRequiresReadyOrder",
    "customerDisclosureExcludesInternalData"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "ordenServicio_ordenservicio",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "serviceOrderNumber": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "Address",
        "title": "Número de orden",
        "description": "Número consecutivo emitido para identificar y consultar la orden de servicio.",
        "maxLength": 40,
        "min": 0,
        "max": 0
      },
      "customerId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Cliente"
        ],
        "title": "Cliente",
        "description": "Cliente que entregó el aparato y que consulta y decide el presupuesto desde el portal.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "deviceId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Aparato"
        ],
        "title": "Aparato",
        "description": "Aparato recibido para diagnóstico, reparación, entrega o retiro.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "Address",
        "values": [
          {
            "value": "underAnalysis",
            "title": "En análisis",
            "description": "El aparato fue recibido y espera o está siendo analizado por el técnico."
          },
          {
            "value": "budgetSent",
            "title": "Presupuesto enviado",
            "description": "El presupuesto está disponible para que el cliente lo apruebe o rechace."
          },
          {
            "value": "approved",
            "title": "Presupuesto aprobado",
            "description": "El cliente autorizó la reparación y la orden espera reparación técnica."
          },
          {
            "value": "rejected",
            "title": "Presupuesto rechazado",
            "description": "El cliente rechazó el presupuesto y el aparato quedó disponible para retiro."
          },
          {
            "value": "readyForPickup",
            "title": "Lista para entrega",
            "description": "La reparación fue terminada y el aparato está disponible para entrega al cliente."
          },
          {
            "value": "completed",
            "title": "Finalizada",
            "description": "El aparato reparado fue entregado al cliente y la atención terminó."
          }
        ],
        "title": "Estado",
        "description": "Etapa vigente de la atención técnica de la orden.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Datos de la orden",
        "description": "Información no indexada de recepción, análisis, presupuesto y reparación de la orden de servicio.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "reportedDefect": {
            "type": "text",
            "required": true,
            "of": "Address",
            "title": "Defecto informado",
            "description": "Falla o problema del aparato descrito al momento de la recepción.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "diagnosis": {
            "type": "text",
            "of": "Address",
            "title": "Diagnóstico",
            "description": "Diagnóstico técnico de la falla del aparato que se informa al cliente junto con el presupuesto.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "requiredParts": {
            "type": "object",
            "collection": true,
            "of": "Address",
            "title": "Piezas necesarias",
            "description": "Piezas previstas por el técnico para realizar la reparación, con sus costos internos.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "fields": {
              "description": {
                "type": "string",
                "required": true,
                "of": "Address",
                "title": "Pieza",
                "description": "Nombre o descripción de la pieza necesaria.",
                "maxLength": 160,
                "min": 0,
                "max": 0
              },
              "quantity": {
                "type": "integer",
                "required": true,
                "of": "Address",
                "title": "Cantidad",
                "description": "Cantidad de unidades de la pieza necesarias para la reparación.",
                "maxLength": 0,
                "min": 1,
                "max": 0
              },
              "internalCost": {
                "type": "money",
                "required": true,
                "of": "Address",
                "title": "Costo interno",
                "description": "Costo interno estimado de esta pieza, visible solamente para el personal interno autorizado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            }
          },
          "budgetAmount": {
            "type": "money",
            "of": "Address",
            "title": "Valor del presupuesto",
            "description": "Valor propuesto al cliente para autorizar la reparación.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "technicianNotes": {
            "type": "text",
            "of": "Address",
            "title": "Anotaciones técnicas",
            "description": "Observaciones internas del técnico sobre el análisis o la reparación, no visibles para el cliente.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "repairPerformed": {
            "type": "text",
            "of": "Address",
            "title": "Reparación realizada",
            "description": "Trabajo efectuado por el técnico para dejar el aparato listo para entrega.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "availableForPickup": {
            "type": "boolean",
            "derived": true,
            "title": "Aparato disponible para retiro",
            "description": "El aparato está disponible para retiro cuando el presupuesto fue rechazado o cuando la reparación está lista para entrega."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "serviceOrderNumber"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "underAnalysis",
      "reachedBy": "actor"
    },
    {
      "state": "budgetSent",
      "reachedBy": "actor"
    },
    {
      "state": "approved",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    },
    {
      "state": "readyForPickup",
      "reachedBy": "actor"
    },
    {
      "state": "completed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "emitirPresupuesto",
      "from": [
        "underAnalysis"
      ],
      "to": "budgetSent",
      "by": [
        "tecnico"
      ],
      "description": "El técnico emite el presupuesto con el diagnóstico, las piezas necesarias y el valor propuesto para decisión del cliente.",
      "ruleRefs": [
        "emitBudgetRequiresAnalysis"
      ],
      "payload": []
    },
    {
      "transitionId": "aprobarPresupuesto",
      "from": [
        "budgetSent"
      ],
      "to": "approved",
      "by": [
        "cliente"
      ],
      "description": "El cliente de la orden aprueba el presupuesto desde el portal y autoriza la reparación.",
      "ruleRefs": [
        "customerCanDecideOwnBudget"
      ],
      "payload": []
    },
    {
      "transitionId": "rechazarPresupuesto",
      "from": [
        "budgetSent"
      ],
      "to": "rejected",
      "by": [
        "cliente"
      ],
      "description": "El cliente de la orden rechaza el presupuesto desde el portal; la orden se cierra y el aparato queda disponible para retiro.",
      "ruleRefs": [
        "customerCanDecideOwnBudget"
      ],
      "payload": []
    },
    {
      "transitionId": "marcarLista",
      "from": [
        "approved"
      ],
      "to": "readyForPickup",
      "by": [
        "tecnico"
      ],
      "description": "El técnico registra la reparación realizada y deja el aparato listo para entrega.",
      "ruleRefs": [
        "repairRequiresApprovedBudget",
        "repairCompletionRequiresWorkRecorded"
      ],
      "payload": [
        "details.repairPerformed"
      ]
    },
    {
      "transitionId": "entregarYfinalizar",
      "from": [
        "readyForPickup"
      ],
      "to": "completed",
      "by": [
        "recepcionista"
      ],
      "description": "El recepcionista entrega al cliente el aparato reparado y finaliza la orden.",
      "ruleRefs": [
        "deliveryRequiresReadyOrder"
      ],
      "payload": []
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type OrdenServicioEntityOrdenServicioType = typeof ordenServicioEntityOrdenServicio;

export default ordenServicioEntityOrdenServicio;
