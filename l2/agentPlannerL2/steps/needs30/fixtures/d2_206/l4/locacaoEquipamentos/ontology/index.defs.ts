/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "businessDomain": "Locação de equipamentos para construção: contratos de locação de um ou mais equipamentos por período, controle de sobreposição, devolução com cálculo de multa por atraso e acompanhamento da situação dos equipamentos.",
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
      "entityId": "ItemContrato",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "contratoCliente",
      "from": "ContratoLocacao",
      "to": "Cliente",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada contrato de locação pertence a um cliente; um cliente pode ter vários contratos.",
      "field": "ContratoLocacao.clienteId"
    },
    {
      "relationshipId": "itemContrato",
      "from": "ItemContrato",
      "to": "ContratoLocacao",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada item pertence a um contrato; um contrato tem um ou mais itens.",
      "field": "ItemContrato.contratoId"
    },
    {
      "relationshipId": "itemEquipamento",
      "from": "ItemContrato",
      "to": "Equipamento",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada item aponta para o equipamento locado; um equipamento aparece em vários itens ao longo do tempo, sem períodos sobrepostos.",
      "field": "ItemContrato.equipamentoId"
    },
    {
      "relationshipId": "equipamentoContratos",
      "from": "Equipamento",
      "to": "ContratoLocacao",
      "type": "manyToMany",
      "required": false,
      "mode": "throughTable",
      "description": "Contratos em que o equipamento foi ou está locado, usados para mostrar o contrato atual e derivar a situação 'locado'.",
      "through": "ItemContrato",
      "path": "Equipamento <- ItemContrato.equipamentoId -> ItemContrato.contratoId -> ContratoLocacao",
      "derived": true
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type LocacaoEquipamentosOntologyIndexType = typeof locacaoEquipamentosOntologyIndex;

export default locacaoEquipamentosOntologyIndex;
