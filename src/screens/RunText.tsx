import type React from 'react';
import { keycapOf } from '../analytics/keys';
import type { LetterReport, Pace } from '../analytics/letters';
import {
  litLettersCaption,
  letterTitle,
  MISSED,
  QUICK,
  RUN_TEXT_HEADING,
  shadingNote,
  SLOW,
  VERY_SLOW,
} from './debriefLabels';

/** The shade behind a letter, by how long it took against the Run's average. */
const SHADE: Record<Pace, string> = {
  quick: 'bg-emerald-500/25',
  steady: '',
  slow: 'bg-amber-500/30',
  'very slow': 'bg-rose-500/40',
};

const MISSED_LETTER =
  'text-rose-300 underline decoration-rose-500 decoration-2 underline-offset-4';

interface RunTextProps {
  letters: LetterReport[];
  /** The Run's average time a key, for the note on what the shading means. */
  averageMs: number | null;
  /** The keycap whose letters are lit while the rest dim, or null. */
  lit: string | null;
  /** The character the strips' cursor is on, to outline, or null. */
  cursorIndex: number | null;
  /** The pointer is over a letter, or has left it (null). */
  onLetterHover: (letter: LetterReport | null) => void;
}

/** The Run's words, as lists of letters: each word keeps the space that ends it. */
function wordsOf(letters: LetterReport[]): LetterReport[][] {
  const words: LetterReport[][] = [[]];
  for (const letter of letters) {
    words[words.length - 1].push(letter);
    if (letter.character === ' ') words.push([]);
  }
  return words.filter((word) => word.length > 0);
}

/**
 * The text the player typed, letter by letter: each letter shaded by how long
 * it took against the Run's average, each Miss underlined. A lit key
 * highlights every letter it typed and dims the rest.
 */
export const RunText: React.FC<RunTextProps> = ({
  letters,
  averageMs,
  lit,
  cursorIndex,
  onLetterHover,
}) => {
  const litCount =
    lit === null
      ? 0
      : letters.filter(({ character }) => keycapOf(character) === lit).length;
  return (
    <section
      aria-label={RUN_TEXT_HEADING}
      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
    >
      <h3 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2">
        {RUN_TEXT_HEADING}
      </h3>
      <p className="flex flex-wrap font-mono text-[15px] leading-7">
        {wordsOf(letters).map((word) => (
          <span key={word[0].index} className="whitespace-nowrap">
            {word.map((letter) => {
              const isLit = lit !== null && keycapOf(letter.character) === lit;
              const Tag = isLit ? 'mark' : 'span';
              return (
                <Tag
                  key={letter.index}
                  title={letterTitle(letter)}
                  aria-current={cursorIndex === letter.index || undefined}
                  onMouseEnter={() => onLetterHover(letter)}
                  onMouseLeave={() => onLetterHover(null)}
                  className={[
                    'rounded-sm px-px transition-opacity',
                    letter.pace === null ? '' : SHADE[letter.pace],
                    letter.missed ? MISSED_LETTER : 'text-slate-100',
                    lit !== null && !isLit ? 'opacity-25' : '',
                    isLit ? 'ring-2 ring-cyan-300 bg-transparent' : '',
                    cursorIndex === letter.index
                      ? 'outline outline-2 outline-white'
                      : '',
                  ].join(' ')}
                >
                  {letter.character === ' ' ? ' ' : letter.character}
                </Tag>
              );
            })}
          </span>
        ))}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-500">
        {lit !== null ? (
          <span className="text-cyan-300">
            {litLettersCaption(lit, litCount)}
          </span>
        ) : (
          <>
            <span>
              <span className="inline-block w-2 h-2 bg-emerald-500/60 mr-1" />
              {QUICK}
            </span>
            <span>
              <span className="inline-block w-2 h-2 bg-amber-500/60 mr-1" />
              {SLOW}
            </span>
            <span>
              <span className="inline-block w-2 h-2 bg-rose-500/70 mr-1" />
              {VERY_SLOW}
            </span>
            <span className={MISSED_LETTER}>{MISSED}</span>
            {averageMs !== null && <span>{shadingNote(averageMs)}</span>}
          </>
        )}
      </p>
    </section>
  );
};
