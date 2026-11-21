/// <mls fileReference="_102047_/l4/manutencaoFrota/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "manutencaoFrota",
  "rules": {
    "placaUnica": "Cada placa pode estar cadastrada em apenas um veículo da frota.",
    "quilometragemNaoRegride": "A quilometragem atual de um veículo nunca pode ser alterada para um valor menor que o já registrado.",
    "motoristaVeSomenteVeiculosAtribuidos": "O motorista só vê os veículos atribuídos a ele.",
    "abastecimentoSomenteVeiculoAtribuido": "O motorista só pode registrar abastecimento para um veículo atribuído a ele.",
    "motoristaVeSomenteSeusAbastecimentos": "O motorista só vê os abastecimentos dos veículos atribuídos a ele.",
    "kmPainelNaoMenorQueAtual": "O km no painel informado no abastecimento não pode ser menor que a quilometragem atual do veículo.",
    "kmPainelAtualizaQuilometragemVeiculo": "Ao registrar um abastecimento, a quilometragem atual do veículo passa a ser o km no painel informado.",
    "litrosEValorPositivos": "Os litros e o valor de um abastecimento devem ser maiores que zero.",
    "precoPorLitroCalculado": "O preço por litro de um abastecimento é o valor pago dividido pelos litros abastecidos.",
    "planoIntervaloObrigatorio": "Todo plano de manutenção preventiva deve ter intervalo em quilômetros ou em meses, com valor maior que zero.",
    "planoVencimentoCalculado": "O km previsto do plano é o km da última preventiva concluída (ou o km de referência) somado ao intervalo em km, e a data prevista é a data da última preventiva concluída (ou a data de referência) somada ao intervalo em meses.",
    "avisoPreventivaVencidaKm": "O sistema avisa que a preventiva está vencida quando a quilometragem atual do veículo passa do km previsto para a próxima preventiva de algum de seus planos.",
    "planoUmaOrdemAberta": "Um plano de manutenção pode ter no máximo uma ordem de manutenção aberta por vez.",
    "ordemPreventivaExigePlano": "Uma ordem de manutenção preventiva deve estar vinculada a um plano de manutenção do mesmo veículo.",
    "ordemCorretivaSemPlano": "Uma ordem de manutenção corretiva não pode estar vinculada a um plano de manutenção.",
    "oficinaInativaSemNovasOrdens": "Uma oficina com cadastro inativo não pode receber novas ordens de manutenção.",
    "numeroOrdemUnico": "O número de cada ordem de manutenção é único e emitido em sequência na abertura.",
    "conclusaoExigeSaidaECusto": "Uma ordem de manutenção só pode ser concluída com a data de saída e o custo informados.",
    "dataSaidaNaoAnteriorEntrada": "A data de saída da ordem de manutenção não pode ser anterior à data de entrada.",
    "conclusaoRecalculaPlano": "Ao concluir uma ordem preventiva, o km e a data da última preventiva do plano passam a ser os da ordem concluída, recalculando o próximo vencimento.",
    "ordemConcluidaNaoEditavel": "Uma ordem de manutenção concluída não pode mais ser alterada."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type ManutencaoFrotaRulesType = typeof manutencaoFrotaRules;

export default manutencaoFrotaRules;
