/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "reembolsoDespesas",
  "businessDomain": "Reembolso de despesas",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "reembolsoDespesas",
    "description": "Branch details.reembolsoDespesas of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Colaborador",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "GestorEquipe",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Despesa",
      "kind": "entity",
      "class": "core"
    }
  ],
  "relationships": [
    {
      "relationshipId": "despesaDoColaborador",
      "from": "Despesa",
      "to": "Colaborador",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada despesa pertence obrigatoriamente ao colaborador que a registrou.",
      "field": "Despesa.colaboradorId"
    },
    {
      "relationshipId": "colaboradorReportaGestor",
      "from": "Colaborador",
      "to": "GestorEquipe",
      "type": "manyToOne",
      "required": false,
      "mode": "mdmRelationship",
      "description": "O colaborador reporta-se ao gestor da equipe que pode avaliar suas despesas.",
      "catalogType": "ReportsTo",
      "roles": [
        "direct-report"
      ]
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type ReembolsoDespesasOntologyIndexType = typeof reembolsoDespesasOntologyIndex;

export default reembolsoDespesasOntologyIndex;
