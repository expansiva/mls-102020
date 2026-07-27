/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetThemeConfirmationLogic.ts" enhancement="_blank"/>

// Pure logic for the Theme Confirmation widget. Kept separate from the Lit component
// so the color helpers are unit-testable. The summary type is structural (shared/ must
// not depend on a specific agent); agentNewTheme passes a compatible NtThemeSummary.

export interface ThemeConfirmSwatch { token: string; label: string; color: string; }
export interface ThemeConfirmSignatureRow { aspect: string; value: string; }
export interface ThemeConfirmSummary {
  name: string;
  displayName: string;
  background: { kind: string; css: string };
  palette: ThemeConfirmSwatch[];
  signature: ThemeConfirmSignatureRow[];
}
export interface ThemeConfirmationValue {
  title: string;
  summary: ThemeConfirmSummary;
}
export type ConfirmAction = 'continue' | 'cancel';

// Parse a CSS color (#rgb, #rrggbb, rgb()/rgba()) to {r,g,b}. Alpha ignored. null if unknown.
export function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  const c = (color || '').trim();
  const hex = c.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  const rgb = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) {
    return { r: Math.round(Number(rgb[1])), g: Math.round(Number(rgb[2])), b: Math.round(Number(rgb[3])) };
  }
  return null;
}

// A legible overlay text color for a swatch background (black on light, white on dark).
export function readableTextOn(color: string): '#000000' | '#ffffff' {
  const rgb = parseColorToRgb(color);
  if (!rgb) return '#000000';
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 150 ? '#000000' : '#ffffff';
}
