/// <mls fileReference="_102047_/l4/locacaoEquipamentos/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "locacaoEquipamentos",
  "rules": {
    "contratoExigeItem": "O contrato de locação só pode ser confirmado e passar a ativo se tiver pelo menos um equipamento incluído.",
    "contratoComAoMenosUmItem": "Todo contrato de locação ativo ou encerrado deve conter ao menos um item de equipamento.",
    "equipamentoSemSobreposicao": "Ao confirmar o contrato, nenhum de seus equipamentos pode constar em outro contrato em elaboração confirmado, ativo ou com período ainda não devolvido cujo período se sobreponha ao deste contrato.",
    "equipamentoSemPeriodosSobrepostos": "O mesmo equipamento não pode estar em dois contratos de locação com períodos sobrepostos, considerando o intervalo entre a data de retirada e a data prevista de devolução de cada contrato.",
    "equipamentoSemPeriodoSobreposto": "Ao incluir um equipamento em um contrato, o sistema recusa a inclusão se esse equipamento já estiver em outro contrato não encerrado com período sobreposto.",
    "equipamentoDisponivelParaLocar": "Só pode ser incluído em um contrato o equipamento cuja situação atual seja disponível para o período informado.",
    "equipamentoEmManutencaoNaoLocavel": "Equipamento com situação cadastral em manutenção não pode ser incluído em contrato de locação.",
    "equipamentoEmManutencaoNaoLoca": "Contrato que contenha equipamento em manutenção não pode ser confirmado.",
    "multaAtrasoDevolucao": "Ao registrar a devolução após a data prevista, a multa do contrato é a soma, para cada equipamento, do valor da diária × dias de atraso × 1,5; sem atraso a multa é zero.",
    "multaPorAtraso": "A multa de cada item é o valor da diária praticado no item × dias de atraso × 1,5, sendo os dias de atraso a diferença em dias entre a data real e a data prevista de devolução quando a real for posterior; caso contrário, zero.",
    "devolucaoLiberaEquipamentos": "Ao registrar a data real de devolução, o contrato passa a encerrado e seus equipamentos voltam a ficar disponíveis.",
    "clienteInativoNaoLoca": "Cliente com registro mestre inativo não pode ser titular de um novo contrato de locação.",
    "equipamentoCodigoUnico": "O código do equipamento é único e não pode se repetir entre equipamentos.",
    "equipamentoLocadoDecorreDeContratoAtivo": "A situação atual do equipamento é em manutenção quando assim cadastrada, locado quando consta em contrato ativo sem devolução registrada e disponível nos demais casos.",
    "valorDiariaPositivo": "O valor da diária do equipamento e do item de contrato deve ser maior que zero.",
    "contratoPeriodoValido": "A data prevista de devolução não pode ser anterior à data de retirada, e a data real de devolução não pode ser anterior à data de retirada.",
    "contratoEditavelSomenteEmElaboracao": "Itens, cliente e período do contrato só podem ser alterados enquanto o contrato estiver em elaboração.",
    "itemUnicoPorContrato": "O mesmo equipamento não pode ser incluído mais de uma vez no mesmo contrato."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type LocacaoEquipamentosRulesType = typeof locacaoEquipamentosRules;

export default locacaoEquipamentosRules;
