/// <mls fileReference="_102047_/l4/conteudo/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conteudoModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "conteudo",
  "title": "Conteúdo do blog, documentação e site institucional",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "Módulo para manter o blog, a documentação e o site institucional da empresa, que são arquivos de texto em formato markdown guardados no repositório de conteúdo. O conteúdo de verdade é o que está no repositório: o módulo não guarda cópia. O editor navega pelas pastas (blog, docs, site), abre um arquivo, lê, altera e salva; e cria um conteúdo novo escolhendo a pasta, o título e o texto. Toda gravação vai para o repositório pelo módulo de integração. O módulo mantém um histórico do que cada pessoa publicou e quando. Quando o repositório muda por fora, o módulo fica sabendo e atualiza a lista."
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;

export type ConteudoModuleType = typeof conteudoModule;

export default conteudoModule;
