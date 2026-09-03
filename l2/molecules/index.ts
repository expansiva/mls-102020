/// <mls fileReference="_102020_/l2/molecules/index.ts" enhancement="_blank"/>

import { skills } from '/_102020_/l2/aura/molecules/skills/index.js';
// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type SkillCategory =
    | 'dataEntry'
    | 'dataDiscovery'
    | 'dataDisplay'
    | 'actions'
    | 'navigation'
    | 'feedback'
    | 'identity';

export interface MutationGroupEntry {
    name: string;
    category: SkillCategory;
    icon: string;               // SVG path(s) for viewBox="0 0 24 24"
    label: string;
    shortDescription: string;
    demo: string;
}

export interface MutationWidget {
    name: string;
    tag: string;
    label: string;
    description: string;
}

export interface MutationGroup {
    widgets: MutationWidget[];
    demo: string;
    state: Record<string, any>;
}
// ═══════════════════════════════════════════════════════════════
// Mutation Groups
// ═══════════════════════════════════════════════════════════════

export const mutationGroups: MutationGroupEntry[] = [

    // ── Data Entry ─────────────────────────────────────────────

    {
        name: 'groupSelectOne',
        category: 'dataEntry',
        icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
        label: 'Select one',
        shortDescription: 'Choose exactly one option from a list',
        demo: `
        <molecule-for-replace     
            <Label>Favorite Color</Label>
            <Item value="red">Red</Item>
            <Item value="green">Green</Item>
            <Item value="blue">Blue</Item>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupSelectMany',
        category: 'dataEntry',
        icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        label: 'Select many',
        shortDescription: 'Choose one or more options from a list',
        demo: `
        <molecule-for-replace     
            <Label>Fruits</Label>
            <Helper>Select one or more fruits from the list.</Helper>
            <Item value="apple">Apple</Item>
            <Item value="banana">Banana</Item>
            <Item value="grape">Grape</Item>
            <Item value="orange">Orange</Item>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterText',
        category: 'dataEntry',
        icon: '<path d="M4 7h16M4 12h10M4 17h13"/>',
        label: 'Enter text',
        shortDescription: 'Free-form text input',
        demo: `
        <molecule-for-replace class="w-100 block" rows="4">
            <Label>Name</Label>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterNumber',
        category: 'dataEntry',
        icon: '<path d="M5 17l5-10 4 6 3-3 3 7"/>',
        label: 'Enter number',
        shortDescription: 'Numeric value input',
        demo: `
        <molecule-for-replace class="w-100 block" min="10" max="100" step="5" decimals="2">
            <Label>Weight</Label>
            <Prefix>#</Prefix>
            <Suffix>kg</Suffix>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterMoney',
        category: 'dataEntry',
        icon: '<circle cx="12" cy="12" r="8"/><path d="M9 12h6M9 9h6M9 15h3M12 6v-2M12 20v-2"/>',
        label: 'Enter money',
        shortDescription: 'Currency value with locale formatting',
        demo: `
        <molecule-for-replace class="w-100 block" currency="BRL" locale="pt-BR">
            <Label>Preço</Label>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterDatetime',
        category: 'dataEntry',
        icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/><circle cx="12" cy="15" r="1.5"/>',
        label: 'Enter datetime',
        shortDescription: 'Date and time input combined',
        demo: `
        <molecule-for-replace value="2026-04-29" class="w-100 block">
            <Label>Date</Label>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterDate',
        category: 'dataEntry',
        icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
        label: 'Enter date',
        shortDescription: 'Date-only input, no time',
        demo: `
        <molecule-for-replace value="2026-04-29" class="w-100 block">
            <Label>Date</Label>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterTime',
        category: 'dataEntry',
        icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
        label: 'Enter time',
        shortDescription: 'Time-only input, no date',
        demo: `
        <molecule-for-replace value="14:30" class="w-100 block" minuteStep="15">
            <Label>Appointment Time</Label>
            <Helper>Select a time in 15-minute intervals</Helper>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterDateInterval',
        category: 'dataEntry',
        icon: '<rect x="2" y="6" width="8" height="12" rx="1.5"/><rect x="14" y="6" width="8" height="12" rx="1.5"/><path d="M10 12h4" stroke-dasharray="2 2"/>',
        label: 'Date interval',
        shortDescription: 'Date range with start and end',
        demo: `
        <molecule-for-replace locale="en-US" class="w-200 block">
            <Label>Booking Window</Label>
            <LabelStart>Check-in</LabelStart>
            <LabelEnd>Check-out</LabelEnd>
            <Helper>Select your stay period</Helper>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterDateTimeInterval',
        category: 'dataEntry',
        icon: '<rect x="2" y="6" width="8" height="12" rx="1.5"/><rect x="14" y="6" width="8" height="12" rx="1.5"/><path d="M10 12h4" stroke-dasharray="2 2"/><circle cx="6" cy="15" r="1"/><circle cx="18" cy="15" r="1"/>',
        label: 'Datetime interval',
        shortDescription: 'Date+time range with start and end',
        demo: `
        <molecule-for-replace class="w-200 block">
            <Label>Booking Window</Label>
            <LabelStart>Check-in</LabelStart>
            <LabelEnd>Check-out</LabelEnd>
            <Helper>Select your arrival and departure times.</Helper>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupEnterTimeInterval',
        category: 'dataEntry',
        icon: '<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/><path d="M8 7v-1M8 18v-1M16 7v-1M16 18v-1"/>',
        label: 'Time interval',
        shortDescription: 'Time range, supports overnight',
        demo: `
        <molecule-for-replace startTime="08:00" endTime="17:00" minuteStep="30" class="w-200 block">
            <Label>Work Shift</Label>
            <LabelStart>From</LabelStart>
            <LabelEnd>To</LabelEnd>
            <Helper>Define start and end of your shift</Helper>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupRateItem',
        category: 'dataEntry',
        icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>',
        label: 'Rate item',
        shortDescription: 'Star rating, NPS, emoji score',
        demo: `
        <molecule-for-replace min="1" max="5" step="1" value="3">
            <Label>How was your experience?</Label>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupLocatePosition',
        category: 'dataEntry',
        icon: '<path d="M12 2C8 2 5 5.5 5 10c0 7 7 12 7 12s7-5 7-12c0-4.5-3-8-7-8z"/><circle cx="12" cy="10" r="2.5"/>',
        label: 'Locate position',
        shortDescription: 'Geographic location input',
        demo: `
        <molecule-for-replace class="w-200 block">
            <Label>Delivery Address</Label>
            <Helper>Search or pin your location on the map</Helper>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupSelectFileForUpload',
        category: 'dataEntry',
        icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6M9 15l3-3 3 3"/>',
        label: 'Upload file',
        shortDescription: 'File selection with drag-drop',
        demo: `
        <molecule-for-replace accept=".pdf,.jpg,.png" maxSize="5242880" multiple class="w-200 block">
            <Label>Attachments</Label>
            <Helper>Drag files here or click to browse. Max 5MB each.</Helper>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupScanCode',
        category: 'dataEntry',
        icon: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
        label: 'Scan code',
        shortDescription: 'QR code, barcode, document capture',
        demo: `
        <molecule-for-replace camera="rear" class="w-200 block">
            <Label>Scan QR Code</Label>
            <Helper>Point your camera at a QR code or barcode</Helper>
        </molecule-for-replace>
        `
    },

    // ── Data Discovery ─────────────────────────────────────────

    {
        name: 'groupSearchContent',
        category: 'dataDiscovery',
        icon: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
        label: 'Search content',
        shortDescription: 'Find content using text search',
        demo: `
        <molecule-for-replace class="w-200 block" debounce="300">
            <Label>Search Products</Label>
            <Suggestion value="laptop">Laptop</Suggestion>
            <Suggestion value="keyboard">Keyboard</Suggestion>
            <Suggestion value="monitor">Monitor</Suggestion>
            <Empty>No products found</Empty>
        </molecule-for-replace>
        `
    },

    // ── Data Display ───────────────────────────────────────────

    {
        name: 'groupViewTable',
        category: 'dataDisplay',
        icon: '<path d="M3 6h18M3 12h18M3 18h18"/><path d="M9 6v12M15 6v12" stroke-dasharray="2 2" opacity=".5"/>',
        label: 'View table',
        shortDescription: 'Sortable, filterable data table',
        demo: `
        <molecule-for-replace class="w-full block">
            <TableHeader>
                <TableHead sortable>Name</TableHead>
                <TableHead sortable>Role</TableHead>
                <TableHead>Email</TableHead>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>Alice Johnson</TableCell>
                    <TableCell>Engineer</TableCell>
                    <TableCell>alice@example.com</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Bob Smith</TableCell>
                    <TableCell>Designer</TableCell>
                    <TableCell>bob@example.com</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Carol Lee</TableCell>
                    <TableCell>Manager</TableCell>
                    <TableCell>carol@example.com</TableCell>
                </TableRow>
            </TableBody>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupViewCard',
        category: 'dataDisplay',
        icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
        label: 'View card',
        shortDescription: 'Visual card unit with flexible slots',
        demo: `
        <molecule-for-replace variant="outlined" clickable class="w-200 block">
            <Header>
                <Title>Project Alpha</Title>
                <Description>Web application redesign</Description>
            </Header>
            <Content>
                <p>Redesigning the main dashboard with improved UX patterns and accessibility compliance.</p>
            </Content>
            <Footer>
                <span>Updated 2 days ago</span>
            </Footer>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupViewData',
        category: 'dataDisplay',
        icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/>',
        label: 'View data',
        shortDescription: 'Adaptive data collection display',
        demo: `
        <molecule-for-replace class="w-full block">
            <Field name="name">Alice Johnson</Field>
            <Field name="role">Engineer</Field>
            <Field name="email">alice@example.com</Field>
            <Field name="department">Product</Field>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupViewMetric',
        category: 'dataDisplay',
        icon: '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>',
        label: 'View metric',
        shortDescription: 'KPI, big number, trend indicator',
        demo: `
        <molecule-for-replace>
            <Label>Monthly Revenue</Label>
            <Value>R$ 148.500</Value>
            <Icon>💰</Icon>
            <Trend direction="up">+12.5%</Trend>
            <Helper>Compared to last month</Helper>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupViewChart',
        category: 'dataDisplay',
        icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17V11M12 17V7M17 17v-4"/>',
        label: 'View chart',
        shortDescription: 'Bar, line, pie, area charts',
        demo: `
        <molecule-for-replace class="w-full block" style="height:300px">
            <Series name="Revenue" color="#3b82f6">
                <Point label="Jan" value="12000"/>
                <Point label="Feb" value="15000"/>
                <Point label="Mar" value="13500"/>
                <Point label="Apr" value="18000"/>
                <Point label="May" value="21000"/>
                <Point label="Jun" value="19500"/>
            </Series>
            <Series name="Expenses" color="#ef4444">
                <Point label="Jan" value="8000"/>
                <Point label="Feb" value="9200"/>
                <Point label="Mar" value="8800"/>
                <Point label="Apr" value="10500"/>
                <Point label="May" value="11000"/>
                <Point label="Jun" value="10200"/>
            </Series>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupViewHierarchy',
        category: 'dataDisplay',
        icon: '<circle cx="12" cy="4" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/><path d="M12 6v2l-6 4M12 8l6 4M6 14v4M18 14v4"/>',
        label: 'View hierarchy',
        shortDescription: 'Tree view, org chart, nested list',
        demo: `
        <molecule-for-replace class="w-full block">
            < <Label>Folders</Label>
                <Node expanded>📁 src
                    <Node>📄 index.ts</Node>
                    <Node>📄 app.ts</Node>
                </Node>
                <Node>📁 public
                    <Node>📄 favicon.ico</Node>
                </Node>
                <Node>📄 package.json</Node>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupPlayMedia',
        category: 'dataDisplay',
        icon: '<polygon points="5 3 19 12 5 21 5 3"/>',
        label: 'Play media',
        shortDescription: 'Audio and video player',
        demo: `
        <molecule-for-replace class="w-200 block" controls>
            <Source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"/>
            <Label>Sample Video</Label>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupExpandContent',
        category: 'dataDisplay',
        icon: '<path d="M6 9l6 6 6-6"/>',
        label: 'Expand content',
        shortDescription: 'Accordion, collapsible sections',
        demo: `
        <molecule-for-replace class="w-full block" mode="accordion">
            <Section title="What is Collab?" expanded>
                <p>Collab is a platform for building full-stack business applications with AI assistance.</p>
            </Section>
            <Section title="How does it work?">
                <p>It uses structured architecture, reusable components, and AI-driven workflows to accelerate development.</p>
            </Section>
            <Section title="Who is it for?">
                <p>Teams building ERP modules, CRM systems, dashboards, and internal business tools.</p>
            </Section>
        </molecule-for-replace>
        `
    },

    // ── Actions ────────────────────────────────────────────────

    {
        name: 'groupTriggerAction',
        category: 'actions',
        icon: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M12 8v8"/>',
        label: 'Trigger action',
        shortDescription: 'Button, FAB, submit action',
        demo: `
        <molecule-for-replace variant="primary" size="md">
            <Label>Save Changes</Label>
            <Icon>💾</Icon>
        </molecule-for-replace>
        `
    },

    // ── Navigation ─────────────────────────────────────────────

    {
        name: 'groupNavigateSection',
        category: 'navigation',
        icon: '<path d="M3 6h18"/><path d="M3 6l4 12h10l4-12"/><path d="M8 6v12M16 6v12"/>',
        label: 'Navigate section',
        shortDescription: 'Tabs, pills, segmented control',
        demo: `
        <molecule-for-replace value="overview" class="w-full block">
            <Tab value="overview" title="Overview"/>
            <Tab value="details" title="Details"/>
            <Tab value="history" title="History"/>
            <Tab value="settings" title="Settings" disabled/>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupNavigateSteps',
        category: 'navigation',
        icon: '<circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><path d="M8 12h8"/><path d="M5 12h.01M19 12h.01"/>',
        label: 'Navigate steps',
        shortDescription: 'Stepper, wizard, multi-step flow',
        demo: `
        <molecule-for-replace value="1" class="w-full block">
            <Step title="Account" description="Create your account" completed/>
            <Step title="Profile" description="Fill in your details"/>
            <Step title="Review" description="Confirm information"/>
            <Step title="Done" description="All set!" disabled/>
        </molecule-for-replace>
        `
    },

    // ── Feedback ────────────────────────────────────────────────

    {
        name: 'groupNotifyUser',
        category: 'feedback',
        icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
        label: 'Notify user',
        shortDescription: 'Toast, alert, snackbar feedback',
        demo: `
        <molecule-for-replace type="success" visible dismissible>
            <Label>Changes saved successfully</Label>
            <Action>Undo</Action>
        </molecule-for-replace>
        `
    },
    {
        name: 'groupShowProgress',
        category: 'feedback',
        icon: '<path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2a10 10 0 0 0 0 20" stroke-dasharray="3 3"/>',
        label: 'Show progress',
        shortDescription: 'Progress bar, ring, spinner',
        demo: `
        <molecule-for-replace value="65" max="100">
            <Label>Uploading...</Label>
        </molecule-for-replace>
        `
    },
];

const folderToGroupMap = new Map<string, MutationGroupEntry>(
    mutationGroups.map(g => [g.name.toLocaleLowerCase(), g])
);

export function getGroupByFolder(folder: string): MutationGroupEntry | undefined {
    return folderToGroupMap.get(folder.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════
// Helper: enriquece com dados do index original
// ═══════════════════════════════════════════════════════════════

export function getEnrichedGroups() {
    return mutationGroups.map(group => {
        const skill = skills.find(s => s.name === group.name);
        return {
            ...group,
            description: skill?.description ?? '',
            skillReference: skill?.skillReference ?? '',
        };
    });
}

// ═══════════════════════════════════════════════════════════════
// Helper: renderiza o icon SVG
// ═══════════════════════════════════════════════════════════════

export function renderIcon(icon: string, size = 24): string {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        ${icon}
    </svg>`;
}