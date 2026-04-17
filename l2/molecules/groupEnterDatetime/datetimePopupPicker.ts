/// <mls fileReference="_102020_/l2/molecules/groupEnterDatetime/datetimePopupPicker.ts" enhancement="_102020_/l2/enhancementAura" />
// =============================================================================
// DATETIME POPUP PICKER MOLECULE
// =============================================================================
// Skill Group: enter + datetime
// This molecule does NOT contain business logic.
// - No Shadow DOM
// - Presentation-only
// - Receives data via properties
// - Emits change/focus/blur events
import { html, TemplateResult, nothing, unsafeHTML } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_102027_/l2/collabDecorators';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  placeholder: 'Select date and time',
  clear: 'Clear',
  confirm: 'Confirm',
  loading: 'Loading...',
  viewEmpty: '—',
  openPicker: 'Open date and time picker',
  monthPrev: 'Previous month',
  monthNext: 'Next month',
  hours: 'Hours',
  minutes: 'Minutes',
};

type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    placeholder: 'Selecione data e hora',
    clear: 'Limpar',
    confirm: 'Confirmar',
    loading: 'Carregando...',
    viewEmpty: '—',
    openPicker: 'Abrir seletor de data e hora',
    monthPrev: 'Mês anterior',
    monthNext: 'Próximo mês',
    hours: 'Horas',
    minutes: 'Minutos',
  },
};
/// **collab_i18n_end**

type Ymd = { y: number; m: number; d: number };

