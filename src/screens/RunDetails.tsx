import type React from 'react';
import { useState } from 'react';
import { keycapOf } from '../analytics/keys';
import type { LetterReport } from '../analytics/letters';
import type { RunReport } from '../analytics/runReport';
import { hitOn } from '../analytics/strips';
import { RunKeys } from './RunKeys';
import { RunStrips, type RunCursor } from './RunStrips';
import { RunText } from './RunText';

/**
 * What the Debrief shows of how the Run was typed: its text, its strips and
 * its keys. It holds what links them:
 * - one cursor in Run Time: hovering a strip puts it on all four and outlines
 *   the letter typed then, hovering a letter moves it to that letter's moment,
 *   and the letter's key is outlined on the keyboard;
 * - hovering a key, a list entry or a Mix-up lights every letter where that
 *   key was typed and dims the rest; clicking pins it, and clicking it again
 *   lets go.
 */
export const RunDetails: React.FC<{ report: RunReport }> = ({ report }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [cursor, setCursor] = useState<RunCursor | null>(null);
  const lit = hovered ?? pinned;
  const typedThen =
    cursor === null
      ? undefined
      : report.letters.find((letter) => letter.index === cursor.index);

  const onLetterHover = (letter: LetterReport | null) => {
    const hit =
      letter === null ? null : hitOn(report.strips.moments, letter.index);
    setCursor(hit && letter ? { step: hit.step, index: letter.index } : null);
  };

  return (
    <div className="w-full mb-5 space-y-3">
      <RunText
        letters={report.letters}
        averageMs={report.averageMs}
        lit={lit}
        cursorIndex={cursor?.index ?? null}
        onLetterHover={onLetterHover}
      />
      <RunStrips strips={report.strips} cursor={cursor} onCursor={setCursor} />
      <RunKeys
        report={report}
        linking={{
          lit,
          letter: typedThen ? keycapOf(typedThen.character) : null,
          pinned,
          onHover: setHovered,
          onPin: (keycap) =>
            setPinned((now) => (now === keycap ? null : keycap)),
        }}
      />
    </div>
  );
};
