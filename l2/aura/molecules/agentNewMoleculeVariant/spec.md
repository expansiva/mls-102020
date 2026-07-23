# agentNewMoleculeVariant — spec (v1)

> Spec-first: o `flow.json` ao lado é o contrato máquina; este arquivo é a
> racional humana. Mudanças de comportamento alteram PRIMEIRO o flow.json,
> depois o código. Histórico de decisões:
> `todo/analise-agentes-molecules-modelos-novos.md` (§5, §10–§15) e
> `todo/todo-agents-molecules-modelos-novos.md` (Fases 0–2).

## O que este agente faz

Cria, no **projeto atual** (que precisa ter `l2/skills/theme.ts` no
contrato v1), a **variante temática** de uma molécula existente em outro
projeto (tipicamente o mls-102040), por **herança** (Strategy D):

- `.ts` — casca: `extends` da molécula de origem, sem `render()`;
- `.defs.ts` — metadados (formato glass, padrão adotado na Fase 0);
- `.less` — folha COMPLETA do tema, escopada na tag com sufixo
  (**única chamada LLM de geração**);
- `.html` — página de demo no visual do tema (`themeInfo.background`);
- atualização do `index.ts` do grupo no projeto.

## O que ele NÃO faz (v1)

- Não é chamado pelo New Molecule/Improve Molecule (roteamento = v2).
- Não tem clarification/checkpoint (v2; ver análise §14).
- Não processa lote ("puxar grupo inteiro" = v2, fan-out paralelo).
- Não propaga mudanças da base para variantes existentes.
- Não altera a molécula de origem, nunca.

## Invocação

```
@@agentNewMoleculeVariant { page: '_102040_/l2/molecules/grouptriggeraction/ml-button-standard', prompt: 'observações opcionais' }
```

Mesmo mecanismo de entrada do `agentImproveMolecule` (verificado na Fase 0).
Projeto de destino = `mls.actualProject`. A origem precisa ser dependência
do destino (senão o bootstrap falha com orientação).

## Desenho (por que assim)

- **Deterministic-first** (skill `agentsBestPractices.md` §3): tag, classe,
  caminhos, detecção de portal, inventário de classes `ml-*`, shell, defs e
  index são código; a LLM entra só onde há julgamento (o `.less` e os
  exemplos da demo).
- **Tema é dado**: todo o conhecimento do tema vem do `theme.ts` do projeto
  (contrato v1 — Fase 1); o conhecimento genérico do Strategy D vem do
  template `todo/fase1-template-strategy-d.md` embutido nos `prompt.md`.
  Prompt nunca manda "ler" arquivo: cada step anexa as fontes (análise §11).
- **Cold start** (rascunho do contrato §8): `examples` vazio => instrução
  explícita de "primeira molécula do tema (piloto)" no prompt do `.less` e
  aviso + sugestão de bootstrap no summary.
- **Gates com retry limitado**: `.less` e demo têm 1 retry com os erros do
  gate no contexto; steps determinísticos falham legível na hora, sem retry.
- **Âncoras `vN-done`**: downstream depende só das âncoras, nunca do planId
  de um run (retries têm planId dinâmico) — regra do engine
  (`skills/collab_messages.md`).

## Fluxo

```
root (rootPlan barato: idioma + títulos localizados)
  └─ v1-bootstrap  (sem LLM) admissão + context.json
      └─ v2-shell  (sem LLM) .ts + .defs.ts por template
          └─ v3-less  (LLM code) folha do tema + gate + retry≤1
              └─ v4-index (sem LLM) index do grupo
                  └─ v5-demo (LLM code) .html demo + gate + retry≤1
                      └─ v6-summary (LLM codefast) resumo final
```

Falha do v5-demo não bloqueia o summary (reporta a falha); falha de
qualquer outro gate bloqueia o downstream.

## Aceite (todo Fase 2.12)

1. Gerar variante de um grupo ainda não coberto no mls-102054 e comparar
   com as feitas à mão (shell estruturalmente idêntico; `.less` aprovado
   visualmente).
2. Um caso portal no mls-102055 (seletor `div[data-widget=...]`).
3. Cold start com `examples: []`.
4. Regressão: zero — nenhum arquivo fora desta pasta é alterado.
