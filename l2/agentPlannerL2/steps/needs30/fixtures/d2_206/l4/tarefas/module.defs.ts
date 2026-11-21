/// <mls fileReference="_102047_/l4/tarefas/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "tarefas",
  "title": "Tarefas da equipe Collab",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "Módulo de tarefas da equipe Collab, no lugar do ClickUp: telas e ações simples, sem IA, no desktop e no celular. Pessoas: o membro da equipe e o gestor. Os dois são usuários da organização (pessoas que fazem login). O módulo não cadastra ninguém e não pede dado pessoal. O gestor escolhe, entre os usuários da organização, quem participa e marca, para cada um, se aceita tarefas e se pode criar tarefas; um usuário ainda não configurado aceita tarefas e pode criar tarefas até o gestor mudar, e uma escolha já feita nunca é sobrescrita. Ser gestor vem do acesso da plataforma, não dessas marcas. Listas agrupam tarefas (por projeto ou área) e são um cadastro simples do gestor. Uma tarefa tem título, descrição, prioridade (baixa, média, alta), prazo, lista, um responsável e quem criou. Pode ter subtarefas (uma tarefa pai), uma checklist de itens marcáveis e etiquetas. O responsável é escolhido pelo nome, entre os usuários que aceitam tarefas, numa lista visível com busca pelo nome, como se menciona alguém numa conversa; nunca pelo e-mail. Criar tarefa exige \"pode criar tarefas\". Situações: a fazer, em andamento, em revisão, concluída, cancelada. O responsável inicia a tarefa e envia para revisão; quem criou aceita (concluída) ou devolve com o motivo (volta a em andamento) e o responsável retoma; quem criou ou o gestor cancela. Quem vê a tarefa edita os campos sem mudar a situação; só quem criou ou o gestor reatribui. Cada tarefa é uma ocorrência do processo de tarefa na plataforma: ao criar, o responsável é avisado; a cada mudança de situação quem age agora é avisado, e reatribuir troca quem age agora. A discussão da tarefa acontece na conversa da própria tarefa na plataforma, com os anexos nas mensagens; o módulo não guarda comentários nem anexos. Todo dia às 8h cada responsável recebe as suas tarefas abertas que vencem hoje ou estão atrasadas. Um aviso que não terminou para uma pessoa não começa outro para ela, e nunca bloqueia os demais. O que cada pessoa vê: o membro vê as tarefas de que é responsável e as que criou, e o que depende dele agora; o gestor acompanha todas as tarefas por lista, responsável, prioridade, prazo e situação, em lista e em quadro por situação. Lista vazia e erro aparecem separados."
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;

export type TarefasModuleType = typeof tarefasModule;

export default tarefasModule;
