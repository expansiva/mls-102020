/// <mls fileReference="_102047_/l4/manutencaoFrota/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "manutencaoFrota",
  "actors": [
    {
      "actorId": "motorista",
      "kind": "internal",
      "origin": "named",
      "title": "Motorista",
      "description": "Motorista da transportadora que registra os abastecimentos (data, litros, valor, km no painel) do veículo que dirige e só vê os veículos atribuídos a ele.",
      "personEntity": "Motorista"
    },
    {
      "actorId": "gestor",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor de frota",
      "description": "Gestor de frota que cadastra os veículos e os planos de manutenção preventiva por veículo, abre ordens de manutenção quando o plano vence ou quando há defeito, e acompanha os avisos de preventiva vencida por quilometragem.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "motoristaVeiculosAtribuidos",
      "actorRef": "motorista",
      "title": "Veículos atribuídos ao motorista",
      "description": "O motorista localiza e confere apenas os veículos atribuídos a ele, vendo placa, modelo, ano e quilometragem atual.",
      "entityRefs": [
        "Veiculo"
      ],
      "dataScope": {
        "mode": "assigned",
        "description": "Somente veículos cujo motorista atribuído é o motorista da sessão.",
        "anchorEntity": "Motorista"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Placa, modelo, motorista atribuído, ano e quilometragem atual; os indicadores de preventiva ficam com o gestor.",
        "allowedFields": [
          "Veiculo.placa",
          "Veiculo.modelo",
          "Veiculo.motoristaId",
          "Veiculo.details.ano",
          "Veiculo.details.quilometragemAtual"
        ]
      }
    },
    {
      "grantId": "motoristaMeusAbastecimentos",
      "actorRef": "motorista",
      "title": "Meus abastecimentos",
      "description": "O motorista registra e consulta os abastecimentos que ele mesmo lançou, com data, litros, valor e km no painel.",
      "entityRefs": [
        "Abastecimento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente abastecimentos registrados pelo motorista da sessão.",
        "anchorEntity": "Motorista"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O motorista vê o registro completo dos seus abastecimentos."
      }
    },
    {
      "grantId": "motoristaProprioCadastro",
      "actorRef": "motorista",
      "title": "Meu cadastro de motorista",
      "description": "O motorista vê o próprio nome e a situação do seu cadastro, exibidos na atribuição de veículos e nos abastecimentos.",
      "entityRefs": [
        "Motorista"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o registro mestre do próprio motorista da sessão.",
        "anchorEntity": "Motorista"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Nome, situação e apelidos do próprio motorista.",
        "allowedFields": [
          "Motorista.details.identification.name",
          "Motorista.details.identification.status",
          "Motorista.details.base.aliases"
        ]
      }
    },
    {
      "grantId": "gestorFrota",
      "actorRef": "gestor",
      "title": "Gestão da frota e da manutenção",
      "description": "O gestor cadastra veículos e os atribui a motoristas, define planos de preventiva, abre e conclui ordens de manutenção, acompanha preventivas vencidas e consulta os abastecimentos.",
      "entityRefs": [
        "Veiculo",
        "PlanoManutencao",
        "OrdemManutencao",
        "Abastecimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os veículos, planos, ordens e abastecimentos da transportadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gestor vê os registros completos, incluindo os valores calculados de vencimento e custo."
      }
    },
    {
      "grantId": "gestorCadastrosMestres",
      "actorRef": "gestor",
      "title": "Cadastro de motoristas e oficinas",
      "description": "O gestor mantém os motoristas da transportadora e as oficinas que executam as ordens de manutenção.",
      "entityRefs": [
        "Motorista",
        "Oficina"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os motoristas e oficinas da organização com papel neste módulo."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gestor vê o registro mestre completo de motoristas e oficinas."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ManutencaoFrotaAccessType = typeof manutencaoFrotaAccess;

export default manutencaoFrotaAccess;
