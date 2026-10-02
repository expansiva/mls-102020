/// <mls fileReference="_102047_/l4/ordenServicio/journeys/repararYmarcarLista.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const repararYmarcarListaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "repararYmarcarLista",
  "business": {
    "actorRef": "tecnico",
    "title": "Reparar el aparato y marcar la orden como lista",
    "goal": "Realizar la reparación autorizada y dejar constancia del trabajo efectuado para su entrega.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdenAprobada",
        "kind": "locate",
        "entity": "OrdenServicio",
        "title": "Localizar la orden aprobada",
        "description": "Localiza la orden cuyo presupuesto fue aprobado y está pendiente de reparación."
      },
      {
        "stepId": "revisarDiagnosticoAprobado",
        "kind": "inspect",
        "entity": "OrdenServicio",
        "title": "Revisar la reparación autorizada",
        "description": "Revisa el diagnóstico, las piezas previstas y la autorización del cliente antes de reparar."
      },
      {
        "stepId": "registrarReparacionTerminada",
        "kind": "act",
        "entity": "OrdenServicio",
        "effect": "transition",
        "transitionRef": "marcarLista",
        "title": "Registrar la reparación terminada",
        "description": "Realiza la reparación, registra lo efectuado y marca la orden como lista para entrega."
      },
      {
        "stepId": "derivarEntrega",
        "kind": "handoff",
        "entity": "OrdenServicio",
        "title": "Derivar a entrega",
        "description": "Deriva la orden lista al recepcionista para entregar el aparato.",
        "handoffTo": "recepcionista"
      }
    ],
    "outcome": {
      "statement": "La reparación queda registrada y la orden está lista para entregar el aparato.",
      "evidence": [
        "La OrdenServicio muestra que está lista para entrega.",
        "La orden contiene el registro del trabajo de reparación realizado."
      ]
    }
  },
  "businessHash": "sha256:77c4d636f785d73ecb59d6696e68ba1a7621ff3915fbc25ca99ae5e9339805be"
} as const satisfies Ns5JourneyArtifact;

export type RepararYmarcarListaJourneyType = typeof repararYmarcarListaJourney;

export default repararYmarcarListaJourney;
