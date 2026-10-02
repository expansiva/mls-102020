/// <mls fileReference="_102047_/l4/manutencaoFrota/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "manutencaoFrota",
  "title": "Manutenção de Frota",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "manutencaoFrota, português. transportadora com veículos (placa, modelo, ano, quilometragem atual). o motorista registra abastecimentos (data, litros, valor, km no painel) do veículo que dirige e só vê os veículos atribuídos a ele. o gestor de frota cadastra planos de manutenção preventiva por veículo (a cada N km ou a cada N meses) e abre ordens de manutenção quando o plano vence ou quando há defeito; a ordem tem oficina, descrição, custo e datas de entrada e saída. o sistema avisa quando um veículo passou do km previsto para a próxima preventiva. perfis: motorista e gestor."
} as const satisfies Ns5ModuleArtifact;

export type ManutencaoFrotaModuleType = typeof manutencaoFrotaModule;

export default manutencaoFrotaModule;
