# Visão de produto

## Proposta

Criar o **CollabUX**, uma camada do `collab.codes` que transforma definições funcionais do app em experiências de usuário SaaS de maior qualidade.

A proposta de valor:

```text
O collab.codes gera UX por AI entendendo seu negócio e também o tipo de sistema com que você já está acostumado.
```

## Problema atual

As páginas geradas diretamente por LLM a partir de operações tendem a ficar:

- funcionais, mas pouco agradáveis;
- com muitos campos expostos;
- com layout técnico;
- sem hierarquia de ação;
- com baixa familiaridade para usuários de SaaS;
- inconsistentes entre workspaces.

Exemplo observado:

```text
https://102051.collabcodes.com/cafeFlow/menuManagement
```

O domínio está correto, mas a tela não parece uma experiência SaaS madura.

## Direção

Adicionar uma etapa de enriquecimento UX antes da geração da página final.

Fluxo desejado:

```text
L4 domain/workspace
  -> UX Workspace Enricher
  -> UX classification
  -> style/template selection
  -> page31 generation
  -> app cliente com UX mais familiar e consistente
```

## Princípio central

A LLM não deve desenhar a página do zero.

A LLM deve:

- classificar o workspace;
- escolher um template;
- escolher uma família de experiência;
- priorizar campos;
- definir ações primárias/secundárias;
- preencher slots do template.

O layout final deve ser guiado por skills/templates controlados.

