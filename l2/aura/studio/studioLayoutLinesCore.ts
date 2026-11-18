/// <mls fileReference="_102020_/l2/aura/studio/studioLayoutLinesCore.ts" enhancement="_blank" />
// What the layout lines draw, from measurements. PURE: no DOM, no getComputedStyle — the layer
// (studioLayoutLines) measures, this decides, so the rules are checked on plain numbers.
//
// THE RULES THAT ARE NOT TASTE
//  - Only DECLARED space is painted. The free space a `justify-content: space-between` leaves between
//    two children is not spacing anyone wrote; painting it as gap made the first mockup lie. A gap is
//    at most the declared `column-gap` / `row-gap`, never the whole distance between the boxes.
//  - Values are text only where they help: on request (the hovered element and its direct children)
//    or everywhere when the person asked for it. Painted areas are always on.
//  - Outlines are a stylesheet, not measurements: one rule per depth, later rules win at equal
//    specificity, so `scope * * *` recolours what is three levels deep.

export interface IBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ISides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type LineRectKind = 'margin' | 'padding' | 'gap' | 'column' | 'twelve' | 'baseline';

export interface ILineRect extends IBox {
  kind: LineRectKind;
  /** The value written in the middle of the rect, when it is shown. */
  label?: string;
}

/** What the layer measured of one element. */
export interface ISpacingMeasure {
  box: IBox;
  margin: ISides;
  padding: ISides;
  /** `display` as computed: only flex and grid containers have a gap to paint. */
  display: string;
  rowGap: number;
  columnGap: number;
  /** The boxes of its element children, in order. */
  children: IBox[];
}

/** Smallest value worth a label: below this the number covers what it measures. */
export const LABEL_MIN = 4;

/** Outline colours by depth; the list repeats past its end. */
export const DEPTH_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#a855f7', '#ef4444'];

/** How many depth rules the outline stylesheet has; deeper levels keep the last colour. */
export const OUTLINE_DEPTH = 12;

const round = (value: number): number => Math.round(value);
const text = (value: number): string => String(round(value));

/** Margin, padding and declared gap of one element, as rects. `values` puts the px on them. */
export function spacingRects(m: ISpacingMeasure, values: boolean): ILineRect[] {
  const out: ILineRect[] = [];
  const { box, margin: mg, padding: pd } = m;
  const push = (kind: LineRectKind, x: number, y: number, w: number, h: number, value: number): void => {
    if (w < 1 || h < 1) return;
    out.push({ kind, x, y, w, h, label: values && value >= LABEL_MIN ? text(value) : undefined });
  };

  // Margin: outside the border box.
  push('margin', box.x, box.y - mg.top, box.w, mg.top, mg.top);
  push('margin', box.x, box.y + box.h, box.w, mg.bottom, mg.bottom);
  push('margin', box.x - mg.left, box.y, mg.left, box.h, mg.left);
  push('margin', box.x + box.w, box.y, mg.right, box.h, mg.right);

  // Padding: inside it. An even padding is labelled once, on top.
  const even = pd.top === pd.right && pd.top === pd.bottom && pd.top === pd.left;
  const innerH = box.h - pd.top - pd.bottom;
  push('padding', box.x, box.y, box.w, pd.top, pd.top);
  push('padding', box.x, box.y + box.h - pd.bottom, box.w, pd.bottom, even ? 0 : pd.bottom);
  push('padding', box.x, box.y + pd.top, pd.left, innerH, even ? 0 : pd.left);
  push('padding', box.x + box.w - pd.right, box.y + pd.top, pd.right, innerH, even ? 0 : pd.right);

  // Gap: only between consecutive children of a flex or grid container, and only as wide as declared.
  if (!/flex|grid/u.test(m.display)) return out;
  for (let i = 0; i < m.children.length - 1; i += 1) {
    const a = m.children[i];
    const b = m.children[i + 1];
    const sideBySide = b.x >= a.x + a.w - 1 && Math.abs(b.y - a.y) < Math.max(a.h, 1);
    if (sideBySide) {
      const w = Math.min(m.columnGap, b.x - (a.x + a.w));
      const y = Math.min(a.y, b.y);
      push('gap', a.x + a.w, y, w, Math.max(a.y + a.h, b.y + b.h) - y, w);
    } else if (b.y >= a.y + a.h - 1) {
      const h = Math.min(m.rowGap, b.y - (a.y + a.h));
      const x = Math.min(a.x, b.x);
      push('gap', x, a.y + a.h, Math.max(a.x + a.w, b.x + b.w) - x, h, h);
    }
  }
  return out;
}

/**
 * The columns of a grid container: `columns` are the computed track widths
 * (`grid-template-columns` resolved to px), laid from the content edge with the column gap between.
 */
export function gridRects(box: IBox, contentLeft: number, columns: readonly number[], columnGap: number): ILineRect[] {
  const out: ILineRect[] = [];
  let x = box.x + contentLeft;
  columns.forEach((width, index) => {
    if (width >= 1) out.push({ kind: 'column', x, y: box.y, w: width, h: box.h, label: `${index + 1} · ${text(width)}` });
    x += width;
    if (index < columns.length - 1 && columnGap >= 1) {
      out.push({ kind: 'gap', x, y: box.y, w: columnGap, h: box.h, label: text(columnGap) });
      x += columnGap;
    }
  });
  return out;
}

/** `grid-template-columns` as computed ("240px 320.5px") → widths; anything not in px is dropped. */
export function parseTracks(value: string): number[] {
  return value.split(/\s+/u).filter((token) => /px$/u.test(token)).map((token) => parseFloat(token)).filter((n) => !Number.isNaN(n));
}

/** The 12-column reference over a box, with a fixed gutter. */
export function twelveColumnRects(box: IBox, gutter = 24, count = 12): ILineRect[] {
  const width = (box.w - gutter * (count - 1)) / count;
  if (width <= 0) return [];
  return Array.from({ length: count }, (_, i) => ({ kind: 'twelve' as const, x: box.x + i * (width + gutter), y: box.y, w: width, h: box.h }));
}

/** The outline stylesheet for everything under `scope`, coloured by depth (or one colour). */
export function outlineCss(scope: string, mono: boolean): string {
  if (mono) return `${scope} * { outline: 1px solid rgba(99,102,241,0.75) !important; outline-offset: -1px !important; }`;
  const rules: string[] = [];
  for (let depth = 0; depth < OUTLINE_DEPTH; depth += 1) {
    const color = DEPTH_COLORS[depth % DEPTH_COLORS.length];
    rules.push(`${scope}${' *'.repeat(depth + 1)} { outline: 1px solid ${color} !important; outline-offset: -1px !important; }`);
  }
  return rules.join('\n');
}

/** Whether two boxes overlap — what decides that an element is worth measuring at all. */
export function intersects(a: IBox, b: IBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
