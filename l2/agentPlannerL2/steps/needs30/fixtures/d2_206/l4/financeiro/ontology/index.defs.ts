/// <mls fileReference="_102047_/l4/financeiro/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "businessDomain": "Contas a receber da organização: títulos a receber originados em outros módulos (comanda do restaurante, mensalidade da academia, ordem de serviço da assistência técnica), recebimentos no caixa ou pelo portal com cartão via Stripe, baixas parciais, estornos no mesmo dia, painel de recebíveis e extrato por pagador.",
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
      "entityId": "PainelRecebiveis",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "tituloPagador",
      "from": "TituloReceber",
      "to": "Pagador",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada título a receber pertence a um pagador, que responde pelo pagamento.",
      "field": "TituloReceber.pagadorId"
    },
    {
      "relationshipId": "recebimentoTitulo",
      "from": "Recebimento",
      "to": "TituloReceber",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada recebimento baixa, total ou parcialmente, um título a receber.",
      "field": "Recebimento.tituloId"
    },
    {
      "relationshipId": "pagadorRecebimentos",
      "from": "Pagador",
      "to": "Recebimento",
      "type": "oneToMany",
      "required": false,
      "mode": "throughTable",
      "description": "Os recebimentos de um pagador, obtidos pelos títulos dele, usados no portal e no extrato.",
      "through": "TituloReceber",
      "path": "Pagador <- TituloReceber.pagadorId <- Recebimento.tituloId",
      "derived": true
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type FinanceiroOntologyIndexType = typeof financeiroOntologyIndex;

export default financeiroOntologyIndex;
