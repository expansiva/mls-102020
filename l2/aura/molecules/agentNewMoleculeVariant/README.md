# agentNewMoleculeVariant

Cria a **variante temática** (Strategy D, por herança) de uma molécula existente,
no **projeto atual** — que precisa ter `l2/skills/theme.ts` (contrato v1).
Standalone: invocado manualmente, nunca roteado pelo New/Improve (v1).

## Uso

```
@@agentNewMoleculeVariant { page: '_102040_/l2/molecules/grouptriggeraction/ml-button-standard', prompt: 'observações opcionais' }
```

## Spec

- `flow.json` — contrato máquina (spec-first; mudanças alteram o spec ANTES do código).
- `spec.md` — racional humana + links para a análise (`todo/analise-agentes-molecules-modelos-novos.md`).

## Pipeline

root (rootPlan `classifier`: idioma + títulos) → `v1-bootstrap` (sem LLM) →
`v2-shell` (sem LLM) → `v3-less` (LLM `design`, retry≤1) → `v4-index` (sem LLM) →
`v5-demo` (LLM `design`, retry≤1, falha não bloqueia) → `v6-summary` (`general`).

Âncoras `vN-done`; artefatos = os arquivos da molécula; contexto/trace em
`l4/agentVariant/<shortName>/` no projeto destino.

## Estrutura

- `steps/<slug>/` — agente do step + gate + gate.test + prompt.md (LLM) + readme + CHANGELOG.
- `helpers/` — vFs (stor), vTheme (contrato), vOrigin (análise da origem),
  vTemplates (shell/defs/index/demo-state), vContext (tipo do artefato), vSteps (intents + tool).
- `schemas/` — tool schemas estritos (v3-less, v5-demo).

## Testes

Gates são puros — `node --test` nos `gate.test.ts` dos steps.

## Aceite (todo Fase 2.12)

1. Grupo não coberto no 102054 vs. variantes feitas à mão.
2. Caso portal no 102055.
3. Cold start (`examples: []`).
4. Regressão: zero arquivos alterados fora desta pasta.
