/// <mls fileReference="_102047_/l4/financeiro/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "financeiro",
  "actors": [
    {
      "actorId": "caixa",
      "kind": "internal",
      "origin": "named",
      "title": "Caixa",
      "description": "Recebe títulos em dinheiro, pix ou cartão, registra baixas parciais e estorna recebimentos no mesmo dia.",
      "personEntity": ""
    },
    {
      "actorId": "gerenteFinanceiro",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente financeiro",
      "description": "Acompanha o painel de recebíveis por período e por origem, consulta os títulos vencidos e emite extrato por pagador.",
      "personEntity": ""
    },
    {
      "actorId": "pagador",
      "kind": "external",
      "origin": "named",
      "title": "Pagador",
      "description": "Acessa o portal para ver só os próprios títulos e recebimentos e pagar com cartão um título em aberto.",
      "personEntity": "Pagador"
    }
  ],
  "grants": [
    {
      "grantId": "caixaTitulos",
      "actorRef": "caixa",
      "title": "Caixa: títulos a receber",
      "description": "O caixa localiza e confere os títulos a receber da organização (pagador, valor, saldo, vencimento e origem) para registrar recebimentos.",
      "entityRefs": [
        "TituloReceber"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os títulos a receber da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O caixa vê o título completo, incluindo saldo em aberto e situação derivada."
      }
    },
    {
      "grantId": "caixaRecebimentos",
      "actorRef": "caixa",
      "title": "Caixa: recebimentos e estornos",
      "description": "O caixa registra recebimentos totais ou parciais em dinheiro, pix ou cartão via Stripe e estorna recebimentos do mesmo dia.",
      "entityRefs": [
        "Recebimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os recebimentos da organização; o estorno só é permitido no mesmo dia."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O caixa vê o recebimento completo, incluindo dados do estorno."
      }
    },
    {
      "grantId": "caixaPagadorIdentificacao",
      "actorRef": "caixa",
      "title": "Caixa: identificação do pagador",
      "description": "O caixa vê o nome e o documento do pagador para localizar e conferir o título.",
      "entityRefs": [
        "Pagador"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Pagadores da organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Apenas nome e documento do pagador; endereços, contatos e consentimento ficam ocultos.",
        "allowedFields": [
          "Pagador.details.identification.name",
          "Pagador.details.identification.docType",
          "Pagador.details.identification.docId"
        ]
      }
    },
    {
      "grantId": "gerenteRecebiveis",
      "actorRef": "gerenteFinanceiro",
      "title": "Gerente: títulos, recebimentos e painel",
      "description": "O gerente financeiro acompanha o painel de recebíveis por período e origem, lista os títulos vencidos e consulta títulos e recebimentos para o extrato.",
      "entityRefs": [
        "TituloReceber",
        "Recebimento",
        "PainelRecebiveis"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os títulos, recebimentos e totais do painel da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gerente vê os registros completos e os totais do painel."
      }
    },
    {
      "grantId": "gerentePagadores",
      "actorRef": "gerenteFinanceiro",
      "title": "Gerente: pagadores",
      "description": "O gerente localiza o pagador por nome ou documento e emite o extrato com seus dados de cabeçalho e contatos para cobrança de vencidos.",
      "entityRefs": [
        "Pagador"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os pagadores da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gerente vê o registro do pagador visível ao módulo."
      }
    },
    {
      "grantId": "pagadorMeuCadastro",
      "actorRef": "pagador",
      "title": "Pagador: meu cadastro",
      "description": "O pagador vê o próprio registro no portal.",
      "entityRefs": [
        "Pagador"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o registro do próprio pagador da sessão.",
        "anchorEntity": "Pagador"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O pagador vê os próprios dados."
      }
    },
    {
      "grantId": "pagadorMeusTitulos",
      "actorRef": "pagador",
      "title": "Pagador: meus títulos",
      "description": "O pagador vê no portal somente os próprios títulos, em aberto e quitados, e escolhe um em aberto para pagar com cartão.",
      "entityRefs": [
        "TituloReceber"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Títulos cujo pagador é a pessoa da sessão.",
        "anchorEntity": "Pagador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O pagador vê valor, vencimento, origem, saldo e situação; o identificador interno do documento de origem fica oculto.",
        "deniedFields": [
          "TituloReceber.origemReferencia"
        ]
      }
    },
    {
      "grantId": "pagadorMeusRecebimentos",
      "actorRef": "pagador",
      "title": "Pagador: meus recebimentos",
      "description": "O pagador vê os recebimentos dos próprios títulos e paga com cartão via Stripe um título em aberto.",
      "entityRefs": [
        "Recebimento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Recebimentos de títulos cujo pagador é a pessoa da sessão.",
        "anchorEntity": "Pagador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O pagador vê valor, data, forma de pagamento e situação; o identificador do Stripe e a anotação interna do caixa ficam ocultos.",
        "deniedFields": [
          "Recebimento.stripePaymentIntentId",
          "Recebimento.details.observacao"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type FinanceiroAccessType = typeof financeiroAccess;

export default financeiroAccess;
