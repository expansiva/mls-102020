/// <mls fileReference="_102047_/l4/ordenServicio/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const ordenServicioOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "ordenServicio",
  "businessDomain": "Servicio técnico de electrónica: recepción de aparatos, diagnóstico, presupuesto con aprobación del cliente en el portal, reparación y entrega.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "ordenServicio",
    "description": "Branch details.ordenServicio of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Cliente",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "OrdenServicio",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "PiezaOrden",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "ordenCliente",
      "from": "OrdenServicio",
      "to": "Cliente",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada orden de servicio pertenece a un cliente, que solo ve en el portal sus propias órdenes.",
      "field": "OrdenServicio.clienteId"
    },
    {
      "relationshipId": "piezaOrden",
      "from": "PiezaOrden",
      "to": "OrdenServicio",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada pieza registrada por el técnico pertenece a una orden de servicio.",
      "field": "PiezaOrden.ordenServicioId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type OrdenServicioOntologyIndexType = typeof ordenServicioOntologyIndex;

export default ordenServicioOntologyIndex;
