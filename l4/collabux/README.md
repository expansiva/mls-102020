# CollabUX — gerador de UX por AI

## Ideia

O `collab.codes` deve ter um gerador de UX por AI que entende:

- o domínio do app cliente;
- o tipo de workspace;
- as operações disponíveis;
- o perfil de usuário;
- as preferências/familiaridade do cliente com sistemas conhecidos;
- os templates UX disponíveis na plataforma.

Em vez de deixar a LLM criar telas livremente, a plataforma deve guiar a geração usando uma classificação UX explícita e uma biblioteca de templates/skills.

## Objetivo

Gerar páginas SaaS mais agradáveis, consistentes e úteis, evitando telas técnicas ou estranhas derivadas diretamente das operações.

Exemplo de objetivo:

```text
O cliente está acostumado com Salesforce.
Para um workspace de gestão de cardápio, gerar uma experiência familiar a um record/catalog workspace,
com lista, filtros, ação primária clara e painel lateral para criar/editar.
```

## Documentos

- [product_vision.md](./product_vision.md)
- [l4_ux_enrichment.md](./l4_ux_enrichment.md)
- [ux_template_library.md](./ux_template_library.md)
- [ux_style_skills.md](./ux_style_skills.md)
- [page31_generation_contract.md](./page31_generation_contract.md)
- [known_system_styles.md](./known_system_styles.md)
- [governance_and_ip.md](./governance_and_ip.md)
- [acceptance_criteria.md](./acceptance_criteria.md)

## Organização

- `templates/`: definições genéricas de estilos e templates reutilizáveis pelo produto CollabUX.
- `examples/`: mapeamentos, screenshots e previews específicos de projetos usados para validar templates.
- projetos cliente, como `mls-102051`, são entradas/saídas de geração; não são o local canônico das definições CollabUX.

## Templates implementados

- [salesforceStyle](./templates/salesforceStyle/SKILL.md)
  - [inventoryControl](./templates/salesforceStyle/inventoryControl/TEMPLATE.md)

## Exemplos

- [102051 / stockManagement / salesforceStyle.inventoryControl](./examples/102051/stockManagement/salesforceStyle.inventoryControl.mapping.md)
