/// <mls fileReference="_102047_/l2/repoHost/web/desktop/page11/conteudo_repositorio.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/hierarchyTreeView/page21.md",
    "experience": "treeAndDetail"
  },
  "intent": "O administrador percorre as pastas e os arquivos do repositório e abre um arquivo para ler o conteúdo atual. Assim ele confere se a integração com o serviço que hospeda o repositório está funcionando.",
  "sections": [
    {
      "id": "navegacaoRepositorio",
      "priority": "primary",
      "purpose": "Mostra a árvore de pastas e arquivos do repositório para o administrador localizar o item que quer conferir.",
      "organisms": [
        "arvoreRepositorio"
      ]
    },
    {
      "id": "leituraArquivo",
      "priority": "main",
      "purpose": "Ao lado da árvore, mostra o arquivo escolhido com o conteúdo como está no repositório e com os dados de versão e sincronização.",
      "organisms": [
        "conteudoArquivo"
      ]
    }
  ],
  "organisms": {
    "arvoreRepositorio": {
      "kind": "list",
      "text": "Navego pelas pastas e arquivos do repositório para conferir se a integração está funcionando. Cada item mostra nome, tipo e caminho. Também posso buscar pelo caminho para achar um arquivo sem abrir todas as pastas.",
      "intents": []
    },
    "conteudoArquivo": {
      "kind": "detail",
      "text": "Abro um arquivo e leio o conteúdo dele como está no repositório. Junto do conteúdo aparecem caminho, tamanho, tipo de conteúdo, versão e a última sincronização.",
      "intents": []
    }
  },
  "molecules": {
    "arvoreRepositorio": [
      {
        "role": "navegação por pastas e arquivos",
        "preferred": "groupviewhierarchy--ml-hierarchy-tree",
        "alternative": "groupviewtable--ml-data-table"
      }
    ],
    "conteudoArquivo": [
      {
        "role": "leitura do arquivo",
        "preferred": "groupviewcard--ml-vertical-card",
        "alternative": "groupviewcard--ml-view-card-horizontal"
      }
    ]
  }
} as const;
