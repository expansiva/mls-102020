# CHANGELOG — i2-triage

## 2026-08-17 — os contratos do grupo voltaram ao prompt

**Decisão registrada:** os agentes **leem** os contratos de criação e de uso do grupo e **nunca os
alteram**. Alterar contrato de grupo é trabalho manual em `mls-102020` — é onde a superfície pública de
todas as moléculas daquele grupo é definida, e um agente que pudesse editá-lo poderia alargar em
silêncio o que um grupo inteiro promete.

**E ler não é desenho novo: é restaurar o que o fluxo anterior fazia.** O
`agentImproveMoleculeMaterialize` — o passo que escrevia código no agente antigo — injetava três skills
no prompt: o overview do Aura, o `moleculeGeneration` e o **contrato de criação do grupo**, resolvido
pelo `skills/index`. O IM2 herdou as *referências* no `context.json` e deixou de injetar o conteúdo.

**O que a ausência custou, medido em 14/08:** pediram "um rótulo e um texto de ajuda" na
`ml-currency-input`. O grupo `groupEnterMoney` define rótulo e ajuda como os slots `Label` e `Helper`.
Sem as tabelas do grupo, o editor criou duas **propriedades públicas** `label` e `helper` — mudança de
definição na rota que não as faz, com o `slotTags` continuando ausente. O gate passou a recusar a
invenção no mesmo dia; ele não sabia qual era o acerto.

**A divisão entre os dois contratos segue a semântica dos arquivos:**

| passo | recebe | por quê |
|---|---|---|
| `i2-triage` | **uso** | a primeira pergunta dele é "o contrato já promete isto?", e uso é o que o grupo oferece a quem consome |
| `i3-edit` | **criação + uso** | ele escreve o código: precisa de como se constrói e do que se promete |
| `i7-summary` | **criação** | já usava, para o relatório de coerência |

`readGroupSkill` (em `imResolve`) passou a ser o único leitor — havia três cópias da mesma função em
três passos. O gate do `i3` recebe a **união** dos dois textos como vocabulário: um nome que qualquer um
dos dois declara é sancionado pelo grupo.

**A regra nova no prompt do triage**, e é ela que endereça as 27 moléculas: *o silêncio do `.defs.ts` da
molécula não é permissão para tratar o pedido como novo* — se o grupo declara e a molécula não, é
**defeito**, não responsabilidade nova.

## 2026-08-14 — "it is a defect" was answering a question it does not answer

`ml-copy-button-glass`, a shell. The request: make the copy confirmation last three seconds. The
contract promised three seconds, the code did two, so the first question answered **DEFECT** — and the
routing stopped there, at **B**. The duration lives in `const COPY_CONFIRM_MS = 2000` in the **parent**,
module scope, unreachable from any subclass. It was route **C**, desfecho `parent`.

**The prompt was not wrong; it was ordered wrong.** It asked two questions — *is this a defect or a new
responsibility*, and *would existing markup have to be rewritten* — and both are about **what changes**.
Neither is about **where the code that changes it lives**, which is the whole of B against C. Route C
existed only as a definition in the route list, never as a step anyone walks through, so the model
reached a confident B and had no reason to look further. The first section even said it outright:
*"defects are route B"*.

That sentence is now *"a defect is never route A"*, and there is a **third ordered question**, asked
only on a shell: can this molecule's own files carry the change — its `.less`, or an override of a
member the parent declares **and** a subclass can reach — or is the code out of reach? A defect answers
it exactly like a wish does.

**The evidence half.** The inheritance block showed only what the shell COULD override. On this parent
that is `disconnectedCallback` and `render`, and nothing said why the list was so short. Same silent
filter that made i4-inherit suggest a teardown hook for a timer duration on 13/08, one step later and
from the same cause. The block now renders `unreachableMembers` too — measured, not guessed.

**A bug in the 13/08 fix, found while verifying this one.** `unreachableMembersOf` emitted privates
first and module constants last, and every consumer caps the list at 12. On `ml-copy-button` that put
`COPY_CONFIRM_MS` **33rd of 34**: the one member that decides the case was the one the cap threw away —
in this prompt and in i4-inherit's, which has been shipping that way since 13/08. Constants now come
first. They are the rarer kind (4 of 34 here), so the privates lose almost nothing, and the name that
answers "where does this value live" is never the one cut.

**No new gate, deliberately.** The tempting one is *"on a shell, route B may not name `ts`"*, and it is
wrong: 14 of the 84 shells legitimately override a member of the parent, and that edit is a route-B
`ts` edit. A gate that refuses a correct answer costs the whole run — `IM_MAX_ATTEMPTS` is 2 — and
teaches the model to misreport its artifacts. B against C is judgement, exactly like A against B: this
payload holds a route and a list, never "is the code that implements this behaviour reachable from the
shell". The code-side half of the defect lives one step later, in i3-edit's `dead_member`, which refuses
the invented override a wrong B produces. Better than nothing, and worse than routing to C.

