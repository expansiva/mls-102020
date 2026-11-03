/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/membros_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/masterDataManagement/page21.md",
    "experience": "compactCrudTable"
  },
  "intent": "Permitir que o gestor veja todas as pessoas da equipe que podem criar tarefas e ser responsáveis por elas, e cadastre novas pessoas ou corrija o nome e o país de quem já está na equipe.",
  "sections": [
    {
      "id": "equipe",
      "priority": "primary",
      "purpose": "Mostrar quem faz parte da equipe, com nome, país, situação no cadastro (ativo pode receber tarefas) e contatos usados nos avisos, para que o gestor encontre e escolha a pessoa que quer revisar.",
      "organisms": [
        "pessoasEquipe"
      ]
    },
    {
      "id": "cadastro",
      "priority": "main",
      "purpose": "Ao lado da lista, cadastrar uma nova pessoa ou atualizar o nome e o país da pessoa selecionada, para que as tarefas mostrem o nome certo.",
      "organisms": [
        "cadastroPessoa"
      ]
    }
  ],
  "organisms": {
    "pessoasEquipe": {
      "kind": "list",
      "text": "Pessoas da equipe que podem criar tarefas e ser responsáveis, com nome, país, situação no cadastro e contatos. Dá para buscar pelo nome e escolher uma pessoa para editar.",
      "intents": []
    },
    "cadastroPessoa": {
      "kind": "form",
      "text": "Cadastrar uma nova pessoa da equipe ou atualizar o nome e o país da pessoa selecionada. O nome é o que aparece como responsável e criador nas tarefas.",
      "intents": [
        {
          "id": "cadastrarPessoa",
          "kind": "submit"
        },
        {
          "id": "salvarAlteracoes",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "pessoasEquipe": [
      {
        "role": "tabela de pessoas da equipe",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewtable--ml-side-detail-table"
      },
      {
        "role": "busca por nome",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      },
      {
        "role": "paginação da lista",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ],
    "cadastroPessoa": [
      {
        "role": "nome da pessoa",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "país da pessoa",
        "preferred": "groupentertext--ml-enter-text"
      },
      {
        "role": "salvar cadastro",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-split-button"
      },
      {
        "role": "confirmação ou erro ao salvar",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
