/// <mls fileReference="_102020_/l2/aura/studio/studioTours.ts" enhancement="_blank" />
// The Studio's guided tours, as data (studioTourCore). Each step points at an element by a `data-tour` mark the
// panels carry, so the tour follows the layout instead of positions; the words live in studioMessages.

import type { TourDef } from '/_102020_/l2/aura/studio/studioTourCore.js';

/** The Genome (l3): choose the page, select, inspect, the tree, the AI, the versions. */
export const GENOME_TOUR: TourDef = {
  id: 'genome',
  version: 2,
  welcome: {
    kickerKey: 'tour.genome.kicker',
    titleKey: 'tour.genome.welcomeTitle',
    lineKeys: ['tour.genome.welcome1', 'tour.genome.welcome2', 'tour.genome.welcome3'],
  },
  steps: [
    { anchor: '[data-tour="genome-pages"]', titleKey: 'tour.genome.pagesTitle', textKey: 'tour.genome.pagesText' },
    {
      // The app region of the client shell (102033) is the page itself; the mark comes first when a panel sets it.
      anchor: '[data-tour="genome-app"], main[data-region="content"]',
      titleKey: 'tour.genome.appTitle', textKey: 'tour.genome.appText', tryKey: 'tour.genome.appTry', advanceOn: 'selection',
    },
    { anchor: '[data-tour="genome-inspect"]', titleKey: 'tour.genome.inspectTitle', textKey: 'tour.genome.inspectText', openTab: 'visual' },
    { anchor: '[data-tour="genome-tree"]', titleKey: 'tour.genome.treeTitle', textKey: 'tour.genome.treeText', openTab: 'visual' },
    { anchor: '[data-tour="genome-tab-ai"]', titleKey: 'tour.genome.aiTitle', textKey: 'tour.genome.aiText', openTab: 'ai' },
    // The Page tab, one step per block (a block that is not on screen — e.g. the switches outside the client app's
    // studio mode — is skipped).
    { anchor: '[data-tour="genome-page-info"]', titleKey: 'tour.genome.pageInfoTitle', textKey: 'tour.genome.pageInfoText', openTab: 'page' },
    { anchor: '[data-tour="genome-device"]', titleKey: 'tour.genome.deviceTitle', textKey: 'tour.genome.deviceText', openTab: 'page' },
    { anchor: '[data-tour="genome-theme"]', titleKey: 'tour.genome.themeTitle', textKey: 'tour.genome.themeText', openTab: 'page' },
    { anchor: '[data-tour="genome-advanced"]', titleKey: 'tour.genome.advancedTitle', textKey: 'tour.genome.advancedText', openTab: 'page' },
    { anchor: '[data-tour="genome-versions"]', titleKey: 'tour.genome.versionsTitle', textKey: 'tour.genome.versionsText', openTab: 'page' },
  ],
};

/**
 * The Design System (l5). One tour for the three views of the panel: the list (all design systems), one design
 * system, and a new one — the steps of the view not on screen are skipped.
 */
export const DESIGN_SYSTEM_TOUR: TourDef = {
  id: 'designSystem',
  version: 1,
  welcome: {
    kickerKey: 'tour.ds.kicker',
    titleKey: 'tour.ds.welcomeTitle',
    lineKeys: ['tour.ds.welcome1', 'tour.ds.welcome2', 'tour.ds.welcome3'],
  },
  steps: [
    { anchor: '[data-tour="ds-nav"]', titleKey: 'tour.ds.navTitle', textKey: 'tour.ds.navText' },
    { anchor: '[data-tour="ds-list"]', titleKey: 'tour.ds.listTitle', textKey: 'tour.ds.listText' },
    { anchor: '[data-tour="ds-add"]', titleKey: 'tour.ds.addTitle', textKey: 'tour.ds.addText' },
    { anchor: '[data-tour="ds-palette"]', titleKey: 'tour.ds.paletteTitle', textKey: 'tour.ds.paletteText' },
    { anchor: '[data-tour="ds-ai"]', titleKey: 'tour.ds.aiTitle', textKey: 'tour.ds.aiText' },
    { anchor: '[data-tour="ds-scope"]', titleKey: 'tour.ds.scopeTitle', textKey: 'tour.ds.scopeText' },
    { anchor: '[data-tour="ds-filter"]', titleKey: 'tour.ds.filterTitle', textKey: 'tour.ds.filterText' },
    { anchor: '[data-tour="ds-inspect"]', titleKey: 'tour.ds.inspectTitle', textKey: 'tour.ds.inspectText' },
    { anchor: '[data-tour="ds-colors"]', titleKey: 'tour.ds.colorsTitle', textKey: 'tour.ds.colorsText' },
    { anchor: '[data-tour="ds-typography"]', titleKey: 'tour.ds.typographyTitle', textKey: 'tour.ds.typographyText' },
    { anchor: '[data-tour="ds-global"]', titleKey: 'tour.ds.globalTitle', textKey: 'tour.ds.globalText' },
    { anchor: '[data-tour="ds-components"]', titleKey: 'tour.ds.componentsTitle', textKey: 'tour.ds.componentsText' },
    { anchor: '[data-tour="ds-save"]', titleKey: 'tour.ds.saveTitle', textKey: 'tour.ds.saveText' },
  ],
};

