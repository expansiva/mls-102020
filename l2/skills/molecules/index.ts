/// <mls fileReference="_102020_/l2/skills/molecules/index.ts" enhancement="_blank"/>

export const skills = [
    // Category 1: Data Entry & Editing
    {
        name: 'groupSelectOne',
        description: 'Allows the user to select exactly one option from a list of mutually exclusive choices. Ideal for scenarios where a single, clear decision is required. Implementations include dropdown, radio group, segmented control, knob, and list picker.',
        skillReference: '_102020_/l2/skills/molecules/groupSelectOne.ts'
    },
    {
        name: 'groupSelectMany',
        description: 'Allows the user to select one or more options from a list. Ideal for building collections, applying multiple filters, or choosing several items simultaneously. Implementations include checkbox group, tags/chips, dual list, and multi-select dropdown.',
        skillReference: '_102020_/l2/skills/molecules/groupSelectMany.ts'
    },
    {
        name: 'groupInputText',
        description: 'Allows the user to enter and edit free-form text content. Ideal for names, descriptions, comments, notes, and any textual data entry. Implementations include text field, textarea, rich text editor, masked input, and password field.',
        skillReference: '_102020_/l2/skills/molecules/groupInputText.ts'
    },
    {
        name: 'groupInputNumber',
        description: 'Allows the user to enter and edit numeric values. Ideal for quantities, counts, measurements, and numeric settings. Implementations include number field, stepper, slider, and calculator input.',
        skillReference: '_102020_/l2/skills/molecules/groupInputNumber.ts'
    },
    {
        name: 'groupInputCurrency',
        description: 'Allows the user to enter and edit monetary values with currency context. Ideal for prices, payments, financial transactions, and any value representing currency. Implementations include currency field, multi-currency input, and amount input.',
        skillReference: '_102020_/l2/skills/molecules/groupInputCurrency.ts'
    },
    {
        name: 'groupDateTime',
        description: 'Allows the user to select or enter date and/or time values. Ideal for scheduling, deadlines, timestamps, and date ranges. Implementations include date picker, datetime picker, time picker, date range, and inline calendar.',
        skillReference: '_102020_/l2/skills/molecules/groupDateTime.ts'
    },
    {
        name: 'groupToggle',
        description: 'Allows the user to switch between two mutually exclusive states (on/off, yes/no, true/false). Ideal for settings, preferences, feature flags, and binary choices with immediate effect. Implementations include switch, checkbox, yes/no buttons, and icon toggle.',
        skillReference: '_102020_/l2/skills/molecules/groupToggle.ts'
    },

    // Category 2: Search, Lookup & Filters
    {
        name: 'groupLookup',
        description: 'Allows the user to search and select a record or value from a large or remote dataset. Ideal for referencing related records, foreign keys, and selection from 100+ items. Implementations include autocomplete, combobox, modal lookup, and barcode lookup.',
        skillReference: '_102020_/l2/skills/molecules/groupLookup.ts'
    },
    {
        name: 'groupSearch',
        description: 'Allows the user to find content across the application or dataset using text queries. Ideal for global search, navigation, and command palette functionality. Implementations include simple search, expanded search, and command search (cmd+k style).',
        skillReference: '_102020_/l2/skills/molecules/groupSearch.ts'
    },
    {
        name: 'groupFilter',
        description: 'Allows the user to narrow down visible data by applying criteria and conditions. Ideal for reducing large datasets, multi-criteria filtering, and saved filter configurations. Implementations include quick filter, advanced filter, and filter chips.',
        skillReference: '_102020_/l2/skills/molecules/groupFilter.ts'
    },

    // Category 3: Data Display
    {
        name: 'groupDataTable',
        description: 'Displays and allows interaction with structured tabular data. Supports sorting, filtering, pagination, selection, and inline editing. Ideal for lists of records, data comparison, bulk operations, and CRUD interfaces. Implementations include table, editable grid, virtualized table, tree table, and pivot table.',
        skillReference: '_102020_/l2/skills/molecules/groupDataTable.ts'
    },
    {
        name: 'groupDataCard',
        description: 'Displays structured information within a visually delimited container, optimized for data presentation. Ideal for grouped content, list/grid displays, and kanban interfaces. Implementations include info card, metric card, and kanban card.',
        skillReference: '_102020_/l2/skills/molecules/groupDataCard.ts'
    },
    {
        name: 'groupDisplayText',
        description: 'Presents text content with semantic meaning and visual hierarchy. Ideal for displaying labels, values, paragraphs, and highlighted text. Implementations include label, paragraph, and highlight.',
        skillReference: '_102020_/l2/skills/molecules/groupDisplayText.ts'
    },
    {
        name: 'groupKpiMetric',
        description: 'Displays key performance indicators and metrics with visual emphasis and trend indicators. Ideal for dashboard metrics, numeric highlights, and performance tracking. Implementations include big number, sparkline, and trend indicator.',
        skillReference: '_102020_/l2/skills/molecules/groupKpiMetric.ts'
    },
    {
        name: 'groupChart',
        description: 'Visualizes data relationships and patterns through graphical representations. Ideal for showing trends, comparing values, and displaying distributions. Implementations include line chart, bar chart, pie chart, donut chart, and gauge.',
        skillReference: '_102020_/l2/skills/molecules/groupChart.ts'
    },
    {
        name: 'groupTreeView',
        description: 'Displays hierarchical data structures with expandable and collapsible nodes. Ideal for file/folder structures, organizational hierarchies, category trees, and nested navigation. Implementations include tree, org chart, and cascader.',
        skillReference: '_102020_/l2/skills/molecules/groupTreeView.ts'
    },

    // Category 4: Actions & Navigation
    {
        name: 'groupActionButton',
        description: 'Triggers actions and commands through clickable interactive elements. Ideal for form submission, triggering operations, navigation, and confirming decisions. Implementations include primary button, icon button, split button, and floating action button (FAB).',
        skillReference: '_102020_/l2/skills/molecules/groupActionButton.ts'
    },
    {
        name: 'groupMenu',
        description: 'Presents a list of actions or options in a dropdown or contextual overlay. Ideal for multiple related actions, context-specific options, and overflow menus. Implementations include dropdown menu, context menu, and overflow menu.',
        skillReference: '_102020_/l2/skills/molecules/groupMenu.ts'
    },
    {
        name: 'groupTabs',
        description: 'Organizes content into switchable panels within the same context. Ideal for multiple views of related content, sectioned forms, and dashboard panels. Implementations include horizontal tabs, vertical tabs, and pill tabs.',
        skillReference: '_102020_/l2/skills/molecules/groupTabs.ts'
    },
    {
        name: 'groupModalDialog',
        description: 'Displays overlay content that requires user attention or interaction before continuing. Ideal for confirmations, alerts, focused forms, detail views, and multi-step wizards. Implementations include dialog, drawer, confirm dialog, and wizard.',
        skillReference: '_102020_/l2/skills/molecules/groupModalDialog.ts'
    },
    {
        name: 'groupStepper',
        description: 'Guides users through a multi-step process with visual progress indication. Ideal for multi-step forms, onboarding flows, checkout processes, and wizard interfaces. Implementations include linear stepper, non-linear stepper, and vertical stepper.',
        skillReference: '_102020_/l2/skills/molecules/groupStepper.ts'
    },

    // Category 5: Feedback & States
    {
        name: 'groupNotification',
        description: 'Communicates feedback, alerts, and messages to users about system status or actions. Ideal for success/error feedback, system alerts, action confirmations, and announcements. Implementations include toast, banner, inline alert, and snackbar.',
        skillReference: '_102020_/l2/skills/molecules/groupNotification.ts'
    },
    {
        name: 'groupProgress',
        description: 'Indicates loading, progress, or completion status of operations or processes. Ideal for long-running operations, file uploads, step completion tracking, and loading states. Implementations include progress bar, progress ring, progress steps, and skeleton.',
        skillReference: '_102020_/l2/skills/molecules/groupProgress.ts'
    },
    {
        name: 'groupEmptyState',
        description: 'Communicates absence of content and guides users on next steps. Ideal for no search results, empty lists/tables, first-time use, and no data scenarios. Implementations include illustration empty state, minimal empty state, and action empty state.',
        skillReference: '_102020_/l2/skills/molecules/groupEmptyState.ts'
    },

    // Category 6: Files & Media
    {
        name: 'groupFileUpload',
        description: 'Allows users to select and upload files to the application. Ideal for document uploads, image/media uploads, bulk file imports, and attachment handling. Implementations include drag-drop upload, button upload, multi-file upload, and camera capture.',
        skillReference: '_102020_/l2/skills/molecules/groupFileUpload.ts'
    },
    {
        name: 'groupFilePreview',
        description: 'Displays previews and information about files and media. Ideal for showing uploaded files, document previews, image galleries, and file attachment lists. Implementations include image preview, PDF preview, and file list.',
        skillReference: '_102020_/l2/skills/molecules/groupFilePreview.ts'
    },

    // Category 7: Identity & Status
    {
        name: 'groupBadgeStatus',
        description: 'Indicates status, category, or count through visual badges and labels. Ideal for status indicators, category labels, notification counts, and tags. Implementations include pill badge, dot indicator, and removable tag.',
        skillReference: '_102020_/l2/skills/molecules/groupBadgeStatus.ts'
    },
    {
        name: 'groupAvatar',
        description: 'Represents user or entity identity through visual indicators. Ideal for user profiles, contact lists, comment authors, and entity representation. Implementations include photo avatar, initials avatar, and avatar group.',
        skillReference: '_102020_/l2/skills/molecules/groupAvatar.ts'
    }
]