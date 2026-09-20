/// <mls fileReference="_102047_/l4/locacaoEquipamentos/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "locacaoEquipamentos",
  "title": "Locação de Equipamentos",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "locacaoEquipamentos em português. locadora de equipamentos para construção. cada equipamento tem código, descrição, valor da diária e situação. o atendente cria um contrato de locação para um cliente com um ou mais equipamentos e período (data de retirada e data prevista de devolução); o mesmo equipamento não pode estar em dois contratos com períodos sobrepostos. na devolução registra a data real; se atrasou, o sistema calcula a multa (diária × dias de atraso × 1,5). o gerente vê quais equipamentos estão disponíveis, locados ou em manutenção. perfis: atendente e gerente."
} as const satisfies Ns5ModuleArtifact;

export type LocacaoEquipamentosModuleType = typeof locacaoEquipamentosModule;

export default locacaoEquipamentosModule;
