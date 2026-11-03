import type React from 'react';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { useGame } from '../app/useGame';
import { useGameState } from '../app/useGameState';
import { closeLabel, flightDeckLabel } from './closeLabel';
import { useEscLayer } from '../app/escLayers';

/**
 * How a screen's frame and panel look. Every class is written out whole (a
 * composed class name would be missed by Tailwind), and each variant is one
 * of the looks the overlay screens already had:
 * - `window`: a panel whose sections pad themselves (Galaxy Map, Hangar,
 *   Analytics)
 * - `form`: a panel that pads and scrolls itself (Free Flight)
 * - `debrief`: a centred card on a darker backdrop, never taller than the
 *   window and not scrolling itself, so the Debrief can scroll its body inside
 *   it while its action buttons stay on screen. The frame keeps only a thin
 *   vertical margin, so a card that is a little taller than the window's
 *   usual padding leaves (the Debrief of a Stage, at 900px) still fits whole
 * - `pause`: a small centred card (the Pause Menu)
 */
const VARIANTS = {
  window: {
    frame: 'p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto',
    panel: 'overflow-hidden flex flex-col max-h-[90vh]',
  },
  form: {
    frame: 'p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto',
    panel: 'p-6 flex flex-col max-h-[90vh] overflow-y-auto',
  },
  debrief: {
    frame: 'px-3 py-2 sm:px-6 bg-slate-950/85 backdrop-blur-md',
    panel: 'flex flex-col max-h-full text-center',
  },
  pause: {
    frame: 'p-4 bg-slate-950/80 backdrop-blur-md',
    panel: 'p-6 text-center outline-none',
  },
} as const;

const WIDTHS = {
  sm: 'max-w-sm',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
} as const;

export interface OverlayShellProps {
  variant: keyof typeof VARIANTS;
  width: keyof typeof WIDTHS;
  /** The id of the element that names the screen (its heading). */
  labelledBy: string;
  /** The panel takes focus when the screen opens, so no button has it. */
  focusOnOpen?: boolean;
  children: ReactNode;
}

/**
 * The frame every overlay screen shares: fixed below the header, and a dialog
 * over the Flight Deck. The header sits above it (see `HeaderNav`), so its
 * buttons and its audio panel stay usable; the dialog is not `aria-modal`,
 * because the header is meant to stay reachable. The Flight Deck behind is
 * `inert` (see `App`), so Tab cycles through the header and the overlay only.
 * A screen renders its content as `children`; the Close and Flight Deck
 * buttons below are the shell's too, for the screen to place in its header.
 */
export const OverlayShell: React.FC<OverlayShellProps> = ({
  variant,
  width,
  labelledBy,
  focusOnOpen = false,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnOpen) panelRef.current?.focus();
  }, [focusOnOpen]);

  const look = VARIANTS[variant];
  return (
    <div
      role="dialog"
      aria-labelledby={labelledBy}
      className={`fixed inset-x-0 bottom-0 top-[var(--header-height,0px)] z-50 flex items-center justify-center ${look.frame}`}
    >
      <div
        ref={panelRef}
        tabIndex={focusOnOpen ? -1 : undefined}
        className={`w-full ${WIDTHS[width]} rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl ${look.panel}`}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * A confirm over a screen (Wipe, Factory Reset): the backdrop and the card,
 * an `alertdialog` named by `title` and described by `message`. While it is
 * open it is a layer on the Esc stack (see `escLayers.ts`): Esc cancels the
 * confirm and nothing more, wherever focus is (on the card, dropped to the
 * page by a click on the backdrop, or tabbed out), unless the header's audio
 * panel is open above it. With the confirm gone, the next Esc goes back from
 * the screen as it always did. A click on the backdrop does nothing: a modal
 * does not close on an outside click.
 *
 * Cancel takes focus when the confirm opens, so Enter or Space straight away
 * cancels, and focus goes back to where it was when it closes. The screen
 * under the confirm is the caller's to make `inert`; the card is not
 * `aria-modal`, because the header stays reachable (as with `OverlayShell`).
 */
export const OverlayConfirm: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel, onConfirm, onCancel }) => {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Read while rendering, not in the effect: by then the screen under the
  // confirm is inert, and the browser may have moved focus off the button that
  // opened it.
  const [before] = useState(() => document.activeElement);

  useEffect(() => {
    cancelRef.current?.focus();
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus();
    };
  }, [before]);

  useEscLayer('confirm', onCancel);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-rose-900/80 bg-slate-900 shadow-2xl p-6 text-center outline-none duration-150"
      >
        <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-center mx-auto mb-4 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3
          id={titleId}
          className="text-xl font-bold font-display text-white mb-2"
        >
          {title}
        </h3>

        <p
          id={messageId}
          className="text-xs text-slate-300 leading-relaxed mb-4"
        >
          {message}
        </p>

        <div className="flex items-center gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-colors shadow-lg shadow-rose-950/50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * The button that closes the screen, labelled for where it returns to. `back`
 * is the Galaxy Map's return to the Debrief it was opened from.
 */
export const OverlayCloseButton: React.FC<{
  look?: 'regular' | 'compact' | 'back';
}> = ({ look = 'regular' }) => {
  const { send } = useGame();
  const opener = useGameState((state) => state.opener);
  const onClose = () => send({ type: 'PRESS_CLOSE' });

  if (look === 'back') {
    return (
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-cyan-500/50 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{closeLabel(opener)}</span>
      </button>
    );
  }
  // Back to the Pause Menu has the arrow Back to Debrief has.
  const arrow = opener === 'pause-menu' || opener === 'flight-deck';
  return (
    <button
      type="button"
      onClick={onClose}
      className={`${
        look === 'compact'
          ? 'px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer'
          : 'px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer'
      }${arrow ? ' flex items-center gap-1' : ''}`}
    >
      {arrow ? (
        <>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{closeLabel(opener)}</span>
        </>
      ) : (
        closeLabel(opener)
      )}
    </button>
  );
};

/** The button that goes straight to the Flight Deck: Resume Flight on a paused Run. */
export const OverlayFlightDeckButton: React.FC<{
  look?: 'regular' | 'compact';
}> = ({ look = 'regular' }) => {
  const { send } = useGame();
  // A paused Run is waiting, so the button resumes it.
  const runPaused = useGameState((state) => state.phase === 'paused');
  const compact = look === 'compact';
  const label = flightDeckLabel(runPaused);

  return (
    <button
      type="button"
      onClick={() => send({ type: 'PRESS_FLIGHT_DECK' })}
      className={
        compact
          ? 'px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-cyan-950 whitespace-nowrap'
          : 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/60'
      }
      title={label}
    >
      <Play className="w-3.5 h-3.5 fill-current" />
      <span>{label}</span>
    </button>
  );
};
