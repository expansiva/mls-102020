/// <mls fileReference="_102020_/l2/skills/molecules/index" enhancement="_blank"/>


export const skills = [
    // Category 1: Data Entry & Editing
    {
        name: 'groupSelectOne',
        description: 'Allows the user to select exactly one option from a list of mutually exclusive choices. Ideal for scenarios where a single, clear decision is required. Implementations include dropdown, radio group, segmented control, knob, and list picker.',
        skillReference: '/_102020_/l2/skills/molecules/groupSelectOne',
        skillUsageReference: ''
    },
    {
        name: 'groupSelectMany',
        description: 'Allows the user to select one or more options from a list. Ideal for building collections, applying multiple filters, or choosing several items simultaneously. Implementations include checkbox group, tags/chips, dual list, and multi-select dropdown.',
        skillReference: '/_102020_/l2/skills/molecules/groupSelectMany',
        skillUsageReference: ''
    },
    {
        name: 'groupEnterText',
        description: 'Allows the user to input free-form text. Ideal for names, descriptions, comments, emails, passwords, and any textual data. Implementations include input, textarea, password input, masked input, input OTP, search input, and tag input.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterText',
        skillUsageReference: ''
    },

    {
        name: 'groupEnterNumber',
        description: 'Allows the user to input numeric values. Ideal for quantities, measurements, percentages, ages, weights, and numeric configurations. Implementations include number input, stepper, slider, percentage input, and quantity selector.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterNumber',
        skillUsageReference: ''
    },
    {
        name: 'groupEnterMoney',
        description: 'Allows the user to input monetary values with locale-aware formatting. Ideal for prices, payments, budgets, and financial transactions. Handles currency symbols, thousand separators, and decimal precision. Implementations include currency input, price field, money input, and currency converter.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterMoney',
        skillUsageReference: ''
    },
    {
        name: 'groupEnterDatetime',
        description: 'Allows the user to input date and/or time values. Ideal for scheduling, deadlines, date ranges, and appointments. Implementations include date picker, time picker, datetime picker, date range picker, inline calendar, month picker, and year picker.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterDateTime/creation',
        skillUsageReference: '/_102020_/l2/skills/molecules/groupEnterDateTime/usage'
    },

    {
        name: 'groupEnterDate',
        description: 'Allows the user to input a date only (no time). Ideal for birth dates, due dates, contract effective dates, expiration dates, and any scenario where the time of day is irrelevant. Implementations include date picker, masked date input, inline calendar, and month/year picker.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterDate/creation',
        skillUsageReference: '/_102020_/l2/skills/molecules/groupEnterDate/usage'
    },
    {
        name: 'groupEnterTime',
        description: 'Allows the user to input a time only (no date). Ideal for business hours, recurring daily schedules, alarm times, opening and closing times, and shift configurations. Implementations include time picker with scrollable columns, masked time input, time spinner, and clock face.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterTime/creation',
        skillUsageReference: '/_102020_/l2/skills/molecules/groupEnterTime/usage'
    },
    {
        name: 'groupEnterDateInterval',
        description: 'Allows the user to input a date range with a start date and an end date (no time). Ideal for vacation periods, report filters, campaign durations, contract validity, and hotel or flight booking dates. Implementations include date range picker with dual calendar, inline date range, and range picker with presets.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterDateInterval/creation',
        skillUsageReference: '/_102020_/l2/skills/molecules/groupEnterDateInterval/usage'
    },
    {
        name: 'groupEnterDateTimeInterval',
        description: 'Allows the user to input a date+time range with a start datetime and an end datetime. Ideal for meeting scheduling, room reservations, maintenance windows, task time tracking, and any booking that requires exact start and end timestamps. Implementations include datetime range picker, event scheduler, and booking widget.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterDateTimeInterval/creation',
        skillUsageReference: '/_102020_/l2/skills/molecules/groupEnterDateTimeInterval/usage'
    },
    {
        name: 'groupEnterTimeInterval',
        description: 'Allows the user to input a time range with a start time and an end time (no date). Ideal for work shifts, business hours configuration, recurring availability windows, class schedules, and break intervals. Supports overnight intervals that cross midnight. Implementations include time range picker, dual-handle timeline slider, and business hours grid.',
        skillReference: '/_102020_/l2/skills/molecules/groupEnterTimeInterval/creation',
        skillUsageReference: '/_102020_/l2/skills/molecules/groupEnterTimeInterval/usage'
    },

    // Category 3: Data Display
    {
        name: 'groupViewData',
        description: 'Display a collection of data with adaptive layout. The component decides the best presentation based on context (viewport, configuration). Use when displaying multiple records with defined fields and rich content.',
        skillReference: '/_102020_/l2/skills/molecules/groupViewData',
        skillUsageReference: ''
    },
    {
        name: 'groupViewTable',
        description: 'Displays and allows interaction with structured tabular data. Supports sorting, filtering, pagination, selection, and inline editing. Ideal for lists of records, data comparison, bulk operations, and CRUD interfaces. Implementations include table, editable grid, virtualized table, tree table, and pivot table.',
        skillReference: '/_102020_/l2/skills/molecules/groupViewTable',
        skillUsageReference: ''
    },

    {
        name: 'groupNotifyUser',
        description: 'Informs the user about events, status changes, or action results. Ideal for success/error feedback, system alerts, and important announcements. Implementations include toast, snackbar, banner, alert, and notification card.',
        skillReference: '/_102020_/l2/skills/molecules/groupNotifyUser',
        skillUsageReference: ''
    }

]