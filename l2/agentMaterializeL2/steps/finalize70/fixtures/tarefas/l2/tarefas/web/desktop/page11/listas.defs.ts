/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/listas.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/masterDataManagement/page21.md",
    "experience": "compactCrudTable"
  },
  "intent": "O gestor vê todas as listas que agrupam as tarefas da equipe, com a quantidade de tarefas abertas em cada uma, e cadastra novas listas ou altera as existentes, sem sair da página.",
  "sections": [
    {
      "id": "cadastroListas",
      "priority": "primary",
      "purpose": "Mostrar as listas existentes por projeto ou área, se estão ativas e quantas tarefas abertas cada uma tem, para o gestor localizar a lista que quer acompanhar ou alterar.",
      "organisms": [
        "listasCadastradas"
      ]
    },
    {
      "id": "manutencaoLista",
      "priority": "main",
      "purpose": "Criar uma nova lista ou editar nome, tipo, descrição e se está ativa para a lista escolhida, ao lado da lista de registros.",
      "organisms": [
        "formularioLista"
      ]
    }
  ],
  "organisms": {
    "listasCadastradas": {
      "kind": "list",
      "text": "Listas que agrupam as tarefas, com nome, tipo (projeto ou área), se está ativa e a quantidade de tarefas abertas em cada uma; o gestor busca pelo nome e escolhe uma lista para alterar.",
      "intents": []
    },
    "formularioLista": {
      "kind": "form",
      "text": "Cadastrar uma nova lista ou alterar o nome, o tipo, a descrição e se a lista está ativa; listas inativas deixam de aparecer na escolha ao criar tarefa, e não pode haver duas listas com o mesmo nome.",
      "intents": [
        {
          "id": "criarLista",
          "kind": "submit"
        },
        {
          "id": "salvarLista",
          "kind": "submit"
        }
      ]
    }
  },
  "molecules": {
    "listasCadastradas": [
      {
        "role": "tabela das listas com tarefas abertas",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewtable--ml-side-detail-table"
      },
      {
        "role": "busca pelo nome da lista",
        "preferred": "groupsearchcontent--ml-search-filters",
        "alternative": "groupsearchcontent--ml-search-bar"
      },
      {
        "role": "paginação das listas",
        "preferred": "grouptriggeraction--ml-pagination-control"
      }
    ],
    "formularioLista": [
      {
        "role": "nome da lista",
        "preferred": "groupentertext--ml-enter-text",
        "alternative": "groupentertext--ml-floating-text-input"
      },
      {
        "role": "descrição da lista",
        "preferred": "groupentertext--ml-multiline-text"
      },
      {
        "role": "salvar ou criar lista",
        "preferred": "grouptriggeraction--ml-button-standard",
        "alternative": "grouptriggeraction--ml-button-group"
      },
      {
        "role": "confirmação ou erro de nome repetido",
        "preferred": "groupnotifyuser--ml-toast-notification",
        "alternative": "groupnotifyuser--ml-contextual-feedback"
      }
    ]
  }
} as const;
