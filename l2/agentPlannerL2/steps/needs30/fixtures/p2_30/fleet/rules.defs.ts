/// <mls fileReference="_102047_/l4/manutencaoFrota/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "manutencaoFrota",
  "rules": {
    "ruleForeignNamespaceRefused": "Dados de outros módulos não podem ser gravados no espaço de dados de manutenção de frota.",
    "ruleDocumentShapeValidated": "Todo registro deve respeitar a estrutura de dados definida para seu tipo.",
    "ruleIdentityNeverInNamespace": "Identificadores imutáveis dos registros não podem ser mantidos no espaço de dados do módulo.",
    "preventiveMaintenanceMileageAlert": "O veículo deve ser sinalizado quando sua quilometragem atual ultrapassar a quilometragem prevista para a próxima manutenção preventiva.",
    "rulePersonSsnUniqueForUs": "O número de seguridade social deve ser único entre pessoas cujo país seja os Estados Unidos.",
    "rulePersonPrivacyConsentRequiredBrEu": "O consentimento de privacidade é obrigatório para pessoas do Brasil ou da União Europeia.",
    "ruleCompanyEinUniqueForUs": "O número de identificação fiscal empresarial deve ser único entre empresas cujo país seja os Estados Unidos.",
    "ruleCompanyLegalNameRequired": "A razão social é obrigatória para empresas.",
    "motoristaAbasteceVeiculoAtribuido": "Um motorista somente pode registrar abastecimento para veículo que esteja atribuído a ele.",
    "quilometragemAbastecimentoNaoMenorQueAtual": "A quilometragem informada em um abastecimento não pode ser menor que a quilometragem atual conhecida do veículo.",
    "maintenanceIntervalRequired": "Um plano de manutenção preventiva deve definir intervalo por quilometragem, por meses ou por ambos.",
    "preventiveMileageAlert": "Um plano preventivo fica vencido quando a quilometragem atual do veículo atinge ou ultrapassa a próxima quilometragem prevista, ou quando a data atual alcança a próxima data preventiva aplicável.",
    "preventiveOrderRequiresPlan": "Uma ordem de manutenção preventiva deve estar vinculada a um plano de manutenção preventiva.",
    "repairOrderDoesNotRequirePlan": "Uma ordem de manutenção para reparo de defeito não exige vínculo com plano de manutenção preventiva.",
    "completionRequiresExitDateAndFinalCost": "A conclusão de uma ordem de manutenção exige o registro da data de saída e do custo final."
  }
} as const satisfies Ns5RulesArtifactV2;

export type ManutencaoFrotaRulesType = typeof manutencaoFrotaRules;

export default manutencaoFrotaRules;
