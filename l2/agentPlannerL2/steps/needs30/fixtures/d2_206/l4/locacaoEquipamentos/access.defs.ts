/// <mls fileReference="_102047_/l4/locacaoEquipamentos/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "locacaoEquipamentos",
  "actors": [
    {
      "actorId": "atendente",
      "kind": "internal",
      "origin": "named",
      "title": "Atendente",
      "description": "Cria contratos de locação para clientes com um ou mais equipamentos e período, e registra a devolução com a data real.",
      "personEntity": ""
    },
    {
      "actorId": "gerente",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente",
      "description": "Acompanha a situação dos equipamentos: disponíveis, locados ou em manutenção.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "atendenteClientes",
      "actorRef": "atendente",
      "title": "Localizar e cadastrar clientes",
      "description": "O atendente busca clientes pelo nome ou documento e cadastra o cliente quando ainda não existe, para abrir contratos de locação.",
      "entityRefs": [
        "Cliente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os clientes da locadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O atendente vê o cadastro completo do cliente: identificação, documento, endereços, contatos e consentimento."
      }
    },
    {
      "grantId": "atendenteContratos",
      "actorRef": "atendente",
      "title": "Criar contratos e registrar devoluções",
      "description": "O atendente cria contratos de locação, inclui equipamentos, confirma o contrato e registra a data real de devolução, conferindo dias de atraso e multa.",
      "entityRefs": [
        "ContratoLocacao",
        "ItemContrato"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os contratos e itens de contrato da locadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O atendente vê todos os dados do contrato e de seus itens, incluindo valores calculados de atraso e multa."
      }
    },
    {
      "grantId": "atendenteEquipamentos",
      "actorRef": "atendente",
      "title": "Consultar equipamentos",
      "description": "O atendente busca equipamentos pelo código ou descrição e confere a situação e o valor da diária antes de incluí-los no contrato.",
      "entityRefs": [
        "Equipamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os equipamentos da locadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O atendente vê código, descrição, situação, valor da diária e o contrato atual do equipamento."
      }
    },
    {
      "grantId": "gerenteEquipamentos",
      "actorRef": "gerente",
      "title": "Manter e acompanhar equipamentos",
      "description": "O gerente cadastra os equipamentos, mantém a situação (disponível ou em manutenção) e acompanha quais estão disponíveis, locados ou em manutenção.",
      "entityRefs": [
        "Equipamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os equipamentos da locadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gerente vê todos os dados do equipamento, inclusive a situação atual e o contrato em que está locado."
      }
    },
    {
      "grantId": "gerenteContratos",
      "actorRef": "gerente",
      "title": "Consultar contratos dos equipamentos",
      "description": "O gerente consulta o contrato e os itens em que um equipamento está locado.",
      "entityRefs": [
        "ContratoLocacao",
        "ItemContrato"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os contratos e itens de contrato da locadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gerente vê os dados dos contratos e itens, incluindo período, atraso e multa."
      }
    },
    {
      "grantId": "gerenteClientes",
      "actorRef": "gerente",
      "title": "Identificar o cliente do contrato",
      "description": "O gerente vê o nome do cliente titular do contrato em que o equipamento está locado.",
      "entityRefs": [
        "Cliente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Clientes da locadora."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O gerente vê apenas o nome e a situação do cadastro do cliente, sem documento, endereços ou contatos.",
        "allowedFields": [
          "Cliente.details.identification.name",
          "Cliente.details.identification.status"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type LocacaoEquipamentosAccessType = typeof locacaoEquipamentosAccess;

export default locacaoEquipamentosAccess;
