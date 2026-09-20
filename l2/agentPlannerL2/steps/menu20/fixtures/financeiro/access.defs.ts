/// <mls fileReference="_102047_/l4/financeiro/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const financeiroAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "financeiro",
  "actors": [
    {
      "actorId": "caixa",
      "kind": "internal",
      "origin": "named",
      "title": "Caixa",
      "description": "Recebe títulos por dinheiro, Pix ou cartão, registra baixas parciais e estorna recebimentos no mesmo dia."
    },
    {
      "actorId": "gerenteFinanceiro",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente financeiro",
      "description": "Acompanha os recebíveis, títulos vencidos e emite extratos por pagador."
    },
    {
      "actorId": "pagador",
      "kind": "external",
      "origin": "named",
      "title": "Pagador",
      "description": "Acessa o portal para consultar os próprios títulos e recebimentos e pagar títulos em aberto com cartão."
    }
  ],
  "grants": [
    {
      "grantId": "caixaRecebimentos",
      "actorRef": "caixa",
      "title": "Receber e estornar recebimentos",
      "description": "Permite ao caixa consultar pagadores e títulos de toda a organização, registrar recebimentos totais ou parciais e conferir ou estornar recebimentos lançados no dia.",
      "entityRefs": [
        "Pagador",
        "TituloReceber",
        "Recebimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os pagadores, títulos e recebimentos de toda a organização necessários ao atendimento do caixa."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O caixa vê a identificação do pagador e os dados financeiros e operacionais necessários para receber, conferir e estornar títulos, sem acesso a documentos, dados pessoais, dados gerais ou dados de outros módulos.",
        "allowedFields": [
          "Pagador.id",
          "Pagador.details.identification",
          "TituloReceber.id",
          "TituloReceber.number",
          "TituloReceber.pagadorId",
          "TituloReceber.dueDate",
          "TituloReceber.originModule",
          "TituloReceber.details",
          "Recebimento.id",
          "Recebimento.number",
          "Recebimento.tituloReceberId",
          "Recebimento.receivedAt",
          "Recebimento.stripePaymentId",
          "Recebimento.status",
          "Recebimento.details"
        ]
      }
    },
    {
      "grantId": "gerenteFinanceiroRecebiveis",
      "actorRef": "gerenteFinanceiro",
      "title": "Gerir recebíveis e emitir extratos",
      "description": "Permite ao gerente financeiro acompanhar os recebíveis e vencidos de toda a organização, consultar pagadores e movimentações, emitir extratos e manter o papel de gerente financeiro.",
      "entityRefs": [
        "Pagador",
        "GerenteFinanceiro",
        "TituloReceber",
        "Recebimento",
        "ExtratoPagador",
        "PainelRecebiveis"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todos os registros financeiros e pagadores da organização para análise consolidada e emissão de extratos."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O gerente financeiro vê os dados de identificação necessários para localizar pagadores e gerentes e todos os dados financeiros, extratos e indicadores necessários para gerir os recebíveis, sem acesso a documentos, dados pessoais, dados gerais ou dados de outros módulos.",
        "allowedFields": [
          "Pagador.id",
          "Pagador.details.identification",
          "GerenteFinanceiro.id",
          "GerenteFinanceiro.details.identification",
          "TituloReceber.id",
          "TituloReceber.number",
          "TituloReceber.pagadorId",
          "TituloReceber.dueDate",
          "TituloReceber.originModule",
          "TituloReceber.originRecordId",
          "TituloReceber.details",
          "Recebimento.id",
          "Recebimento.number",
          "Recebimento.tituloReceberId",
          "Recebimento.receivedAt",
          "Recebimento.stripePaymentId",
          "Recebimento.status",
          "Recebimento.details",
          "ExtratoPagador.id",
          "ExtratoPagador.number",
          "ExtratoPagador.pagadorId",
          "ExtratoPagador.emitidoEm",
          "ExtratoPagador.details",
          "PainelRecebiveis.id",
          "PainelRecebiveis.period",
          "PainelRecebiveis.groupKey",
          "PainelRecebiveis.details"
        ]
      }
    },
    {
      "grantId": "pagadorMeusTitulos",
      "actorRef": "pagador",
      "title": "Consultar e pagar meus títulos",
      "description": "Permite ao pagador consultar somente seus próprios títulos e recebimentos e pagar títulos em aberto com cartão.",
      "entityRefs": [
        "TituloReceber",
        "Recebimento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange exclusivamente títulos e recebimentos que alcançam o pagador autenticado como responsável pelo pagamento.",
        "anchorEntity": "Pagador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O pagador vê somente valores, vencimentos, origem, situação e saldo de seus títulos, além de valores, datas, situação e formas de seus próprios recebimentos; não vê identificadores da Stripe nem dados de outros pagadores.",
        "allowedFields": [
          "TituloReceber.id",
          "TituloReceber.number",
          "TituloReceber.dueDate",
          "TituloReceber.originModule",
          "TituloReceber.details.amount",
          "TituloReceber.details.totalReceived",
          "TituloReceber.details.outstandingBalance",
          "TituloReceber.details.situation",
          "TituloReceber.details.overdue",
          "Recebimento.id",
          "Recebimento.number",
          "Recebimento.tituloReceberId",
          "Recebimento.receivedAt",
          "Recebimento.status",
          "Recebimento.details"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type FinanceiroAccessType = typeof financeiroAccess;

export default financeiroAccess;
