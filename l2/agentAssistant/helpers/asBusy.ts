/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asBusy.ts" enhancement="_blank"/>

// Loading overlay around a round's widget. The answer handler runs outside the pooling cycle
// (lookups, the command through /execBff, applying intents) and can take seconds; without this
// the widget looks frozen and the button can be clicked again. The overlay stays until the task
// has been updated; the widget stays read-only afterwards so the round cannot be sent twice.

const STYLE = `
.as-busy-host { position: relative; }
.as-busy-overlay {
  position: absolute; inset: 0; z-index: 10;
  display: none; align-items: center; justify-content: center; gap: 10px;
  background: rgba(127, 127, 127, 0.25); backdrop-filter: blur(1px);
  cursor: progress; font-size: 14px; border-radius: inherit;
}
.as-busy-host[data-busy="true"] .as-busy-overlay { display: flex; }
.as-busy-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid currentColor; border-right-color: transparent;
  animation: as-busy-spin 0.8s linear infinite;
}
@keyframes as-busy-spin { to { transform: rotate(360deg); } }
`;

export interface AsBusyHost {
  host: HTMLElement;
  // true when this call took the lock; false when a previous answer is still running
  start(text: string): boolean;
  // keepLocked=false hands the round back to the user (the answer could not be applied at all)
  stop(keepLocked?: boolean): void;
}

export function createBusyHost(widget: HTMLElement): AsBusyHost {
  const host = document.createElement('div');
  host.className = 'as-busy-host';
  const style = document.createElement('style');
  style.textContent = STYLE;
  const overlay = document.createElement('div');
  overlay.className = 'as-busy-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  const spinner = document.createElement('span');
  spinner.className = 'as-busy-spinner';
  const label = document.createElement('span');
  overlay.append(spinner, label);
  host.append(style, widget, overlay);

  let busy = false;
  const setReadonly = (value: boolean): void => {
    (widget as unknown as { readonly: boolean }).readonly = value;
  };
  return {
    host,
    start(text: string): boolean {
      if (busy) return false;
      busy = true;
      label.textContent = text;
      setReadonly(true);
      host.dataset.busy = 'true';
      host.setAttribute('aria-busy', 'true');
      return true;
    },
    stop(keepLocked = true): void {
      host.dataset.busy = 'false';
      host.removeAttribute('aria-busy');
      if (!keepLocked) {
        busy = false;
        setReadonly(false);
      }
    },
  };
}
