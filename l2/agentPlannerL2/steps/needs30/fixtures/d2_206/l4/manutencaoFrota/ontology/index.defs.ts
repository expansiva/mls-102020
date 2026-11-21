/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "businessDomain": "Manutenção de frota de transportadora: veículos, abastecimentos registrados pelos motoristas, planos de manutenção preventiva e ordens de manutenção em oficinas.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "manutencaoFrota",
    "description": "Branch details.manutencaoFrota of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Veiculo",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Motorista",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Oficina",
      "kind": "role",
      "subtype": "Company"
    },
    {
      "entityId": "Abastecimento",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "PlanoManutencao",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "OrdemManutencao",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "veiculoMotorista",
      "from": "Veiculo",
      "to": "Motorista",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "O veículo é atribuído ao motorista que o dirige; é o caminho do escopo do motorista.",
      "field": "Veiculo.motoristaId"
    },
    {
      "relationshipId": "abastecimentoVeiculo",
      "from": "Abastecimento",
      "to": "Veiculo",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O abastecimento pertence a um veículo.",
      "field": "Abastecimento.veiculoId"
    },
    {
      "relationshipId": "abastecimentoMotorista",
      "from": "Abastecimento",
      "to": "Motorista",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O abastecimento foi registrado pelo motorista que dirigia o veículo.",
      "field": "Abastecimento.motoristaId"
    },
    {
      "relationshipId": "planoVeiculo",
      "from": "PlanoManutencao",
      "to": "Veiculo",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O plano de preventiva é definido para um veículo.",
      "field": "PlanoManutencao.veiculoId"
    },
    {
      "relationshipId": "ordemVeiculo",
      "from": "OrdemManutencao",
      "to": "Veiculo",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "A ordem de manutenção é aberta para um veículo.",
      "field": "OrdemManutencao.veiculoId"
    },
    {
      "relationshipId": "ordemPlano",
      "from": "OrdemManutencao",
      "to": "PlanoManutencao",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "A ordem preventiva é vinculada ao plano que venceu; a corretiva não tem plano.",
      "field": "OrdemManutencao.planoId"
    },
    {
      "relationshipId": "ordemOficina",
      "from": "OrdemManutencao",
      "to": "Oficina",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "A ordem é executada em uma oficina.",
      "field": "OrdemManutencao.oficinaId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type ManutencaoFrotaOntologyIndexType = typeof manutencaoFrotaOntologyIndex;

export default manutencaoFrotaOntologyIndex;
