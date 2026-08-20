/// <mls fileReference="_102020_/l2/aura/agentManageHeader/helpers/logoGeometry.ts" enhancement="_blank"/>

// Geometry of a brand mark, measured from its markup. Pure and dependency-free.
//
// The validator can already tell whether a mark is SAFE and monochrome. What made the first real
// marks look amateur is geometric and just as measurable: a detail 3px wide at render size, two
// different stroke widths in the same drawing, a motif floating in a corner of the viewBox. This
// module turns the markup into numbers so those can be REFUSED instead of shipped.
//
// The path reader is deliberately approximate: it tracks the current point through the usual
// commands and treats control points as part of the extent. That overestimates a curve's box
// slightly, which is the safe direction for a "this shape is too small" check.

export interface ShapeBox {
  name: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MarkGeometry {
  /** viewBox width/height (0 when absent or malformed). */
  boxWidth: number;
  boxHeight: number;
  shapes: ShapeBox[];
  /** Union of every shape box — how much of the viewBox the drawing actually uses. */
  union?: ShapeBox;
  /** Distinct stroke-width values used across the mark. */
  strokeWidths: number[];
}

const NUMBER = /-?\d*\.?\d+(?:e-?\d+)?/gi;

function numbers(text: string): number[] {
  return (text.match(NUMBER) ?? []).map(Number).filter((value) => Number.isFinite(value));
}

function attr(tag: string, name: string): string | undefined {
  const match = new RegExp('[ \\t\\n]' + name + '[ \\t\\n]*=[ \\t\\n]*"([^"]*)"', 'u').exec(tag);
  return match ? match[1].trim() : undefined;
}

function num(tag: string, name: string, fallback = 0): number {
  const raw = attr(tag, name);
  const value = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function box(name: string, xs: number[], ys: number[]): ShapeBox | undefined {
  if (xs.length === 0 || ys.length === 0) return undefined;
  return { name, minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/**
 * Extent of a `d` attribute: walks the commands tracking the current point, so relative deltas are
 * resolved instead of being read as coordinates (the reason a naive min/max over the numbers is
 * useless here).
 */
export function pathBox(d: string): ShapeBox | undefined {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let command = '';
  let index = 0;

  const take = (count: number): number[] => {
    const values: number[] = [];
    while (values.length < count && index < tokens.length && !/[a-z]/iu.test(tokens[index])) {
      values.push(Number(tokens[index]));
      index += 1;
    }
    return values;
  };
  const plot = () => { xs.push(x); ys.push(y); };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/[a-z]/iu.test(token)) {
      command = token;
      index += 1;
      if (command === 'Z' || command === 'z') {
        x = startX;
        y = startY;
        plot();
      }
      continue;
    }
    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case 'M':
      case 'L':
      case 'T': {
        const [dx, dy] = take(2);
        if (dx === undefined || dy === undefined) { index += 1; break; }
        x = relative ? x + dx : dx;
        y = relative ? y + dy : dy;
        if (command.toUpperCase() === 'M') { startX = x; startY = y; }
        plot();
        break;
      }
      case 'H': {
        const [dx] = take(1);
        if (dx === undefined) { index += 1; break; }
        x = relative ? x + dx : dx;
        plot();
        break;
      }
      case 'V': {
        const [dy] = take(1);
        if (dy === undefined) { index += 1; break; }
        y = relative ? y + dy : dy;
        plot();
        break;
      }
      case 'C': {
        const values = take(6);
        if (values.length < 6) { index += 1; break; }
        for (let pair = 0; pair < 3; pair += 1) {
          const pointX = relative ? x + values[pair * 2] : values[pair * 2];
          const pointY = relative ? y + values[pair * 2 + 1] : values[pair * 2 + 1];
          xs.push(pointX);
          ys.push(pointY);
          if (pair === 2) { x = pointX; y = pointY; }
        }
        break;
      }
      case 'S':
      case 'Q': {
        const values = take(4);
        if (values.length < 4) { index += 1; break; }
        for (let pair = 0; pair < 2; pair += 1) {
          const pointX = relative ? x + values[pair * 2] : values[pair * 2];
          const pointY = relative ? y + values[pair * 2 + 1] : values[pair * 2 + 1];
          xs.push(pointX);
          ys.push(pointY);
          if (pair === 1) { x = pointX; y = pointY; }
        }
        break;
      }
      case 'A': {
        const values = take(7);
        if (values.length < 7) { index += 1; break; }
        x = relative ? x + values[5] : values[5];
        y = relative ? y + values[6] : values[6];
        plot();
        break;
      }
      default:
        index += 1;
        break;
    }
  }

  return box('path', xs, ys);
}

/** Measures every shape of a mark, plus the viewBox and the stroke widths in play. */
export function markGeometry(svg: string): MarkGeometry {
  const rootTag = svg.slice(0, svg.indexOf('>') + 1);
  const viewBox = numbers(attr(rootTag, 'viewBox') ?? '');
  const boxWidth = viewBox.length === 4 ? viewBox[2] : 0;
  const boxHeight = viewBox.length === 4 ? viewBox[3] : 0;

  const shapes: ShapeBox[] = [];
  for (const match of svg.matchAll(/<(rect|circle|ellipse|line|polygon|polyline|path)\b[^>]*>/gu)) {
    const [tag, name] = [match[0], match[1]];
    let shape: ShapeBox | undefined;
    if (name === 'rect') {
      const x = num(tag, 'x');
      const y = num(tag, 'y');
      shape = box('rect', [x, x + num(tag, 'width')], [y, y + num(tag, 'height')]);
    } else if (name === 'circle') {
      const cx = num(tag, 'cx');
      const cy = num(tag, 'cy');
      const r = num(tag, 'r');
      shape = box('circle', [cx - r, cx + r], [cy - r, cy + r]);
    } else if (name === 'ellipse') {
      const cx = num(tag, 'cx');
      const cy = num(tag, 'cy');
      const rx = num(tag, 'rx');
      const ry = num(tag, 'ry');
      shape = box('ellipse', [cx - rx, cx + rx], [cy - ry, cy + ry]);
    } else if (name === 'line') {
      shape = box('line', [num(tag, 'x1'), num(tag, 'x2')], [num(tag, 'y1'), num(tag, 'y2')]);
    } else if (name === 'polygon' || name === 'polyline') {
      const points = numbers(attr(tag, 'points') ?? '');
      shape = box(name, points.filter((_, i) => i % 2 === 0), points.filter((_, i) => i % 2 === 1));
    } else {
      shape = pathBox(attr(tag, 'd') ?? '');
    }
    if (shape) shapes.push(shape);
  }

  const strokeWidths = [...new Set(
    [...svg.matchAll(/stroke-width[ \t\n]*=[ \t\n]*"([^"]*)"/gu)]
      .map((match) => Number(match[1]))
      .filter((value) => Number.isFinite(value)),
  )].sort((left, right) => left - right);

  const union = shapes.length
    ? {
      name: 'union',
      minX: Math.min(...shapes.map((shape) => shape.minX)),
      minY: Math.min(...shapes.map((shape) => shape.minY)),
      maxX: Math.max(...shapes.map((shape) => shape.maxX)),
      maxY: Math.max(...shapes.map((shape) => shape.maxY)),
    }
    : undefined;

  return { boxWidth, boxHeight, shapes, union, strokeWidths };
}

/** Diagonal of a box — the single number that says "is this thing big enough to be seen". */
export function boxDiagonal(shape: ShapeBox): number {
  return Math.hypot(shape.maxX - shape.minX, shape.maxY - shape.minY);
}

/** Human-readable geometry line for a prompt or a log. */
export function describeGeometry(geometry: MarkGeometry): string {
  const coverage = geometry.union && geometry.boxWidth && geometry.boxHeight
    ? `${Math.round(((geometry.union.maxX - geometry.union.minX) / geometry.boxWidth) * 100)}%x`
      + `${Math.round(((geometry.union.maxY - geometry.union.minY) / geometry.boxHeight) * 100)}%`
    : 'unknown';
  return `viewBox ${geometry.boxWidth}x${geometry.boxHeight} · ${geometry.shapes.length} shapes · `
    + `coverage ${coverage} · stroke-width [${geometry.strokeWidths.join(', ') || 'none'}]`;
}
