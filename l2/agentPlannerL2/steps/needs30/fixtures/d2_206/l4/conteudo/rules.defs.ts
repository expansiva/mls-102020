/// <mls fileReference="_102047_/l4/conteudo/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conteudoRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "conteudo",
  "rules": {
    "contentRepositoryIsSourceOfTruth": "O conteúdo de verdade é o que está no repositório de conteúdo: o módulo não guarda cópia dos arquivos markdown e sempre lê o texto atual do repositório ao abrir um arquivo.",
    "contentFolderAllowed": "Todo arquivo de conteúdo, existente ou novo, pertence a uma das pastas blog, docs ou site, e o conteúdo novo só pode ser criado em uma delas.",
    "contentWriteThroughIntegration": "Toda gravação de conteúdo, seja criação ou alteração, vai para o repositório exclusivamente pelo módulo de integração.",
    "contentSaveOverReadVersion": "A alteração de um arquivo só é gravada sobre a versão que o editor leu; se o arquivo mudou no repositório depois da leitura, a gravação não é aceita.",
    "contentCreateRequiresTitleAndText": "Para criar um conteúdo novo o editor precisa informar a pasta, o título e o texto, e não pode existir outro arquivo com o mesmo caminho na pasta.",
    "publicationRecordedOnSave": "Cada gravação confirmada pelo repositório gera um registro de publicação com quem publicou, o arquivo, a pasta, se foi criação ou alteração e o momento da confirmação.",
    "publicationKeepsNoFileText": "O registro de publicação não guarda o texto do arquivo, apenas os dados de identificação da gravação.",
    "contentListFollowsExternalChanges": "Quando o repositório de conteúdo muda por fora do módulo, a lista de arquivos é atualizada para refletir o estado atual do repositório."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type ConteudoRulesType = typeof conteudoRules;

export default conteudoRules;
