/// <mls fileReference="_102047_/l4/ordenServicio/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "ordenServicio",
  "actors": [
    {
      "actorId": "recepcionista",
      "kind": "internal",
      "origin": "named",
      "title": "Recepcionista",
      "description": "Abre órdenes de servicio, registra la recepción del aparato, entrega el aparato reparado y finaliza la orden."
    },
    {
      "actorId": "tecnico",
      "kind": "internal",
      "origin": "named",
      "title": "Técnico",
      "description": "Analiza el aparato, registra el diagnóstico, las piezas y costos internos, prepara el presupuesto y realiza la reparación."
    },
    {
      "actorId": "cliente",
      "kind": "external",
      "origin": "named",
      "title": "Cliente",
      "description": "Consulta sus propias órdenes en el portal y aprueba o rechaza el presupuesto."
    }
  ],
  "grants": [
    {
      "grantId": "recepcionGestionaOrdenes",
      "actorRef": "recepcionista",
      "title": "Gestionar recepción y entrega de órdenes",
      "description": "Permite registrar la recepción de aparatos, consultar los datos necesarios para la entrega y finalizar las órdenes de servicio de la organización.",
      "entityRefs": [
        "Cliente",
        "Aparato",
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Accede a las órdenes, clientes y aparatos de toda la organización necesarios para la recepción y la entrega."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Muestra los datos de cliente y aparato necesarios para atender la orden, además de la recepción, diagnóstico, presupuesto, reparación y disponibilidad para retiro; no expone costos internos ni anotaciones técnicas.",
        "allowedFields": [
          "Cliente.details.identification",
          "Cliente.details.base",
          "Aparato.details.identification",
          "Aparato.details.assetEquipment",
          "OrdenServicio.serviceOrderNumber",
          "OrdenServicio.customerId",
          "OrdenServicio.deviceId",
          "OrdenServicio.status",
          "OrdenServicio.details.reportedDefect",
          "OrdenServicio.details.diagnosis",
          "OrdenServicio.details.budgetAmount",
          "OrdenServicio.details.repairPerformed",
          "OrdenServicio.details.availableForPickup"
        ]
      }
    },
    {
      "grantId": "tecnicoGestionaReparaciones",
      "actorRef": "tecnico",
      "title": "Analizar, presupuestar y reparar órdenes",
      "description": "Permite consultar las órdenes de la organización, registrar el análisis y los costos internos, preparar presupuestos y dejar constancia de las reparaciones realizadas.",
      "entityRefs": [
        "Cliente",
        "Aparato",
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Accede a las órdenes, clientes y aparatos de toda la organización requeridos para el análisis y la reparación."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Muestra la identificación del cliente, la identificación técnica del aparato y toda la información de la orden, incluidos diagnóstico, piezas, costos internos y anotaciones técnicas.",
        "allowedFields": [
          "Cliente.details.identification",
          "Aparato.details.identification",
          "Aparato.details.assetEquipment",
          "OrdenServicio.id",
          "OrdenServicio.version",
          "OrdenServicio.serviceOrderNumber",
          "OrdenServicio.customerId",
          "OrdenServicio.deviceId",
          "OrdenServicio.status",
          "OrdenServicio.details"
        ]
      }
    },
    {
      "grantId": "clienteConsultaYdecidePresupuesto",
      "actorRef": "cliente",
      "title": "Consultar y decidir presupuestos propios",
      "description": "Permite al cliente consultar únicamente sus órdenes de servicio y aprobar o rechazar el presupuesto recibido desde el portal.",
      "entityRefs": [
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Accede solo a las órdenes cuyo cliente vinculado corresponde a la persona de la sesión.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Muestra el número, estado, diagnóstico, valor del presupuesto y disponibilidad para retiro de las órdenes propias, sin revelar costos internos de piezas ni anotaciones del técnico.",
        "allowedFields": [
          "OrdenServicio.serviceOrderNumber",
          "OrdenServicio.status",
          "OrdenServicio.details.diagnosis",
          "OrdenServicio.details.budgetAmount",
          "OrdenServicio.details.availableForPickup"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type OrdenServicioAccessType = typeof ordenServicioAccess;

export default ordenServicioAccess;
