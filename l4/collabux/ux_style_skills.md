# Skills de estilo UX

## Objetivo

Criar skills especializadas para guiar a geração visual e interacional de páginas.

Templates definem estrutura.

Skills definem a interpretação do estilo.

## Por que skills

Skills são mais flexíveis que JSON puro porque permitem:

- regras de julgamento;
- exemplos;
- anti-patterns;
- adaptação por contexto;
- fallback;
- instruções para mobile;
- diretrizes de acessibilidade;
- priorização de campos e ações.

## Skills iniciais sugeridas

```text
ux-salesforce-style
ux-dynamics-style
ux-oracle-style
ux-sap-fiori-style
ux-square-pos-style
ux-jira-board-style
ux-powerbi-dashboard-style
ux-generic-saas-style
```

## Exemplo de skill

```text
ux-salesforce-style
```

Uso:

- CRM;
- record workspace;
- dashboards;
- gestão de relacionamento;
- entidades com histórico/contexto.

Direções:

- foco em registros;
- painéis laterais;
- ações contextuais;
- campos prioritários primeiro;
- visão de resumo antes do detalhe.

Evitar:

- copiar logotipo;
- copiar CSS;
- reproduzir tela específica;
- usar nomes de produto.

## Relação entre skill e template

Exemplo:

```text
workspaceClass: entityManagement
pagePattern: recordCatalog
preferredExperience: salesforceStyle
```

Resultado:

```text
template: recordCatalog
skill: ux-salesforce-style
```

O template define que haverá lista + drawer.

A skill define como organizar visualmente a experiência para ficar familiar a usuários acostumados com Salesforce-like systems.

## Implementação inicial

A primeira skill/template concreta está em:

- [`templates/salesforceStyle/SKILL.md`](./templates/salesforceStyle/SKILL.md)
- [`templates/salesforceStyle/inventoryControl/TEMPLATE.md`](./templates/salesforceStyle/inventoryControl/TEMPLATE.md)

Os exemplos específicos de cliente ficam separados em `examples/`.

## Entrada da skill

A skill deve receber:

- workspace L4;
- classificação UX;
- template selecionado;
- operações BFF;
- campos;
- requisitos de validação;
- preferências do cliente;
- device priority.

## Saída esperada

A skill deve orientar a geração de:

- hierarquia visual;
- posição de ações;
- agrupamento de campos;
- mensagens;
- empty states;
- validações;
- layout responsivo;
- microcopy.
