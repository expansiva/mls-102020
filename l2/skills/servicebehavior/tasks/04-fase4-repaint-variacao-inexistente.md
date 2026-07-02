# Fase 4 — Preview sempre reflete a variação (layout/DS), existindo ou não

Ao girar **Layout** ou **Design System** no genome, a combinação vira
`page{L}{D}` (ex.: page12, page22). Hoje, se a página atual **não existe** nessa
variação, o preview fica preso na página antiga — parece que a troca não fez nada.

## Comportamento desejado
Mudou layout ou DS no genome → o preview **sempre** repinta para o arquivo da
nova variação:
- página existe → renderiza;
- página não existe → estado "not found" do preview (mesma UX da seleção de
  página não gerada pelo selectPage, Fase 1 do plano anterior).

## Causa
`serviceGenome._repaintPageForCombination` tem o guard
`if (!storFiles.ts) return; // combination not generated → keep the current preview`
— é ele que segura o preview na página antiga.

## Passos
1. Remover o guard de existência: chamar `_openPage(file)` sempre (o
   `servicePreview` já mostra ".html file not found" quando o arquivo não existe).
2. Conferir o guard anterior ("já mostrando esta combinação") — continua válido.
3. Ao mudar layout/DS, incrementar `_pageReloadToken` para o selectPage
   re-escanear (badges "Não gerada" refletem a nova variação sem reabrir o service).
4. Atenção: `_openPage` grava `actualPage`/`saveOpenedFile` apontando para arquivo
   inexistente — verificar que reload do studio com esse estado não quebra
   (deve cair no not-found de novo, ok).

## Validação (102048)
- [ ] Com página aberta em page11, girar DS para 2 → preview mostra not found
      (não a página antiga); girar de volta para 1 → página reaparece.
- [ ] Badges do selectPage atualizam ao girar layout/DS sem reabrir o service.
