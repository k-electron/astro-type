import type React from 'react';
import { useRef, useEffect } from 'react';
import {
  KEY_FINGER_MAP,
  FINGER_LANES,
  FINGER_DISPLAY_NAMES,
} from '../data/curriculum';
import { useGameState } from '../store/useGameState';

/** The Stage's text and where the player is in it. It selects only what it shows. */
export const TextPromptStream: React.FC = () => {
  const stage = useGameState((state) => state.run.currentStage);
  const currentIndex = useGameState((state) => state.run.currentCharIndex);
  const errorIndices = useGameState((state) => state.run.errorIndices);
  const fullText = stage.sampleText;
  const { targetWpm, techniqueTip, focusFingers } = stage;
  const stageTitle = `${stage.title} · ${stage.subtitle}`;
  const activeCharRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll so current text remains centered
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex is the trigger, not an input: scroll each time the typed index moves.
  useEffect(() => {
    if (activeCharRef.current && containerRef.current) {
      const activeEl = activeCharRef.current;
      const container = containerRef.current;
      const offsetTop = activeEl.offsetTop - container.offsetTop;
      if (
        offsetTop > container.clientHeight * 0.5 ||
        offsetTop < container.scrollTop
      ) {
        container.scrollTo({
          top: Math.max(0, offsetTop - 50),
          behavior: 'smooth',
        });
      }
    }
  }, [currentIndex]);

  const progressPercent = Math.min(
    100,
    Math.round((currentIndex / fullText.length) * 100),
  );
  const currentChar = fullText[currentIndex] || '';
  const charInfo = currentChar
    ? KEY_FINGER_MAP[currentChar] || KEY_FINGER_MAP[currentChar.toLowerCase()]
    : null;
  const laneInfo = charInfo ? FINGER_LANES[charInfo.lane] : null;

  return (
    <section
      aria-label="Text prompt"
      className="w-full flex flex-col rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur-md overflow-hidden"
    >
      {/* Top Header bar with live target finger indicator (Fixed Height: h-11) */}
      <div className="h-11 flex items-center justify-between gap-3 px-4 border-b border-slate-800/80 bg-slate-950/70 text-xs shrink-0">
        <div className="flex items-center gap-3 truncate">
          <span className="font-semibold text-slate-200 truncate">
            {stageTitle}
          </span>
          <span className="text-slate-500 hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
            Cadence:{' '}
            <strong className="text-cyan-400 font-mono">{targetWpm} WPM</strong>
          </span>
        </div>

        {/* Live Finger Guidance Pill (Fixed h-7) */}
        <div className="h-7 flex items-center shrink-0">
          {charInfo && laneInfo ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                style={{
                  backgroundColor: laneInfo.color,
                  color: laneInfo.color,
                }}
              />
              <span className="text-slate-300 font-mono text-[11px] whitespace-nowrap">
                {FINGER_DISPLAY_NAMES[charInfo.finger] || charInfo.finger}
              </span>
              {charInfo.shiftRequired && charInfo.recommendedShiftHand && (
                <span className="text-amber-400 font-mono text-[10px] bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60 whitespace-nowrap">
                  + {charInfo.recommendedShiftHand.toUpperCase()} SHIFT
                </span>
              )}
            </div>
          ) : (
            <div className="text-slate-500 font-mono text-[11px]">Ready</div>
          )}
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          aria-valuetext={`${progressPercent}%`}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-20 sm:w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono tabular-nums text-slate-300 text-xs">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Structured Pedagogical Technique Bar */}
      {techniqueTip && (
        <div className="px-4 py-1.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono text-[10px] uppercase font-bold tracking-wider shrink-0">
              Form Focus
            </span>
            <span className="truncate text-slate-300 text-[11px]">
              {techniqueTip}
            </span>
          </div>
          {focusFingers && (
            <span className="shrink-0 font-mono text-[10px] text-amber-300 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded whitespace-nowrap">
              {focusFingers}
            </span>
          )}
        </div>
      )}

      {/* Main Streaming Text Content (Strict Fixed Height: h-32) */}
      <div
        ref={containerRef}
        className="p-4 h-32 overflow-y-auto font-mono text-base sm:text-lg leading-relaxed tracking-wider select-none text-slate-400"
      >
        {fullText.split('').map((char, index) => {
          const isTyped = index < currentIndex;
          const isCurrent = index === currentIndex;
          const hasError = errorIndices.has(index);
          const isSpaceChar = char === ' ';

          if (isSpaceChar) {
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: a character's position is its identity; the text can repeat any character.
                key={index}
                ref={isCurrent ? activeCharRef : null}
                aria-current={isCurrent ? 'true' : undefined}
                className={`inline-block select-none transition-all duration-75 ${
                  isCurrent
                    ? `px-1.5 py-0.2 mx-0.5 rounded bg-cyan-500/25 ring-1.5 ring-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)] scale-105 ${
                        hasError
                          ? 'text-rose-400 line-through decoration-rose-500'
                          : 'text-cyan-200'
                      }`
                    : isTyped
                      ? hasError
                        ? 'px-1 text-rose-400 line-through decoration-rose-500 font-bold'
                        : 'px-1 text-emerald-500/60 font-medium'
                      : 'px-1 text-slate-600/70 hover:text-slate-400 font-normal'
                }`}
                title="Space (␣)"
              >
                ␣
              </span>
            );
          }

          let charClass = 'text-slate-500';
          if (isTyped) {
            charClass = hasError
              ? 'text-rose-400 line-through decoration-rose-500 bg-rose-950/30'
              : 'text-emerald-400 font-medium';
          } else if (isCurrent) {
            // A wrong key marks the character at once; the cursor stays on it.
            charClass = `bg-cyan-500/30 ring-2 ring-cyan-400 rounded-sm font-bold shadow-[0_0_12px_rgba(6,182,212,0.6)] ${
              hasError
                ? 'text-rose-400 line-through decoration-rose-500'
                : 'text-white'
            }`;
          }

          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a character's position is its identity; the text can repeat any character.
              key={index}
              ref={isCurrent ? activeCharRef : null}
              aria-current={isCurrent ? 'true' : undefined}
              className={`inline-block px-[2px] transition-colors ${charClass}`}
            >
              {char}
            </span>
          );
        })}
      </div>
    </section>
  );
};