@customElement('molecules--group-enter-datetime--datetime-popup-picker-102020')
export class DatetimePopupPickerMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // ===========================================================================
  // SLOT TAGS
  // ===========================================================================
  slotTags = ['Label', 'Helper'];

  // ===========================================================================
  // PROPERTIES — From Contract
  // ===========================================================================
  @propertyDataSource({ type: String })
  value: string | null = null; // "YYYY-MM-DDTHH:mm:ss"

  @propertyDataSource({ type: String })
  error: string = '';

  @propertyDataSource({ type: String })
  name: string = '';

  @propertyDataSource({ type: String })
  locale: string = '';

  @propertyDataSource({ type: String })
  timezone: string = '';

  @propertyDataSource({ type: String })
  minDatetime: string = '';

  @propertyDataSource({ type: String })
  maxDatetime: string = '';

  @propertyDataSource({ type: Number })
  minuteStep: number = 1;

  @propertyDataSource({ type: String })
  placeholder: string = '';

  @propertyDataSource({ type: Boolean })
  isEditing: boolean = true;

  @propertyDataSource({ type: Boolean })
  disabled: boolean = false;

  @propertyDataSource({ type: Boolean })
  readonly: boolean = false;

  @propertyDataSource({ type: Boolean })
  required: boolean = false;

  @propertyDataSource({ type: Boolean })
  loading: boolean = false;

  // ===========================================================================
  // INTERNAL STATE
  // ===========================================================================
  @state()
  private isOpen: boolean = false;

  @state()
  private isFocused: boolean = false;

  // Derived display (and draft picker values)
  @state()
  private displayValue: string = '';

  @state()
  private draftDate: string = ''; // YYYY-MM-DD

  @state()
  private draftHour: number | null = null;

  @state()
  private draftMinute: number | null = null;

  @state()
  private viewMonthY: number = 0;

  @state()
  private viewMonthM: number = 0; // 1-12

  // ===========================================================================
  // STATE CHANGE HANDLER — keep derived state in sync
  // ===========================================================================
  handleIcaStateChange(key: string, value: any) {
    const valueAttr = this.getAttribute('value');
    const localeAttr = this.getAttribute('locale');
    const tzAttr = this.getAttribute('timezone');

    if (valueAttr === `{{${key}}}` || localeAttr === `{{${key}}}` || tzAttr === `{{${key}}}`) {
      this.syncDerivedFromValue();
    }

    const editingAttr = this.getAttribute('isEditing');
    if (editingAttr === `{{${key}}}`) {
      if (!this.isEditing) {
        this.isOpen = false;
      }
    }

    this.requestUpdate();
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================
  firstUpdated() {
    this.syncDerivedFromValue();

    // Close on outside click
    document.addEventListener('mousedown', this.handleDocumentMouseDown);
    document.addEventListener('keydown', this.handleDocumentKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousedown', this.handleDocumentMouseDown);
    document.removeEventListener('keydown', this.handleDocumentKeyDown);
  }

  // ===========================================================================
  // DERIVED STATE
  // ===========================================================================
  private syncDerivedFromValue(): void {
    this.displayValue = this.formatValueForDisplay(this.value);

    const parts = this.parseIsoLocal(this.value);
    if (parts) {
      this.draftDate = this.formatYmd(parts.y, parts.m, parts.d);
      this.draftHour = parts.hh;
      this.draftMinute = parts.mm;
      this.viewMonthY = parts.y;
      this.viewMonthM = parts.m;
    } else {
      const now = new Date();
      this.viewMonthY = now.getFullYear();
      this.viewMonthM = now.getMonth() + 1;
      this.draftDate = '';
      this.draftHour = null;
      this.draftMinute = null;
    }
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================
  private emitChange(next: string | null): void {
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value: next },
      }),
    );
  }

  private emitFocus(): void {
    this.dispatchEvent(
      new CustomEvent('focus', {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    );
  }

  private emitBlur(): void {
    this.dispatchEvent(
      new CustomEvent('blur', {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    );
  }

  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  private handleTriggerClick = () => {
    if (!this.isEditing) return;
    if (this.disabled || this.readonly || this.loading) return;

    const next = !this.isOpen;
    this.isOpen = next;

    if (next) {
      // initialize draft from current value (or defaults)
      const parts = this.parseIsoLocal(this.value);
      if (parts) {
        this.draftDate = this.formatYmd(parts.y, parts.m, parts.d);
        this.draftHour = parts.hh;
        this.draftMinute = parts.mm - (parts.mm % this.getMinuteStepSafe());
        this.viewMonthY = parts.y;
        this.viewMonthM = parts.m;
      } else {
        const now = new Date();
        const hh = now.getHours();
        const mm = now.getMinutes();
        this.draftDate = this.formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
        this.draftHour = hh;
        this.draftMinute = mm - (mm % this.getMinuteStepSafe());
        this.viewMonthY = now.getFullYear();
        this.viewMonthM = now.getMonth() + 1;
      }
    }
  };

  private handleTriggerFocus = () => {
    if (!this.isEditing) return;
    if (this.disabled) return;
    this.isFocused = true;
    this.emitFocus();
  };

  private handleTriggerBlur = () => {
    // Real blur is handled when closing/outside click. But we still emit blur on trigger blur.
    if (!this.isEditing) return;
    this.isFocused = false;
    this.emitBlur();
  };

  private handleDocumentMouseDown = (e: MouseEvent) => {
    if (!this.isOpen) return;
    const path = e.composedPath() as EventTarget[];
    if (!path.includes(this)) {
      this.isOpen = false;
    }
  };

  private handleDocumentKeyDown = (e: KeyboardEvent) => {
    if (!this.isOpen) return;
    if (e.key === 'Escape') {
      this.isOpen = false;
    }
  };

  private handlePrevMonth = () => {
    const { y, m } = this.addMonths(this.viewMonthY, this.viewMonthM, -1);
    this.viewMonthY = y;
    this.viewMonthM = m;
  };

  private handleNextMonth = () => {
    const { y, m } = this.addMonths(this.viewMonthY, this.viewMonthM, 1);
    this.viewMonthY = y;
    this.viewMonthM = m;
  };

  private handleSelectDay = (ymd: Ymd) => {
    if (this.disabled || this.readonly || this.loading) return;
    const ymdStr = this.formatYmd(ymd.y, ymd.m, ymd.d);
    if (!this.isDateAllowed(ymdStr)) return;

    this.draftDate = ymdStr;

    // If boundary day, ensure chosen time is allowed; otherwise adjust to nearest allowed.
    if (this.draftHour === null) this.draftHour = 0;
    if (this.draftMinute === null) this.draftMinute = 0;

    const adjusted = this.adjustTimeToBoundaryIfNeeded(ymdStr, this.draftHour, this.draftMinute);
    this.draftHour = adjusted.hh;
    this.draftMinute = adjusted.mm;
  };

  private handleSelectHour = (hh: number) => {
    if (this.disabled || this.readonly || this.loading) return;
    this.draftHour = hh;

    if (this.draftDate) {
      const mm = this.draftMinute ?? 0;
      const adjusted = this.adjustTimeToBoundaryIfNeeded(this.draftDate, hh, mm);
      this.draftHour = adjusted.hh;
      this.draftMinute = adjusted.mm;
    }
  };

  private handleSelectMinute = (mm: number) => {
    if (this.disabled || this.readonly || this.loading) return;
    this.draftMinute = mm;

    if (this.draftDate && this.draftHour !== null) {
      const adjusted = this.adjustTimeToBoundaryIfNeeded(this.draftDate, this.draftHour, mm);
      this.draftHour = adjusted.hh;
      this.draftMinute = adjusted.mm;
    }
  };

  private handleClear = () => {
    if (this.disabled || this.readonly || this.loading) return;
    this.value = null;
    this.displayValue = this.formatValueForDisplay(this.value);
    this.isOpen = false;
    this.emitChange(this.value);
  };

  private handleConfirm = () => {
    if (this.disabled || this.readonly || this.loading) return;

    if (!this.draftDate) return;
    const hh = this.draftHour ?? 0;
    const mm = this.draftMinute ?? 0;

    const next = `${this.draftDate}T${this.pad2(hh)}:${this.pad2(mm)}:00`;
    if (!this.isDatetimeAllowed(next)) return;

    this.value = next;
    this.displayValue = this.formatValueForDisplay(this.value);
    this.isOpen = false;
    this.emitChange(this.value);
  };

  // ===========================================================================
  // HELPERS — dates, formatting, constraints
  // ===========================================================================
  private getLocaleSafe(): string {
    return (this.locale || '').trim() || 'en-US';
  }

  private getMinuteStepSafe(): number {
    const s = Number(this.minuteStep);
    if (!Number.isFinite(s) || s <= 0) return 1;
    if (s > 60) return 60;
    return Math.floor(s);
  }

  private pad2(n: number): string {
    return `${n}`.padStart(2, '0');
  }

  private formatYmd(y: number, m: number, d: number): string {
    return `${y}-${this.pad2(m)}-${this.pad2(d)}`;
  }

  private parseIsoLocal(iso: string | null): { y: number; m: number; d: number; hh: number; mm: number; ss: number } | null {
    if (!iso) return null;
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = Number(m[6]);
    if ([y, mo, d, hh, mm, ss].some(v => !Number.isFinite(v))) return null;
    return { y, m: mo, d, hh, mm, ss };
  }

  private isoToDateLocal(iso: string): Date | null {
    const parts = this.parseIsoLocal(iso);
    if (!parts) return null;
    return new Date(parts.y, parts.m - 1, parts.d, parts.hh, parts.mm, parts.ss, 0);
  }

  private formatValueForDisplay(iso: string | null): string {
    if (!iso) return '';

    // Display formatting is locale-aware. Timezone handling is best-effort:
    // - If timezone is empty: format using local time
    // - If timezone is provided: format using Intl.DateTimeFormat with timeZone
    // Note: value is stored without timezone offset; this is a UI display concern.
    const date = this.isoToDateLocal(iso);
    if (!date) return '';

    const loc = this.getLocaleSafe();
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };

    const tz = (this.timezone || '').trim();
    if (tz) {
      opts.timeZone = tz;
    }

    try {
      return new Intl.DateTimeFormat(loc, opts).format(date);
    } catch {
      return new Intl.DateTimeFormat('en-US', opts).format(date);
    }
  }

  private addMonths(y: number, m: number, delta: number): { y: number; m: number } {
    const idx = (y * 12 + (m - 1)) + delta;
    const ny = Math.floor(idx / 12);
    const nm = (idx % 12 + 12) % 12;
    return { y: ny, m: nm + 1 };
  }

  private daysInMonth(y: number, m: number): number {
    return new Date(y, m, 0).getDate();
  }

  private weekdayOfFirst(y: number, m: number): number {
    // 0=Sun..6=Sat
    return new Date(y, m - 1, 1).getDay();
  }

  private normalizeIsoOrEmpty(iso: string): string {
    return (iso || '').trim();
  }

  private isDateAllowed(ymd: string): boolean {
    const minIso = this.normalizeIsoOrEmpty(this.minDatetime);
    const maxIso = this.normalizeIsoOrEmpty(this.maxDatetime);

    if (!minIso && !maxIso) return true;

    const min = minIso ? this.parseIsoLocal(minIso) : null;
    const max = maxIso ? this.parseIsoLocal(maxIso) : null;

    const d = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!d) return false;
    const y = Number(d[1]);
    const m = Number(d[2]);
    const day = Number(d[3]);

    const atStart = `${ymd}T00:00:00`;
    const atEnd = `${ymd}T23:59:59`;

    if (min) {
      const minYmd = this.formatYmd(min.y, min.m, min.d);
      if (ymd < minYmd) return false;
      if (ymd === minYmd) {
        // still allowed as a day; time will be restricted
        return true;
      }
    }

    if (max) {
      const maxYmd = this.formatYmd(max.y, max.m, max.d);
      if (ymd > maxYmd) return false;
      if (ymd === maxYmd) {
        return true;
      }
    }

    // basic date sanity
    if (m < 1 || m > 12) return false;
    const dim = this.daysInMonth(y, m);
    if (day < 1 || day > dim) return false;

    // Make sure range by datetime comparison (start/end)
    if (minIso && atEnd < minIso) return false;
    if (maxIso && atStart > maxIso) return false;

    return true;
  }

  private isDatetimeAllowed(iso: string): boolean {
    const minIso = this.normalizeIsoOrEmpty(this.minDatetime);
    const maxIso = this.normalizeIsoOrEmpty(this.maxDatetime);
    if (minIso && iso < minIso) return false;
    if (maxIso && iso > maxIso) return false;
    return true;
  }

  private adjustTimeToBoundaryIfNeeded(dateYmd: string, hh: number, mm: number): { hh: number; mm: number } {
    const step = this.getMinuteStepSafe();
    const snappedMm = mm - (mm % step);
    let nextIso = `${dateYmd}T${this.pad2(hh)}:${this.pad2(snappedMm)}:00`;

    if (this.isDatetimeAllowed(nextIso)) return { hh, mm: snappedMm };

    // If outside, clamp to min/max on that date (if applicable)
    const minIso = this.normalizeIsoOrEmpty(this.minDatetime);
    const maxIso = this.normalizeIsoOrEmpty(this.maxDatetime);

    const min = minIso ? this.parseIsoLocal(minIso) : null;
    const max = maxIso ? this.parseIsoLocal(maxIso) : null;

    if (min) {
      const minYmd = this.formatYmd(min.y, min.m, min.d);
      if (dateYmd === minYmd) {
        const minMm = min.mm - (min.mm % step);
        return { hh: min.hh, mm: minMm };
      }
    }

    if (max) {
      const maxYmd = this.formatYmd(max.y, max.m, max.d);
      if (dateYmd === maxYmd) {
        const maxMm = max.mm - (max.mm % step);
        return { hh: max.hh, mm: maxMm };
      }
    }

    // Fallback
    return { hh, mm: snappedMm };
  }

  private getAllowedMinutesForDraftDate(): number[] {
    const step = this.getMinuteStepSafe();
    const base: number[] = [];
    for (let m = 0; m < 60; m += step) base.push(m);

    if (!this.draftDate) return base;

    const minIso = this.normalizeIsoOrEmpty(this.minDatetime);
    const maxIso = this.normalizeIsoOrEmpty(this.maxDatetime);
    const min = minIso ? this.parseIsoLocal(minIso) : null;
    const max = maxIso ? this.parseIsoLocal(maxIso) : null;

    const hh = this.draftHour ?? 0;

    let minMinute = 0;
    let maxMinute = 59;

    if (min) {
      const minYmd = this.formatYmd(min.y, min.m, min.d);
      if (this.draftDate === minYmd && hh === min.hh) {
        minMinute = min.mm;
      }
    }

    if (max) {
      const maxYmd = this.formatYmd(max.y, max.m, max.d);
      if (this.draftDate === maxYmd && hh === max.hh) {
        maxMinute = max.mm;
      }
    }

    return base.filter(m => m >= minMinute && m <= maxMinute);
  }

  private getAllowedHoursForDraftDate(): number[] {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    if (!this.draftDate) return hours;

    const minIso = this.normalizeIsoOrEmpty(this.minDatetime);
    const maxIso = this.normalizeIsoOrEmpty(this.maxDatetime);
    const min = minIso ? this.parseIsoLocal(minIso) : null;
    const max = maxIso ? this.parseIsoLocal(maxIso) : null;

    let minH = 0;
    let maxH = 23;

    if (min) {
      const minYmd = this.formatYmd(min.y, min.m, min.d);
      if (this.draftDate === minYmd) minH = min.hh;
    }

    if (max) {
      const maxYmd = this.formatYmd(max.y, max.m, max.d);
      if (this.draftDate === maxYmd) maxH = max.hh;
    }

    return hours.filter(h => h >= minH && h <= maxH);
  }

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================
  private renderLabel(labelId: string): TemplateResult {
    if (!this.hasSlot('Label')) return html`${nothing}`;

    const labelText = this.getSlotContent('Label');
    return html`
      <div class="mb-1 flex items-center gap-2">
        <div id=${labelId} class="text-sm font-medium text-slate-800">${unsafeHTML(labelText)}</div>
        ${this.required && this.isEditing
          ? html`<div class="text-sm font-medium text-rose-600" aria-hidden="true">*</div>`
          : html`${nothing}`}
      </div>
    `;
  }

  private renderHelperOrError(helperId: string, errorId: string): TemplateResult {
    if (!this.isEditing) return html`${nothing}`;

    if ((this.error || '').trim()) {
      return html`<div id=${errorId} class="mt-1 text-sm text-rose-600">${this.error}</div>`;
    }

    if (this.hasSlot('Helper')) {
      const helperText = this.getSlotContent('Helper');
      return html`<div id=${helperId} class="mt-1 text-sm text-slate-500">${unsafeHTML(helperText)}</div>`;
    }

    return html`${nothing}`;
  }

  private renderViewMode(labelId: string): TemplateResult {
    const display = this.value ? this.formatValueForDisplay(this.value) : this.msg.viewEmpty;

    return html`
      <div class="w-full">
        ${this.renderLabel(labelId)}
        <div class="text-sm text-slate-900">${display || this.msg.viewEmpty}</div>
      </div>
    `;
  }

  private getTriggerClasses(): string {
    const hasError = !!(this.error || '').trim();
    return [
      'w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition',
      'bg-white',
      this.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      this.readonly ? 'bg-slate-50' : '',
      hasError ? 'border-rose-500' : (this.isFocused || this.isOpen ? 'border-sky-500' : 'border-slate-300'),
      !this.disabled && !this.readonly && !hasError ? 'hover:bg-slate-50' : '',
      (this.isFocused || this.isOpen) && !hasError ? 'ring-2 ring-sky-200' : '',
    ].filter(Boolean).join(' ');
  }

  private renderTrigger(triggerId: string, labelId: string, helperId: string, errorId: string): TemplateResult {
    const hasError = !!(this.error || '').trim();
    const describedBy = hasError ? errorId : (this.hasSlot('Helper') ? helperId : '');

    const placeholder = (this.placeholder || '').trim() || this.msg.placeholder;
    const text = this.displayValue || placeholder;

    const valueLabel = this.displayValue ? this.displayValue : placeholder;

    return html`
      <button
        id=${triggerId}
        type="button"
        class=${this.getTriggerClasses()}
        ?disabled=${this.disabled}
        aria-labelledby=${labelId}
        aria-describedby=${describedBy || nothing}
        aria-invalid=${hasError ? 'true' : 'false'}
        aria-required=${this.required ? 'true' : 'false'}
        aria-label=${valueLabel}
        @click=${this.handleTriggerClick}
        @focus=${this.handleTriggerFocus}
        @blur=${this.handleTriggerBlur}
      >
        <div class="min-w-0 flex-1">
          <div class=${[
            'truncate',
            this.displayValue ? 'text-slate-900' : 'text-slate-400',
          ].join(' ')}>${text}</div>
        </div>

        <div class="flex items-center gap-2">
          ${this.loading
            ? html`<div class="text-slate-500 text-xs">${this.msg.loading}</div>`
            : html`${nothing}`}

          <div class="flex items-center gap-1 text-slate-500" aria-hidden="true">
            <span class="inline-block">📅</span>
            <span class="inline-block">🕒</span>
          </div>
        </div>
      </button>
    `;
  }

  private renderCalendar(): TemplateResult {
    const y = this.viewMonthY;
    const m = this.viewMonthM;

    const firstDow = this.weekdayOfFirst(y, m); // 0..6
    const dim = this.daysInMonth(y, m);

    const cells: Array<{ y: number; m: number; d: number; inMonth: boolean }> = [];

    // leading blanks
    for (let i = 0; i < firstDow; i++) {
      cells.push({ y, m, d: 0, inMonth: false });
    }
    for (let d = 1; d <= dim; d++) {
      cells.push({ y, m, d, inMonth: true });
    }
    // trailing to complete 6 rows (optional but stable UI)
    while (cells.length < 42) {
      cells.push({ y, m, d: 0, inMonth: false });
    }

    const monthLabel = (() => {
      try {
        const loc = this.getLocaleSafe();
        return new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'long' }).format(new Date(y, m - 1, 1));
      } catch {
        return `${y}-${this.pad2(m)}`;
      }
    })();

    const selectedYmd = this.draftDate;

    return html`
      <div class="w-full">
        <div class="flex items-center justify-between mb-2">
          <button
            type="button"
            class="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            @click=${this.handlePrevMonth}
            aria-label=${this.msg.monthPrev}
          >
            ‹
          </button>
          <div class="text-sm font-medium text-slate-800">${monthLabel}</div>
          <button
            type="button"
            class="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            @click=${this.handleNextMonth}
            aria-label=${this.msg.monthNext}
          >
            ›
          </button>
        </div>

        <div class="grid grid-cols-7 gap-1 text-xs text-slate-500 mb-1" aria-hidden="true">
          <div class="text-center">Su</div>
          <div class="text-center">Mo</div>
          <div class="text-center">Tu</div>
          <div class="text-center">We</div>
          <div class="text-center">Th</div>
          <div class="text-center">Fr</div>
          <div class="text-center">Sa</div>
        </div>

        <div class="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
          ${cells.map(c => {
            if (!c.inMonth) {
              return html`<div class="h-9" aria-hidden="true"></div>`;
            }

            const ymd = this.formatYmd(c.y, c.m, c.d);
            const allowed = this.isDateAllowed(ymd);
            const isSelected = selectedYmd === ymd;

            const classes = [
              'h-9 w-9 rounded-md text-sm border transition flex items-center justify-center',
              allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
              isSelected ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-800',
              allowed && !isSelected ? 'hover:bg-slate-50' : '',
              allowed ? 'focus:outline-none focus:ring-2 focus:ring-sky-200' : '',
            ].filter(Boolean).join(' ');

            return html`
              <button
                type="button"
                class=${classes}
                role="gridcell"
                aria-selected=${isSelected ? 'true' : 'false'}
                aria-disabled=${allowed ? 'false' : 'true'}
                @click=${() => allowed && this.handleSelectDay({ y: c.y, m: c.m, d: c.d })}
              >
                ${c.d}
              </button>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderTimeColumns(): TemplateResult {
    const hours = this.getAllowedHoursForDraftDate();
    const minutes = this.getAllowedMinutesForDraftDate();

    const selectedH = this.draftHour;
    const selectedM = this.draftMinute;

    const colBase = 'w-full rounded-lg border border-slate-200 bg-white p-2';

    return html`
      <div class="grid grid-cols-2 gap-3">
        <div class=${colBase}>
          <div class="mb-2 text-xs font-medium text-slate-600">${this.msg.hours}</div>
          <div class="max-h-48 overflow-auto grid grid-cols-3 gap-1" role="list">
            ${hours.map(h => {
              const selected = selectedH === h;
              const classes = [
                'rounded-md border px-2 py-1 text-sm transition',
                'text-center',
                selected ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-800',
                !selected ? 'hover:bg-slate-50' : '',
                'cursor-pointer',
              ].filter(Boolean).join(' ');

              return html`
                <button type="button" class=${classes} @click=${() => this.handleSelectHour(h)}>
                  ${this.pad2(h)}
                </button>
              `;
            })}
          </div>
        </div>

        <div class=${colBase}>
          <div class="mb-2 text-xs font-medium text-slate-600">${this.msg.minutes}</div>
          <div class="max-h-48 overflow-auto grid grid-cols-3 gap-1" role="list">
            ${minutes.map(m => {
              const selected = selectedM === m;
              const classes = [
                'rounded-md border px-2 py-1 text-sm transition',
                'text-center',
                selected ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-800',
                !selected ? 'hover:bg-slate-50' : '',
                'cursor-pointer',
              ].filter(Boolean).join(' ');

              return html`
                <button type="button" class=${classes} @click=${() => this.handleSelectMinute(m)}>
                  ${this.pad2(m)}
                </button>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  private renderActions(): TemplateResult {
    return html`
      <div class="mt-3 flex items-center justify-between">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          @click=${this.handleClear}
        >
          ${this.msg.clear}
        </button>

        <button
          type="button"
          class="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700"
          @click=${this.handleConfirm}
        >
          ${this.msg.confirm}
        </button>
      </div>
    `;
  }

  private renderPickerPanel(): TemplateResult {
    if (!this.isOpen) return html`${nothing}`;

    return html`
      <div
        class="absolute z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg p-3"
        role="dialog"
        aria-modal="true"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${this.renderCalendar()}
          <div class="w-full">
            ${this.renderTimeColumns()}
            ${this.renderActions()}
          </div>
        </div>
      </div>
    `;
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    const uid = this.id || `dtpp-${Math.random().toString(16).slice(2)}`;
    const labelId = `${uid}-label`;
    const triggerId = `${uid}-trigger`;
    const helperId = `${uid}-helper`;
    const errorId = `${uid}-error`;

    if (!this.isEditing) {
      return html`<div class="w-full">${this.renderViewMode(labelId)}</div>`;
    }

    const containerClasses = [
      'relative w-full',
    ].join(' ');

    return html`
      <div class=${containerClasses}>
        ${this.renderLabel(labelId)}

        ${this.renderTrigger(triggerId, labelId, helperId, errorId)}

        ${this.renderPickerPanel()}

        ${this.renderHelperOrError(helperId, errorId)}

        <!-- Hidden input for forms (optional) -->
        ${this.name
          ? html`<input type="hidden" name=${this.name} .value=${this.value ?? ''} />`
          : html`${nothing}`}
      </div>
    `;
  }
}
