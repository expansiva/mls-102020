/// <mls fileReference="_102047_/l2/agendaClinica/web/mobile/page11/profissionais_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/masterDataManagement/page21.md",
    "experience": "compactCrudTable"
  },
  "intent": "A recepcionista busca o profissional em uma coluna estreita, confere a ocupação de quem foi selecionado e segue para marcar a consulta.",
  "sections": [
    {
      "id": "localizarProfissionais",
      "priority": "primary",
      "purpose": "Em conteúdo fluido e estreito, cerca de 390px, prioriza busca e lista para localizar o profissional, permanecendo usável em 360px e 430px.",
      "organisms": [
        "listaProfissionais"
      ]
    },
    {
      "id": "consultarProfissional",
      "priority": "secondary",
      "purpose": "Empilha abaixo da lista, na mesma faixa estreita, os dados e a ocupação do profissional escolhido para seguir à agenda.",
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
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      }
    ],
    "detalheProfissional": [
      {
        "role": "profile",
        "preferred": "groupviewcard--ml-profile-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      }
    ]
  }
} as const;
