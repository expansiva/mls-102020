/// <mls fileReference="_102047_/l4/financeiro/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const financeiroOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "businessDomain": "Contas a receber e recebimentos financeiros",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "financeiro",
    "description": "Branch details.financeiro of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Pagador",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "GerenteFinanceiro",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "TituloReceber",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Recebimento",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "ExtratoPagador",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "PainelRecebiveis",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "tituloTemPagador",
      "from": "TituloReceber",
      "to": "Pagador",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada título a receber pertence obrigatoriamente a um pagador.",
      "field": "TituloReceber.pagadorId"
    },
    {
      "relationshipId": "recebimentoDoTitulo",
      "from": "Recebimento",
      "to": "TituloReceber",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada recebimento é lançado obrigatoriamente para um título a receber.",
      "field": "Recebimento.tituloReceberId"
    },
    {
      "relationshipId": "extratoDoPagador",
      "from": "ExtratoPagador",
      "to": "Pagador",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada extrato emitido referencia obrigatoriamente o pagador a que se destina.",
      "field": "ExtratoPagador.pagadorId"
    },
    {
      "relationshipId": "pagadorTemRecebimentos",
      "from": "Pagador",
      "to": "Recebimento",
      "type": "oneToMany",
      "required": false,
      "mode": "throughTable",
      "description": "Os recebimentos de um pagador são obtidos pelos títulos a receber vinculados a ele.",
      "through": "Recebimento",
      "path": "Pagador <- TituloReceber.pagadorId; Recebimento.tituloReceberId -> TituloReceber",
      "derived": true
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type FinanceiroOntologyIndexType = typeof financeiroOntologyIndex;

export default financeiroOntologyIndex;
