/// <mls fileReference="_102047_/l4/financeiro/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "financeiro",
  "rules": {
    "estornoSomenteMesmoDia": "Um recebimento só pode ser estornado se ainda estiver registrado e no mesmo dia em que foi recebido.",
    "estornoRestabeleceSaldo": "Ao estornar um recebimento, o valor dele volta ao saldo em aberto do título, e o título deixa de estar quitado se voltar a ter saldo.",
    "estornoExigeMotivo": "Todo estorno de recebimento precisa ter um motivo informado.",
    "pagadorVeApenasProprios": "No portal, o pagador vê somente os títulos a receber em que ele é o pagador.",
    "pagadorVeSomenteProprios": "No portal, o pagador vê somente os recebimentos e estornos dos próprios títulos, e só pode pagar os próprios títulos.",
    "tituloOrigemUnica": "A mesma combinação de origem e referência de origem só pode gerar um único título a receber.",
    "tituloValorPositivo": "O valor de um título a receber deve ser maior que zero.",
    "tituloVencimentoNaoAnteriorEmissao": "O vencimento de um título a receber não pode ser anterior à data de emissão.",
    "saldoAbertoCalculado": "O saldo em aberto do título é o valor do título menos a soma dos recebimentos não estornados, e nunca fica negativo.",
    "tituloQuitadoQuandoSaldoZera": "O título fica quitado quando o total recebido alcança o seu valor, e fica parcialmente recebido quando há ao menos um recebimento válido e ainda resta saldo.",
    "recebimentoNaoExcedeSaldo": "O valor de um recebimento não pode ser maior que o saldo em aberto do título no momento do recebimento; um valor menor caracteriza baixa parcial.",
    "recebimentoValorPositivo": "O valor de um recebimento deve ser maior que zero.",
    "tituloQuitadoNaoRecebe": "Um título quitado não pode receber novos recebimentos.",
    "recebimentoEstornadoNaoConta": "Um recebimento estornado não conta no total recebido nem abate o saldo em aberto do título.",
    "estornoExcluiDoRecebido": "Recebimentos estornados são excluídos do total recebido e da quantidade de recebimentos no painel e no extrato.",
    "formaPagamentoPermitida": "A forma de pagamento de um recebimento no caixa deve ser dinheiro, pix ou cartão via Stripe.",
    "portalSomenteCartao": "No portal, o pagador só pode pagar com cartão via Stripe, e apenas títulos em aberto.",
    "portalPagaSaldoIntegral": "O pagamento pelo portal quita o saldo em aberto integral do título.",
    "numeroRecebimentoUnico": "Cada recebimento recebe um número sequencial único, emitido pelo sistema na criação.",
    "stripePagamentoUnico": "Recebimentos em cartão devem ter o identificador do pagamento no Stripe, e a mesma confirmação de pagamento do Stripe só pode gerar um único recebimento.",
    "tituloVencidoEmAbertoAposVencimento": "Um título está vencido quando tem saldo em aberto e vencimento anterior a hoje, e os dias de atraso são os dias entre o vencimento e hoje, ou zero se não estiver vencido.",
    "painelSomenteGerenteFinanceiro": "O painel de recebíveis, a lista de títulos vencidos e o extrato por pagador são acessíveis somente ao gerente financeiro.",
    "painelTotaisCalculados": "Os totais do painel por período e por origem são calculados a partir dos títulos e recebimentos: a receber é a soma dos valores dos títulos com vencimento no período, em aberto é o saldo restante desses títulos, e vencido é o saldo em aberto dos que já passaram do vencimento."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type FinanceiroRulesType = typeof financeiroRules;

export default financeiroRules;
