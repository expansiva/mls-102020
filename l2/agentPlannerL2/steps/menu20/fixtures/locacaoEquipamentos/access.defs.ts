/// <mls fileReference="_102047_/l4/locacaoEquipamentos/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "locacaoEquipamentos",
  "actors": [
    {
      "actorId": "atendente",
      "kind": "internal",
      "origin": "named",
      "title": "Atendente",
      "description": "Cria contratos de locação para clientes e registra a devolução dos equipamentos."
    },
    {
      "actorId": "gerente",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente",
      "description": "Acompanha a disponibilidade, a locação e a manutenção dos equipamentos."
    }
  ],
  "grants": [
    {
      "grantId": "atendenteLocalizarCliente",
      "actorRef": "atendente",
      "title": "Localizar clientes para locação",
      "description": "Permite ao atendente identificar o cliente cadastrado ao preparar um contrato de locação.",
      "entityRefs": [
        "Cliente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Clientes cadastrados na organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Permite consultar a identificação do cliente necessária para sua localização; os demais dados do registro mestre permanecem restritos.",
        "allowedFields": [
          "Cliente.id",
          "Cliente.details.identification",
          "Cliente.details.locacaoEquipamentos"
        ]
      }
    },
    {
      "grantId": "atendenteSelecionarEquipamentos",
      "actorRef": "atendente",
      "title": "Consultar equipamentos para locação",
      "description": "Permite ao atendente consultar os equipamentos e suas condições comerciais e operacionais ao montar um contrato.",
      "entityRefs": [
        "Equipamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Equipamentos pertencentes à organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Permite consultar o código, a descrição, a diária e a situação operacional de cada equipamento.",
        "allowedFields": [
          "Equipamento.id",
          "Equipamento.codigo",
          "Equipamento.details.descricao",
          "Equipamento.details.valorDiaria",
          "Equipamento.details.situacaoOperacional"
        ]
      }
    },
    {
      "grantId": "atendenteGerirLocacoes",
      "actorRef": "atendente",
      "title": "Criar e concluir contratos de locação",
      "description": "Permite ao atendente registrar contratos, seus equipamentos locados e a devolução efetiva, inclusive a multa calculada por atraso.",
      "entityRefs": [
        "ContratoLocacao",
        "ItemLocacao"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Contratos e itens de locação da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite consultar integralmente os contratos de locação e seus itens para criação, conferência e devolução."
      }
    },
    {
      "grantId": "gerenteGerirInventario",
      "actorRef": "gerente",
      "title": "Gerir equipamentos e manutenções",
      "description": "Permite ao gerente administrar o cadastro de equipamentos e seus períodos de manutenção, acompanhando a situação operacional.",
      "entityRefs": [
        "Equipamento",
        "ManutencaoEquipamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Equipamentos e manutenções de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite consultar integralmente os equipamentos e os registros de manutenção necessários para gerir a disponibilidade."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type LocacaoEquipamentosAccessType = typeof locacaoEquipamentosAccess;

export default locacaoEquipamentosAccess;
