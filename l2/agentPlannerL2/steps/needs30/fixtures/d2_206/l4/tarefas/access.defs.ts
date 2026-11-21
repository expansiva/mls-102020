/// <mls fileReference="_102047_/l4/tarefas/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "tarefas",
  "actors": [
    {
      "actorId": "membroEquipe",
      "kind": "internal",
      "origin": "named",
      "title": "Membro da equipe",
      "description": "Usuário da organização que cria tarefas (quando pode criar), executa as tarefas de que é responsável, inicia, envia para revisão, aceita ou devolve as que criou e vê o que depende dele agora.",
      "personEntity": "Participante"
    },
    {
      "actorId": "gestor",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor",
      "description": "Usuário da organização com acesso de gestor na plataforma: escolhe quem participa e marca quem aceita e quem pode criar tarefas, mantém as listas, reatribui e cancela tarefas e acompanha todas as tarefas em lista e em quadro por situação.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "membroTarefasProprias",
      "actorRef": "membroEquipe",
      "title": "Minhas tarefas",
      "description": "O membro vê e trabalha nas tarefas de que é responsável e nas que criou: cria (quando pode criar), edita campos, inicia, envia para revisão, aceita, devolve, retoma, reatribui e cancela conforme o seu papel na tarefa, e vê o que depende dele agora.",
      "entityRefs": [
        "Tarefa"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Tarefas cujo responsável ou quem criou é o participante da sessão.",
        "anchorEntity": "Participante"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todos os campos da tarefa, incluindo motivo da devolução, quem age agora, prazo e progresso da checklist."
      }
    },
    {
      "grantId": "membroChecklistPropria",
      "actorRef": "membroEquipe",
      "title": "Checklist das minhas tarefas",
      "description": "O membro adiciona, edita e marca itens da checklist das tarefas de que é responsável ou que criou.",
      "entityRefs": [
        "ItemChecklist"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Itens de checklist de tarefas cujo responsável ou quem criou é o participante da sessão.",
        "anchorEntity": "Participante"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todos os campos do item da checklist."
      }
    },
    {
      "grantId": "membroEscolherResponsavel",
      "actorRef": "membroEquipe",
      "title": "Escolher responsável pelo nome",
      "description": "O membro vê os participantes pelo nome, numa lista com busca, para escolher o responsável entre quem aceita tarefas; não vê dados pessoais nem e-mail.",
      "entityRefs": [
        "Participante"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Participantes do módulo na organização, para a escolha do responsável."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Somente o nome, a situação do registro e as marcas efetivas de aceitar e criar tarefas.",
        "allowedFields": [
          "Participante.details.identification.name",
          "Participante.details.identification.status",
          "Participante.details.tarefas.aceitaTarefasEfetivo",
          "Participante.details.tarefas.podeCriarTarefasEfetivo"
        ]
      }
    },
    {
      "grantId": "membroConsultarListas",
      "actorRef": "membroEquipe",
      "title": "Consultar listas",
      "description": "O membro vê as listas de tarefas para escolher a lista ao criar ou editar uma tarefa.",
      "entityRefs": [
        "ListaTarefas"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as listas da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Nome, descrição e quantidade de tarefas abertas da lista."
      }
    },
    {
      "grantId": "gestorParticipantes",
      "actorRef": "gestor",
      "title": "Configurar participantes",
      "description": "O gestor escolhe, entre os usuários da organização, quem participa do módulo e marca se aceita tarefas e se pode criar tarefas, sem cadastrar ninguém nem ver dado pessoal.",
      "entityRefs": [
        "Participante"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Usuários da organização e participantes do módulo."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Identificação (nome, situação, papéis) e as marcas do módulo de tarefas; sem dados base nem pessoais.",
        "allowedFields": [
          "Participante.details.identification",
          "Participante.details.tarefas"
        ],
        "deniedFields": [
          "Participante.details.base",
          "Participante.details.person",
          "Participante.details.general"
        ]
      }
    },
    {
      "grantId": "gestorListas",
      "actorRef": "gestor",
      "title": "Manter listas",
      "description": "O gestor cria e altera as listas que agrupam tarefas por projeto ou área.",
      "entityRefs": [
        "ListaTarefas"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as listas da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todos os campos da lista."
      }
    },
    {
      "grantId": "gestorTodasTarefas",
      "actorRef": "gestor",
      "title": "Acompanhar, reatribuir e cancelar tarefas",
      "description": "O gestor acompanha todas as tarefas por lista, responsável, prioridade, prazo e situação, em lista e em quadro, reatribui o responsável e cancela tarefas.",
      "entityRefs": [
        "Tarefa",
        "ItemChecklist"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as tarefas e itens de checklist da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todos os campos das tarefas e dos itens de checklist."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type TarefasAccessType = typeof tarefasAccess;

export default tarefasAccess;
