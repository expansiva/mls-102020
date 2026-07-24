# Governança, propriedade intelectual e limites

## Princípio

O objetivo é gerar familiaridade para o usuário, não clonar produtos.

É aceitável usar padrões comuns de UX encontrados em sistemas SaaS.

Não é aceitável depender de assets, código, CSS, marcas ou telas proprietárias copiadas.

## Permitido

- command bar;
- data grid;
- side panel;
- drawer;
- kanban board;
- dashboard de KPIs;
- wizard;
- object page;
- POS com catálogo e carrinho;
- navegação por entidade;
- formulários agrupados;
- padrões comuns de validação.

## Evitar

- logotipos de terceiros;
- nomes de produtos de terceiros na UI final;
- ícones proprietários;
- imagens proprietárias;
- CSS extraído;
- HTML extraído;
- reprodução pixel-perfect de telas específicas;
- engenharia reversa.

## Como nomear internamente

Internamente podemos usar:

```text
salesforceStyle
dynamicsStyle
oracleStyle
sapFioriStyle
squarePosStyle
```

Mas a UI final do app cliente não deve exibir esses nomes como marca.

## Saída desejada

Uma tela pode ser:

```text
familiar para usuários de Salesforce
```

sem ser:

```text
uma cópia do Salesforce
```

## Revisão humana

Quando uma nova skill/template for criada com inspiração forte em um produto conhecido, deve passar por revisão humana antes de entrar na biblioteca padrão.

