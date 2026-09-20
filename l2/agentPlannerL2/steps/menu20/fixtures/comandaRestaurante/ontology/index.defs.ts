/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "businessDomain": "Gestão de comandas e atendimento de restaurante",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "comandaRestaurante",
    "description": "Branch details.comandaRestaurante of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Mesa",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "ItemCardapio",
      "kind": "role",
      "subtype": "Product"
    },
    {
      "entityId": "Comanda",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "ItemComanda",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "comandaMesa",
      "from": "Comanda",
      "to": "Mesa",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada comanda é aberta para uma mesa, e uma mesa pode receber diversas comandas ao longo do tempo.",
      "field": "Comanda.mesaId"
    },
    {
      "relationshipId": "itemComandaComanda",
      "from": "ItemComanda",
      "to": "Comanda",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada lançamento pertence a uma única comanda, que pode reunir vários itens lançados.",
      "field": "ItemComanda.comandaId"
    },
    {
      "relationshipId": "itemComandaItemCardapio",
      "from": "ItemComanda",
      "to": "ItemCardapio",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada lançamento registra o item do cardápio solicitado, usando o preço vigente no momento do lançamento.",
      "field": "ItemComanda.itemCardapioId"
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type ComandaRestauranteOntologyIndexType = typeof comandaRestauranteOntologyIndex;

export default comandaRestauranteOntologyIndex;
