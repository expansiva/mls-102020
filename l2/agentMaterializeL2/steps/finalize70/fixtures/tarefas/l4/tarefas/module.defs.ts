/// <mls fileReference="_102047_/l4/tarefas/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "tarefas",
  "title": "Tarefas da equipe",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "Módulo de tarefas para a equipe, no estilo de um ClickUp simples, sem IA. Pessoas: o membro da equipe e o gestor. Todo membro cria tarefas, executa as que lhe são atribuídas e revisa as que criou. O gestor, além disso, vê e acompanha todas as tarefas da equipe e mantém as listas. Uma lista agrupa tarefas (por projeto ou área). Listas são cadastro simples do gestor. Uma tarefa tem título, descrição, prioridade (baixa, média, alta), prazo, lista, responsável (uma pessoa) e quem criou. Pode ter subtarefas (uma tarefa pai), uma checklist de itens marcáveis, etiquetas e anexos. Situações: a fazer, em andamento, em revisão, concluída, cancelada. O responsável inicia e envia para revisão; quem criou aceita (concluída) ou devolve para ajuste (volta a em andamento) com o motivo; quem criou ou o gestor cancela. Qualquer um que veja a tarefa pode editar os campos sem mudar a situação; só o criador ou o gestor reatribui. Processo da tarefa: ao criar, o responsável é avisado. Ele inicia e envia para revisão; o criador é avisado, aceita ou devolve; devolvida, o responsável é avisado de novo e retoma. Cada tarefa é uma ocorrência: ao criar nasce a mensagem de origem na thread do módulo e a Task, que referencia a tarefa e guarda o andamento (etapa, quem age agora, histórico). A Task abre um task-room para a discussão da tarefa; os comentários são as mensagens dele, e não há entidade de comentário no módulo. A cada mudança de situação o task-room recebe uma mensagem e quem age agora é avisado. Reatribuir troca quem age agora. Reenviar a criação depois de um erro de rede não cria duas tarefas. Todo dia às 8h cada responsável recebe as suas tarefas abertas que vencem hoje ou estão atrasadas; se o aviso do dia anterior ainda não terminou, o novo não começa. O gestor acompanha as tarefas por lista, responsável, prioridade, prazo e situação (lista e quadro por situação)."
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;

export type TarefasModuleType = typeof tarefasModule;

export default tarefasModule;
