/// <mls fileReference="_102047_/l4/ordenServicio/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const ordenServicioIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "ordenServicio",
  "inbound": [],
  "outbound": [
    {
      "id": "presupuestoAprobado",
      "kind": "event",
      "to": "any",
      "event": "presupuestoAprobado",
      "on": "OrdenServicio.aprobarPresupuesto",
      "description": "Se publica cuando el cliente aprueba el presupuesto desde el portal. Lleva el registro de la orden de servicio con el cliente, el valor del presupuesto aprobado y las piezas necesarias, para que otros módulos (por ejemplo, financiero o control de stock) puedan reaccionar.",
      "entityRefs": [
        "OrdenServicio",
        "Cliente",
        "PiezaOrden"
      ]
    },
    {
      "id": "presupuestoRechazado",
      "kind": "event",
      "to": "any",
      "event": "presupuestoRechazado",
      "on": "OrdenServicio.rechazarPresupuesto",
      "description": "Se publica cuando el cliente rechaza el presupuesto: la orden se cierra como rechazada y el aparato queda disponible para retiro.",
      "entityRefs": [
        "OrdenServicio",
        "Cliente"
      ]
    },
    {
      "id": "ordenServicioFinalizada",
      "kind": "event",
      "to": "any",
      "event": "ordenServicioFinalizada",
      "on": "OrdenServicio.finalizar",
      "description": "Se publica cuando el recepcionista entrega el aparato y finaliza la orden. Lleva la orden con el cliente y el valor del presupuesto, por ejemplo para que el módulo financiero registre el cobro.",
      "entityRefs": [
        "OrdenServicio",
        "Cliente"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type OrdenServicioIntegrationType = typeof ordenServicioIntegration;

export default ordenServicioIntegration;
