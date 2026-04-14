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
        name: 'groupEnterText',
        description: 'Allows the user to input free-form text. Ideal for names, descriptions, comments, emails, passwords, and any textual data. Implementations include input, textarea, password input, masked input, input OTP, search input, and tag input.',
        skillReference: '_102020_/l2/skills/molecules/groupEnterText.ts'
    },

    {
        name: 'groupEnterNumber',
        description: 'Allows the user to input numeric values. Ideal for quantities, prices, measurements, percentages, and numeric configurations. Implementations include number input, stepper, slider, currency input, percentage input, and quantity selector.',
        skillReference: '_102020_/l2/skills/molecules/groupEnterNumber.ts'
    },

    {
        name: 'groupEnterDatetime',
        description: 'Allows the user to input date and/or time values. Ideal for scheduling, deadlines, date ranges, and appointments. Implementations include date picker, time picker, datetime picker, date range picker, inline calendar, month picker, and year picker.',
        skillReference: '_102020_/l2/skills/molecules/groupEnterDateTime.ts'
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

    {
        name: 'groupNotifyUser',
        description: 'Informs the user about events, status changes, or action results. Ideal for success/error feedback, system alerts, and important announcements. Implementations include toast, snackbar, banner, alert, and notification card.',
        skillReference: '_102020_/l2/skills/molecules/groupNotifyUser.ts'
    }

]