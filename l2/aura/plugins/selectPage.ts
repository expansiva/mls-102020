/// <mls fileReference="_102020_/l2/aura/plugins/selectPage.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getAuraEdit, getAuraState, type IAuraEditSelection } from '/_102020_/l2/aura/helpers/auraState.js';
import { PAGE_FOLDER_UI, pageFolderName } from '/_102020_/l2/aura/helpers/pageCombination.js';
import { getContentByMlsPath } from '/_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeStudio.js';
import { pageDsCheckByDefs, restampPage, layoutHasRules, type PageDsCheck } from '/_102020_/l2/aura/helpers/dsMatch/dsVersion.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { openElementInServiceDetails } from '/_102027_/l2/libCommom.js';
import { setTask, getTask, subscribeTaskManager } from '/_102020_/l2/aura/helpers/taskManager.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { readGenomeUxBaseChoice } from '/_102020_/l2/aura/agentGenomeUx/genomeUxIo.js';
import {
    getAdvancedPrefs,
    onAdvancedPrefsChange,
    toggleLine,
    updateAdvancedPrefs,
    type IAdvancedPrefs,
    type LayoutLine,
} from '/_102020_/l2/aura/studio/studioAdvancedMode.js';
import { annotCommand, getAnnotState, onAnnotStateChange, type IAnnotState } from '/_102020_/l2/aura/studio/studioAnnotateStore.js';
import { LIVE_OTHER_PAGE, commitPageSource, restoreEditPage, snapshotEditPage, snapshotPageFile, type EditPageSnapshot } from '/_102020_/l2/aura/agentEditPage/editPageIo.js';
import { EDIT_PAGE_MAX_ADJUST, EDIT_PAGE_MAX_PAGES, requestWithAdjustments } from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import {
    batchAdjusting, batchAdjustReady, batchAdjustTargets, batchCounts, standardMisses, batchDecision, batchOpen, batchOrder, moleculeTagsIn, pagesUsingTag, runLimited, scopePages,
    type BatchAdjustState, type BatchRow, type BatchRowState, type EditScopeKind,
} from '/_102020_/l2/aura/plugins/editBatchCore.js';
import { isPageInReview, setPageInReview } from '/_102020_/l2/aura/studio/studioPageReview.js';
import { offerTour, startTour } from '/_102020_/l2/aura/studio/studioTour.js';
import { GENOME_TOUR } from '/_102020_/l2/aura/studio/studioTours.js';
import { t as tStudio } from '/_102020_/l2/aura/studio/studioMessages.js';
import { PAGE_VERSION_DIFF_TAG, type IPageVersionSide } from '/_102020_/l2/aura/studio/pageVersionDiff.js';
import {
    ensurePageVersion, listPageVersions, pageVersionsAvailable, recordPageVersion, restorePageVersion, versionedPage,
} from '/_102020_/l2/aura/studio/pageVersions.js';
import '/_102020_/l2/aura/studio/pageVersionsPanel.js';
import type { StudioTheme } from '/_102033_/l2/cbe/studioTheme.js';
import type { StudioDevice } from '/_102033_/l2/cbe/studioDevice.js';
import '/_102020_/l2/aura/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Pages',
    desc: 'Pages of the selected module. Filtered by active device when one is selected.',
    allTitle: 'All Pages',
    allDesc: 'All pages found for the selected module and device.',
    customTitle: 'New Page',
    customDesc: 'Create a new page in this module.',
    noModule: 'No module selected.',
    noPages: 'No pages found for this module.',
    noResults: 'No pages match your search.',
    createNew: 'New Page',
    searchPlaceholder: 'Search pages…',
    inDevelopment: 'In development',
    devices: 'Devices',
    notCreated: 'Pages have not been created for this layout / design system combination.',
    generatePages: 'Generate pages',
    outdated: 'Outdated',
    review: 'Review',
    reviewIntro: 'Molecules used by this page changed since it was generated:',
    markReviewed: 'Mark as reviewed',
    saving: 'Saving…',
    staleIntro: 'The selection no longer reflects the design system:',
    staleReasonRules: "The page's rules changed.",
    staleReasonRemoved: 'A molecule it uses was removed.',
    staleReasonIncompatible: 'A molecule it uses is no longer compatible.',
    staleReasonNoStamp: 'The page predates DS versioning.',
    regeneratePage: 'Regenerate page',
    regenerating: 'Regenerating…',
    regenerated: 'Task started',
    followTask: 'Follow task',
    missingVariation: 'This page has not been generated for the current layout / design system yet.',
    generatePage: 'Generate page',
    notGenerated: 'Not generated',
    editPage: 'Change this page',
    annotate: 'Annotate',
    annotating: 'Annotating…',
    annotateOff: 'Turn on Studio editing on this page to annotate it.',
    annotateHint: 'No marks. Use “Annotate” to circle on the page what you want to change.',
    marksCount: '{n} mark(s) — sent with the request',
    markNoNote: 'no note',
    markNotePlaceholder: 'note (optional)',
    markRemove: 'Remove this mark',
    markRepeated: 'list item: applies to every row',
    planMark: 'mark {n}',
    drawingTitle: 'Drawing',
    drawingNotSent: 'Not sent to the AI for now — it cannot receive images yet.',
    drawingCapturing: 'creating the image…',
    drawingPending: 'the image is created when you finish drawing (Done)',
    drawingFailed: 'the image could not be created: {error}',
    drawingRemove: 'Remove the drawing',
    editUnavailable: 'This page is not in a generated page folder (web/<device>/pageNN), so the AI cannot change it.',
    editPlaceholder: 'Describe the change (e.g. center the buttons of the list)…',
    editReview: 'Review',
    editPlanning: 'Analyzing…',
    editPlanTitle: 'Confirm the change',
    editPlanApply: 'Generate preview',
    editPlanCancel: 'Cancel',
    editApplying: 'Generating the preview…',
    editWhatChanged: 'What changed',
    editPageShell: 'page',
    editRevert: 'undo',
    editRecorded: 'Recorded: "Regenerate page" redoes this change. Save to keep it in the project.',
    editNotRecorded: 'Not recorded in this project: "Regenerate page" undoes this change. Save to keep it in the project.',
    editLiveNotApplied: 'The screen was not refreshed ({reason}): reload to see the change.',
    editNoAnswer: 'The agent ended without an answer (the task failed). Open the task to see why.',
    editDiscard: 'Discard change',
    editDiscarding: 'Discarding…',
    editDiscarded: 'Change discarded: the page is back as it was before.',
    editDiscardStale: 'The page changed after this change and the version history is not available in this browser: discarding now would lose those edits.',
    editDiscardConfirm: '{n} edit(s) made after this request will be undone too. Click Discard again to confirm — the Change history, in the Page tab, can bring them back.',
    reviewTitle: 'In review: the change is on the page',
    reviewHint: 'Look at the page, switch Before | After, then apply or discard. Meanwhile, other edits of this page are blocked.',
    reviewBefore: 'Before',
    reviewAfter: 'After',
    reviewSwitching: 'Rebuilding the page… (the scroll goes back to the top)',
    reviewCode: 'See the code',
    reviewCodeLabel: 'before the request → preview',
    reviewApply: 'Apply',
    reviewApplying: 'Applying…',
    reviewDiscard: 'Discard',
    reviewDiscarding: 'Discarding…',
    reviewAdjust: 'Ask for an adjustment',
    reviewAdjustPlaceholder: 'E.g.: a bit less blue; keep the title on one line',
    reviewAdjustSend: 'Analyze adjustment',
    editScope: 'Scope',
    editPagesTitle: 'Change several pages',
    editScopePage: 'This page',
    editScopeModule: 'Pages of the module',
    editScopeMolecule: 'Pages that use a molecule',
    editScopePick: 'Choose pages',
    editScopeThis: 'this one',
    editScopeMoleculePick: 'Choose the molecule',
    editScopeMoleculeNone: 'This page uses no molecule.',
    editScopeReading: 'Reading the pages…',
    editScopeCount: '{n} pages: {list}',
    editScopeTooMany: 'At most {max} pages per request ({n} reached): choose fewer.',
    editScopeNone: 'No other page fits: choose another scope.',
    editScopeNoMarks: 'With more than one page, the selected element and the marks do not go (they belong to this page).',
    editBatchPlan: 'Review in {n} pages',
    editBatchAnotherOpen: 'Another request of several pages is still open: decide it first.',
    editBatchTitle: 'Request in {n} pages',
    editBatchPlanning: 'planning…',
    editBatchPlanned: 'plan ready',
    editBatchRefused: 'refused',
    editBatchWaiting: 'waiting',
    editBatchGenerating: 'generating the preview…',
    editBatchInReview: 'in review',
    editBatchFailed: 'failed',
    editBatchUnchanged: 'nothing changed',
    editBatchApplied: 'applied',
    editBatchDiscarded: 'discarded',
    editBatchSkipped: 'left out',
    editBatchGenerate: 'Generate preview in {n} pages',
    editBatchCost: 'Asks the AI {n} times, one page at a time.',
    editBatchApplyTicked: 'Apply {n} pages',
    editBatchDiscardAll: 'Discard all',
    editBatchRetry: 'Try again the ones that failed',
    editBatchTask: 'task',
    editBatchOpenHint: 'Click a page to see it with Before | After.',
    editBatchUnsaved: '{n} pages in review: changed in the Studio, not saved, locked for editing.',
    editBatchDone: 'Done: {applied} applied, {discarded} discarded, {other} without change.',
    editBatchClose: 'Close',
    editBatchAdjustAll: 'All ticked',
    editBatchAdjustOne: 'Only the open page',
    editBatchNoVariant: 'This page has no variant for this device.',
    reviewAdjusting: 'Adjusting…',
    reviewAdjustLimit: 'Limit of 3 adjustments reached: apply or discard.',
    reviewAdjustments: 'Adjustments: {list}',
    reviewAdjustPlanning: 'Analyzing…',
    reviewAdjustPlanTitle: 'Adjustment analyzed — what will change:',
    reviewAdjustGenerate: 'Generate adjustment',
    reviewAdjustCancel: 'Cancel adjustment',
    reviewInBatch: 'Apply and discard are in the list above.',
    editBatchAdjustQuote: 'Adjustment: “{text}”',
    editBatchAdjustGenerate: 'Generate adjustment in {n}',
    editBatchTickHint: 'Unticked pages are discarded when you apply.',
    editStandardTitle: 'Common standard for the {n} pages',
    editStandardShort: 'Common standard',
    editStandardAdjusted: 'Standard of this adjustment',
    editStandardDeciding: 'Deciding the common standard…',
    editStandardHint: 'Every page will use exactly these values.',
    editStandardApprove: 'Approve standard',
    editStandardAdjustPlaceholder: 'E.g.: title a bit smaller; more space below the header',
    editStandardAdjustSend: 'Redo standard',
    editStandardRetry: 'Try again',
    editStandardMisses: 'did not follow the standard: {list}',
    editAdjustQueued: 'adjustment queued',
    editAdjustPlanning: 'analyzing adjustment…',
    editAdjustPlanned: 'adjustment analyzed',
    editAdjustRefused: 'adjustment refused',
    editAdjustGenerating: 'generating adjustment…',
    editAdjustDone: 'adjusted',
    editAdjustFailed: 'adjustment failed',
    reviewSaveNote: 'Until you decide, the page holds the preview: a Save now would save it.',
    editElement: 'Element',
    editElementIn: 'in',
    editElementRemove: 'Do not send this element',
    editElementElsewhere: 'The selected element is not on this page and device: it will not be sent.',
    tabVisual: 'Visual',
    tabAi: 'AI',
    tabStates: 'States',
    tabPage: 'Page',
    themeTitle: 'Theme while editing',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeHint: 'Only in studio mode: leaving it, the app goes back to its own theme.',
    advancedTitle: 'Advanced mode',
    advancedOff: 'Off',
    advancedOn: 'On',
    advancedHint: 'Shows advanced tools in the Visual tab, such as the layout lines (Ctrl+Alt+G). Only on this browser.',
    linesTitle: 'Layout lines',
    linesOutline: 'Outlines',
    linesSpacing: 'Spacing',
    linesGrid: 'Grid',
    linesOutlineTip: 'A line around every box of the page',
    linesSpacingTip: 'Margin (orange), padding (green) and gap (purple)',
    linesGridTip: 'The columns of every grid of the page',
    linesByDepth: 'colour per level',
    linesMono: 'one colour',
    linesValuesHover: 'values: on hover',
    linesValuesAlways: 'values: always',
    linesTwelve: '12 columns',
    linesBaseline: '8px rhythm',
    linesShortcut: 'Ctrl+Alt+G turns them off and back on',
    deviceTitle: 'Device',
    deviceDesktop: 'Desktop',
    deviceMobile: 'Mobile',
    deviceMissing: 'This page has no {device} version for the current layout / design system.',
    deviceFailed: 'Could not switch: the variant did not load (the reason is in the console).',
    deviceStretchHint: 'On a wide window the app shows in a phone-wide frame; leaving studio mode, the width decides again.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Páginas',
        desc: 'Páginas do módulo selecionado. Filtradas pelo device ativo quando um estiver selecionado.',
        allTitle: 'Todas as Páginas',
        allDesc: 'Todas as páginas encontradas para o módulo e device selecionados.',
        customTitle: 'Nova Página',
        customDesc: 'Crie uma nova página neste módulo.',
        noModule: 'Nenhum módulo selecionado.',
        noPages: 'Nenhuma página encontrada para este módulo.',
        noResults: 'Nenhuma página corresponde à sua busca.',
        createNew: 'Nova Página',
        searchPlaceholder: 'Buscar páginas…',
        inDevelopment: 'Em desenvolvimento',
        devices: 'Dispositivos',
        notCreated: 'As páginas não foram criadas para esta combinação de layout / design system.',
        generatePages: 'Gerar páginas',
        outdated: 'Desatualizada',
        review: 'Revisar',
        reviewIntro: 'Moléculas usadas por esta página mudaram desde a geração:',
        markReviewed: 'Marcar como revisada',
        saving: 'Salvando…',
        staleIntro: 'A seleção não reflete mais o design system:',
        staleReasonRules: 'As regras da página mudaram.',
        staleReasonRemoved: 'Uma molécula usada foi removida.',
        staleReasonIncompatible: 'Uma molécula usada ficou incompatível.',
        staleReasonNoStamp: 'A página é anterior ao versionamento do DS.',
        regeneratePage: 'Refazer página',
        regenerating: 'Refazendo…',
        regenerated: 'Task iniciada',
        followTask: 'Acompanhar task',
        missingVariation: 'Esta página ainda não foi gerada para o layout / design system atual.',
        generatePage: 'Gerar página',
        notGenerated: 'Não gerada',
        editPage: 'Alterar esta página',
        annotate: 'Anotar',
        annotating: 'Anotando…',
        annotateOff: 'Ative a edição do Studio nesta página para anotá-la.',
        annotateHint: 'Sem marcações. Use “Anotar” para circular na página o que quer mudar.',
        marksCount: '{n} marcação(ões) — vão junto com o pedido',
        markNoNote: 'sem nota',
        markNotePlaceholder: 'nota (opcional)',
        markRemove: 'Remover esta marcação',
        markRepeated: 'item de lista: vale para todas as linhas',
        planMark: 'marcação {n}',
        drawingTitle: 'Desenho',
        drawingNotSent: 'Não vai para a IA por enquanto — ela ainda não recebe imagens.',
        drawingCapturing: 'gerando a imagem…',
        drawingPending: 'a imagem é gerada ao concluir o desenho (Concluir)',
        drawingFailed: 'não foi possível gerar a imagem: {error}',
        drawingRemove: 'Remover o desenho',
        editUnavailable: 'Esta página não está numa pasta de página gerada (web/<dispositivo>/pageNN), então a IA não consegue alterá-la.',
        editPlaceholder: 'Descreva a mudança (ex.: centralize os botões da lista)…',
        editReview: 'Revisar',
        editPlanning: 'Analisando…',
        editPlanTitle: 'Confirme a mudança',
        editPlanApply: 'Gerar prévia',
        editPlanCancel: 'Cancelar',
        editApplying: 'Gerando a prévia…',
        editWhatChanged: 'O que mudou',
        editPageShell: 'página',
        editRevert: 'desfazer',
        editRecorded: 'Registrado: o "Refazer página" refaz esta mudança. Salve para gravar no projeto.',
        editNotRecorded: 'Não registrado neste projeto: o "Refazer página" desfaz esta mudança. Salve para gravar no projeto.',
        editLiveNotApplied: 'A tela não foi atualizada ({reason}): recarregue para ver a mudança.',
        editNoAnswer: 'O agente terminou sem resposta (a task falhou). Abra a task para ver o motivo.',
        editDiscard: 'Descartar alteração',
        editDiscarding: 'Descartando…',
        editDiscarded: 'Alteração descartada: a página voltou a ser como era antes.',
        editDiscardStale: 'A página mudou depois desta alteração e o histórico de versões não está disponível neste navegador: descartar agora perderia essas edições.',
        editDiscardConfirm: '{n} edição(ões) feita(s) depois deste pedido também voltam. Clique em Descartar de novo para confirmar — o Histórico de alterações, na aba Página, traz de volta.',
        reviewTitle: 'Em revisão: a mudança está na página',
        reviewHint: 'Olhe a página, alterne Antes | Depois e então aplique ou descarte. Enquanto isso, as outras edições desta página ficam bloqueadas.',
        reviewBefore: 'Antes',
        reviewAfter: 'Depois',
        reviewSwitching: 'Reconstruindo a página… (a rolagem volta ao topo)',
        reviewCode: 'Ver código',
        reviewCodeLabel: 'antes do pedido → prévia',
        reviewApply: 'Aplicar',
        reviewApplying: 'Aplicando…',
        reviewDiscard: 'Descartar',
        reviewDiscarding: 'Descartando…',
        reviewAdjust: 'Pedir ajuste',
        reviewAdjustPlaceholder: 'Ex.: um pouco menos azul; manter o título em uma linha',
        reviewAdjustSend: 'Analisar ajuste',
        editScope: 'Alcance',
        editPagesTitle: 'Alterar várias páginas',
        editScopePage: 'Esta página',
        editScopeModule: 'Páginas do módulo',
        editScopeMolecule: 'Páginas que usam uma molécula',
        editScopePick: 'Escolher páginas',
        editScopeThis: 'esta',
        editScopeMoleculePick: 'Escolha a molécula',
        editScopeMoleculeNone: 'Esta página não usa molécula.',
        editScopeReading: 'Lendo as páginas…',
        editScopeCount: '{n} páginas: {list}',
        editScopeTooMany: 'No máximo {max} páginas por pedido ({n} no alcance): escolha menos.',
        editScopeNone: 'Nenhuma outra página entra: escolha outro alcance.',
        editScopeNoMarks: 'Com mais de uma página, o elemento selecionado e as marcações não vão (são desta página).',
        editBatchPlan: 'Revisar em {n} páginas',
        editBatchAnotherOpen: 'Outro pedido em várias páginas ainda está aberto: decida ele antes.',
        editBatchTitle: 'Pedido em {n} páginas',
        editBatchPlanning: 'planejando…',
        editBatchPlanned: 'plano pronto',
        editBatchRefused: 'recusada',
        editBatchWaiting: 'na fila',
        editBatchGenerating: 'gerando a prévia…',
        editBatchInReview: 'em revisão',
        editBatchFailed: 'falhou',
        editBatchUnchanged: 'nada mudou',
        editBatchApplied: 'aplicada',
        editBatchDiscarded: 'descartada',
        editBatchSkipped: 'deixada de fora',
        editBatchGenerate: 'Gerar prévia em {n} páginas',
        editBatchCost: 'Consulta a IA {n} vezes, uma página por vez.',
        editBatchApplyTicked: 'Aplicar {n} páginas',
        editBatchDiscardAll: 'Descartar tudo',
        editBatchRetry: 'Tentar de novo as que falharam',
        editBatchTask: 'tarefa',
        editBatchOpenHint: 'Clique numa página para vê-la com Antes | Depois.',
        editBatchUnsaved: '{n} páginas em revisão: alteradas no Studio, não salvas, travadas para edição.',
        editBatchDone: 'Pronto: {applied} aplicadas, {discarded} descartadas, {other} sem mudança.',
        editBatchClose: 'Fechar',
        editBatchAdjustAll: 'Todas as marcadas',
        editBatchAdjustOne: 'Só a página aberta',
        editBatchNoVariant: 'Esta página não tem a variante deste dispositivo.',
        reviewAdjusting: 'Ajustando…',
        reviewAdjustLimit: 'Limite de 3 ajustes atingido: aplique ou descarte.',
        reviewAdjustments: 'Ajustes: {list}',
        reviewAdjustPlanning: 'Analisando…',
        reviewAdjustPlanTitle: 'Ajuste analisado — o que vai mudar:',
        reviewAdjustGenerate: 'Gerar ajuste',
        reviewAdjustCancel: 'Cancelar ajuste',
        reviewInBatch: 'Aplicar e descartar ficam na lista acima.',
        editBatchAdjustQuote: 'Ajuste: “{text}”',
        editBatchAdjustGenerate: 'Gerar ajuste em {n}',
        editBatchTickHint: 'As desmarcadas são descartadas ao aplicar.',
        editStandardTitle: 'Padrão comum para as {n} páginas',
        editStandardShort: 'Padrão comum',
        editStandardAdjusted: 'Padrão deste ajuste',
        editStandardDeciding: 'Decidindo o padrão comum…',
        editStandardHint: 'Todas as páginas vão usar exatamente estes valores.',
        editStandardApprove: 'Aprovar padrão',
        editStandardAdjustPlaceholder: 'Ex.: título um pouco menor; mais espaço abaixo do header',
        editStandardAdjustSend: 'Refazer padrão',
        editStandardRetry: 'Tentar de novo',
        editStandardMisses: 'não seguiu o padrão: {list}',
        editAdjustQueued: 'ajuste na fila',
        editAdjustPlanning: 'analisando ajuste…',
        editAdjustPlanned: 'ajuste analisado',
        editAdjustRefused: 'ajuste recusado',
        editAdjustGenerating: 'gerando ajuste…',
        editAdjustDone: 'ajustada',
        editAdjustFailed: 'ajuste falhou',
        reviewSaveNote: 'Até você decidir, a página fica com a prévia: um Salvar agora gravaria a prévia.',
        editElement: 'Elemento',
        editElementIn: 'em',
        editElementRemove: 'Não enviar este elemento',
        editElementElsewhere: 'O elemento selecionado não é desta página e device: não será enviado.',
        tabVisual: 'Visual',
        tabAi: 'IA',
        tabStates: 'Estados',
        tabPage: 'Página',
        themeTitle: 'Tema durante a edição',
        themeLight: 'Claro',
        themeDark: 'Escuro',
        themeHint: 'Só no modo studio: ao sair dele, o app volta ao tema que tinha.',
        advancedTitle: 'Modo avançado',
        advancedOff: 'Desligado',
        advancedOn: 'Ligado',
        advancedHint: 'Mostra ferramentas avançadas na aba Visual, como as linhas do layout (Ctrl+Alt+G). Vale só neste navegador.',
        linesTitle: 'Linhas do layout',
        linesOutline: 'Contornos',
        linesSpacing: 'Espaçamento',
        linesGrid: 'Grade',
        linesOutlineTip: 'Uma linha em volta de cada caixa da página',
        linesSpacingTip: 'Margem (laranja), padding (verde) e gap (roxo)',
        linesGridTip: 'As colunas de cada grid da página',
        linesByDepth: 'cor por nível',
        linesMono: 'uma cor',
        linesValuesHover: 'valores: no hover',
        linesValuesAlways: 'valores: sempre',
        linesTwelve: '12 colunas',
        linesBaseline: 'ritmo 8px',
        linesShortcut: 'Ctrl+Alt+G desliga e religa',
        deviceTitle: 'Dispositivo',
        deviceDesktop: 'Desktop',
        deviceMobile: 'Mobile',
        deviceMissing: 'Esta página não tem versão {device} para o layout / design system atual.',
        deviceFailed: 'Não foi possível trocar: a versão não carregou (o motivo está no console).',
        deviceStretchHint: 'Numa janela larga o app aparece numa moldura com largura de celular; ao sair do modo studio, a largura volta a decidir.',
    },
    es: {
        title: 'Páginas',
        desc: 'Páginas del módulo seleccionado. Filtradas por dispositivo activo cuando hay uno seleccionado.',
        allTitle: 'Todas las Páginas',
        allDesc: 'Todas las páginas encontradas para el módulo y dispositivo seleccionados.',
        customTitle: 'Nueva Página',
        customDesc: 'Cree una nueva página en este módulo.',
        noModule: 'Ningún módulo seleccionado.',
        noPages: 'No se encontraron páginas para este módulo.',
        noResults: 'Ninguna página coincide con su búsqueda.',
        createNew: 'Nueva Página',
        searchPlaceholder: 'Buscar páginas…',
        inDevelopment: 'En desarrollo',
        devices: 'Dispositivos',
        notCreated: 'Las páginas no se han creado para esta combinación de layout / design system.',
        generatePages: 'Generar páginas',
        outdated: 'Desactualizada',
        review: 'Revisar',
        reviewIntro: 'Las moléculas usadas por esta página cambiaron desde su generación:',
        markReviewed: 'Marcar como revisada',
        saving: 'Guardando…',
        staleIntro: 'La selección ya no refleja el design system:',
        staleReasonRules: 'Las reglas de la página cambiaron.',
        staleReasonRemoved: 'Una molécula usada fue eliminada.',
        staleReasonIncompatible: 'Una molécula usada ya no es compatible.',
        staleReasonNoStamp: 'La página es anterior al versionado del DS.',
        regeneratePage: 'Regenerar página',
        regenerating: 'Regenerando…',
        regenerated: 'Tarea iniciada',
        followTask: 'Seguir tarea',
        missingVariation: 'Esta página aún no fue generada para el layout / design system actual.',
        generatePage: 'Generar página',
        notGenerated: 'No generada',
        editPage: 'Cambiar esta página',
        annotate: 'Anotar',
        annotating: 'Anotando…',
        annotateOff: 'Activa la edición del Studio en esta página para anotarla.',
        annotateHint: 'Sin marcas. Usa “Anotar” para marcar en la página lo que quieres cambiar.',
        marksCount: '{n} marca(s) — van con el pedido',
        markNoNote: 'sin nota',
        markNotePlaceholder: 'nota (opcional)',
        markRemove: 'Quitar esta marca',
        markRepeated: 'elemento de lista: vale para todas las filas',
        planMark: 'marca {n}',
        drawingTitle: 'Dibujo',
        drawingNotSent: 'No se envía a la IA por ahora — todavía no recibe imágenes.',
        drawingCapturing: 'generando la imagen…',
        drawingPending: 'la imagen se genera al terminar el dibujo (Concluir)',
        drawingFailed: 'no se pudo generar la imagen: {error}',
        drawingRemove: 'Quitar el dibujo',
        editUnavailable: 'Esta página no está en una carpeta de página generada (web/<dispositivo>/pageNN), así que la IA no puede cambiarla.',
        editPlaceholder: 'Describa el cambio (p. ej. centre los botones de la lista)…',
        editReview: 'Revisar',
        editPlanning: 'Analizando…',
        editPlanTitle: 'Confirme el cambio',
        editPlanApply: 'Generar vista previa',
        editPlanCancel: 'Cancelar',
        editApplying: 'Generando la vista previa…',
        editWhatChanged: 'Qué cambió',
        editPageShell: 'página',
        editRevert: 'deshacer',
        editRecorded: 'Registrado: "Regenerar página" rehace este cambio. Guarde para conservarlo en el proyecto.',
        editNotRecorded: 'No registrado en este proyecto: "Regenerar página" deshace este cambio. Guarde para conservarlo en el proyecto.',
        editLiveNotApplied: 'La pantalla no se actualizó ({reason}): recargue para ver el cambio.',
        editNoAnswer: 'El agente terminó sin respuesta (la tarea falló). Abra la tarea para ver el motivo.',
        editDiscard: 'Descartar cambio',
        editDiscarding: 'Descartando…',
        editDiscarded: 'Cambio descartado: la página volvió a ser como era antes.',
        editDiscardStale: 'La página cambió después de este cambio y el historial de versiones no está disponible en este navegador: descartar ahora perdería esas ediciones.',
        editDiscardConfirm: '{n} edición(es) hecha(s) después de este pedido también se deshacen. Haga clic en Descartar de nuevo para confirmar — el Historial de cambios, en la pestaña Página, las recupera.',
        reviewTitle: 'En revisión: el cambio está en la página',
        reviewHint: 'Mire la página, alterne Antes | Después y luego aplique o descarte. Mientras tanto, las otras ediciones de esta página quedan bloqueadas.',
        reviewBefore: 'Antes',
        reviewAfter: 'Después',
        reviewSwitching: 'Reconstruyendo la página… (el desplazamiento vuelve arriba)',
        reviewCode: 'Ver código',
        reviewCodeLabel: 'antes del pedido → vista previa',
        reviewApply: 'Aplicar',
        reviewApplying: 'Aplicando…',
        reviewDiscard: 'Descartar',
        reviewDiscarding: 'Descartando…',
        reviewAdjust: 'Pedir ajuste',
        reviewAdjustPlaceholder: 'Ej.: un poco menos azul; mantener el título en una línea',
        reviewAdjustSend: 'Analizar ajuste',
        editScope: 'Alcance',
        editPagesTitle: 'Cambiar varias páginas',
        editScopePage: 'Esta página',
        editScopeModule: 'Páginas del módulo',
        editScopeMolecule: 'Páginas que usan una molécula',
        editScopePick: 'Elegir páginas',
        editScopeThis: 'esta',
        editScopeMoleculePick: 'Elija la molécula',
        editScopeMoleculeNone: 'Esta página no usa moléculas.',
        editScopeReading: 'Leyendo las páginas…',
        editScopeCount: '{n} páginas: {list}',
        editScopeTooMany: 'Como máximo {max} páginas por pedido ({n} en el alcance): elija menos.',
        editScopeNone: 'Ninguna otra página entra: elija otro alcance.',
        editScopeNoMarks: 'Con más de una página, el elemento seleccionado y las marcas no van (son de esta página).',
        editBatchPlan: 'Revisar en {n} páginas',
        editBatchAnotherOpen: 'Otro pedido en varias páginas sigue abierto: decídalo antes.',
        editBatchTitle: 'Pedido en {n} páginas',
        editBatchPlanning: 'planificando…',
        editBatchPlanned: 'plan listo',
        editBatchRefused: 'rechazada',
        editBatchWaiting: 'en cola',
        editBatchGenerating: 'generando la vista previa…',
        editBatchInReview: 'en revisión',
        editBatchFailed: 'falló',
        editBatchUnchanged: 'nada cambió',
        editBatchApplied: 'aplicada',
        editBatchDiscarded: 'descartada',
        editBatchSkipped: 'dejada fuera',
        editBatchGenerate: 'Generar vista previa en {n} páginas',
        editBatchCost: 'Consulta la IA {n} veces, una página a la vez.',
        editBatchApplyTicked: 'Aplicar {n} páginas',
        editBatchDiscardAll: 'Descartar todo',
        editBatchRetry: 'Reintentar las que fallaron',
        editBatchTask: 'tarea',
        editBatchOpenHint: 'Haga clic en una página para verla con Antes | Después.',
        editBatchUnsaved: '{n} páginas en revisión: cambiadas en el Studio, sin guardar, bloqueadas para edición.',
        editBatchDone: 'Listo: {applied} aplicadas, {discarded} descartadas, {other} sin cambio.',
        editBatchClose: 'Cerrar',
        editBatchAdjustAll: 'Todas las marcadas',
        editBatchAdjustOne: 'Solo la página abierta',
        editBatchNoVariant: 'Esta página no tiene la variante de este dispositivo.',
        reviewAdjusting: 'Ajustando…',
        reviewAdjustLimit: 'Límite de 3 ajustes alcanzado: aplique o descarte.',
        reviewAdjustments: 'Ajustes: {list}',
        reviewAdjustPlanning: 'Analizando…',
        reviewAdjustPlanTitle: 'Ajuste analizado — lo que va a cambiar:',
        reviewAdjustGenerate: 'Generar ajuste',
        reviewAdjustCancel: 'Cancelar ajuste',
        reviewInBatch: 'Aplicar y descartar están en la lista de arriba.',
        editBatchAdjustQuote: 'Ajuste: “{text}”',
        editBatchAdjustGenerate: 'Generar ajuste en {n}',
        editBatchTickHint: 'Las desmarcadas se descartan al aplicar.',
        editStandardTitle: 'Estándar común para las {n} páginas',
        editStandardShort: 'Estándar común',
        editStandardAdjusted: 'Estándar de este ajuste',
        editStandardDeciding: 'Decidiendo el estándar común…',
        editStandardHint: 'Todas las páginas usarán exactamente estos valores.',
        editStandardApprove: 'Aprobar estándar',
        editStandardAdjustPlaceholder: 'Ej.: título un poco más pequeño; más espacio bajo el encabezado',
        editStandardAdjustSend: 'Rehacer estándar',
        editStandardRetry: 'Intentar de nuevo',
        editStandardMisses: 'no siguió el estándar: {list}',
        editAdjustQueued: 'ajuste en cola',
        editAdjustPlanning: 'analizando ajuste…',
        editAdjustPlanned: 'ajuste analizado',
        editAdjustRefused: 'ajuste rechazado',
        editAdjustGenerating: 'generando ajuste…',
        editAdjustDone: 'ajustada',
        editAdjustFailed: 'ajuste falló',
        reviewSaveNote: 'Hasta que decida, la página tiene la vista previa: un Guardar ahora la guardaría.',
        editElement: 'Elemento',
        editElementIn: 'en',
        editElementRemove: 'No enviar este elemento',
        editElementElsewhere: 'El elemento seleccionado no es de esta página y dispositivo: no se enviará.',
        tabVisual: 'Visual',
        tabAi: 'IA',
        tabStates: 'Estados',
        tabPage: 'Página',
        themeTitle: 'Tema durante la edición',
        themeLight: 'Claro',
        themeDark: 'Oscuro',
        themeHint: 'Solo en el modo studio: al salir, la app vuelve a su propio tema.',
        advancedTitle: 'Modo avanzado',
        advancedOff: 'Apagado',
        advancedOn: 'Encendido',
        advancedHint: 'Muestra herramientas avanzadas en la pestaña Visual, como las líneas del layout (Ctrl+Alt+G). Solo en este navegador.',
        linesTitle: 'Líneas del layout',
        linesOutline: 'Contornos',
        linesSpacing: 'Espaciado',
        linesGrid: 'Cuadrícula',
        linesOutlineTip: 'Una línea alrededor de cada caja de la página',
        linesSpacingTip: 'Margen (naranja), padding (verde) y gap (morado)',
        linesGridTip: 'Las columnas de cada grid de la página',
        linesByDepth: 'color por nivel',
        linesMono: 'un color',
        linesValuesHover: 'valores: al pasar el ratón',
        linesValuesAlways: 'valores: siempre',
        linesTwelve: '12 columnas',
        linesBaseline: 'ritmo de 8px',
        linesShortcut: 'Ctrl+Alt+G las apaga y las vuelve a encender',
        deviceTitle: 'Dispositivo',
        deviceDesktop: 'Desktop',
        deviceMobile: 'Móvil',
        deviceMissing: 'Esta página no tiene versión {device} para el layout / design system actual.',
        deviceFailed: 'No se pudo cambiar: la versión no cargó (el motivo está en la consola).',
        deviceStretchHint: 'En una ventana ancha la app aparece en un marco con ancho de celular; al salir del modo studio, el ancho vuelve a decidir.',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IModule {
    name: string;
    path: string;
}

interface IPageEntry {
    name: string;
    devices: string[];
    file: mls.stor.IFileInfo;
    // false = listed from the source (page11) but not generated for the current layout/DS variation.
    exists: boolean;
}

// One operation of an agentEditPage plan, as its gate returns it in `PLAN:<json>` (the agent's own type is private to
// its folder; this panel only shows the operations and sends them back verbatim to apply).
interface IEditOperation {
    id: string;
    organism: string | null;
    aspect: string;
    change: string;
    summary: string;
    revert: boolean;
    /** The mark this operation answers (agentEditPage), when the request had marks. */
    mark?: number | null;
}

// A mark of the page sent with the request (agentEditPage `marks`), from the Studio annotation.
interface IEditMark {
    note: string | null;
    elements: IEditElement[];
}

// The selected element sent with the request (agentEditPage `element`): what locates it, from `aura.edit.selection`.
interface IEditElement {
    tag: string;
    organism: string | null;
    organismPath: string;
    anchorPath: unknown[] | null;
    literal: string;
}

// What an agentEditPage apply reports in `NOTES:<json>`.
interface IEditNotes {
    notes: string;
    history: 'written' | 'unchanged' | 'disabled' | 'unavailable';
    /** null = the running app shows the change; else why it does not (reload to see it). */
    live?: string | null;
    warnings: string[];
}

// A preview being reviewed: the approved plan, the page before and after it, and the adjustments asked on top.
interface IEditReview {
    request: string;
    device: string;
    operations: IEditOperation[];
    element: IEditElement | null;
    marks: IEditMark[];
    before: EditPageSnapshot;
    after: EditPageSnapshot;
    notes: IEditNotes;
    /** Which of the two is on screen. */
    showing: 'before' | 'after';
    adjust: string[];
    /** What the AI said it changed: the first patch, then one entry per adjustment. */
    notesLog: string[];
    /** The other pages of the same request, when it was asked of several (agentEditPage `batch`). */
    batch?: string[];
    /** An adjustment analyzed and waiting for "Generate": the ask, the gate's plan of it, and the standard it follows. */
    adjustPlan?: { text: string; operations: IEditOperation[]; standard: IEditStandard | null };
    /** The common standard of the batch this page follows (agentEditPage `standard`). */
    standard?: IEditStandard | null;
}

/** The common standard of a request asked of several pages: the exact classes every page uses (agentEditPage). */
interface IEditStandard {
    rules: Array<{ what: string; classes: string; summary: string }>;
}

// A request asked of several pages: where each page stands, and the plan of each (editBatchCore).
interface IEditBatch {
    module: string;
    device: string;
    request: string;
    /** Page names (IPageEntry.name), the page it was asked from first. */
    pages: string[];
    rows: Record<string, BatchRow>;
    plans: Record<string, IEditOperation[]>;
    /** standard → plan → confirm → generate → review. */
    phase: 'standard' | 'plan' | 'confirm' | 'generate' | 'review';
    /** The last adjustment asked of the batch (the rows say where each page stands with it). */
    adjustText?: string;
    /** The common standard, decided once before the pages are planned (null while deciding, or when there is none). */
    standard: IEditStandard | null;
    /** The standard being decided, and why it could not be. */
    standardBusy?: boolean;
    standardError?: string;
    /** The standard an adjustment of the batch brought: it replaces `standard` once the adjustment is generated. */
    adjustStandard?: IEditStandard | null;
}

/**
 * Plans asked at once: ONE. Each page is its own agent task on the same thread, and the agent runtime does not run
 * two tasks of one thread at the same time — concurrent streams looked their steps up in each other's task ("Step not
 * found in runLLMStepAtomic", "No matching beforePromptStep"). Parallel work goes inside one task, not across tasks.
 */
const BATCH_PLAN_LANES = 1;

/** Adjustments per preview (the agent refuses more). */
const MAX_REVIEW_ADJUST = EDIT_PAGE_MAX_ADJUST;

type DetailTab = 'visual' | 'ai' | 'states' | 'page';

// ─── Constants ───────────────────────────────────────────────────────

const DEVICE_SUB_PATHS: Record<number, string> = {
    1: 'web/desktop',
    2: 'web/mobile',
    3: 'android',
    4: 'ios',
};

const DEVICE_LABELS: Record<string, string> = {
    'web/desktop': 'Web Desktop',
    'web/mobile': 'Web Mobile',
    'android': 'Android',
    'ios': 'iOS',
};

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-page-102020')
export class PluginSelectPage extends StateLitElement {

    @property({ attribute: false }) selectedModule: IModule | null = null;
    @property({ attribute: false }) value: number | null = null;
    @property({ attribute: false }) reloadToken: number = 0;

    @state() private _pages: IPageEntry[] = [];
    @state() private _search: string = '';
    @state() private _activeDevice: string | null = null;
    @state() private _pagesNotCreated: boolean = false;
    // page name → DS-version check: status ('stale' | 'review' | 'fresh') + what changed / why.
    @state() private _checkByName: Record<string, PageDsCheck> = {};
    // page currently being re-stamped (disables its button).
    @state() private _busyPage: string | null = null;
    // agentEditPage, per page name: the request being written, the plan awaiting confirmation, the phase in flight,
    // the last error and the last result.
    @state() private _editDraft: Record<string, string> = {};
    @state() private _editDevice: Record<string, string> = {};
    @state() private _editPlan: Record<string, { request: string; device: string; operations: IEditOperation[]; element: IEditElement | null; marks: IEditMark[]; batch?: string[]; standard?: IEditStandard | null }> = {};
    @state() private _editBusy: Record<string, 'plan' | 'apply' | 'discard' | 'switch' | 'reviewApply' | 'reviewDiscard' | 'adjustPlan' | 'adjust'> = {};
    // The AI change on screen waiting for Apply / Discard, per page (the page is locked meanwhile: studioPageReview).
    @state() private _editReview: Record<string, IEditReview> = {};
    @state() private _adjustDraft: Record<string, string> = {};
    // One request, several pages: the scope chosen per page, what it reaches, and the batch in flight.
    @state() private _editScope: Record<string, EditScopeKind> = {};
    @state() private _scopeTag: Record<string, string> = {};
    // `<device>|<page>` → the molecule tags of that page; `<device>|<tag>` → the pages using it (null = reading).
    @state() private _scopeTags: Record<string, string[]> = {};
    @state() private _scopeMatches: Record<string, string[] | null> = {};
    @state() private _scopePicked: Record<string, string[]> = {};
    @state() private _editBatch: IEditBatch | null = null;
    @state() private _batchBusy = false;
    // The adjustment box of the batch list: the ask, and whether it goes to every ticked page or only the page open.
    @state() private _batchAdjustDraft = '';
    @state() private _batchAdjustScope: 'all' | 'open' = 'all';
    // The ask that adjusts the common standard while it waits for approval.
    @state() private _standardDraft = '';
    // The applied change that can still be discarded, per page: the page before it and the page it left.
    // `appliedAt` = when it was applied (the versions after it are the later edits a discard also takes back);
    // `confirmed` = the person was told those edits go back too, and the next click discards.
    private _editUndo: Record<string, { before: EditPageSnapshot; after: EditPageSnapshot; appliedAt: number; confirmed?: boolean }> = {};
    // The last change was discarded (the panel says so until the next request).
    @state() private _editDiscarded: Record<string, boolean> = {};
    @state() private _editError: Record<string, string> = {};
    @state() private _editNotes: Record<string, IEditNotes> = {};
    // The element selected in the Studio. `_selectionOff` = the person removed
    // the chip; `_selectionUsed` = the selection an applied change consumed (the remount made it stale). A NEW
    // selection clears both.
    @state() private _selection: IAuraEditSelection | null = null;
    @state() private _selectionOff: Record<string, boolean> = {};
    private _selectionUsed: IAuraEditSelection | null = null;
    // The open tab of the page detail; kept across pages.
    @state() private _tab: DetailTab = 'visual';
    // The studio's light/dark switch; null = not in the client's studio mode (no switch to show).
    @state() private _studioTheme: StudioTheme | null = null;
    // The advanced mode (studioAdvancedMode): the switch in the Page tab, the layout lines in the Visual tab.
    @state() private _advanced: IAdvancedPrefs = getAdvancedPrefs();
    private _unsubAdvanced: (() => void) | null = null;
    // The page annotation (studioAnnotateStore): the marks the editor holds, as data.
    @state() private _annot: IAnnotState = getAnnotState();
    private _unsubAnnot: (() => void) | null = null;
    // The page variant the studio shows (Desktop | Mobile); null = not in the client's studio mode.
    @state() private _contentDevice: StudioDevice | null = null;
    @state() private _deviceBusy = false;
    @state() private _deviceError = '';
    // page name → device paths ('web/desktop'…) with a variant generated for the current layout/DS, counted
    // BEFORE the active-device filter (what the Desktop | Mobile switch can offer).
    @state() private _variantDevices: Record<string, string[]> = {};

    private _threadCache = new Map<string, Promise<any>>();
    private _taskInfoByName = new Map<string, { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }>();
    private _unsubTasks: (() => void) | undefined;

    connectedCallback() {
        super.connectedCallback();
        this._unsubTasks = subscribeTaskManager(() => this.requestUpdate());
        // Followed, not only read: the shortcut (Ctrl+Alt+G) changes the chips from the editor.
        this._unsubAdvanced = onAdvancedPrefsChange(prefs => { this._advanced = prefs; });
        this._unsubAnnot = onAnnotStateChange(next => { this._annot = next; });
        this._selection = getAuraEdit()?.selection ?? null;
        subscribe('aura.edit.selection', this);
        subscribe('aura.actualDevice', this);
        window.addEventListener('studio-tour-open-tab', this._onTourOpenTab);
        this._loadPages();
        void this._readStudioTheme();
    }

    // The switches belong to the client app's studio mode (its shell holds the app theme aside while editing).
    // Elsewhere — e.g. the preview iframe, which has its own toggles — the theme module says it is not active.
    private async _readStudioTheme(): Promise<void> {
        try {
            const mod = await import('/_102033_/l2/cbe/studioTheme.js');
            const active = mod.isStudioThemeActive();
            this._studioTheme = active ? mod.getStudioTheme() : null;
            const sites = this._sitesDevice();
            this._contentDevice = active && sites ? sites.getDevice() : null;
            // A remembered pick is re-applied on studio entry and can land after the seed read the other variant.
            if (this._contentDevice && getAuraState().actualDevice !== `web/${this._contentDevice}`) await this._reseedAura();
        } catch {
            this._studioTheme = null;
            this._contentDevice = null;
        }
    }

    // Re-reads the Aura state from the page mounted in the app region (studioAuraSeed: the DOM is the authority).
    private async _reseedAura(): Promise<void> {
        const [{ currentEditHost }, { seedAuraStateFromHost }] = await Promise.all([
            import('/_102033_/l2/cbe/studioEditSlot.js'),
            import('/_102020_/l2/aura/studio/studioAuraSeed.js'),
        ]);
        seedAuraStateFromHost(currentEditHost()?.host);
    }

    // The shell's device controls on mls.sites (not in the published mls typings yet); null until it registers.
    private _sitesDevice(): { getDevice: () => StudioDevice; setDevice: (device: StudioDevice) => Promise<boolean> } | null {
        const sites = (mls as unknown as { sites?: { getDevice?: () => StudioDevice; setDevice?: (device: StudioDevice) => Promise<boolean> } }).sites;
        return typeof sites?.getDevice === 'function' && typeof sites.setDevice === 'function'
            ? { getDevice: sites.getDevice, setDevice: sites.setDevice }
            : null;
    }

    // The shell swaps the mounted page; the Aura state is then re-seeded from it (the DOM is the authority), which
    // moves `actualDevice` and, through the subscription, reloads this list on the new device.
    private async _setContentDevice(device: StudioDevice): Promise<void> {
        const sites = this._sitesDevice();
        if (!sites || this._deviceBusy) return;
        this._deviceBusy = true;
        this._deviceError = '';
        try {
            const ok = await sites.setDevice(device);
            this._contentDevice = sites.getDevice();
            if (!ok) {
                this._deviceError = this.msg.deviceFailed;
                return;
            }
            await this._reseedAura();
        } catch (e: any) {
            this._deviceError = e?.message ?? String(e);
        } finally {
            this._deviceBusy = false;
        }
    }

    private async _setStudioTheme(theme: StudioTheme): Promise<void> {
        const mod = await import('/_102033_/l2/cbe/studioTheme.js');
        this._studioTheme = mod.isStudioThemeActive() ? mod.setStudioTheme(theme) : null;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubTasks?.();
        this._unsubAdvanced?.();
        this._unsubAdvanced = null;
        this._unsubAnnot?.();
        this._unsubAnnot = null;
        unsubscribe('aura.edit.selection', this);
        unsubscribe('aura.actualDevice', this);
        window.removeEventListener('studio-tour-open-tab', this._onTourOpenTab);
    }

    // The guided tour asks for the tab its step points into.
    private readonly _onTourOpenTab = (event: Event) => {
        const tab = (event as CustomEvent<{ tab?: string }>).detail?.tab;
        if (tab === 'visual' || tab === 'ai' || tab === 'states' || tab === 'page') this._tab = tab;
    };

    /** Something the person is in the middle of: no tour opens over it. */
    private _tourBusy(): boolean {
        const file = this._selectedPage?.file;
        return Object.values(this._editBusy).some(Boolean) || this._batchBusy || !!this._editBatch
            || Object.keys(this._editReview).length > 0
            || (!!file && isPageInReview({ project: Number(file.project), folder: file.folder, shortName: file.shortName }));
    }

    // The first time a page of the Genome is on screen, the tour is offered (once per version: studioTour remembers).
    private _tourOffered = false;

    updated(changed: Map<string, unknown>) {
        super.updated(changed);
        if (this._tourOffered || !this._selectedPage?.exists) return;
        this._tourOffered = true;
        // After the page and the panel settle, so the first step finds its element.
        setTimeout(() => offerTour(GENOME_TOUR, { busy: this._tourBusy() }), 800);
    }

    handleIcaStateChange(key: string, value: unknown) {
        if (key === 'aura.actualDevice') {
            this._loadPages();
            return;
        }
        if (key !== 'aura.edit.selection') return;
        this._selection = (value ?? getAuraEdit()?.selection ?? null) as IAuraEditSelection | null;
        this._selectionOff = {};
        // Selecting an element means editing it: bring the picker's tab forward — unless the AI tab is open,
        // where the selection is the element the request is about and must not take the person away.
        if (this._selection && this._tab !== 'ai') this._tab = 'visual';
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('selectedModule') || changed.has('reloadToken')) {
            this._search = '';
            this._loadPages();
        }
        if (changed.has('value')) {
            this._search = '';
        }
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _isAll(): boolean { return this.value === 0; }
    private get _isCustom(): boolean { return this.value !== null && this.value > this._pages.length; }
    private get _selectedPage(): IPageEntry | null {
        if (this.value === null || this.value <= 0 || this.value > this._pages.length) return null;
        return this._pages[this.value - 1];
    }

    // ─── Page Loading ─────────────────────────────────────────────────

    private get _modulePath(): string | null {
        return this.selectedModule?.path ?? getAuraState().actualModule ?? null;
    }

    private get _moduleName(): string | null {
        return this.selectedModule?.name ?? getAuraState().actualModule ?? null;
    }

    private async _loadPages(): Promise<void> {
        this._pages = [];
        this._pagesNotCreated = false;
        const modulePath = this._modulePath;
        if (!modulePath) {
            this._dispatchConfig();
            return;
        }

        const project = getAuraState().actualProject;
        const activeDevicePath = getAuraState().actualDevice;

        this._activeDevice = activeDevicePath ? (DEVICE_LABELS[activeDevicePath] ?? null) : null;

        // The page folder comes from the UX (layout) only: page{UX}1. The UI (design system) only
        // swaps tokens, so UX 1 · UI 2 (page12) lists the pages of page11.
        const layout = getAuraState().actualLayout ?? 1;
        const variation = pageFolderName(layout);

        // Pages live in the project config.json (l0), written by the register step.
        let pages: any[] = [];
        try {
            const content = await getContentByMlsPath(`_${project}_/l0/config.json`);
            if (!content) throw new Error('config.json not found');
            const config = JSON.parse(content);
            const moduleDef = config?.projects?.[String(project)]?.modules
                ?.find((m: any) => m.moduleId === modulePath);
            pages = moduleDef?.frontend?.pages ?? [];
        } catch { /* fall through to the stor scan below */ }

        // Fallback: config.json absent or without this module (register step not run yet) →
        // derive the pages from the physical files in {module}/web/{device}/page11 (always
        // present after create). Synthetic entries mirror the config shape (pageId + source).
        if (!pages.length) pages = this._scanPagesFromStor(project, modulePath);

        const pageMap = new Map<string, { devices: Set<string>; file: mls.stor.IFileInfo; exists: boolean }>();
        const variantDevices: Record<string, string[]> = {};
        let candidateCount = 0;

        for (const page of pages) {
            // source: e.g. "l2/cafeFlow/web/desktop/page11/dashboardGerente.ts"
            const source: string = page.source ?? '';
            const relative = source.replace(/^\.?\//, '').replace(/\.ts$/, '');
            const levelMatch = relative.match(/^l(\d+)\/(.+)$/);
            if (!levelMatch) continue;

            const level = parseInt(levelMatch[1], 10);
            const afterLevel = levelMatch[2];
            const lastSlash = afterLevel.lastIndexOf('/');
            if (lastSlash < 0) continue;

            const rawFolder = afterLevel.substring(0, lastSlash);
            const shortName = afterLevel.substring(lastSlash + 1);
            if (!shortName) continue;

            let devicePath: string | null = null;
            for (const dp of Object.values(DEVICE_SUB_PATHS)) {
                if (rawFolder.includes(`/${dp}/`) || rawFolder.endsWith(`/${dp}`)) { devicePath = dp; break; }
            }
            if (!devicePath) continue;

            // Swap the source's variation segment (e.g. page11) for the current one.
            const variationFolder = rawFolder.replace(/page\d+(\/|$)/, `${variation}$1`);

            // Every device with a generated variant, before the active-device filter below.
            if (this._fileExists(project, level, variationFolder, shortName)) {
                const id = page.pageId || shortName;
                const list = variantDevices[id] ?? (variantDevices[id] = []);
                if (!list.includes(devicePath)) list.push(devicePath);
            }

            if (activeDevicePath && devicePath !== activeDevicePath) continue;
            candidateCount++;

            // The page list is owned by the config (or, without one, by the page11 scan):
            // the source (page11) is the source of truth, so a page not yet generated for
            // the current UX still shows. Its file always points at the
            // variation path — selecting a missing one leads the preview to its own
            // "not found" state instead of silently rendering the page11 version.
            const exists = this._fileExists(project, level, variationFolder, shortName);
            if (!exists && !this._fileExists(project, level, rawFolder, shortName)) continue;

            const name = page.pageId || shortName;
            if (!pageMap.has(name)) {
                const file = { project, folder: variationFolder, shortName, level, extension: '.ts' } as mls.stor.IFileInfo;
                pageMap.set(name, { devices: new Set(), file, exists });
            }
            pageMap.get(name)!.devices.add(devicePath);
        }

        this._pages = Array.from(pageMap.entries())
            .map(([name, { devices, file, exists }]) => ({ name, devices: Array.from(devices).sort(), file, exists }))
            .sort((a, b) => a.name.localeCompare(b.name));
        this._variantDevices = variantDevices;

        // Config lists pages for this module/device, but none exist for the
        // current variation → offer to generate them.
        this._pagesNotCreated = candidateCount > 0 && this._pages.length === 0;

        this._dispatchConfig();
        this.requestUpdate();
        this._autoSelectActivePage();
        this._loadPageStatus();
    }

    /** Fallback page source: scan the stor for {module}/web/{device}/page11/*.ts pages and
     *  return entries in the config.json shape ({ pageId, source }). Used when l0/config.json
     *  is missing or has no entry for the module (frontend register step not run yet). */
    private _scanPagesFromStor(project: number | null, modulePath: string): Array<{ pageId: string; source: string }> {
        if (!project) return [];
        const out: Array<{ pageId: string; source: string }> = [];
        const seen = new Set<string>();
        for (const f of Object.values(mls.stor.files) as any[]) {
            if (!f || f.project !== project || f.level !== 2 || f.status === 'deleted') continue;
            if (f.extension !== '.ts' || typeof f.shortName !== 'string' || !f.shortName) continue;
            const folder = String(f.folder || '');
            if (!folder.startsWith(`${modulePath}/web/`) || !/\/page11$/.test(folder)) continue;
            const key = `${folder}/${f.shortName}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ pageId: f.shortName, source: `l2/${folder}/${f.shortName}.ts` });
        }
        return out.sort((a, b) => a.pageId.localeCompare(b.pageId));
    }

    // Compute each page's DS-version check (stale / review / fresh + details). Only meaningful
    // for non-default design systems (the default DS / origin pages carry no stamp).
    private async _loadPageStatus(): Promise<void> {
        this._checkByName = {};
        const module = this._modulePath;
        const project = getAuraState().actualProject;
        const layout = getAuraState().actualLayout ?? 1;
        // The page file is the UX folder's (page{UX}1): its stamp's UI is the folder's, not the knob's.
        const ds = PAGE_FOLDER_UI;
        if (!module || !project || this._pages.length === 0) return;
        // Gate (L6): only check staleness when the layout actually has rules configured.
        if (!(await layoutHasRules(project, layout))) return;

        const results = await Promise.all(this._pages.filter(p => p.exists).map(async (p) => {
            try {
                const check = await pageDsCheckByDefs(
                    { project: p.file.project, folder: p.file.folder ?? '', shortName: p.file.shortName },
                    module,
                    layout,
                    ds,
                );
                return [p.name, check] as const;
            } catch {
                return [p.name, null] as const;
            }
        }));

        const map: Record<string, PageDsCheck> = {};
        for (const [name, check] of results) if (check) map[name] = check;
        this._checkByName = map;
        this.requestUpdate();
    }

    private _renderStatusBadge(pageName: string) {
        const status = this._checkByName[pageName]?.status;
        if (status === 'stale') return html`
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                ${this.msg.outdated}
            </span>`;
        if (status === 'review') return html`
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                ${this.msg.review}
            </span>`;
        return nothing;
    }

    // Re-fire the select event for the page already active in the state, so the host knows which entry it is when
    // this component (re)loads. Marked `auto`: the page is already on screen, so the host does not open it again.
    private _autoSelectActivePage(): void {
        const activePage = getAuraState().actualPage;
        if (!activePage) return;
        const index = this._pages.findIndex(p =>
            p.file.shortName === activePage.shortName &&
            p.file.project === activePage.project
        );
        if (index < 0) return;
        this._dispatchSelect(index + 1, true);
    }

    private _fileExists(project: number | null, level: number, folder: string, shortName: string): boolean {
        try {
            if (!project) return false;
            const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension: '.ts' });
            const file = (mls.stor.files as Record<string, any>)[key];
            return !!file && file.status !== 'deleted';
        } catch {
            return false;
        }
    }

    private _dispatchConfig() {
        const labels: Record<number, string> = { 0: 'All' };
        this._pages.forEach((p, i) => { labels[i + 1] = p.name; });
        labels[this._pages.length + 1] = '+';
        this.dispatchEvent(new CustomEvent('page-config', {
            detail: {
                min: 0,
                max: this._pages.length + 1,
                labels,
                pages: this._pages.map(p => ({ name: p.name, file: p.file })),
            },
            bubbles: true,
            composed: true,
        }));
    }

    createRenderRoot() { return this; }

    render() {
        if (!this._modulePath) return this._renderNoModule();
        if (this._pagesNotCreated) return this._renderNotCreated();
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderNoModule() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader()}
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.noModule}</span>
                </div>
            </div>
        `;
    }

    private _renderHeader(value = 0, max = 1) {
        return html`
            <aura--plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${this.msg.allTitle}
                .desc=${this.msg.desc}
                .value=${value}
                .min=${0}
                .max=${max}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></aura--plugins--nav-header-102020>
        `;
    }

    private _renderSelected() {
        const page = this._selectedPage;
        const max = this._pages.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <div class="flex items-start gap-1.5">
                    <aura--plugins--nav-header-102020
                        class="flex-1 min-w-0"
                        data-tour="genome-pages"
                        .fixedLabel=${this.msg.title}
                        .itemName=${page?.name ?? ''}
                        .desc=${this.msg.desc}
                        .value=${this.value ?? 0}
                        .min=${0}
                        .max=${max}
                        @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                    ></aura--plugins--nav-header-102020>
                    ${page?.exists ? html`
                        <button type="button"
                            class="shrink-0 mt-0.5 w-6 h-6 rounded-full border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer"
                            title=${tStudio('tour.help')}
                            aria-label=${tStudio('tour.help')}
                            @click=${() => startTour(GENOME_TOUR)}>?</button>` : nothing}
                </div>
                ${page ? this._renderPageDetail(page) : nothing}
            </div>
        `;
    }

    // A page not generated for this variation has nothing to edit: only the way to generate it, no tabs.
    // The DS-version warnings stay above the tabs: they ask for an action whichever tab is open.
    private _renderPageDetail(page: IPageEntry) {
        if (!page.exists) return html`${this._renderPageInfo(page)}${this._renderMissingPanel(page)}`;
        return html`
            ${this._renderDsVersionPanel(page)}
            ${this._renderTabs()}
            ${this._renderTabPanel('visual', html`${this._renderLayoutLines()}${this._renderPageTree()}${this._renderClassPicker()}`)}
            ${this._renderTabPanel('ai', this._editTarget(page)
                ? this._renderEditPanel(page)
                : html`<p class="text-xs text-gray-500 dark:text-gray-400 px-1">${this.msg.editUnavailable}</p>`)}
            ${this._renderTabPanel('states', this._renderPageStates())}
            ${this._renderTabPanel('page', html`${this._renderPageInfo(page)}${this._renderDeviceSwitch(page)}${this._renderThemeSwitch()}${this._renderAdvancedSwitch()}${this._renderVersions(page)}`)}
        `;
    }

    private _renderDeviceSwitch(page: IPageEntry) {
        const current = this._contentDevice;
        if (!current) return nothing;
        const available = this._variantDevices[page.name] ?? [];
        const options: Array<{ id: StudioDevice; label: string }> = [
            { id: 'desktop', label: this.msg.deviceDesktop },
            { id: 'mobile', label: this.msg.deviceMobile },
        ];
        const missing = options.filter(o => o.id !== current && !available.includes(`web/${o.id}`));
        return html`
            <div data-tour="genome-device" class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.deviceTitle}</span>
                <div role="radiogroup" class="flex self-start rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                    ${options.map(o => {
                        const unavailable = o.id !== current && !available.includes(`web/${o.id}`);
                        return html`
                            <button
                                type="button"
                                role="radio"
                                aria-checked=${String(current === o.id)}
                                ?disabled=${this._deviceBusy || unavailable}
                                class="px-3 py-1 text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                                    ${current === o.id
                                        ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
                                @click=${() => { if (o.id !== current) void this._setContentDevice(o.id); }}
                            >${o.label}</button>
                        `;
                    })}
                </div>
                ${missing.map(o => html`<span class="text-[10px] text-amber-600 dark:text-amber-400">${this.msg.deviceMissing.replace('{device}', o.label)}</span>`)}
                ${this._deviceError ? html`<span class="text-[10px] text-red-600 dark:text-red-400">${this._deviceError}</span>` : nothing}
                ${current === 'mobile' ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.deviceStretchHint}</span>` : nothing}
            </div>
        `;
    }

    private _renderThemeSwitch() {
        const current = this._studioTheme;
        if (!current) return nothing;
        const options: Array<{ id: StudioTheme; label: string }> = [
            { id: 'light', label: this.msg.themeLight },
            { id: 'dark', label: this.msg.themeDark },
        ];
        return html`
            <div data-tour="genome-theme" class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.themeTitle}</span>
                <div role="radiogroup" class="flex self-start rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                    ${options.map(o => html`
                        <button
                            type="button"
                            role="radio"
                            aria-checked=${String(current === o.id)}
                            class="px-3 py-1 text-xs transition-colors cursor-pointer
                                ${current === o.id
                                    ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
                            @click=${() => this._setStudioTheme(o.id)}
                        >${o.label}</button>
                    `)}
                </div>
                <span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.themeHint}</span>
            </div>
        `;
    }

    // The advanced mode's switch, OFF by default. Off, nothing it gates shows up or runs (the chips below, the
    // layer over the page, the Ctrl+Alt+G shortcut).
    private _renderAdvancedSwitch() {
        const on = this._advanced.advanced;
        const options = [
            { value: false, label: this.msg.advancedOff },
            { value: true, label: this.msg.advancedOn },
        ];
        return html`
            <div data-tour="genome-advanced" class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.advancedTitle}</span>
                <div role="radiogroup" class="flex self-start rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                    ${options.map(o => html`
                        <button
                            type="button"
                            role="radio"
                            aria-checked=${String(on === o.value)}
                            class="px-3 py-1 text-xs transition-colors cursor-pointer
                                ${on === o.value
                                    ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
                            @click=${() => updateAdvancedPrefs(p => ({ ...p, advanced: o.value }))}
                        >${o.label}</button>
                    `)}
                </div>
                <span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.advancedHint}</span>
            </div>
        `;
    }

    // The layout lines (advanced mode only): three independent chips, and the options of the ones that are on.
    private _renderLayoutLines() {
        const prefs = this._advanced;
        if (!prefs.advanced) return nothing;
        const chip = (on: boolean, label: string, onClick: () => void, title = '') => html`
            <button type="button" title=${title} aria-pressed=${String(on)}
                class="px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-colors
                    ${on
                        ? 'bg-indigo-500 dark:bg-indigo-600 border-indigo-500 dark:border-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
                @click=${onClick}>${label}</button>`;
        const line = (id: LayoutLine, label: string, title: string) =>
            chip(prefs.lines.includes(id), label, () => updateAdvancedPrefs(p => toggleLine(p, id)), title);
        const option = (on: boolean, label: string, change: (p: IAdvancedPrefs) => IAdvancedPrefs) =>
            chip(on, label, () => updateAdvancedPrefs(change));
        const options = [
            prefs.lines.includes('outline')
                ? option(prefs.outlineMono, prefs.outlineMono ? this.msg.linesMono : this.msg.linesByDepth, p => ({ ...p, outlineMono: !p.outlineMono }))
                : nothing,
            prefs.lines.includes('spacing')
                ? option(prefs.valuesAlways, prefs.valuesAlways ? this.msg.linesValuesAlways : this.msg.linesValuesHover, p => ({ ...p, valuesAlways: !p.valuesAlways }))
                : nothing,
            prefs.lines.includes('grid') ? option(prefs.twelveColumns, this.msg.linesTwelve, p => ({ ...p, twelveColumns: !p.twelveColumns })) : nothing,
            prefs.lines.includes('grid') ? option(prefs.baseline, this.msg.linesBaseline, p => ({ ...p, baseline: !p.baseline })) : nothing,
        ];
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-semibold text-gray-600 dark:text-gray-300">${this.msg.linesTitle}</span>
                    <span class="ml-auto text-[10px] text-gray-400 dark:text-gray-500">${this.msg.linesShortcut}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${line('outline', this.msg.linesOutline, this.msg.linesOutlineTip)}
                    ${line('spacing', this.msg.linesSpacing, this.msg.linesSpacingTip)}
                    ${line('grid', this.msg.linesGrid, this.msg.linesGridTip)}
                </div>
                ${prefs.lines.length ? html`<div class="flex flex-wrap gap-1.5">${options}</div>` : nothing}
            </div>
        `;
    }

    private _renderTabs() {
        const tabs: Array<{ id: DetailTab; label: string }> = [
            { id: 'visual', label: this.msg.tabVisual },
            { id: 'ai', label: this.msg.tabAi },
            { id: 'states', label: this.msg.tabStates },
            { id: 'page', label: this.msg.tabPage },
        ];
        return html`
            <div role="tablist" class="flex items-stretch border-b border-gray-200 dark:border-gray-800">
                ${tabs.map(tab => {
                    const active = this._tab === tab.id;
                    return html`
                        <button
                            type="button"
                            role="tab"
                            aria-selected=${String(active)}
                            class="flex-1 px-2 py-1.5 text-xs border-b-2 -mb-px transition-colors cursor-pointer
                                ${active
                                    ? 'border-indigo-500 dark:border-indigo-400 text-gray-900 dark:text-gray-100 font-medium'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}"
                            @click=${() => { this._tab = tab.id; }}
                        >${tab.label}</button>
                    `;
                })}
            </div>
        `;
    }

    // Every panel stays mounted and only the open one shows: the docked class picker must not leave the DOM, or the
    // editor hands the editing back to the floating picker, which then pops over the app.
    private _renderTabPanel(id: DetailTab, content: unknown) {
        return html`<div role="tabpanel" data-tour="genome-tab-${id}" class="${this._tab === id ? 'flex' : 'hidden'} flex-col gap-3">${content}</div>`;
    }

    // The page timeline (pageVersionsPanel): the page file on screen, the one the edits write.
    private _renderVersions(page: IPageEntry) {
        const file = page.file;
        const ref = file ? { project: Number(file.project), folder: file.folder, shortName: file.shortName } : null;
        return html`<aura--studio--page-versions-102020 data-tour="genome-versions" .page=${ref}></aura--studio--page-versions-102020>`;
    }

    private _renderPageInfo(page: IPageEntry) {
        return html`
            <div data-tour="genome-page-info" class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 flex flex-col gap-2">
                <div class="flex items-baseline gap-1">
                    <span class="text-xs text-gray-400 dark:text-gray-500">${this._moduleName}/</span>
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${page.name}</span>
                    <span class="ml-auto">${this._renderStatusBadge(page.name)}</span>
                </div>
                <div class="flex items-center gap-1 flex-wrap">
                    <span class="text-xs text-gray-400 dark:text-gray-600">${this.msg.devices}:</span>
                    ${page.devices.map(d => html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            ${DEVICE_LABELS[d] ?? d}
                        </span>
                    `)}
                </div>
            </div>
        `;
    }

    // ─── Change this page (agentEditPage) ──

    // `<module>/web/<device>/<genome>` of the page on screen; null when the folder is not a generated page folder.
    private _editTarget(page: IPageEntry): { device: string; genome: string } | null {
        const match = /\/web\/(desktop|mobile)\/(page\d\d)$/.exec(page.file?.folder ?? '');
        if (!match) return null;
        return { device: this._editDevice[page.name] ?? match[1], genome: match[2] };
    }

    /**
     * The Studio selection as an agentEditPage `element`, valid only on THIS page and THIS device: its file must be
     * exactly the page `.ts` of `<module>/web/<device>/<genome>`. `element` null with a `reason` = there is a
     * selection but it does not count here; both null = nothing selected (or removed by the person, or consumed).
     */
    private _selectedElement(page: IPageEntry): { element: IEditElement | null; reason: string | null } {
        const selection = this._selection;
        if (!selection || selection === this._selectionUsed || this._selectionOff[page.name]) return { element: null, reason: null };
        const target = this._editTarget(page);
        const folder = page.file?.folder ?? '';
        const base = folder.slice(0, folder.lastIndexOf('/web/'));
        if (!target || !base) return { element: null, reason: null };
        const file = selection.file;
        const samePage = file && file.project === page.file.project && file.shortName === page.file.shortName
            && file.folder === `${base}/web/${target.device}/${target.genome}`;
        if (!samePage) return { element: null, reason: this.msg.editElementElsewhere };
        return {
            element: {
                tag: selection.tag,
                organism: selection.organism ?? null,
                organismPath: selection.organismPath ?? '',
                anchorPath: Array.isArray(selection.anchorPath) ? selection.anchorPath as unknown[] : null,
                literal: selection.literal ?? '',
            },
            reason: null,
        };
    }

    private _renderElementChip(page: IPageEntry, busy: boolean) {
        const { element, reason } = this._selectedElement(page);
        if (reason) return html`<span class="text-[10px] text-gray-400 dark:text-gray-500">${reason}</span>`;
        if (!element) return nothing;
        return html`
            <div class="flex items-center gap-1.5 self-start max-w-full rounded-full border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 pl-2 pr-1 py-0.5 text-[11px] text-indigo-700 dark:text-indigo-300">
                <span class="shrink-0">${this.msg.editElement}:</span>
                <span class="font-mono truncate">${element.tag}</span>
                ${element.organism ? html`<span class="shrink-0 text-indigo-400 dark:text-indigo-500">${this.msg.editElementIn} ${element.organism}</span>` : nothing}
                <button class="shrink-0 px-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800/40 cursor-pointer disabled:cursor-not-allowed"
                    title=${this.msg.editElementRemove}
                    aria-label=${this.msg.editElementRemove}
                    ?disabled=${busy}
                    @click=${() => { this._selectionOff = { ...this._selectionOff, [page.name]: true }; }}>✕</button>
            </div>
        `;
    }

    private _renderEditPanel(page: IPageEntry) {
        const target = this._editTarget(page);
        if (!target) return nothing;
        const batch = this._activeBatch();
        if (batch?.pages.includes(page.name)) {
            const inReview = this._editReview[page.name];
            return html`<div class="flex flex-col gap-2">${this._renderBatch(page, batch)}${inReview && batch.phase === 'review' ? this._renderEditReview(page, inReview) : nothing}</div>`;
        }
        const review = this._editReview[page.name];
        if (review) return this._renderEditReview(page, review);
        const plan = this._editPlan[page.name];
        if (plan) return this._renderEditConfirm(page, plan);
        const busy = this._editBusy[page.name];
        const error = this._editError[page.name];
        const done = this._editNotes[page.name];
        // With the studio's Desktop | Mobile switch on screen, the request goes to the page variant being shown:
        // a second device picker here could aim at a file other than the one the element was selected on.
        const devices = this._contentDevice ? [] : page.devices.map(d => d.replace(/^web\//, '')).filter(d => d === 'desktop' || d === 'mobile');
        const many = this._manyPages(page, target.device);
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3 py-2.5 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${many ? this.msg.editPagesTitle : this.msg.editPage}</span>
                    ${devices.length > 1 ? html`
                        <select class="ml-auto text-[10px] px-1 py-0.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300"
                            .value=${target.device}
                            ?disabled=${!!busy}
                            @change=${(e: Event) => { this._editDevice = { ...this._editDevice, [page.name]: (e.target as HTMLSelectElement).value }; }}>
                            ${devices.map(d => html`<option value=${d} ?selected=${d === target.device}>${DEVICE_LABELS[`web/${d}`] ?? d}</option>`)}
                        </select>
                    ` : nothing}
                </div>
                ${many ? nothing : this._renderElementChip(page, !!busy)}
                <div class="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden transition-colors focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-400/40">
                    <textarea
                        rows="4"
                        class="block w-full min-h-[5.5rem] max-h-80 resize-y border-0 bg-transparent px-2.5 py-2 text-xs leading-relaxed text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
                        placeholder=${this.msg.editPlaceholder}
                        ?disabled=${!!busy}
                        .value=${this._editDraft[page.name] ?? ''}
                        @input=${(e: Event) => { this._editDraft = { ...this._editDraft, [page.name]: (e.target as HTMLTextAreaElement).value }; }}
                    ></textarea>
                    <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-2 py-1.5 border-t border-gray-200 dark:border-gray-800">
                        ${this._renderScopeSelect(page, target.device, !!busy)}
                        ${many ? nothing : this._renderAnnotateButton(page, !!busy)}
                        ${this._renderPlanButton(page, target.device, busy)}
                    </div>
                </div>
                ${many ? this._renderScopeDetail(page, target.device, !!busy) : this._renderMarks(page, !!busy)}
                ${done ? html`
                    <div class="text-xs text-emerald-700 dark:text-emerald-300 rounded bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 flex flex-col gap-1">
                        <span><span class="font-semibold">${this.msg.editWhatChanged}:</span> ${done.notes}</span>
                        <span class="text-[10px] text-gray-500 dark:text-gray-400">${done.history === 'written' || done.history === 'unchanged' ? this.msg.editRecorded : this.msg.editNotRecorded}</span>
                        ${this._liveWarning(done.live) ? html`<span class="text-[10px] text-amber-600 dark:text-amber-400">${this._liveWarning(done.live)}</span>` : nothing}
                        ${this._editUndo[page.name] ? html`
                            <button type="button"
                                class="self-start mt-0.5 text-xs px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                ?disabled=${!!busy}
                                @click=${() => this._onDiscardEdit(page)}
                            >${busy === 'discard' ? this.msg.editDiscarding : this.msg.editDiscard}</button>
                        ` : nothing}
                    </div>
                ` : nothing}
                ${this._editDiscarded[page.name] && !done ? html`
                    <div class="text-xs text-gray-600 dark:text-gray-300 rounded bg-gray-100 dark:bg-gray-800/60 px-2 py-1.5">${this.msg.editDiscarded}</div>
                ` : nothing}
                ${error ? html`
                    <div class="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word rounded bg-red-50 dark:bg-red-900/20 px-2 py-1.5">${error}</div>
                ` : nothing}
                ${this._taskInfoByName.get(`edit:${page.name}`)?.task ? html`
                    <button class="self-end text-xs text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                        @click=${() => this._openTask(`edit:${page.name}`)}>${this.msg.followTask}</button>
                ` : nothing}
            </div>
        `;
    }

    /** Whether the annotation was made on THIS page (file and device). */
    private _annotOnPage(page: IPageEntry): boolean {
        const target = this._editTarget(page);
        const folder = page.file?.folder ?? '';
        const base = folder.slice(0, folder.lastIndexOf('/web/'));
        const file = this._annot.file;
        if (!target || !base || !file) return false;
        return file.project === page.file.project && file.shortName === page.file.shortName
            && file.folder === `${base}/web/${target.device}/${target.genome}`;
    }

    /**
     * The marks of the annotation, when they are about THIS page (file and device), as agentEditPage takes them.
     * Only the ELEMENT marks: the pen's drawing is an image, and the agents cannot receive images yet.
     */
    private _marksFor(page: IPageEntry): IEditMark[] {
        const annot = this._annot;
        if (!annot.marks.length || !this._annotOnPage(page)) return [];
        return annot.marks.map(mark => ({
            note: mark.note.trim() || null,
            elements: mark.elements.map(({ label: _label, ...element }) => element),
        }));
    }

    // The way into the annotation: on the page on screen, with the editor armed.
    private _renderAnnotateButton(page: IPageEntry, busy: boolean) {
        const annot = this._annot;
        const usable = annot.available && !busy;
        return html`
            <button type="button"
                class="shrink-0 text-[11px] px-2 py-0.5 rounded-full cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                    ${annot.active ? 'bg-pink-500 text-white' : 'border border-pink-400/70 text-pink-600 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/20'}"
                title=${annot.available ? '' : this.msg.annotateOff}
                ?disabled=${!usable}
                @click=${() => annotCommand({ kind: annot.active ? 'stop' : 'start' })}
            >✎ ${annot.active ? this.msg.annotating : this.msg.annotate}</button>
        `;
    }

    // The marks of the page, numbered, each with its note (editable here too) and a way to remove it.
    // A free drawing of the pen: its image, its note, and the plain statement that it does not go to the AI yet.
    private _renderDrawing(drawing: IAnnotState['drawings'][number], busy: boolean) {
        return html`
            <div class="flex flex-col gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5">
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-medium text-gray-700 dark:text-gray-200">✎ ${this.msg.drawingTitle} ${drawing.id}</span>
                    <button type="button" class="ml-auto text-gray-400 hover:text-red-500 cursor-pointer" title=${this.msg.drawingRemove}
                        ?disabled=${busy}
                        @click=${() => annotCommand({ kind: 'removeDrawing', id: drawing.id })}>×</button>
                </div>
                ${drawing.image
                    ? html`<img src=${drawing.image} alt=${this.msg.drawingTitle} class="w-full max-h-48 object-contain rounded border border-gray-100 dark:border-gray-800 bg-white">`
                    : nothing}
                ${drawing.capturing ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.drawingCapturing}</span>` : nothing}
                ${drawing.pending && !drawing.capturing ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.drawingPending}</span>` : nothing}
                ${drawing.failed ? html`<span class="text-[10px] text-red-600 dark:text-red-400 wrap-break-word">${this.msg.drawingFailed.replace('{error}', drawing.error)}</span>` : nothing}
                <input type="text" class="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-300 placeholder-gray-400"
                    placeholder=${this.msg.markNotePlaceholder}
                    ?disabled=${busy}
                    .value=${drawing.note}
                    @input=${(e: Event) => annotCommand({ kind: 'drawingNote', id: drawing.id, note: (e.target as HTMLInputElement).value })}>
                <span class="text-[10px] text-amber-600 dark:text-amber-400">${this.msg.drawingNotSent}</span>
            </div>
        `;
    }

    private _renderMarks(page: IPageEntry, busy: boolean) {
        const annot = this._annot;
        if (!annot.available) return nothing;
        // The drawings are shown on the page they were made on, like the marks.
        const drawings = annot.drawings.length && this._annotOnPage(page)
            ? html`${annot.drawings.map(each => this._renderDrawing(each, busy))}`
            : nothing;
        if (!this._marksFor(page).length) {
            if (drawings !== nothing) return drawings;
            return annot.active ? nothing : html`<span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.annotateHint}</span>`;
        }
        return html`
            ${drawings}
            <div class="flex flex-col gap-1">
                <span class="text-[10px] text-gray-500 dark:text-gray-400">${this.msg.marksCount.replace('{n}', String(annot.marks.length))}</span>
                ${annot.marks.map(mark => html`
                    <div class="flex items-start gap-2 rounded-md border px-2 py-1.5
                        ${annot.focused === mark.n ? 'border-pink-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900">
                        <button type="button" class="shrink-0 w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] font-bold cursor-pointer"
                            @click=${() => annotCommand({ kind: 'focus', n: mark.n })}>${mark.n}</button>
                        <div class="min-w-0 flex-1 flex flex-col gap-0.5">
                            <span class="text-[11px] font-medium text-gray-700 dark:text-gray-200 truncate"
                                title=${mark.elements.map(item => item.label).join(' + ')}>${mark.elements.map(item => item.label).join(' + ')}</span>
                            ${mark.repeated ? html`<span class="text-[10px] text-amber-600 dark:text-amber-400">${this.msg.markRepeated}</span>` : nothing}
                            <input type="text" class="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-300 placeholder-gray-400"
                                placeholder=${this.msg.markNotePlaceholder}
                                ?disabled=${busy}
                                .value=${mark.note}
                                @input=${(e: Event) => annotCommand({ kind: 'note', n: mark.n, note: (e.target as HTMLInputElement).value })}>
                        </div>
                        <button type="button" class="shrink-0 text-gray-400 hover:text-red-500 cursor-pointer" title=${this.msg.markRemove}
                            ?disabled=${busy}
                            @click=${() => annotCommand({ kind: 'remove', n: mark.n })}>×</button>
                    </div>
                `)}
            </div>
        `;
    }

    // In review: the AI change on screen; Before | After, the code, Apply / Discard, and an adjustment (analyzed, then
    // generated). A page of a batch only shows itself here: Apply, Discard and the adjustment live in the batch list.
    private _renderEditReview(page: IPageEntry, review: IEditReview) {
        const busy = this._editBusy[page.name];
        const error = this._editError[page.name];
        const inBatch = this._inBatch(page);
        // A segmented pill: a quiet track, the side on screen as a raised chip (the preview side with an amber dot).
        const seg = (which: 'before' | 'after', label: string) => {
            const on = review.showing === which;
            return html`
            <button type="button"
                class="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:cursor-wait ${on
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}"
                aria-pressed=${on ? 'true' : 'false'}
                ?disabled=${!!busy}
                @click=${() => this._onReviewShow(page, which)}>
                ${which === 'after' ? html`<span class="h-1.5 w-1.5 rounded-full ${on ? 'bg-amber-500' : 'bg-amber-500/50'}" aria-hidden="true"></span>` : nothing}
                ${label}
            </button>`;
        };
        return html`
            <div class="rounded-lg border ${inBatch ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40' : 'border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/10'} px-3 py-2.5 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold ${inBatch ? 'text-gray-700 dark:text-gray-200' : 'text-amber-800 dark:text-amber-300'}">${inBatch ? page.name : this.msg.reviewTitle}</span>
                    <span class="ml-auto inline-flex items-center gap-0.5 p-0.5 rounded-full bg-gray-200/80 dark:bg-gray-900 ring-1 ring-inset ring-gray-300/60 dark:ring-gray-700 ${busy === 'switch' ? 'animate-pulse' : ''}" role="group">
                        ${seg('before', this.msg.reviewBefore)}${seg('after', this.msg.reviewAfter)}
                    </span>
                </div>
                ${inBatch ? nothing : html`<span class="text-[11px] italic text-gray-500 dark:text-gray-400">“${review.request}”</span>`}
                ${review.adjust.length ? html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.reviewAdjustments.replace('{list}', review.adjust.join('; '))}</span>` : nothing}
                <span class="text-xs text-gray-700 dark:text-gray-200"><span class="font-semibold">${this.msg.editWhatChanged}:</span> ${review.notes.notes}</span>
                ${inBatch ? html`
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-gray-500 dark:text-gray-400">${busy === 'switch' ? this.msg.reviewSwitching : this.msg.reviewInBatch}</span>
                        <button type="button" class="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            @click=${() => this._onReviewCode(page)}>${this.msg.reviewCode}</button>
                    </div>` : html`
                    <span class="text-[10px] text-gray-500 dark:text-gray-400">${busy === 'switch' ? this.msg.reviewSwitching : this.msg.reviewHint}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <button type="button"
                            class="text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            ?disabled=${!!busy || !!review.adjustPlan}
                            @click=${() => this._onReviewApply(page)}>${busy === 'reviewApply' ? this.msg.reviewApplying : this.msg.reviewApply}</button>
                        <button type="button"
                            class="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            ?disabled=${!!busy}
                            @click=${() => this._onReviewDiscard(page)}>${busy === 'reviewDiscard' ? this.msg.reviewDiscarding : this.msg.reviewDiscard}</button>
                        <button type="button" class="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            @click=${() => this._onReviewCode(page)}>${this.msg.reviewCode}</button>
                    </div>
                    ${this._renderReviewAdjust(page, review)}
                    <span class="text-[10px] text-amber-700 dark:text-amber-400">${this.msg.reviewSaveNote}</span>`}
                ${error ? html`
                    <div class="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word rounded bg-red-50 dark:bg-red-900/20 px-2 py-1.5">${error}</div>
                ` : nothing}
                ${!inBatch && this._taskInfoByName.get(`edit:${page.name}`)?.task ? html`
                    <button class="self-end text-xs text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                        @click=${() => this._openTask(`edit:${page.name}`)}>${this.msg.followTask}</button>
                ` : nothing}
            </div>
        `;
    }

    /** The adjustment of a single page in review: the ask, then its plan to confirm, then the generation. */
    private _renderReviewAdjust(page: IPageEntry, review: IEditReview) {
        const busy = this._editBusy[page.name];
        const full = review.adjust.length >= MAX_REVIEW_ADJUST;
        const plan = review.adjustPlan;
        const inputCls = 'w-full text-xs px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600';
        const small = 'self-start text-xs px-2.5 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
        return html`
            <div class="flex flex-col gap-1.5 border-t border-amber-200 dark:border-amber-800/40 pt-2">
                <span class="text-[11px] font-medium text-gray-600 dark:text-gray-300">${this.msg.reviewAdjust}</span>
                ${plan ? html`
                    <span class="text-[11px] italic text-gray-500 dark:text-gray-400">“${plan.text}”</span>
                    <span class="text-[11px] text-gray-600 dark:text-gray-300">${this.msg.reviewAdjustPlanTitle}</span>
                    ${this._renderOperations(plan.operations)}
                    <div class="flex items-center gap-2">
                        <button type="button" class="${small} bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500"
                            ?disabled=${!!busy} @click=${() => this._applyAdjust(page)}>${busy === 'adjust' ? this.msg.reviewAdjusting : this.msg.reviewAdjustGenerate}</button>
                        <button type="button" class="${small} border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400"
                            ?disabled=${!!busy} @click=${() => this._onReviewAdjustCancel(page)}>${this.msg.reviewAdjustCancel}</button>
                    </div>`
                : full ? html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.reviewAdjustLimit}</span>` : html`
                    <textarea rows="2" class="${inputCls} resize-y"
                        placeholder=${this.msg.reviewAdjustPlaceholder}
                        ?disabled=${!!busy}
                        .value=${this._adjustDraft[page.name] ?? ''}
                        @input=${(e: Event) => { this._adjustDraft = { ...this._adjustDraft, [page.name]: (e.target as HTMLTextAreaElement).value }; }}
                    ></textarea>
                    <button type="button"
                        class="${small} border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        ?disabled=${!!busy || !(this._adjustDraft[page.name] ?? '').trim()}
                        @click=${() => this._onReviewAdjust(page)}>${busy === 'adjustPlan' ? this.msg.reviewAdjustPlanning : this.msg.reviewAdjustSend}</button>
                `}
            </div>`;
    }

    /** The operations of a plan, one line each: the mark, where, the aspect, and the change in the person's words. */
    private _renderOperations(operations: IEditOperation[]) {
        return html`
            <div class="flex flex-col gap-1">
                ${operations.map(op => html`
                    <div class="flex items-baseline gap-1.5 text-xs text-gray-700 dark:text-gray-200">
                        ${op.mark ? html`<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 bg-pink-500 text-white" title=${this.msg.planMark.replace('{n}', String(op.mark))}>${op.mark}</span>` : nothing}
                        <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 shrink-0">${op.organism ?? this.msg.editPageShell}</span>
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">${op.aspect}</span>
                        ${op.revert ? html`<span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">${this.msg.editRevert}</span>` : nothing}
                        <span class="leading-snug">${op.summary}</span>
                    </div>
                `)}
            </div>`;
    }

    // The gate's plan, shown for confirmation before anything is written.
    private _renderEditConfirm(page: IPageEntry, plan: { request: string; device: string; operations: IEditOperation[]; element: IEditElement | null; marks: IEditMark[] }) {
        const busy = this._editBusy[page.name];
        return html`
            <div class="rounded-lg border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-300">${this.msg.editPlanTitle}</span>
                <span class="text-[11px] italic text-gray-500 dark:text-gray-400">“${plan.request}”</span>
                ${plan.element ? html`
                    <span class="text-[10px] text-gray-500 dark:text-gray-400">${this.msg.editElement}: <span class="font-mono">${plan.element.tag}</span>${plan.element.organism ? ` ${this.msg.editElementIn} ${plan.element.organism}` : ''}</span>
                ` : nothing}
                ${plan.marks.length ? html`<span class="text-[10px] text-gray-500 dark:text-gray-400">${this.msg.marksCount.replace('{n}', String(plan.marks.length))}</span>` : nothing}
                ${this._renderOperations(plan.operations)}
                <div class="flex items-center gap-2">
                    <button
                        class="text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        ?disabled=${!!busy}
                        @click=${() => this._onApplyPlan(page)}
                    >${busy === 'apply' ? this.msg.editApplying : this.msg.editPlanApply}</button>
                    <button
                        class="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        ?disabled=${!!busy}
                        @click=${() => this._onCancelPlan(page)}
                    >${this.msg.editPlanCancel}</button>
                    ${this._taskInfoByName.get(`edit:${page.name}`)?.task ? html`
                        <button class="ml-auto text-xs text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                            @click=${() => this._openTask(`edit:${page.name}`)}>${this.msg.followTask}</button>
                    ` : nothing}
                </div>
                ${this._editError[page.name] ? html`
                    <div class="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word rounded bg-red-50 dark:bg-red-900/20 px-2 py-1.5">${this._editError[page.name]}</div>
                ` : nothing}
            </div>
        `;
    }

    private _editEntry(page: IPageEntry, request: string, device: string, element: IEditElement | null, operations?: IEditOperation[], marks: IEditMark[] = [], adjust: string[] = [], batch: string[] = [], standard: IEditStandard | null = null, standardize = false): string | null {
        const target = this._editTarget(page);
        const module = this._moduleName ?? this._modulePath;
        if (!target || !module) return null;
        return JSON.stringify({
            module, page: page.file?.shortName ?? page.name, device, genome: target.genome, request,
            ...(element ? { element } : {}), ...(operations ? { operations } : {}), ...(marks.length ? { marks } : {}), ...(adjust.length ? { adjust } : {}),
            ...(batch.length ? { batch } : {}), ...(standard?.rules.length ? { standard } : {}), ...(standardize ? { standardize: true } : {}),
        });
    }

    /**
     * Why the screen did not take the change, to show — or null. A page written while another one is on screen is not
     * a warning: it was compiled, and opening it shows the change (every page of a batch but the last one).
     */
    private _liveWarning(live: string | null | undefined): string | null {
        return live && live !== LIVE_OTHER_PAGE ? this.msg.editLiveNotApplied.replace('{reason}', live) : null;
    }

    // Per-page edit state is replaced, never mutated, so @state sees the change.
    private _setEdit(field: '_editBusy' | '_editError' | '_editNotes' | '_editPlan', name: string, value: unknown) {
        const next: Record<string, unknown> = { ...this[field] };
        if (value === undefined) delete next[name];
        else next[name] = value;
        (this as unknown as Record<string, unknown>)[field] = next;
    }

    // Phase PLAN: only the gate runs; the operations come back for confirmation and nothing is written.
    /**
     * What is asked: the text written, or — with nothing written — the notes of the marks, numbered. Marks with notes
     * are a request on their own; marks without notes only say where, so with no text they ask nothing.
     */
    private _editRequest(page: IPageEntry): string {
        const written = (this._editDraft[page.name] ?? '').trim();
        if (written) return written;
        return this._marksFor(page)
            .map((mark, i) => (mark.note ? `${i + 1}: ${mark.note}` : ''))
            .filter(Boolean)
            .join('; ');
    }

    private async _onPlanEdit(page: IPageEntry) {
        const request = this._editRequest(page);
        const device = this._editTarget(page)?.device;
        if (!request || !device || this._editBusy[page.name]) return;
        const { element: selected } = this._selectedElement(page);
        // With marks, the selected element is one more mark without a note (one shape for the agent), when it fits.
        const marks = this._marksFor(page);
        if (marks.length && selected && marks.length < 5 && !marks.some(mark => mark.elements.some(item => JSON.stringify(item.anchorPath) === JSON.stringify(selected.anchorPath)))) {
            marks.push({ note: null, elements: [selected] });
        }
        const element = marks.length ? null : selected;
        const entry = this._editEntry(page, request, device, element, undefined, marks);
        if (!entry) return;
        // The request is out: the drawing pointer gives the page back (the marks stay, they are part of it).
        if (this._annot.active) annotCommand({ kind: 'stop' });
        // A new request: the previous change is kept for good.
        delete this._editUndo[page.name];
        this._editDiscarded = { ...this._editDiscarded, [page.name]: false };
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editNotes', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'plan');
        try {
            const result = await this._executeAgent('agentEditPage', entry, data => { this._taskInfoByName.set(`edit:${page.name}`, data); this.requestUpdate(); });
            if (result.failure) this._setEdit('_editError', page.name, result.failure);
            else if (result.plan?.length) this._setEdit('_editPlan', page.name, { request, device, operations: result.plan, element, marks });
            // A task the system failed (an LLM call that never came back right) emits nothing of ours: say so.
            else this._setEdit('_editError', page.name, this.msg.editNoAnswer);
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    // Phase APPLY, as a PREVIEW: the approved operations go back verbatim and the agent patches the .ts, which goes on
    // screen. The page then stays "in review" — its other edits refused — until the person applies or discards it.
    private async _onApplyPlan(page: IPageEntry) {
        const plan = this._editPlan[page.name];
        if (!plan || this._editBusy[page.name]) return;
        // The element the plan was made with goes back with it, even if the selection moved since.
        const entry = this._editEntry(page, plan.request, plan.device, plan.element, plan.operations, plan.marks, [], plan.batch ?? [], plan.standard ?? null);
        if (!entry) return;
        if (this._annot.active) annotCommand({ kind: 'stop' });
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'apply');
        try {
            // The page before the change: what Discard puts back. Without it there is no preview, the change is applied.
            const before = await this._snapshotPage(entry);
            const versioned = before ? versionedPage({ project: before.project, folder: before.folder, shortName: before.page }) : null;
            // The page timeline holds the page as it is before the agent writes (a version only if it is missing).
            await ensurePageVersion(versioned);
            const result = await this._executeAgent('agentEditPage', entry, data => { this._taskInfoByName.set(`edit:${page.name}`, data); this.requestUpdate(); });
            if (result.failure) this._setEdit('_editError', page.name, result.failure);
            // No notes = the apply never finished (the plan stays, to try again).
            else if (!result.notes) this._setEdit('_editError', page.name, this.msg.editNoAnswer);
            else {
                const after = before ? await this._snapshotPage(entry) : null;
                this._setEdit('_editPlan', page.name, undefined);
                if (before && after && after.source !== before.source) {
                    this._editReview = { ...this._editReview, [page.name]: { ...plan, before, after, notes: result.notes, notesLog: [result.notes.notes], showing: 'after', adjust: [] } };
                    setPageInReview(this._reviewRef(before), true);
                    await this._ensureShown(page, after, result.notes.live);
                } else {
                    // Nothing to review (nothing changed, or the page could not be read): the result simply stays.
                    await this._finishApplied(page, plan, result.notes, null);
                }
                // The remount rebuilt the page: the selection that was sent points at nodes that are gone.
                if (plan.element) this._selectionUsed = this._selection;
            }
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    private _reviewRef(snapshot: EditPageSnapshot): { project: number; folder: string; shortName: string } {
        return { project: snapshot.project, folder: snapshot.folder, shortName: snapshot.page };
    }

    /** The change is kept: a version of the timeline, the "What changed" panel, and the discard of today afterwards. */
    private async _finishApplied(page: IPageEntry, plan: { request: string; marks: IEditMark[] }, notes: IEditNotes, review: IEditReview | null) {
        if (review) {
            const versioned = versionedPage(this._reviewRef(review.before));
            // The timeline says what the AI CHANGED — its notes of the change and of every adjustment, in order — and
            // keeps the request (with the adjustments) to be shown on demand.
            const request = requestWithAdjustments(plan.request, review.adjust);
            const steps = review.notesLog.map(text => text.trim()).filter(Boolean);
            await recordPageVersion(versioned, 'ai', steps[0] ?? request, { request, steps });
            this._editUndo[page.name] = { before: review.before, after: review.after, appliedAt: Date.now() };
        }
        this._editDraft = { ...this._editDraft, [page.name]: '' };
        // The marks were for this request: applied, they are done (the page they circled has changed).
        if (plan.marks.length) annotCommand({ kind: 'clear' });
        this._setEdit('_editNotes', page.name, notes);
    }

    private _endReview(page: IPageEntry, review: IEditReview) {
        const next = { ...this._editReview };
        delete next[page.name];
        this._editReview = next;
        setPageInReview(this._reviewRef(review.before), false);
    }

    /** Before | After: puts one of the two texts on screen (the remount). Only a view: no version, no history. */
    private async _onReviewShow(page: IPageEntry, which: 'before' | 'after') {
        const review = this._editReview[page.name];
        if (!review || review.showing === which || this._editBusy[page.name]) return;
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'switch');
        try {
            const snapshot = which === 'before' ? review.before : review.after;
            const result = await commitPageSource(snapshot.project, snapshot.folder, snapshot.page, snapshot.source);
            this._editReview = { ...this._editReview, [page.name]: { ...review, showing: which } };
            if (this._liveWarning(result.live)) this._setEdit('_editError', page.name, this._liveWarning(result.live));
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    /**
     * The agent wrote the page and tried to put it on screen. When that did not take (`live` says why), the page is
     * put there once more the way Before | After does, and what still stops it is shown: a preview never sits
     * silently behind an old screen. A page written while another one is on screen has nothing to refresh.
     */
    private async _ensureShown(page: IPageEntry, snapshot: EditPageSnapshot, live: string | null | undefined): Promise<void> {
        if (!live || live === LIVE_OTHER_PAGE) return;
        console.warn('[selectPage] the AI change did not reach the screen, trying again:', live);
        const again = await commitPageSource(snapshot.project, snapshot.folder, snapshot.page, snapshot.source);
        const warning = this._liveWarning(again.live);
        if (warning) this._setEdit('_editError', page.name, warning);
    }

    /** Puts the candidate back on screen when the person was looking at Before (Apply and Adjust work on it). */
    private async _showCandidate(review: IEditReview): Promise<void> {
        if (review.showing === 'after') return;
        await commitPageSource(review.after.project, review.after.folder, review.after.page, review.after.source);
    }

    private async _onReviewApply(page: IPageEntry) {
        const review = this._editReview[page.name];
        if (!review || this._editBusy[page.name]) return;
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'reviewApply');
        try {
            await this._showCandidate(review);
            this._endReview(page, review);
            await this._finishApplied(page, review, review.notes, review);
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    /** Discard: the page and its defs, whole, as they were before the request. The request text stays, to refine. */
    private async _onReviewDiscard(page: IPageEntry) {
        const review = this._editReview[page.name];
        if (!review || this._editBusy[page.name]) return;
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'reviewDiscard');
        try {
            const result = await restoreEditPage(review.before);
            this._endReview(page, review);
            this._editDiscarded = { ...this._editDiscarded, [page.name]: true };
            if (this._liveWarning(result.live)) this._setEdit('_editError', page.name, this._liveWarning(result.live));
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    /**
     * An adjustment, phase PLAN: the gate reads the page as it is now (the candidate) and plans only this ask — any
     * organism, or a refusal with the reason. The plan waits in the review for "Generate". Nothing is written.
     */
    private async _planAdjust(page: IPageEntry, text: string, standard?: IEditStandard | null): Promise<boolean> {
        const review = this._editReview[page.name];
        if (!review || !text || review.adjust.length >= MAX_REVIEW_ADJUST || this._editBusy[page.name]) return false;
        // The standard of a batch adjustment when it brought one; else the one the page already follows.
        const binding = standard !== undefined ? standard : review.standard ?? null;
        const entry = this._editEntry(page, review.request, review.device, review.element, undefined, review.marks, [...review.adjust, text], review.batch ?? [], binding);
        if (!entry) return false;
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'adjustPlan');
        try {
            // The gate reads the model: the candidate must be the text there, not Before.
            await this._showCandidate(review);
            const current: IEditReview = { ...review, showing: 'after', adjustPlan: undefined };
            this._editReview = { ...this._editReview, [page.name]: current };
            const result = await this._executeAgent('agentEditPage', entry, data => { this._taskInfoByName.set(`edit:${page.name}`, data); this.requestUpdate(); });
            if (result.failure) { this._setEdit('_editError', page.name, result.failure); return false; }
            if (!result.plan?.length) { this._setEdit('_editError', page.name, this.msg.editNoAnswer); return false; }
            const now = this._editReview[page.name];
            if (!now) return false;
            this._editReview = { ...this._editReview, [page.name]: { ...now, adjustPlan: { text, operations: result.plan, standard: binding } } };
            return true;
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
            return false;
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    /** An adjustment, phase APPLY: the approved plan patched ON the candidate; Before stays the page before the request. */
    private async _applyAdjust(page: IPageEntry): Promise<boolean> {
        const review = this._editReview[page.name];
        const plan = review?.adjustPlan;
        if (!review || !plan || this._editBusy[page.name]) return false;
        const adjust = [...review.adjust, plan.text];
        const entry = this._editEntry(page, review.request, review.device, review.element, plan.operations, review.marks, adjust, review.batch ?? [], plan.standard);
        if (!entry) return false;
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'adjust');
        try {
            await this._showCandidate(review);
            const current: IEditReview = { ...review, showing: 'after' };
            this._editReview = { ...this._editReview, [page.name]: current };
            const result = await this._executeAgent('agentEditPage', entry, data => { this._taskInfoByName.set(`edit:${page.name}`, data); this.requestUpdate(); });
            // A failed patch puts the candidate back: the plan stays, to try again or cancel.
            if (result.failure) { this._setEdit('_editError', page.name, result.failure); return false; }
            if (!result.notes) { this._setEdit('_editError', page.name, this.msg.editNoAnswer); return false; }
            const after = await this._snapshotPage(entry);
            this._editReview = { ...this._editReview, [page.name]: { ...current, after: after ?? current.after, notes: result.notes, notesLog: [...current.notesLog, result.notes.notes], adjust, adjustPlan: undefined, standard: plan.standard } };
            this._adjustDraft = { ...this._adjustDraft, [page.name]: '' };
            if (after) await this._ensureShown(page, after, result.notes.live);
            return true;
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
            return false;
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    /** Ask for an adjustment of one page: analyzed first; its plan shows in the review card. */
    private async _onReviewAdjust(page: IPageEntry) {
        const text = (this._adjustDraft[page.name] ?? '').trim();
        if (text) await this._planAdjust(page, text);
    }

    /** The plan of the adjustment is dropped: the candidate stays as it is, the ask stays to be refined. */
    private _onReviewAdjustCancel(page: IPageEntry) {
        const review = this._editReview[page.name];
        if (!review?.adjustPlan || this._editBusy[page.name]) return;
        this._editReview = { ...this._editReview, [page.name]: { ...review, adjustPlan: undefined } };
    }

    /** The code of Before against the candidate, in the details panel on the right (the page timeline's diff). */
    private _onReviewCode(page: IPageEntry) {
        const review = this._editReview[page.name];
        if (!review) return;
        const element = document.createElement(PAGE_VERSION_DIFF_TAG) as HTMLElement & {
            pageName: string; label: string; original: IPageVersionSide; modified: IPageVersionSide;
        };
        element.pageName = `${this._moduleName ?? ''}/${review.before.page}`;
        element.label = this.msg.reviewCodeLabel;
        element.original = { ts: review.before.source, defs: review.before.defs };
        element.modified = { ts: review.after.source, defs: review.after.defs };
        void openElementInServiceDetails(element);
    }

    /** The page the entry aims at, as it is now; null when it cannot be read (the change is then not discardable). */
    private async _snapshotPage(entry: string): Promise<EditPageSnapshot | null> {
        try {
            const project = Number(mls.actualProject || 0);
            if (!Number.isSafeInteger(project) || project <= 0) return null;
            return await snapshotEditPage(project, JSON.parse(entry));
        } catch (error) {
            console.warn('[selectPage] the page could not be read for a discard:', error);
            return null;
        }
    }

    /**
     * Discard: the page and its defs go back to what they were before the change — a "back to this version" of the
     * page timeline, so the discard itself is a version and can be undone from the Versions list. When the page
     * changed after the change, the later edits go back too: the first click says how many, the second confirms.
     * Without the timeline (the browser store failed) a changed page is refused, as nothing could bring them back.
     */
    private async _onDiscardEdit(page: IPageEntry) {
        const undo = this._editUndo[page.name];
        if (!undo || this._editBusy[page.name]) return;
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'discard');
        try {
            const ref = { project: undo.after.project, folder: undo.after.folder, shortName: undo.after.page };
            const now = await snapshotPageFile(ref.project, ref.folder, ref.shortName);
            const changedSince = !now || now.source !== undo.after.source || (now.defs ?? null) !== (undo.after.defs ?? null);
            const versioned = versionedPage(ref);
            if (changedSince) {
                if (!versioned || !pageVersionsAvailable()) {
                    this._setEdit('_editError', page.name, this.msg.editDiscardStale);
                    return;
                }
                if (!undo.confirmed) {
                    const later = (await listPageVersions(versioned)).filter(v => v.at > undo.appliedAt).length;
                    undo.confirmed = true;
                    this._setEdit('_editError', page.name, this.msg.editDiscardConfirm.replace('{n}', String(Math.max(1, later))));
                    return;
                }
            }
            const before = { ts: undo.before.source, defs: undo.before.defs };
            const result = versioned
                ? await restorePageVersion(versioned, { id: 0, at: undo.appliedAt, who: 'ai', what: '', ...before })
                : await restoreEditPage(undo.before);
            delete this._editUndo[page.name];
            this._setEdit('_editNotes', page.name, undefined);
            this._editDiscarded = { ...this._editDiscarded, [page.name]: true };
            if (this._liveWarning(result.live)) this._setEdit('_editError', page.name, this._liveWarning(result.live));
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    // ─── One request, several pages (editBatchCore) ──────────────────────
    // The agent stays a one-page agent: the panel plans every page (a few at a time, the plan only reads), then
    // generates the previews one by one — the page on screen last — through the same per-page review as a single
    // request. The batch only lists the pages and decides them together.

    private _pageByName(name: string): IPageEntry | undefined {
        return this._pages.find(p => p.name === name);
    }

    /** The batch of the module on screen (a batch of another module waits until the person comes back to it). */
    private _activeBatch(): IEditBatch | null {
        const batch = this._editBatch;
        return batch && batch.module === (this._moduleName ?? this._modulePath) ? batch : null;
    }

    /** The rows as they stand now: a page whose review was decided in its own card counts as applied or discarded. */
    private _batchRows(batch: IEditBatch): Record<string, BatchRow> {
        const rows: Record<string, BatchRow> = {};
        for (const name of batch.pages) {
            const row = batch.rows[name];
            rows[name] = row.state === 'review' && !this._editReview[name]
                ? { ...row, state: this._editDiscarded[name] ? 'discarded' : 'applied' }
                : row;
        }
        return rows;
    }

    private _setBatchRow(name: string, patch: Partial<BatchRow>) {
        const batch = this._editBatch;
        if (!batch?.rows[name]) return;
        this._editBatch = { ...batch, rows: { ...batch.rows, [name]: { ...batch.rows[name], ...patch } } };
    }

    /** Pages of the module with the variant the request goes to (this device, generated for the current UX). */
    private _batchCandidates(device: string): IPageEntry[] {
        return this._pages.filter(p => p.exists && p.devices.includes(`web/${device}`) && !!this._editTarget(p));
    }

    /** `<module>/web/<device>/<genome>` of a page: where its variant for that device lives. */
    private _variantFolder(page: IPageEntry, device: string): string | null {
        const folder = page.file?.folder ?? '';
        const at = folder.lastIndexOf('/web/');
        const target = this._editTarget(page);
        return at < 0 || !target ? null : `${folder.slice(0, at)}/web/${device}/${target.genome}`;
    }

    /** The other pages of the batch, as the agent names them (the file's short name). */
    private _batchOthers(pages: readonly string[], name: string): string[] {
        return pages.filter(n => n !== name).map(n => this._pageByName(n)?.file?.shortName ?? n);
    }

    /** The pages the chosen scope reaches (the page asked from included); null while unknown. */
    private _scopeCandidates(page: IPageEntry, device: string): string[] | null {
        const kind = this._editScope[page.name] ?? 'page';
        const all = this._batchCandidates(device).map(p => p.name);
        if (kind === 'module') return all;
        if (kind === 'pick') return this._scopePicked[page.name] ?? all;
        if (kind === 'molecule') {
            const tag = this._scopeTag[page.name];
            return tag ? this._scopeMatches[`${device}|${tag}`] ?? null : null;
        }
        return null;
    }

    private async _loadScopeTags(page: IPageEntry, device: string) {
        const key = `${device}|${page.name}`;
        const folder = this._variantFolder(page, device);
        const project = Number(page.file?.project ?? 0);
        let tags: string[] = [];
        try {
            const snapshot = folder && project ? await snapshotPageFile(project, folder, page.file.shortName) : null;
            tags = snapshot ? moleculeTagsIn(snapshot.source) : [];
        } catch (error) {
            console.warn('[selectPage] molecules of the page could not be read:', error);
        }
        this._scopeTags = { ...this._scopeTags, [key]: tags };
    }

    /** Which pages use the molecule: read from each page's source (the editor model, the local copy included). */
    private async _loadScopeMatches(device: string, tag: string) {
        const key = `${device}|${tag}`;
        this._scopeMatches = { ...this._scopeMatches, [key]: null };
        const sources = await Promise.all(this._batchCandidates(device).map(async p => {
            const folder = this._variantFolder(p, device);
            try {
                const snapshot = folder ? await snapshotPageFile(Number(p.file.project), folder, p.file.shortName) : null;
                return { name: p.name, source: snapshot?.source ?? '' };
            } catch {
                return { name: p.name, source: '' };
            }
        }));
        this._scopeMatches = { ...this._scopeMatches, [key]: pagesUsingTag(sources, tag) };
    }

    /** The request goes to more than this page: marking the page (Annotate, the selected element) means nothing there. */
    private _manyPages(page: IPageEntry, device: string): boolean {
        return (this._editScope[page.name] ?? 'page') !== 'page' && this._batchCandidates(device).length >= 2;
    }

    private _setScope(page: IPageEntry, device: string, kind: EditScopeKind) {
        this._editScope = { ...this._editScope, [page.name]: kind };
        // Drawing on the page is for one page only.
        if (kind !== 'page' && this._annot.active) annotCommand({ kind: 'stop' });
        if (kind === 'molecule' && this._scopeTags[`${device}|${page.name}`] === undefined) void this._loadScopeTags(page, device);
    }

    /** The scope, as a compact pill in the composer's bar; nothing when the module has no other page to send it to. */
    private _renderScopeSelect(page: IPageEntry, device: string, busy: boolean) {
        if (this._batchCandidates(device).length < 2) return nothing;
        const kind = this._editScope[page.name] ?? 'page';
        const labels: Record<EditScopeKind, string> = {
            page: this.msg.editScopePage, module: this.msg.editScopeModule, molecule: this.msg.editScopeMolecule, pick: this.msg.editScopePick,
        };
        return html`
            <select class="min-w-0 shrink max-w-[10rem] truncate text-[11px] pl-2 pr-1 py-0.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:[color-scheme:dark] text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer disabled:cursor-not-allowed"
                title=${this.msg.editScope}
                aria-label=${this.msg.editScope}
                ?disabled=${busy}
                @change=${(e: Event) => this._setScope(page, device, (e.target as HTMLSelectElement).value as EditScopeKind)}>
                ${(Object.keys(labels) as EditScopeKind[]).map(k => html`<option class="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200" value=${k} ?selected=${k === kind}>${labels[k]}</option>`)}
            </select>`;
    }

    /** Below the composer, for a scope of several pages: the molecule or the pages to choose, and the pages reached. */
    private _renderScopeDetail(page: IPageEntry, device: string, busy: boolean) {
        if (!this._manyPages(page, device)) return nothing;
        const all = this._batchCandidates(device);
        const kind = this._editScope[page.name] ?? 'page';
        const selectCls = 'text-[11px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:[color-scheme:dark] text-gray-600 dark:text-gray-300';
        let detail: unknown = nothing;
        if (kind === 'molecule') {
            const tags = this._scopeTags[`${device}|${page.name}`];
            const tag = this._scopeTag[page.name] ?? '';
            detail = tags === undefined
                ? html`<span class="text-[11px] text-gray-400 dark:text-gray-500">${this.msg.editScopeReading}</span>`
                : !tags.length
                    ? html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.editScopeMoleculeNone}</span>`
                    : html`
                        <select class="${selectCls} font-mono max-w-full" ?disabled=${busy}
                            @change=${(e: Event) => {
                                const value = (e.target as HTMLSelectElement).value;
                                this._scopeTag = { ...this._scopeTag, [page.name]: value };
                                if (value) void this._loadScopeMatches(device, value);
                            }}>
                            <option value="" ?selected=${!tag}>${this.msg.editScopeMoleculePick}</option>
                            ${tags.map(t => html`<option value=${t} ?selected=${t === tag}>${t}</option>`)}
                        </select>`;
        }
        if (kind === 'pick') {
            const picked = new Set(this._scopePicked[page.name] ?? all.map(p => p.name));
            const toggle = (name: string, on: boolean) => {
                const next = new Set(picked);
                if (on) next.add(name); else next.delete(name);
                this._scopePicked = { ...this._scopePicked, [page.name]: all.map(p => p.name).filter(n => next.has(n)) };
            };
            detail = html`
                <div class="flex flex-col gap-0.5 max-h-40 overflow-auto rounded-md border border-gray-200 dark:border-gray-800 px-2 py-1">
                    ${all.map(p => html`
                        <label class="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" class="cursor-pointer disabled:cursor-not-allowed"
                                .checked=${p.name === page.name || picked.has(p.name)}
                                ?disabled=${busy || p.name === page.name}
                                @change=${(e: Event) => toggle(p.name, (e.target as HTMLInputElement).checked)}>
                            ${p.name}${p.name === page.name ? html` <span class="text-gray-400 dark:text-gray-500">(${this.msg.editScopeThis})</span>` : nothing}
                        </label>`)}
                </div>`;
        }
        const candidates = this._scopeCandidates(page, device);
        const scoped = candidates ? scopePages(page.name, candidates, EDIT_PAGE_MAX_PAGES) : null;
        // The pages reached, as chips (the pick list already shows them).
        const reached = scoped && 'pages' in scoped && kind !== 'pick'
            ? html`<div class="flex flex-wrap gap-1">${scoped.pages.map(name => html`
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200/70 dark:bg-gray-800 text-gray-600 dark:text-gray-300">${name}</span>`)}</div>`
            : nothing;
        const problem = scoped && !('pages' in scoped)
            ? (scoped.refusal === 'tooMany'
                ? this.msg.editScopeTooMany.replace('{max}', String(EDIT_PAGE_MAX_PAGES)).replace('{n}', String(scoped.count))
                : this.msg.editScopeNone)
            : !scoped && kind === 'molecule' && this._scopeTag[page.name] ? this.msg.editScopeReading : '';
        const open = !!this._editBatch && batchOpen(this._batchRows(this._editBatch));
        return html`
            ${detail}
            ${reached}
            ${problem ? html`<span class="text-[11px] ${scoped ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}">${problem}</span>` : nothing}
            ${open ? html`<span class="text-[11px] text-amber-700 dark:text-amber-400">${this.msg.editBatchAnotherOpen}</span>` : nothing}
            ${this._marksFor(page).length || this._selectedElement(page).element ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.editScopeNoMarks}</span>` : nothing}`;
    }

    /** The send button at the right of the composer's bar: this page, or the pages of the scope. */
    private _renderPlanButton(page: IPageEntry, device: string, busy: string | undefined) {
        const cls = 'ml-auto shrink-0 text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
        if (!this._manyPages(page, device)) {
            return html`
                <button type="button" class=${cls} ?disabled=${!!busy || !this._editRequest(page)} @click=${() => this._onPlanEdit(page)}
                >${busy === 'plan' ? this.msg.editPlanning : busy === 'apply' ? this.msg.editApplying : this.msg.editReview}</button>`;
        }
        const candidates = this._scopeCandidates(page, device);
        const scoped = candidates ? scopePages(page.name, candidates, EDIT_PAGE_MAX_PAGES) : null;
        const open = !!this._editBatch && batchOpen(this._batchRows(this._editBatch));
        const text = (this._editDraft[page.name] ?? '').trim();
        return html`
            <button type="button" class=${cls} ?disabled=${!!busy || !text || !scoped || !('pages' in scoped) || open} @click=${() => this._onPlanBatch(page)}
            >${this.msg.editBatchPlan.replace('{n}', scoped && 'pages' in scoped ? String(scoped.pages.length) : '…')}</button>`;
    }

    /** PLAN of every page of the scope (a few at a time): the person then confirms them together. Nothing is written. */
    private async _onPlanBatch(origin: IPageEntry) {
        const request = (this._editDraft[origin.name] ?? '').trim();
        const device = this._editTarget(origin)?.device;
        const module = this._moduleName ?? this._modulePath;
        if (!request || !device || !module || (this._editBatch && batchOpen(this._batchRows(this._editBatch)))) return;
        const candidates = this._scopeCandidates(origin, device);
        const scoped = candidates ? scopePages(origin.name, candidates, EDIT_PAGE_MAX_PAGES) : null;
        if (!scoped || !('pages' in scoped)) return;
        if (this._annot.active) annotCommand({ kind: 'stop' });
        const pages = scoped.pages;
        for (const name of pages) {
            // A new request: the previous change of each page is kept for good.
            delete this._editUndo[name];
            this._setEdit('_editError', name, undefined);
            this._setEdit('_editNotes', name, undefined);
            this._setEdit('_editPlan', name, undefined);
        }
        this._editDiscarded = { ...this._editDiscarded, ...Object.fromEntries(pages.map(n => [n, false])) };
        const batch: IEditBatch = {
            module, device, request, pages, plans: {}, phase: 'standard', standard: null,
            rows: Object.fromEntries(pages.map(n => [n, { state: 'waiting', include: true } as BatchRow])),
        };
        this._editBatch = batch;
        this._standardDraft = '';
        // The values every page must use, decided once; a request with nothing in common goes straight to the plans.
        const standard = await this._runStandard(null);
        if (standard && this._editBatch?.pages === pages) {
            this._editBatch = { ...this._editBatch, standard };
            if (!standard.rules.length) await this._planBatchPages();
        }
    }

    /**
     * The common standard: ONE task reads the page asked from (whole), the pages the request names and the outline of
     * the others, and returns the exact classes for each element the request is about. With `adjust` the current
     * standard is adjusted. null when it could not be decided (the reason is on the batch).
     */
    private async _runStandard(adjust: string | null, previous: IEditStandard | null = null): Promise<IEditStandard | null> {
        const batch = this._editBatch;
        const origin = batch ? this._pageByName(batch.pages[0]) : null;
        if (!batch || !origin) return null;
        const entry = this._editEntry(origin, batch.request, batch.device, null, undefined, [], adjust ? [adjust] : [], this._batchOthers(batch.pages, origin.name), previous, true);
        const failed = (reason: string) => {
            if (this._editBatch?.pages === batch.pages) this._editBatch = { ...this._editBatch, standardError: reason };
            return null;
        };
        if (!entry) return failed(this.msg.editBatchNoVariant);
        this._editBatch = { ...batch, standardBusy: true, standardError: undefined };
        try {
            const result = await this._executeAgent('agentEditPage', entry, data => { this._taskInfoByName.set('edit:standard', data); this.requestUpdate(); });
            if (this._editBatch?.pages !== batch.pages) return null;
            if (result.failure) return failed(result.failure);
            return result.standard ?? failed(this.msg.editNoAnswer);
        } catch (e: any) {
            return failed(e?.message ?? String(e));
        } finally {
            if (this._editBatch?.pages === batch.pages) this._editBatch = { ...this._editBatch, standardBusy: false };
        }
    }

    /** The standard is approved: now every page is planned with it. */
    private async _onApproveStandard() {
        const batch = this._editBatch;
        if (!batch || batch.phase !== 'standard' || batch.standardBusy || !batch.standard) return;
        await this._planBatchPages();
    }

    /** The standard again: adjusted as asked (or decided once more after a failure). */
    private async _onStandardAdjust() {
        const batch = this._editBatch;
        const text = this._standardDraft.trim();
        if (!batch || batch.phase !== 'standard' || batch.standardBusy || (!text && batch.standard)) return;
        const standard = await this._runStandard(batch.standard ? text : null, batch.standard);
        if (standard && this._editBatch?.pages === batch.pages) {
            this._editBatch = { ...this._editBatch, standard };
            this._standardDraft = '';
        }
    }

    /** Every page planned with the common standard, one at a time (two tasks of one thread mix their steps up). */
    private async _planBatchPages() {
        const batch = this._editBatch;
        if (!batch) return;
        const { pages, request, device, standard } = batch;
        this._editBatch = { ...batch, phase: 'plan' };
        for (const name of pages) this._setBatchRow(name, { state: 'planning' });
        await runLimited(pages, BATCH_PLAN_LANES, async name => {
            const page = this._pageByName(name);
            const entry = page ? this._editEntry(page, request, device, null, undefined, [], [], this._batchOthers(pages, name), standard) : null;
            if (!entry) { this._setBatchRow(name, { state: 'refused', reason: this.msg.editBatchNoVariant, include: false }); return; }
            try {
                const result = await this._executeAgent('agentEditPage', entry, data => { this._taskInfoByName.set(`edit:${name}`, data); this.requestUpdate(); });
                if (this._editBatch?.pages !== pages) return;
                if (result.failure) this._setBatchRow(name, { state: 'refused', reason: result.failure, include: false });
                else if (result.plan?.length) {
                    this._editBatch = { ...this._editBatch!, plans: { ...this._editBatch!.plans, [name]: result.plan } };
                    this._setBatchRow(name, { state: 'planned', include: true });
                } else this._setBatchRow(name, { state: 'refused', reason: this.msg.editNoAnswer, include: false });
            } catch (e: any) {
                this._setBatchRow(name, { state: 'refused', reason: e?.message ?? String(e), include: false });
            }
        });
        if (this._editBatch?.pages === pages) this._editBatch = { ...this._editBatch, phase: 'confirm' };
    }

    /** The previews, one page at a time, the page on screen last; each page goes into its own review. */
    private async _generateBatchPages(names: string[]) {
        const batch = this._editBatch;
        if (!batch || !names.length) return;
        this._batchBusy = true;
        this._editBatch = { ...batch, phase: 'generate' };
        for (const name of names) this._setBatchRow(name, { state: 'waiting', reason: undefined });
        const going = batch.pages.filter(n => names.includes(n) || this._batchRows(batch)[n].state === 'review');
        try {
            for (const name of batchOrder(names, this._selectedPage?.name ?? null)) {
                if (this._editBatch?.pages !== batch.pages) return;
                const page = this._pageByName(name);
                const operations = batch.plans[name];
                if (!page || !operations) { this._setBatchRow(name, { state: 'failed', reason: this.msg.editBatchNoVariant, include: false }); continue; }
                this._setBatchRow(name, { state: 'generating' });
                this._setEdit('_editError', name, undefined);
                this._setEdit('_editPlan', name, { request: batch.request, device: batch.device, operations, element: null, marks: [], batch: this._batchOthers(going, name), standard: batch.standard });
                await this._onApplyPlan(page);
                const failed = this._editError[name];
                const review = this._editReview[name];
                this._setBatchRow(name, review ? { state: 'review', include: true, misses: standardMisses(review.after.source, batch.standard) }
                    : failed ? { state: 'failed', reason: failed, include: false }
                    : { state: 'unchanged', include: false });
            }
        } finally {
            this._batchBusy = false;
            if (this._editBatch?.pages === batch.pages) this._editBatch = { ...this._editBatch, phase: 'review' };
        }
    }

    private async _onGenerateBatch() {
        const batch = this._editBatch;
        if (!batch || batch.phase !== 'confirm' || this._batchBusy) return;
        const chosen = batch.pages.filter(n => batch.rows[n].state === 'planned' && batch.rows[n].include);
        for (const name of batch.pages) if (batch.rows[name].state === 'planned' && !batch.rows[name].include) this._setBatchRow(name, { state: 'skipped' });
        await this._generateBatchPages(chosen);
    }

    private async _onRetryBatch() {
        const batch = this._editBatch;
        if (!batch || this._batchBusy) return;
        await this._generateBatchPages(batch.pages.filter(n => batch.rows[n].state === 'failed'));
    }

    /** Apply the ticked pages in review and discard the others (or discard them all): the page on screen last. */
    private async _onBatchDecide(mode: 'ticked' | 'discardAll', only?: { name: string; apply: boolean }) {
        const batch = this._editBatch;
        if (!batch || this._batchBusy) return;
        const rows = this._batchRows(batch);
        let { apply, discard } = batchDecision(rows);
        if (mode === 'discardAll') { discard = [...apply, ...discard]; apply = []; }
        if (only) { apply = only.apply ? [only.name] : []; discard = only.apply ? [] : [only.name]; }
        this._batchBusy = true;
        try {
            for (const name of batchOrder([...apply, ...discard], this._selectedPage?.name ?? null)) {
                const page = this._pageByName(name);
                if (!page || !this._editReview[name]) continue;
                if (apply.includes(name)) await this._onReviewApply(page);
                else await this._onReviewDiscard(page);
                if (!this._editReview[name]) this._setBatchRow(name, { state: apply.includes(name) ? 'applied' : 'discarded' });
            }
        } finally {
            this._batchBusy = false;
        }
    }

    /**
     * An adjustment of the batch, phase PLAN: on every ticked page in review (or only the page open), one page at a
     * time; each row says where it stands. The plans wait in the list for one "Generate".
     */
    private async _onBatchAdjustPlan() {
        const batch = this._editBatch;
        const text = this._batchAdjustDraft.trim();
        if (!batch || batch.phase !== 'review' || !text || this._batchBusy) return;
        const onScreen = this._selectedPage?.name ?? null;
        const adjustCount = (name: string) => this._editReview[name]?.adjust.length ?? MAX_REVIEW_ADJUST;
        const targets = batchAdjustTargets(this._batchRows(batch), adjustCount, MAX_REVIEW_ADJUST)
            .filter(name => this._batchAdjustScope === 'all' || name === onScreen);
        if (!targets.length) return;
        // A new adjustment: what the previous one said goes, and so do plans no one generated.
        for (const name of batch.pages) {
            const review = this._editReview[name];
            if (review?.adjustPlan) this._editReview = { ...this._editReview, [name]: { ...review, adjustPlan: undefined } };
            this._setBatchRow(name, { adjust: targets.includes(name) ? 'queued' : undefined, adjustReason: undefined });
        }
        this._editBatch = { ...this._editBatch!, adjustText: text, adjustStandard: undefined };
        this._batchBusy = true;
        try {
            // On several pages the adjustment may move a common value: the standard is adjusted once, first.
            let standard: IEditStandard | null | undefined;
            if (targets.length > 1) {
                standard = await this._runStandard(text, batch.standard);
                if (!standard) {
                    for (const name of targets) this._setBatchRow(name, { adjust: undefined });
                    return;
                }
                if (this._editBatch?.pages !== batch.pages) return;
                this._editBatch = { ...this._editBatch, adjustStandard: standard };
            }
            for (const name of targets) {
                if (this._editBatch?.pages !== batch.pages) return;
                const page = this._pageByName(name);
                if (!page) { this._setBatchRow(name, { adjust: 'refused', adjustReason: this.msg.editBatchNoVariant }); continue; }
                this._setBatchRow(name, { adjust: 'planning' });
                const ok = await this._planAdjust(page, text, standard);
                // The reason lives in the row, not twice on the page's own card.
                this._setBatchRow(name, ok ? { adjust: 'planned' } : { adjust: 'refused', adjustReason: this._editError[name] ?? this.msg.editNoAnswer });
                if (!ok) this._setEdit('_editError', name, undefined);
            }
        } finally {
            this._batchBusy = false;
        }
    }

    /** An adjustment of the batch, phase APPLY: the analyzed pages one by one, the page on screen last. */
    private async _onBatchAdjustGenerate() {
        const batch = this._editBatch;
        if (!batch || this._batchBusy) return;
        const ready = batchAdjustReady(this._batchRows(batch));
        if (!ready.length) return;
        for (const name of ready) this._setBatchRow(name, { adjust: 'queued' });
        this._batchBusy = true;
        try {
            for (const name of batchOrder(ready, this._selectedPage?.name ?? null)) {
                if (this._editBatch?.pages !== batch.pages) return;
                const page = this._pageByName(name);
                if (!page) continue;
                this._setBatchRow(name, { adjust: 'generating' });
                const standard = this._editReview[name]?.adjustPlan?.standard ?? null;
                const ok = await this._applyAdjust(page);
                const after = this._editReview[name]?.after.source;
                this._setBatchRow(name, ok ? { adjust: 'done', misses: after ? standardMisses(after, standard) : undefined } : { adjust: 'failed', adjustReason: this._editError[name] ?? this.msg.editNoAnswer });
                if (!ok) {
                    this._setEdit('_editError', name, undefined);
                    const review = this._editReview[name];
                    if (review?.adjustPlan) this._editReview = { ...this._editReview, [name]: { ...review, adjustPlan: undefined } };
                }
            }
            this._batchAdjustDraft = '';
            // The adjusted standard is the batch's from now on.
            if (this._editBatch?.pages === batch.pages && this._editBatch.adjustStandard) {
                this._editBatch = { ...this._editBatch, standard: this._editBatch.adjustStandard, adjustStandard: undefined };
            }
        } finally {
            this._batchBusy = false;
        }
    }

    /** The analyzed adjustment is dropped on every page: the candidates stay, the ask stays to be refined. */
    private _onBatchAdjustCancel() {
        const batch = this._editBatch;
        if (!batch || this._batchBusy) return;
        for (const name of batch.pages) {
            const review = this._editReview[name];
            if (review?.adjustPlan) this._editReview = { ...this._editReview, [name]: { ...review, adjustPlan: undefined } };
            this._setBatchRow(name, { adjust: undefined, adjustReason: undefined });
        }
        this._editBatch = { ...this._editBatch!, adjustStandard: undefined };
    }

    private _onCloseBatch() {
        const batch = this._editBatch;
        if (!batch) return;
        // Plans that never became a preview are dropped with the batch; reviews still open are not touched.
        for (const name of batch.pages) if (!this._editReview[name]) this._setEdit('_editPlan', name, undefined);
        this._editBatch = null;
    }

    /** Whether the page is in review as part of the batch on screen (its adjustment can go to the whole batch). */
    private _inBatch(page: IPageEntry): boolean {
        const batch = this._activeBatch();
        return !!batch && batch.pages.includes(page.name) && this._batchRows(batch)[page.name]?.state === 'review';
    }

    private _batchStateLabel(state: BatchRowState): string {
        return {
            planning: this.msg.editBatchPlanning, planned: this.msg.editBatchPlanned, refused: this.msg.editBatchRefused,
            waiting: this.msg.editBatchWaiting, generating: this.msg.editBatchGenerating, review: this.msg.editBatchInReview,
            failed: this.msg.editBatchFailed, unchanged: this.msg.editBatchUnchanged, applied: this.msg.editBatchApplied,
            discarded: this.msg.editBatchDiscarded, skipped: this.msg.editBatchSkipped,
        }[state];
    }

    private _batchAdjustLabel(state: BatchAdjustState): string {
        return {
            queued: this.msg.editAdjustQueued, planning: this.msg.editAdjustPlanning, planned: this.msg.editAdjustPlanned,
            refused: this.msg.editAdjustRefused, generating: this.msg.editAdjustGenerating, done: this.msg.editAdjustDone,
            failed: this.msg.editAdjustFailed,
        }[state];
    }

    /** The rules of a standard: what each is for, in the person's words, and the exact classes. */
    private _renderStandardRules(standard: IEditStandard, title: string) {
        return html`
            <div class="flex flex-col gap-1 rounded-md border border-indigo-200 dark:border-indigo-800/50 bg-white/70 dark:bg-gray-900/60 px-2 py-1.5">
                <span class="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">${title}</span>
                ${standard.rules.map(rule => html`
                    <div class="flex flex-col">
                        <span class="text-[11px] text-gray-700 dark:text-gray-200">${rule.summary}</span>
                        <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 wrap-break-word">${rule.classes}</span>
                    </div>`)}
            </div>`;
    }

    /**
     * The common standard on top of the batch list. While it is decided: deciding, then the rules with Approve /
     * Cancel and an ask to redo it (or the reason it failed and a retry). Afterwards, the rules the pages follow.
     */
    private _renderBatchStandard(batch: IEditBatch) {
        const standard = batch.standard;
        if (batch.phase !== 'standard') {
            return standard?.rules.length ? this._renderStandardRules(standard, this.msg.editStandardShort) : nothing;
        }
        const primary = 'text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
        const secondary = 'text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
        const busy = !!batch.standardBusy;
        const task = this._taskInfoByName.get('edit:standard')?.task;
        return html`
            <div class="flex flex-col gap-2">
                ${busy ? html`
                    <div class="flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" aria-hidden="true"></span>
                        <span class="text-xs text-gray-600 dark:text-gray-300">${this.msg.editStandardDeciding}</span>
                        ${task ? html`<button type="button" class="ml-auto text-[10px] text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer" @click=${() => this._openTask('edit:standard')}>${this.msg.editBatchTask}</button>` : nothing}
                    </div>` : nothing}
                ${standard?.rules.length ? html`
                    ${this._renderStandardRules(standard, this.msg.editStandardTitle.replace('{n}', String(batch.pages.length)))}
                    <span class="text-[10px] text-gray-500 dark:text-gray-400">${this.msg.editStandardHint}</span>` : nothing}
                ${batch.standardError && !busy ? html`<span class="text-[11px] text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word">${batch.standardError}</span>` : nothing}
                ${standard?.rules.length ? html`
                    <div class="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden focus-within:border-indigo-400 dark:focus-within:border-indigo-500">
                        <textarea rows="2"
                            class="block w-full resize-y border-0 bg-transparent px-2.5 py-2 text-xs leading-relaxed text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
                            placeholder=${this.msg.editStandardAdjustPlaceholder}
                            ?disabled=${busy}
                            .value=${this._standardDraft}
                            @input=${(e: Event) => { this._standardDraft = (e.target as HTMLTextAreaElement).value; }}
                        ></textarea>
                        <div class="flex items-center px-2 py-1.5 border-t border-gray-200 dark:border-gray-800">
                            <button type="button" class="ml-auto text-xs px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                ?disabled=${busy || !this._standardDraft.trim()}
                                @click=${() => this._onStandardAdjust()}>${this.msg.editStandardAdjustSend}</button>
                        </div>
                    </div>` : nothing}
                <div class="flex items-center gap-2 flex-wrap">
                    ${standard?.rules.length ? html`<button type="button" class=${primary} ?disabled=${busy} @click=${() => this._onApproveStandard()}>${this.msg.editStandardApprove}</button>`
                        : batch.standardError && !busy ? html`<button type="button" class=${primary} @click=${() => this._onStandardAdjust()}>${this.msg.editStandardRetry}</button>` : nothing}
                    <button type="button" class=${secondary} ?disabled=${busy} @click=${() => this._onCloseBatch()}>${this.msg.editPlanCancel}</button>
                </div>
            </div>`;
    }

    /**
     * The batch list: the ONLY place a request of several pages is decided. Each row says where its page stands
     * (the preview, then an adjustment: analyzing, analyzed with its plan, generating, done or why not); below, one
     * adjustment box and one decision (apply the ticked, discard the rest — or discard all). The page's own card only
     * shows the page.
     */
    private _renderBatch(page: IPageEntry, batch: IEditBatch) {
        const rows = this._batchRows(batch);
        const busy = this._batchBusy;
        const onScreen = this._selectedPage?.name ?? null;
        const counts = batchCounts(rows);
        const open = batchOpen(rows);
        const ready = batchAdjustReady(rows);
        const adjusting = batchAdjusting(rows);
        const primary = 'text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
        const secondary = 'text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
        const dot: Record<BatchRowState, string> = {
            planning: 'bg-gray-400 animate-pulse', planned: 'bg-indigo-500', refused: 'bg-gray-300 dark:bg-gray-600',
            waiting: 'bg-gray-400', generating: 'bg-amber-400 animate-pulse', review: 'bg-amber-500', failed: 'bg-red-500',
            unchanged: 'bg-gray-300 dark:bg-gray-600', applied: 'bg-emerald-500', discarded: 'bg-gray-400', skipped: 'bg-gray-300 dark:bg-gray-600',
        };
        const adjustDot: Record<BatchAdjustState, string> = {
            queued: 'bg-gray-400', planning: 'bg-indigo-400 animate-pulse', planned: 'bg-indigo-500', refused: 'bg-gray-400',
            generating: 'bg-indigo-400 animate-pulse', done: 'bg-amber-500', failed: 'bg-red-500',
        };
        const ticked = batch.phase === 'confirm'
            ? batch.pages.filter(n => rows[n].state === 'planned' && rows[n].include).length
            : batch.pages.filter(n => rows[n].state === 'review' && rows[n].include).length;
        const inReview = counts.review ?? 0;
        const row = (name: string) => {
            const r = rows[name];
            const tickable = (batch.phase === 'confirm' && r.state === 'planned') || (batch.phase === 'review' && r.state === 'review');
            const target = this._pageByName(name);
            const index = target ? this._pages.indexOf(target) : -1;
            const error = r.state === 'review' ? this._editError[name] : undefined;
            const adjust = r.state === 'review' ? r.adjust : undefined;
            const adjustPlan = adjust === 'planned' ? this._editReview[name]?.adjustPlan : undefined;
            return html`
                <li class="flex flex-col gap-1 rounded-md px-2 py-1.5 ${name === onScreen ? 'bg-white dark:bg-gray-800/70 ring-1 ring-indigo-200 dark:ring-indigo-800/50' : 'bg-gray-50 dark:bg-gray-900/50'}">
                    <div class="flex items-center gap-2 min-w-0">
                        ${tickable ? html`
                            <input type="checkbox" class="cursor-pointer disabled:cursor-not-allowed" .checked=${r.include} ?disabled=${busy || adjusting}
                                aria-label=${name}
                                @change=${(e: Event) => this._setBatchRow(name, { include: (e.target as HTMLInputElement).checked })}>`
                            : html`<span class="w-3.5 shrink-0"></span>`}
                        <span class="h-2 w-2 shrink-0 rounded-full ${adjust ? adjustDot[adjust] : dot[r.state]}" aria-hidden="true"></span>
                        <button type="button" class="min-w-0 text-xs font-medium text-gray-700 dark:text-gray-200 hover:underline cursor-pointer truncate disabled:cursor-default disabled:no-underline"
                            ?disabled=${index < 0 || name === onScreen}
                            title=${this.msg.editBatchOpenHint}
                            @click=${() => this._dispatchSelect(index + 1)}>${name}</button>
                        <span class="text-[10px] text-gray-500 dark:text-gray-400 shrink-0">${adjust ? this._batchAdjustLabel(adjust) : this._batchStateLabel(r.state)}</span>
                        ${this._taskInfoByName.get(`edit:${name}`)?.task ? html`
                            <button type="button" class="ml-auto shrink-0 text-[10px] text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer" @click=${() => this._openTask(`edit:${name}`)}>${this.msg.editBatchTask}</button>` : nothing}
                    </div>
                    ${batch.phase === 'confirm' && r.state === 'planned' ? html`
                        <ul class="flex flex-col gap-0.5 pl-6">
                            ${(batch.plans[name] ?? []).map(op => html`
                                <li class="flex items-baseline gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                                    <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 shrink-0">${op.organism ?? this.msg.editPageShell}</span>
                                    <span class="leading-snug">${op.summary}</span>
                                </li>`)}
                        </ul>` : nothing}
                    ${adjustPlan ? html`
                        <ul class="flex flex-col gap-0.5 pl-6">
                            ${adjustPlan.operations.map(op => html`
                                <li class="flex items-baseline gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                                    <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 shrink-0">${op.organism ?? this.msg.editPageShell}</span>
                                    <span class="leading-snug">${op.summary}</span>
                                </li>`)}
                        </ul>` : nothing}
                    ${r.reason && (r.state === 'refused' || r.state === 'failed') ? html`<span class="pl-6 text-[11px] text-gray-500 dark:text-gray-400 whitespace-pre-wrap wrap-break-word">${r.reason}</span>` : nothing}
                    ${adjust && r.adjustReason && (adjust === 'refused' || adjust === 'failed') ? html`<span class="pl-6 text-[11px] ${adjust === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'} whitespace-pre-wrap wrap-break-word">${r.adjustReason}</span>` : nothing}
                    ${r.misses?.length && r.state === 'review' ? html`<span class="pl-6 text-[11px] text-amber-700 dark:text-amber-400">${this.msg.editStandardMisses.replace('{list}', r.misses.join('; '))}</span>` : nothing}
                    ${error ? html`<span class="pl-6 text-[11px] text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word">${error}</span>` : nothing}
                </li>`;
        };
        const adjustTargets = batchAdjustTargets(rows, n => this._editReview[n]?.adjust.length ?? MAX_REVIEW_ADJUST, MAX_REVIEW_ADJUST);
        const scopeCount = this._batchAdjustScope === 'all' ? adjustTargets.length : (onScreen && adjustTargets.includes(onScreen) ? 1 : 0);
        const draft = this._batchAdjustDraft;
        // The adjustment box: write → analyze (rows say how it goes) → the plans in the rows → generate or cancel.
        const adjustBox = ready.length && !busy ? html`
            <div class="flex flex-col gap-1.5 border-t border-amber-200 dark:border-amber-800/40 pt-2">
                <span class="text-[11px] italic text-gray-500 dark:text-gray-400">${this.msg.editBatchAdjustQuote.replace('{text}', batch.adjustText ?? '')}</span>
                ${batch.adjustStandard?.rules.length ? this._renderStandardRules(batch.adjustStandard, this.msg.editStandardAdjusted) : nothing}
                <div class="flex items-center gap-2 flex-wrap">
                    <button type="button" class=${primary} @click=${() => this._onBatchAdjustGenerate()}>${this.msg.editBatchAdjustGenerate.replace('{n}', String(ready.length))}</button>
                    <button type="button" class=${secondary} @click=${() => this._onBatchAdjustCancel()}>${this.msg.reviewAdjustCancel}</button>
                </div>
            </div>` : html`
            <div class="flex flex-col gap-1.5 border-t border-amber-200 dark:border-amber-800/40 pt-2">
                <span class="text-[11px] font-medium text-gray-600 dark:text-gray-300">${this.msg.reviewAdjust}</span>
                <div class="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden focus-within:border-indigo-400 dark:focus-within:border-indigo-500">
                    <textarea rows="2"
                        class="block w-full resize-y border-0 bg-transparent px-2.5 py-2 text-xs leading-relaxed text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
                        placeholder=${this.msg.reviewAdjustPlaceholder}
                        ?disabled=${busy}
                        .value=${draft}
                        @input=${(e: Event) => { this._batchAdjustDraft = (e.target as HTMLTextAreaElement).value; }}
                    ></textarea>
                    <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-2 py-1.5 border-t border-gray-200 dark:border-gray-800">
                        <select class="min-w-0 shrink max-w-[12rem] truncate text-[11px] pl-2 pr-1 py-0.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:[color-scheme:dark] text-gray-600 dark:text-gray-300 cursor-pointer disabled:cursor-not-allowed"
                            aria-label=${this.msg.editScope}
                            ?disabled=${busy}
                            @change=${(e: Event) => { this._batchAdjustScope = (e.target as HTMLSelectElement).value === 'open' ? 'open' : 'all'; }}>
                            <option class="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200" value="all" ?selected=${this._batchAdjustScope === 'all'}>${this.msg.editBatchAdjustAll} · ${adjustTargets.length}</option>
                            <option class="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200" value="open" ?selected=${this._batchAdjustScope === 'open'}>${this.msg.editBatchAdjustOne}</option>
                        </select>
                        <button type="button" class="ml-auto shrink-0 text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            ?disabled=${busy || !draft.trim() || !scopeCount}
                            @click=${() => this._onBatchAdjustPlan()}>${busy && adjusting ? this.msg.reviewAdjustPlanning : this.msg.reviewAdjustSend}</button>
                    </div>
                </div>
            </div>`;
        return html`
            <div class="rounded-lg border ${batch.phase === 'review' || batch.phase === 'generate' ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-900/10' : 'border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/10'} px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">${this.msg.editBatchTitle.replace('{n}', String(batch.pages.length))}</span>
                <span class="text-[11px] italic text-gray-500 dark:text-gray-400">“${batch.request}”</span>
                ${this._renderBatchStandard(batch)}
                <ul class="flex flex-col gap-1">${batch.pages.map(row)}</ul>
                ${batch.phase === 'review' && inReview ? html`<span class="text-[10px] text-gray-500 dark:text-gray-400">${this.msg.editBatchOpenHint} ${this.msg.editBatchTickHint}</span>` : nothing}
                ${batch.phase === 'confirm' ? html`
                    <span class="text-[10px] text-gray-500 dark:text-gray-400">${this.msg.editBatchCost.replace('{n}', String(ticked))}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <button type="button" class=${primary} ?disabled=${busy || !ticked} @click=${() => this._onGenerateBatch()}>${this.msg.editBatchGenerate.replace('{n}', String(ticked))}</button>
                        <button type="button" class=${secondary} ?disabled=${busy} @click=${() => this._onCloseBatch()}>${this.msg.editPlanCancel}</button>
                    </div>` : nothing}
                ${batch.phase === 'plan' ? html`
                    <button type="button" class="self-start ${secondary}" @click=${() => this._onCloseBatch()}>${this.msg.editPlanCancel}</button>` : nothing}
                ${batch.phase === 'review' && inReview ? html`
                    ${adjustBox}
                    ${ready.length && !busy ? nothing : html`
                        <div class="flex items-center gap-2 flex-wrap border-t border-amber-200 dark:border-amber-800/40 pt-2">
                            <button type="button" class=${primary} ?disabled=${busy} @click=${() => this._onBatchDecide('ticked')}>${this.msg.editBatchApplyTicked.replace('{n}', String(ticked))}</button>
                            <button type="button" class=${secondary} ?disabled=${busy} @click=${() => this._onBatchDecide('discardAll')}>${this.msg.editBatchDiscardAll}</button>
                        </div>
                        <span class="text-[10px] text-amber-700 dark:text-amber-400">${this.msg.editBatchUnsaved.replace('{n}', String(inReview))}</span>`}` : nothing}
                ${batch.phase === 'review' && counts.failed ? html`
                    <button type="button" class="self-start text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50" ?disabled=${busy} @click=${() => this._onRetryBatch()}>${this.msg.editBatchRetry}</button>` : nothing}
                ${batch.phase === 'review' && !open ? html`
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-600 dark:text-gray-300">${this.msg.editBatchDone
                            .replace('{applied}', String(counts.applied ?? 0)).replace('{discarded}', String(counts.discarded ?? 0))
                            .replace('{other}', String((counts.failed ?? 0) + (counts.unchanged ?? 0) + (counts.refused ?? 0) + (counts.skipped ?? 0)))}</span>
                        <button type="button" class="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" @click=${() => this._onCloseBatch()}>${this.msg.editBatchClose}</button>
                    </div>` : nothing}
            </div>`;
    }

    // Cancel: back to the request, kept so it can be refined.
    private _onCancelPlan(page: IPageEntry) {
        this._setEdit('_editPlan', page.name, undefined);
    }

    // The "States" tab: simulates the situations of the page on screen (pluginPageStates, loaded on first use).
    private _renderPageStates() {
        void import('/_102020_/l2/aura/plugins/pluginPageStates.js');
        return html`<aura--plugins--page-states-102020></aura--plugins--page-states-102020>`;
    }

    // The page tree (pageTreePanel): the "Structure" section, collapsible, on top of the Visual tab so
    // finding an element and editing it never needs a tab switch. Like the docked picker it stays
    // mounted while another tab is open (the tab panels only hide), so the editor never loses it.
    // Loaded lazily, for the same reason as the picker.
    private _renderPageTree() {
        void import('/_102020_/l2/aura/studio/pageTreePanel.js');
        return html`<aura--studio--page-tree-102020 data-tour="genome-tree"></aura--studio--page-tree-102020>`;
    }

    // The class picker DOCKED here (pageClassPickerPanel) — a second take on the floating one, kept
    // side by side while we compare. While it is connected the studio editor feeds it AND the floating
    // panel, so both are active on the same selection. Loaded lazily: it pulls the studio's editing core, which this plugin otherwise
    // never needs.
    private _renderClassPicker() {
        void import('/_102020_/l2/aura/studio/pageClassPickerPanel.js');
        return html`
            <div class="border-t border-gray-200 dark:border-gray-800 pt-3" data-tour="genome-inspect">
                <aura--studio--page-class-picker-102020></aura--studio--page-class-picker-102020>
            </div>
        `;
    }

    // Page listed from the source (page11) but absent in the current layout/DS
    // variation: explain why the preview shows nothing and offer to generate it.
    private _renderMissingPanel(page: IPageEntry) {
        const task = getTask(`regenerate:${page.name}`);
        const running = task?.status === 'running';
        return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">${this.msg.missingVariation}</span>
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${running}
                    @click=${() => this._onRegenerate(page)}
                >${running ? this.msg.regenerating : this.msg.generatePage}</button>
                ${task && task.status === 'error' ? html`
                    <span class="text-xs text-red-500 dark:text-red-400 truncate">${task.message ?? 'error'}</span>
                ` : nothing}
            </div>
        `;
    }

    // ─── DS-version panel (review / stale) ────────────────────────────

    private _renderDsVersionPanel(page: IPageEntry) {
        const check = this._checkByName[page.name];
        if (!check) return nothing;
        if (check.status === 'review') return this._renderReviewPanel(page, check);
        if (check.status === 'stale') return this._renderStalePanel(page, check);
        return nothing;
    }

    private _renderReviewPanel(page: IPageEntry, check: PageDsCheck) {
        return html`
            <div class="rounded-lg border border-sky-200 dark:border-sky-800/40 bg-sky-50 dark:bg-sky-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-sky-700 dark:text-sky-300">${this.msg.reviewIntro}</span>
                <div class="flex flex-col gap-1.5">
                    ${check.changed.map(m => html`
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-700 dark:text-gray-300">${this._humanizeGroup(m.group)}</span>
                            <span class="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">${m.tag}</span>
                        </div>
                    `)}
                </div>
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${this._busyPage === page.name}
                    @click=${() => this._onMarkReviewed(page)}
                >${this._busyPage === page.name ? this.msg.saving : this.msg.markReviewed}</button>
            </div>
        `;
    }

    private _renderStalePanel(page: IPageEntry, check: PageDsCheck) {
        const reason = {
            'rules': this.msg.staleReasonRules,
            'molecule-removed': this.msg.staleReasonRemoved,
            'molecule-incompatible': this.msg.staleReasonIncompatible,
            'no-stamp': this.msg.staleReasonNoStamp,
        }[check.staleReason ?? 'no-stamp'];
        const mol = check.staleMolecule;
        const task = getTask(`regenerate:${page.name}`);
        const running = task?.status === 'running';
        return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">${this.msg.staleIntro}</span>
                <span class="text-xs text-amber-600 dark:text-amber-400">${reason}</span>
                ${mol ? html`<span class="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">${mol.tag}</span>` : nothing}
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${running}
                    @click=${() => this._onRegenerate(page)}
                >${running ? this.msg.regenerating : this.msg.regeneratePage}</button>
                ${task ? html`
                    <div class="flex items-center gap-2 text-xs">
                        ${task.status === 'running' ? html`<span class="text-indigo-500 dark:text-indigo-400 italic">${this.msg.regenerating}</span>` : nothing}
                        ${task.status === 'done' ? html`<span class="text-emerald-600 dark:text-emerald-400">✓ ${this.msg.regenerated}</span>` : nothing}
                        ${task.status === 'error' ? html`<span class="text-red-500 dark:text-red-400 truncate">${task.message ?? 'error'}</span>` : nothing}
                        ${this._taskInfoByName.get(page.name)?.task ? html`
                            <button class="ml-auto text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                                @click=${() => this._openTask(page.name)}>${this.msg.followTask}</button>
                        ` : nothing}
                    </div>
                ` : nothing}
            </div>
        `;
    }

    private _humanizeGroup(group: string): string {
        return group.replace(/^group/, '').replace(/([A-Z])/g, ' $1').trim() || group;
    }

    private async _onMarkReviewed(page: IPageEntry) {
        const module = this._modulePath;
        const layout = getAuraState().actualLayout ?? 1;
        // The page file is the UX folder's (page{UX}1): its stamp's UI is the folder's, not the knob's.
        const ds = PAGE_FOLDER_UI;
        if (!module) return;
        this._busyPage = page.name;
        this.requestUpdate();
        await restampPage(
            { project: page.file.project, folder: page.file.folder ?? '', shortName: page.file.shortName },
            module,
            layout,
            ds,
            new Date().toISOString(),
        );
        this._busyPage = null;
        await this._loadPageStatus();
    }

    // Regenerate this single page. UX N (2..9): agentGenomeUx writes page{N}1/<page>.defs.ts
    // on both devices and chains agentMaterializeL2 --genome page{N}1 itself (force: even when its receipt is fresh).
    // UX 1 (page11) is agentDefsL2's: only its .ts is regenerated (agentMaterializeL2 --genome page11 --force), unless
    // the page has a UX 1 template choice that differs from page11: then agentGenomeUx base
    // mode (layout 1) rewrites page11 with it and chains agentMaterializeL2 --genome page11.
    private async _onRegenerate(page: IPageEntry) {
        const module = this._moduleName ?? this._modulePath;
        const layout = Number(getAuraState().actualLayout ?? 1);
        if (!module) return;

        const taskKey = `regenerate:${page.name}`;
        if (getTask(taskKey)?.status === 'running') return;
        // A preview is waiting for Apply / Discard: the regeneration would rewrite it unseen.
        if (this._editReview[page.name]) return;

        // The agents match on page ids (the defs shortName); page.name may be a pageId/path, so send the file shortName.
        const pageShort = page.file?.shortName ?? page.name;
        const genomeUx = Number.isInteger(layout) && layout >= 2 && layout <= 9;
        // Pause the preview while the agent rewrites the defs (avoids repaint thrash); restore after.
        const prevPause = getState('preview.pausePreview');
        setTask(taskKey, { status: 'running', startedAt: Date.now() });
        const trackTask = (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => {
            this._taskInfoByName.set(page.name, data);
            this.requestUpdate(); // surface "Follow task" as soon as the task exists
        };
        // The page timeline: the regeneration rewrites the page, so the page before it must be a version.
        const versioned = versionedPage(page.file ? { project: Number(page.file.project), folder: page.file.folder, shortName: page.file.shortName } : null);
        try {
            await ensurePageVersion(versioned);
            let result: { failure?: string };
            const project = Number(page.file?.project ?? getAuraState().actualProject ?? 0);
            const baseChoice = !genomeUx && project ? await readGenomeUxBaseChoice(project, module, pageShort) : null;
            if (genomeUx) {
                setState('preview.pausePreview', true);
                const entry = { module, layout, pages: [pageShort], force: true, materialize: true };
                result = await this._executeAgent('agentGenomeUx', JSON.stringify(entry), trackTask);
            } else if (baseChoice) {
                // No force: the choice alone makes the page pending; without it the base mode is a no-op.
                setState('preview.pausePreview', true);
                const entry = { module, layout: 1, pages: [pageShort], materialize: true };
                result = await this._executeAgent('agentGenomeUx', JSON.stringify(entry), trackTask);
            } else {
                result = await this._executeAgent('agentMaterializeL2', `${module} --page ${pageShort} --genome page11 --force`, trackTask);
            }
            if (result.failure) throw new Error(result.failure);
            await recordPageVersion(versioned, 'regen', '');
            setTask(taskKey, { ...getTask(taskKey)!, status: 'done' });
        } catch (e: any) {
            setTask(taskKey, { ...getTask(taskKey)!, status: 'error', message: e?.message });
        } finally {
            setState('preview.pausePreview', prevPause ?? false);
            await this._loadPages(); // re-scan: refreshes existence in the variation + DS status
        }
    }

    private async _executeAgent(
        agentName: string,
        prompt: string,
        onTaskCreated?: (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => void,
    ): Promise<{ taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message; failure?: string; plan?: IEditOperation[]; notes?: IEditNotes; standard?: IEditStandard }> {
        // Thread host: selectPage lives in serviceGenome since the knob move (D4).
        const fullName = '_102020_/l2/serviceGenome';
        let threadPromise = this._threadCache.get(fullName);
        if (!threadPromise) {
            threadPromise = (async () => {
                let thread = await getThreadByName(fullName);
                if (!thread) thread = await createThread(fullName, [], 'company');
                return thread;
            })();
            this._threadCache.set(fullName, threadPromise);
        }
        const thread = await threadPromise;
        const userId = getUserId();
        const threadId = thread?.threadId;
        if (!userId || !threadId) return { taskId: '' };

        const moduleAgent = await loadAgent(agentName);
        if (!moduleAgent) throw new Error('Invalid agent');
        const context = getTemporaryContext(threadId, userId, prompt);

        let taskId = '';
        let task: mls.msg.TaskData | undefined;
        let message: mls.msg.Message | undefined;
        // The stream drives the WHOLE flow (hooks + intents), not just task creation. Capture the
        // last step failure (mkFail → update-status 'failed' + traceMsg) or a stream error, so callers
        // can surface it instead of silently swallowing it.
        let failure: string | undefined;
        // agentEditPage answers through completed steps: `PLAN:<operations json>` (plan phase) and
        // `NOTES:<json>` (apply phase).
        let plan: IEditOperation[] | undefined;
        let notes: IEditNotes | undefined;
        let standard: IEditStandard | undefined;
        for await (const event of executeBeforePromptStream(moduleAgent, context)) {
            if (event.type === 'task-created') {
                taskId = event.taskId; task = event.task; message = event.message;
                onTaskCreated?.({ taskId, task, message });
            } else if (event.type === 'hook-done') {
                for (const intent of event.intents ?? []) {
                    const i = intent as any;
                    if (i?.type !== 'update-status') continue;
                    if (i.status === 'failed' && i.traceMsg) failure = String(i.traceMsg);
                    else if (i.status === 'completed' && typeof i.traceMsg === 'string') {
                        try {
                            if (i.traceMsg.startsWith('PLAN:')) plan = JSON.parse(i.traceMsg.slice(5));
                            else if (i.traceMsg.startsWith('NOTES:')) notes = JSON.parse(i.traceMsg.slice(6));
                            else if (i.traceMsg.startsWith('STANDARD:')) standard = JSON.parse(i.traceMsg.slice(9));
                        } catch { /* not ours */ }
                    }
                }
            } else if (event.type === 'error') {
                failure = String(event.error);
            }
        }
        return { taskId, task, message, failure, plan, notes, standard };
    }

    private async _openTask(pageName: string) {
        const info = this._taskInfoByName.get(pageName);
        if (!info?.task) return;
        await import('/_102025_/l2/collabMessagesTaskInfo.js');
        const el = document.createElement('collab-messages-task-info-102025');
        el.setAttribute('messageId', info.message?.createAt ?? '');
        if (info.task.PK) el.setAttribute('taskId', info.task.PK);
        (el as any)['task'] = info.task;
        (el as any)['message'] = info.message;
        openElementInServiceDetails(el);
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const filtered = this._pages
            .map((p, i) => ({ p, selectValue: i + 1 }))
            .filter(({ p }) => !q || p.name.toLowerCase().includes(q));
        const max = this._pages.length + 1;
        const activePage = getAuraState().actualPage;

        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg.allTitle}
                    .desc=${this.msg.allDesc}
                    .value=${0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>

                ${this._activeDevice ? html`
                    <div class="flex items-center gap-1.5 px-1">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">${this._activeDevice}</span>
                    </div>
                ` : nothing}

                <button
                    class="
                        self-end text-sm px-2.5 py-1 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors whitespace-nowrap cursor-pointer
                    "
                    @click=${() => this._dispatchSelect(max)}
                >+ ${this.msg.createNew}</button>

                <input
                    type="text"
                    .value=${this._search}
                    placeholder=${this.msg.searchPlaceholder}
                    class="
                        w-full text-sm px-2.5 py-1.5 rounded-md
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900
                        text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}
                />

                ${this._pages.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noPages}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ p, selectValue }) => {
                                    const isActive = !!activePage
                                        && p.file.shortName === activePage.shortName
                                        && p.file.project === activePage.project;
                                    return this._renderPageCard(p, selectValue, isActive);
                                })}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderCustom() {
        const max = this._pages.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg.customTitle}
                    .desc=${this.msg.customDesc}
                    .value=${max}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.inDevelopment}</span>
                </div>
            </div>
        `;
    }

    private _renderNotCreated() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader()}

                ${this._activeDevice ? html`
                    <div class="flex items-center gap-1.5 px-1">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">${this._activeDevice}</span>
                    </div>
                ` : nothing}

                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.notCreated}</span>
                </div>

                <button
                    class="
                        self-start text-sm px-3 py-1.5 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors whitespace-nowrap cursor-pointer
                    "
                    @click=${() => this._dispatchGenerate()}
                >${this.msg.generatePages}</button>
            </div>
        `;
    }

    // ─── Shared helpers ───────────────────────────────────────────────

    private _renderPageCard(page: IPageEntry, selectValue: number, isActive = false) {
        return html`
            <div
                class="
                    rounded-lg border px-3 py-2.5 flex items-center gap-2
                    cursor-pointer transition-colors
                    ${isActive
                        ? 'border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/70'}
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                ${isActive ? html`<div class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0"></div>` : nothing}
                <div class="flex-1 flex items-baseline gap-1 min-w-0">
                    <span class="text-[10px] text-gray-400 dark:text-gray-600 shrink-0">${this._moduleName}/</span>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">${page.name}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    ${!page.exists ? html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            ${this.msg.notGenerated}
                        </span>` : nothing}
                    ${this._renderStatusBadge(page.name)}
                    ${page.devices.map(d => html`
                        <span class="text-[10px] font-medium px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            ${DEVICE_LABELS[d]?.replace('Web ', '') ?? d}
                        </span>
                    `)}
                </div>
            </div>
        `;
    }

    private _dispatchSelect(value: number, auto = false) {
        const entry = value > 0 && value <= this._pages.length ? this._pages[value - 1] : null;
        this.dispatchEvent(new CustomEvent('select-page', {
            detail: { value, file: entry?.file ?? null, auto },
            bubbles: true,
            composed: true,
        }));
    }

    private _dispatchGenerate() {
        this.dispatchEvent(new CustomEvent('generate-pages', {
            detail: {
                module: this._modulePath,
                device: getAuraState().actualDevice,
                layout: getAuraState().actualLayout,
            },
            bubbles: true,
            composed: true,
        }));
    }
}