## 2026-08-13 — a documented defect was routed to A, and the taxonomy was why

`ml-copy-button`: with nothing in the `Label` slot the click copied the component's own translated word
("Copy") to the clipboard, and the contract said so. The request — "with nothing in `Label` it should
not copy that" — came back **route A**, which is not implemented, so the run died on a fix that was one
line of `getCopyText` plus one sentence of the contract. Rewritten with "nothing in the public
definition changes" spelled out in the request, the same triage answered **B** twice, the second time
even with the `action` event mentioned.

**The prompt was not careless — it was incomplete.** It said "never promote a DEFECT to a definition
change" in two places, and the first test it asks offered exactly two branches: the contract promises
the behaviour and the code fails (defect → B), or the contract is silent (a new responsibility). There
was **no branch for "the contract describes this behaviour and what it describes is wrong"**, so the
model fell out of the defect branch and found, one section down, the words that fit: *keeps its name and
changes documented meaning*.

That third branch is not an edge case. The `.defs.ts` and the `.ts` are written in the SAME
agentNewMolecule2 run, so **every defect NM2 generates is born documented as intended.** With A
unimplemented, that made a whole class of correction — the ones the pair generates itself —
unreachable.

Changes, all of them vocabulary, in the three places the model actually reads:

- **the third branch is now written down** in the first test, with the measured example, and it lands on
  B with `defs` named alongside the code;
- **the A-vs-B discriminator lost a half.** It used to be "the consumer has to change what they write
  **or observe something different**" (see 2026-08-06 below). The second half cannot discriminate:
  fixing any defect changes what you observe, which is what the fix is for. The criterion is now one
  question with one answer — **would a page that uses this molecule today have to be written
  differently?**;
- **"changes documented meaning" is gone** from `schemas/i2-triage.schema.json` (the tool definition the
  model reads) and from this gate's own `route_a_no_elements` retry message. Both now say what the
  criterion is. A corrected contract sentence is explicitly NOT a definition element.

**Route C stopped prescribing its destination.** The prompt used to say, in the "what you must not do"
list, that on route C *"a local override is the answer"*. It reached the rationale as
"deve ser resolvida localmente por meio de uma sobrescrita", the next step inherited it as the decision,
and proposed overriding a member that could not carry the change. C has three legal outcomes and the
next step picks between them **with the human**, after reading the parent's code — which this step never
reads. The `expectedArtifacts` description says the same thing now: on C the list is conditional,
because the "base component" outcome writes nothing.

**No new gate check, and this time it is not a gap.** "Would existing markup have to be rewritten" is
not decidable from this payload; a gate ruling on it would be guessing with authority. Two tests were
added instead, pinning the shape the gate must keep ACCEPTING — route B with `defs` + `ts` and an empty
`definitionElements` — so nobody later "fixes" this by refusing it. Compare the rejected check of
2026-08-06 ("route B may not touch `defs`"), which was refused for the same reason.

## 2026-08-06 — first version

- The routing call, with the A-vs-B discriminator stated as one question: does a consumer have to
  change what they write, or observe something different through slots, attributes or events.
  Earlier drafts described the four routes and let the model weigh them; that reads as an invitation
  to judge SIZE, and every user request that matters ("just add a little detail area") is phrased to
  sound small.
- **The model does not receive the molecule's source.** Only the `.defs.ts` plus a derived surface
  summary. `ml-data-table` is 300+ lines and its surface is 20; the rest cannot answer the routing
  question, and paying for it on every run buys nothing.
- `surface.ts` lives in the step, not in `helpers/` — it is step-specific and `helpers/` must not
  know about a specific step (agentsBestPractices §2).
- **`definitionElements` was added to the schema** so the gate can enforce flow.json's "route A
  requires at least one named definition element". Without a field for it the check was
  unimplementable. It doubles as the pre-fill for the rebuild clarification.
- **Rejected gate check: "route B may not touch `defs`".** It looked sharp — editing the contract
  IS a definition change — but a typo fix in the Objective paragraph is route B and touches the
  same file. The gate cannot separate editorial from contractual, so it does not try. Left to the
  prompt.
- **`html` ⇒ `groupIndex` is a normalization, not a failure**, and it runs after the gate so the
  model's actual answer is what gets judged and traced.
- `route_invalid` returns alone, same reasoning as `molecule_not_found` in i1: with a bad route
  every other message is about a decision that was never made.
- Added `<!-- x-tool-strict: true -->`, which NM2's prompts do not carry. `skills/modelTypes.md`
  recommends it for every tool-calling step whose output crosses a gate, and this output crosses
  one. Server-side validation catches the enum violations before they cost a retry.
