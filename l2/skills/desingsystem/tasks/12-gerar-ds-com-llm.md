# T12 — Gerar Design System com LLM (descrição e/ou paleta)

> O plugin `_102020_/l2/plugins/selectDesignSystem.ts` hoje só suporta criação **manual**
> (preset + ajuste de tokens). Esta task adiciona dois modos assistidos por IA na view **Add**:
> **(2)** usuário escreve uma descrição → LLM gera o DS inteiro; **(3)** usuário define a
> paleta → LLM gera o resto (roles light/dark, tipografia, forma, densidade, elevação).
> O modo **(1)** manual permanece como está.

**Status: implementado (typecheck ok, testes puros passando); falta validar no app (LLM real).**

## Princípio

Os modos 2 e 3 são a **mesma tarefa de LLM com inputs diferentes** — um único agente com
inputs opcionais `{ brief?, palette? }` (pelo menos um obrigatório; os dois juntos são
válidos: "paleta da marca + descrição do tom"). O output é **sempre** o contrato `DsTokens`
já existente em `_102020_/l2/dsMatch/buildGlobalCss.ts` — a LLM funciona como um
"preset inteligente": o resultado cai no **editor existente** como rascunho, e o usuário
revisa/ajusta e salva pelo caminho atual (`_onSave` → `_persist` → `buildGlobalCss`).
Nada novo downstream: `dsTokensHash` já dispara re-reconciliação (`agentReconcileTokens`)
na próxima rodada do genome.

## Core puro — `dsMatch/generateDsCore.ts` ✅

- [x] Vocabulário fechado exportado (roles canônicos/mínimos, `SCALES`, `WEIGHTS`, `TRACKINGS`,
      `RADII`, `BORDERS`, `DENSITIES`, `ELEVATIONS`, `FONT_SOURCES`, `FALLBACKS`, `GOOGLE_FONTS`).
- [x] `buildGenerateDsHumanPrompt(req)` — brief + paleta (verbatim) + nameHint + idioma.
- [x] `sanitizeGeneratedDs(raw, req)` — validação determinística:
      hex `#RRGGBB`/`#RGB` normalizado; roles mínimos (`primary, background, surface, text, border`)
      obrigatórios senão rejeita; `background.light ≠ background.dark`; paleta do request
      SOBRESCREVE a do output; enums clampados com defaults; fontes filtradas (name+family) com
      fallback para par system-ui.
- [x] Testes puros: `dsMatch/generateDsCore.test.ts` (9 testes, `node:test`).
      Nota: `scripts/run-tests.mjs` falha silenciosamente no Windows (spawnSync do shim
      `.bin/tsx` sem shell — pré-existente, afeta todos os projetos); rodar direto com tsx funciona.

## Agente — `agents/designSystem/agentGenerateDs.ts` ✅

- [x] Padrão `IAgentAsync`: `beforePromptImplicit` (valida request, 1 prompt de geração,
      request ecoado via `longTermMemory`) + `afterPromptStep` (sanitiza e persiste).
- [x] Input: `{ projectId, brief?, palette?, nameHint?, language?, requestId }` (brief e/ou palette).
- [x] System prompt (`modelType: codepro`): roles canônicos, vocabulário fechado, contraste ≥4.5:1
      nos dois temas, paleta dada = verbatim, 1 exemplo few-shot (formato do preset earthy),
      `[[OutputSection]]` + região `Output` exportada.
- [x] Persistência: `config.dsDraft` (fora de `designSystems` — nunca renderizado/committado),
      com `requestId` para correlação one-shot. Reusa `mkCompleted`/`mkFail` de
      `agentImplementGenome/planning.ts`.

## Plugin `selectDesignSystem.ts` — view Add ✅

- [x] Seção "Gerar com IA" (collapsible, aberta) entre descrição e preset picker:
      textarea do brief + checkbox "usar a paleta atual como cores da marca" (com preview das
      swatches) + botão Gerar (disabled sem brief e sem checkbox) + erro amigável.
- [x] Invocação pelo padrão plugin→agente (`loadAgent` + `getTemporaryContext` +
      `executeBeforePromptStream` consumido até o fim — o await cobre LLM + afterPromptStep).
- [x] Pós-await: relê config, valida `dsDraft.requestId`, carrega via `_loadDraft` e **apaga o
      rascunho** (canal one-shot). `name`/`description` do usuário têm precedência sobre os gerados.
- [x] i18n en/pt/es (aiTitle, aiHint, aiBriefPlaceholder, aiUsePalette, aiGenerate, aiGenerating, aiError).
- [x] Só na view Add (DS default não é alcançado).

## Decisões fechadas

- **D-a — canal do resultado:** opção (ii) — `config.dsDraft` one-shot com `requestId`;
  nada é commitado em `designSystems` até o usuário salvar.
- **D-b — um agente:** `agentGenerateDs` único com inputs opcionais.
- **D-c — localização:** `_102020_/l2/agents/designSystem/agentGenerateDs.ts`.
- **D-d — regenerar:** o botão Gerar pode ser clicado de novo (brief/checkbox preservados);
  o novo draft substitui o form. Sem botão dedicado.

## Definition of Done

- [x] Typecheck limpo (nos arquivos da task; erros pré-existentes do repo não relacionados).
- [ ] Modo 2: brief sozinho gera DS completo válido, cai no editor, salva e o preview reflete (`styles/<ds>/global.css`). *(validar no app)*
- [ ] Modo 3: paleta preenchida + gerar → roles derivados preservam as cores da paleta. *(validar no app)*
- [x] Output inválido da LLM não corrompe o config (sanitize rejeita/clampa; task falha → UI mostra erro; testes puros cobrem).
- [x] Modo 1 (manual) intocado; presets continuam funcionando.
