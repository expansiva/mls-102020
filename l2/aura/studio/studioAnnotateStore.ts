/// <mls fileReference="_102020_/l2/aura/studio/studioAnnotateStore.ts" enhancement="_blank" />
// Where the page annotation (studioAnnotate, owned by the editor) and the AI tab of the Pages plugin meet.
//
// Two directions, both as data:
//  - the editor PUBLISHES the marks — numbered, with their notes and, per element, exactly what the agent's
//    `IEditElement` carries (tag, organism, path in the organism, anchor path, class). Never a live node: the
//    panel is chrome, and the state of an element is the editor's.
//  - the panel SENDS COMMANDS (start, stop, note, remove, focus, clear). The editor registers the handler when
//    it arms; with no editor armed a command is simply not heard, and the panel shows the button disabled.
//
// Not collabState, for the same reason as the page tree: nothing else reads it, and the state keeps a log.

/** One marked element, in the shape agentEditPage takes (`EditElement`) plus a label for the panel. */
export interface IAnnotElement {
  tag: string;
  organism: string | null;
  organismPath: string;
  anchorPath: unknown[] | null;
  literal: string;
  /** What the panel shows: organism id, molecule name or tag, with a bit of text. */
  label: string;
}

export interface IAnnotMark {
  n: number;
  note: string;
  elements: IAnnotElement[];
  /** Some element is an item of a list: the change applies to every row. */
  repeated: boolean;
}

/**
 * The free drawing of the pen: an IMAGE of the drawn area (the page with the strokes over it), shown in the AI tab.
 * It does not go to the agent yet — the agents cannot receive images; when they can, this is what will be sent.
 */
export interface IAnnotDrawing {
  /** Stable while the drawing lives: the panel's handle for its note and its removal. */
  id: number;
  /** PNG data URL, cut to the strokes; empty while the first capture runs. */
  image: string;
  note: string;
  strokes: number;
  /** Capturing the page right now. */
  capturing: boolean;
  /** Still being drawn: the image is made when the drawing ends (Done, Esc, the rectangle). */
  pending: boolean;
  /** The image could not be made. */
  failed: boolean;
  /** Why, as the browser said it (shown in the AI tab). */
  error: string;
}

export interface IAnnotState {
  /** The editor is armed and can annotate (the button is usable). */
  available: boolean;
  /** Annotating right now (the pointer draws). */
  active: boolean;
  marks: IAnnotMark[];
  /** The mark whose note balloon is open, or null. */
  focused: number | null;
  /** The page the marks belong to; marks never travel to another page. */
  page: string;
  /** The page FILE on screen, for the panel to check the marks are about the page it is editing. */
  file: { project: number; folder: string; shortName: string } | null;
  /** The pen's free drawings, oldest first — each time the pen is taken up is a new one. */
  drawings: IAnnotDrawing[];
}

export type AnnotCommand =
  | { kind: 'start' }
  | { kind: 'stop' }
  | { kind: 'clear' }
  | { kind: 'note'; n: number; note: string }
  | { kind: 'remove'; n: number }
  | { kind: 'focus'; n: number }
  | { kind: 'drawingNote'; id: number; note: string }
  | { kind: 'removeDrawing'; id: number };

type Listener = (state: IAnnotState) => void;
type Handler = (command: AnnotCommand) => void;

const EMPTY: IAnnotState = { available: false, active: false, marks: [], focused: null, page: '', file: null, drawings: [] };

let state: IAnnotState = EMPTY;
let handler: Handler | null = null;
const listeners = new Set<Listener>();

export function getAnnotState(): IAnnotState {
  return state;
}

/** The editor publishes; every listener hears the new state. */
export function publishAnnotState(next: IAnnotState): void {
  state = next;
  for (const listener of [...listeners]) listener(state);
}

/** Called now with the current state and on every change. Returns the unsubscribe. */
export function onAnnotStateChange(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => { listeners.delete(listener); };
}

/** The editor takes the commands while it is armed; `null` lets them go and empties the state. */
export function setAnnotHandler(next: Handler | null): void {
  handler = next;
  if (!next) publishAnnotState(EMPTY);
}

/** The panel's way in. Nothing armed = nothing happens (the button says so). */
export function annotCommand(command: AnnotCommand): void {
  handler?.(command);
}
