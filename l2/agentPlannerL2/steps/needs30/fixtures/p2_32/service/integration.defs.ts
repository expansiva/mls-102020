/// <mls fileReference="_102047_/l4/ordenServicio/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "ordenServicio",
  "inbound": [],
  "outbound": [
    {
      "id": "emitirPresupuesto",
      "kind": "event",
      "to": "any",
      "event": "emitirPresupuesto",
      "on": "OrdenServicio.emitirPresupuesto",
      "description": "Publica la orden con el presupuesto emitido para que otros módulos que lo requieran puedan reaccionar.",
      "entityRefs": [
        "OrdenServicio"
      ]
    },
    {
      "id": "aprobarPresupuesto",
      "kind": "event",
      "to": "any",
      "event": "aprobarPresupuesto",
      "on": "OrdenServicio.aprobarPresupuesto",
      "description": "Publica la aprobación del presupuesto de la orden para los módulos suscritos.",
      "entityRefs": [
        "OrdenServicio"
      ]
    },
    {
      "id": "rechazarPresupuesto",
      "kind": "event",
      "to": "any",
      "event": "rechazarPresupuesto",
      "on": "OrdenServicio.rechazarPresupuesto",
      "description": "Publica el rechazo del presupuesto y el cierre de la orden para los módulos suscritos.",
      "entityRefs": [
        "OrdenServicio"
      ]
    },
    {
      "id": "marcarLista",
      "kind": "event",
      "to": "any",
      "event": "marcarLista",
      "on": "OrdenServicio.marcarLista",
      "description": "Publica que la reparación está lista y el aparato queda disponible para entrega.",
      "entityRefs": [
        "OrdenServicio"
      ]
    },
    {
      "id": "entregarYfinalizar",
      "kind": "event",
      "to": "any",
      "event": "entregarYfinalizar",
      "on": "OrdenServicio.entregarYfinalizar",
      "description": "Publica la entrega del aparato y la finalización de la orden.",
      "entityRefs": [
        "OrdenServicio"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type OrdenServicioIntegrationType = typeof ordenServicioIntegration;

export default ordenServicioIntegration;
