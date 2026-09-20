/// <mls fileReference="_102047_/l4/manutencaoFrota/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "manutencaoFrota",
  "actors": [
    {
      "actorId": "motorista",
      "kind": "internal",
      "origin": "named",
      "title": "Motorista",
      "description": "Registra abastecimentos dos veículos que dirige e consulta apenas os veículos a ele atribuídos."
    },
    {
      "actorId": "gestor",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor de frota",
      "description": "Gerencia planos de manutenção preventiva e abre ordens de manutenção para os veículos da frota."
    }
  ],
  "grants": [
    {
      "grantId": "motoristaVeiculosAtribuidos",
      "actorRef": "motorista",
      "title": "Consultar veículos atribuídos",
      "description": "Permite ao motorista consultar os dados operacionais dos veículos atribuídos a ele.",
      "entityRefs": [
        "Vehicle"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente veículos alcançados pela atribuição vinculada ao cadastro de motorista correspondente à pessoa da sessão.",
        "anchorEntity": "Driver"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Exibe a identificação, as características veiculares e a quilometragem operacional necessárias ao motorista.",
        "allowedFields": [
          "Vehicle.details.identification",
          "Vehicle.details.assetVehicle",
          "Vehicle.details.manutencaoFrota"
        ]
      }
    },
    {
      "grantId": "motoristaAbastecimentosProprios",
      "actorRef": "motorista",
      "title": "Registrar e consultar próprios abastecimentos",
      "description": "Permite ao motorista registrar e consultar abastecimentos vinculados ao seu próprio cadastro de motorista.",
      "entityRefs": [
        "Fueling"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente abastecimentos cujo motorista vinculado corresponde à pessoa da sessão.",
        "anchorEntity": "Driver"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Exibe integralmente os dados dos abastecimentos do próprio motorista."
      }
    },
    {
      "grantId": "gestorGerenciarFrota",
      "actorRef": "gestor",
      "title": "Gerenciar manutenção da frota",
      "description": "Permite ao gestor cadastrar os cadastros operacionais da frota, definir planos preventivos e abrir ou atualizar ordens de manutenção.",
      "entityRefs": [
        "Vehicle",
        "Driver",
        "Workshop",
        "VehicleAssignment",
        "MaintenancePlan",
        "MaintenanceOrder"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os registros de manutenção de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Exibe integralmente os dados necessários para administrar a frota e suas manutenções."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ManutencaoFrotaAccessType = typeof manutencaoFrotaAccess;

export default manutencaoFrotaAccess;
