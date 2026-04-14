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


    // Category 3: Data Display
    {
        name: 'groupViewData',
        description: 'Display a collection of data with adaptive layout. The component decides the best presentation based on context (viewport, configuration). Use when displaying multiple records with defined fields and rich content.',
        skillReference: '_102020_/l2/skills/molecules/groupViewData.ts'
    },
    {
        name: 'groupViewTable',
        description: 'Displays and allows interaction with structured tabular data. Supports sorting, filtering, pagination, selection, and inline editing. Ideal for lists of records, data comparison, bulk operations, and CRUD interfaces. Implementations include table, editable grid, virtualized table, tree table, and pivot table.',
        skillReference: '_102020_/l2/skills/molecules/groupViewTable.ts'
    },

]