/// <mls fileReference="_102047_/l2/agendaClinica/web/desktop/page11/profissionais_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/masterDataManagement/page21.md",
    "experience": "compactCrudTable"
  },
  "intent": "A recepcionista localiza o profissional que realizará o atendimento e confere nome, situação e ocupação para organizar a agenda da clínica.",
  "sections": [
    {
      "id": "localizarProfissionais",
      "priority": "primary",
      "purpose": "Reúne a busca e a lista para a recepcionista encontrar quem atenderá a consulta.",
      "organisms": [
        "listaProfissionais"
      ]
    },
    {
      "id": "consultarProfissional",
      "priority": "main",
      "purpose": "Mostra os dados do profissional selecionado e a ocupação para a recepcionista seguir com a agenda.",
      "organisms": [
        "detalheProfissional"
      ]
    }
  ],
  "organisms": {
    "listaProfissionais": {
      "kind": "list",
      "text": "Lista os profissionais da clínica para a recepcionista localizar e selecionar quem atenderá a consulta.",
      "intents": []
    },
    "detalheProfissional": {
      "kind": "detail",
      "text": "Mostra nome, situação cadastral e ocupação do profissional selecionado para a recepcionista organizar a agenda.",
      "intents": [
        {
          "id": "irParaConsultas",
          "kind": "navigate",
          "to": "consultas_recepcao"
        }
      ]
    }
  },
  "molecules": {
    "listaProfissionais": [
      {
        "role": "search",
        "preferred": "groupsearchcontent--ml-search-bar",
        "alternative": "groupsearchcontent--ml-search-filters"
      },
      {
        "role": "records",
        "preferred": "groupviewtable--ml-data-table",
        "alternative": "groupviewtable--ml-data-table-minimal"
      }
    ],
    "detalheProfissional": [
      {
        "role": "profile",
        "preferred": "groupviewcard--ml-profile-card",
        "alternative": "groupviewcard--ml-vertical-card"
      }
    ]
  }
} as const;
