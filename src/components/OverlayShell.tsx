import type React from 'react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { useGame } from '../store/gameContext';
import { useGameState } from '../store/useGameState';
import { closeLabel, flightDeckLabel } from './closeLabel';

/**
 * How a screen's frame and panel look. Every class is written out whole (a
 * composed class name would be missed by Tailwind), and each variant is one
 * of the looks the overlay screens already had:
 * - `window`: a panel whose sections pad themselves (Galaxy Map, Hangar,
 *   Analytics)
 * - `form`: a panel that pads and scrolls itself (Free Flight)
 * - `debrief`: a centred card on a darker backdrop (the Debrief)
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
    frame: 'p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto',
    panel: 'p-6 sm:p-8 flex flex-col items-center text-center my-auto',
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
  /**
   * What sits over the panel but belongs to the screen, such as a confirm. It
   * stays inside the frame, so it is part of the dialog.
   */
  over?: ReactNode;
  children: ReactNode;
}

/**
 * The frame every overlay screen shares: fixed below the header, so the
 * header's buttons stay clickable, and a modal dialog over the Flight Deck.
 * A screen renders its content as `children`; the Close and Flight Deck
 * buttons below are the shell's too, for the screen to place in its header.
 * The dialog is one element (the frame), so a focus trap and an Esc contract
 * can be added here for every overlay at once.
 */
export const OverlayShell: React.FC<OverlayShellProps> = ({
  variant,
  width,
  labelledBy,
  focusOnOpen = false,
  over,
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
      aria-modal="true"
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
      {over}
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
  return (
    <button
      type="button"
      onClick={onClose}
      className={
        look === 'compact'
          ? 'px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer'
          : 'px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer'
      }
    >
      {closeLabel(opener)}
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

  return (
    <button
      type="button"
      onClick={() => send({ type: 'PRESS_PLAY' })}
      className={
        compact
          ? 'px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-cyan-950 whitespace-nowrap'
          : 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/60'
      }
      title="Launch directly into the cockpit flight deck"
    >
      <Play className="w-3.5 h-3.5 fill-current" />
      <span>{flightDeckLabel(runPaused)}</span>
    </button>
  );
};