/** Assets (l5), the Media panel: the sections, uploading, finding, the files. */
export const ASSETS_TOUR: TourDef = {
  id: 'assets',
  version: 1,
  welcome: {
    kickerKey: 'tour.assets.kicker',
    titleKey: 'tour.assets.welcomeTitle',
    lineKeys: ['tour.assets.welcome1', 'tour.assets.welcome2', 'tour.assets.welcome3'],
  },
  steps: [
    { anchor: '[data-tour="assets-nav"]', titleKey: 'tour.assets.navTitle', textKey: 'tour.assets.navText' },
    { anchor: '[data-tour="assets-add"]', titleKey: 'tour.assets.addTitle', textKey: 'tour.assets.addText' },
    { anchor: '[data-tour="assets-toolbar"]', titleKey: 'tour.assets.toolbarTitle', textKey: 'tour.assets.toolbarText' },
    { anchor: '[data-tour="assets-categories"]', titleKey: 'tour.assets.categoriesTitle', textKey: 'tour.assets.categoriesText' },
    { anchor: '[data-tour="assets-files"]', titleKey: 'tour.assets.filesTitle', textKey: 'tour.assets.filesText' },
  ],
};

/** The Header knob (l5): the headers of the app, the default one, and the way into the editor. */
export const HEADER_TOUR: TourDef = {
  id: 'header',
  version: 1,
  welcome: {
    kickerKey: 'tour.header.kicker',
    titleKey: 'tour.header.welcomeTitle',
    lineKeys: ['tour.header.welcome1', 'tour.header.welcome2', 'tour.header.welcome3'],
  },
  steps: [
    { anchor: '[data-tour="header-nav"]', titleKey: 'tour.header.navTitle', textKey: 'tour.header.navText' },
    { anchor: '[data-tour="header-list"]', titleKey: 'tour.header.listTitle', textKey: 'tour.header.listText' },
    { anchor: '[data-tour="header-add"]', titleKey: 'tour.header.addTitle', textKey: 'tour.header.addText' },
    { anchor: '[data-tour="header-name"]', titleKey: 'tour.header.nameTitle', textKey: 'tour.header.nameText' },
    { anchor: '[data-tour="header-band"]', titleKey: 'tour.header.bandTitle', textKey: 'tour.header.bandText' },
    { anchor: '[data-tour="header-default"]', titleKey: 'tour.header.defaultTitle', textKey: 'tour.header.defaultText' },
    // Opening the editor hands the tour over to the editor's own (continueTour in pluginHeaderEditor).
    { anchor: '[data-tour="header-edit"]', titleKey: 'tour.header.editTitle', textKey: 'tour.header.editText', tryKey: 'tour.header.editTry' },
  ],
};

/** The header editor, in the details panel on the right: applied, preview as, brand, generate, the draft. */
export const HEADER_EDITOR_TOUR: TourDef = {
  id: 'headerEditor',
  version: 1,
  welcome: {
    kickerKey: 'tour.headerEditor.kicker',
    titleKey: 'tour.headerEditor.welcomeTitle',
    lineKeys: ['tour.headerEditor.welcome1', 'tour.headerEditor.welcome2', 'tour.headerEditor.welcome3'],
  },
  steps: [
    { anchor: '[data-tour="header-editor-applied"]', titleKey: 'tour.headerEditor.appliedTitle', textKey: 'tour.headerEditor.appliedText' },
    { anchor: '[data-tour="header-editor-preview-as"]', titleKey: 'tour.headerEditor.previewAsTitle', textKey: 'tour.headerEditor.previewAsText' },
    { anchor: '[data-tour="header-editor-brand"]', titleKey: 'tour.headerEditor.brandTitle', textKey: 'tour.headerEditor.brandText' },
    { anchor: '[data-tour="header-editor-request"]', titleKey: 'tour.headerEditor.requestTitle', textKey: 'tour.headerEditor.requestText' },
    { anchor: '[data-tour="header-editor-bar"]', titleKey: 'tour.headerEditor.barTitle', textKey: 'tour.headerEditor.barText' },
  ],
};
