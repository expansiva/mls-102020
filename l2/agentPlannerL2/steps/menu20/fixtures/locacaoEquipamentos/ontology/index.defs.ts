/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "businessDomain": "Locação de equipamentos para construção",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "locacaoEquipamentos",
    "description": "Branch details.locacaoEquipamentos of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Cliente",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Equipamento",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "ContratoLocacao",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "ItemLocacao",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "ManutencaoEquipamento",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "clienteContratosLocacao",
      "from": "Cliente",
      "to": "ContratoLocacao",
      "type": "oneToMany",
      "required": true,
      "mode": "fk",
      "description": "Um cliente pode possuir vários contratos de locação, e cada contrato pertence a um cliente.",
      "field": "ContratoLocacao.clienteId"
    },
    {
      "relationshipId": "contratoItensLocacao",
      "from": "ContratoLocacao",
      "to": "ItemLocacao",
      "type": "oneToMany",
      "required": true,
      "mode": "fk",
      "description": "Um contrato de locação contém um ou mais itens de equipamentos locados.",
      "field": "ItemLocacao.contratoLocacaoId"
    },
    {
      "relationshipId": "itemLocacaoEquipamento",
      "from": "ItemLocacao",
      "to": "Equipamento",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada item de locação referencia exatamente um equipamento, que pode constar em locações diferentes em períodos não sobrepostos.",
      "field": "ItemLocacao.equipamentoId"
    },
    {
      "relationshipId": "equipamentoManutencoes",
      "from": "Equipamento",
      "to": "ManutencaoEquipamento",
      "type": "oneToMany",
      "required": true,
      "mode": "fk",
      "description": "Um equipamento pode ter vários períodos de manutenção, cada um associado a um único equipamento.",
      "field": "ManutencaoEquipamento.equipamentoId"
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type LocacaoEquipamentosOntologyIndexType = typeof locacaoEquipamentosOntologyIndex;

export default locacaoEquipamentosOntologyIndex;
