/// <mls fileReference="_102047_/l4/mensalidadesAcademia/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "mensalidadesAcademia",
  "rules": {
    "planoNomeUnico": "O nome do plano deve ser único entre os planos da academia.",
    "planoValorPositivo": "O valor do plano deve ser maior que zero.",
    "planoDiaVencimentoValido": "O dia de vencimento do plano deve ser um dia do mês entre 1 e 31; em meses com menos dias, o vencimento cai no último dia do mês.",
    "planoComMatriculaNaoPodeSerExcluido": "Um plano que possui matrículas vinculadas não pode ser excluído.",
    "matriculaExigeAlunoEPlano": "Toda matrícula deve ter um aluno, um plano e uma data de início informados, e começa com a situação ativa.",
    "somenteAtivaGeraMensalidade": "Somente matrículas ativas, com data de início até o mês de referência, recebem mensalidade na geração do mês.",
    "gerarSomenteMatriculaAtiva": "A geração de mensalidades do mês considera apenas matrículas com situação ativa, ignorando as canceladas.",
    "mensalidadeUnicaPorMatriculaMes": "Existe no máximo uma mensalidade por matrícula e mês de referência; uma nova geração do mesmo mês não duplica mensalidades já geradas.",
    "valorDoPlanoNaGeracao": "O valor da mensalidade é copiado do valor do plano da matrícula no momento da geração e não muda se o plano for alterado depois.",
    "vencimentoNoDiaDoPlano": "O vencimento da mensalidade é a data no mês de referência correspondente ao dia de vencimento do plano da matrícula.",
    "mensalidadeVencida": "Uma mensalidade é considerada vencida quando está em aberto e sua data de vencimento é anterior a hoje.",
    "mensalidadeVencidaAposVencimento": "A mensalidade não paga passa a ser tratada como vencida a partir do dia seguinte ao seu vencimento, sem alteração manual da situação.",
    "pagamentoValorPositivo": "O valor de um pagamento deve ser maior que zero.",
    "pagamentoSomenteMensalidadeEmAberto": "Só é possível registrar pagamento para mensalidade em aberto ou vencida; mensalidade já paga não recebe novos pagamentos.",
    "pagamentoQuitaMensalidade": "Quando a soma dos pagamentos registrados atinge o valor da mensalidade, ela passa a paga e a data de quitação é a data do pagamento que completou o valor.",
    "quitacaoPorPagamento": "A mensalidade só passa de aberta para paga em consequência de pagamentos registrados que quitam todo o seu valor, nunca por alteração manual.",
    "alunoInadimplente": "O aluno é inadimplente quando tem ao menos uma mensalidade vencida.",
    "alunoBloqueadoDuasVencidas": "O aluno fica bloqueado quando tem duas ou mais mensalidades vencidas em matrícula ativa.",
    "alunoBloqueadoComDuasVencidas": "A matrícula ativa com duas ou mais mensalidades vencidas é considerada bloqueada, situação calculada e não digitada.",
    "bloqueadoNaoEntra": "Aluno bloqueado não tem a entrada liberada na academia.",
    "alunoBloqueadoNaoEntra": "A entrada só é liberada para aluno com matrícula ativa e não bloqueada; matrícula cancelada ou bloqueada impede a entrada até a regularização.",
    "regularizacaoDesbloqueiaAluno": "O aluno deixa de estar bloqueado assim que os pagamentos reduzem suas mensalidades vencidas a menos de duas.",
    "cancelamentoEncerraGeracao": "Somente matrícula ativa pode ser cancelada, com data de cancelamento informada, e após o cancelamento ela não volta a ficar ativa.",
    "cancelamentoEncerraMensalidadesFuturas": "Matrícula cancelada não recebe mensalidades em gerações de meses posteriores à data de cancelamento; mensalidades já geradas permanecem devidas.",
    "painelTotalAreceber": "O total a receber do mês é a soma dos valores das mensalidades com vencimento no mês de referência.",
    "painelTotalRecebido": "O total recebido do mês é a soma dos valores dos pagamentos com data de pagamento dentro do mês de referência.",
    "painelQuantidadeAlunos": "O painel conta alunos ativos como os que têm matrícula ativa, bloqueados como os que têm duas ou mais mensalidades vencidas e inadimplentes como os que têm ao menos uma mensalidade vencida."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type MensalidadesAcademiaRulesType = typeof mensalidadesAcademiaRules;

export default mensalidadesAcademiaRules;
