import type React from 'react';
import { useState } from 'react';
import type { RunReport } from '../analytics/runReport';
import { RunKeys } from './RunKeys';
import { RunText } from './RunText';

/**
 * What the Debrief shows of how the Run was typed: its text and its keys. It
 * holds what links them: hovering a key, a list entry or a Mix-up lights every
 * letter where that key was typed and dims the rest; clicking pins it, and
 * clicking it again lets go. Hovering a letter outlines its key.
 */
export const RunDetails: React.FC<{ report: RunReport }> = ({ report }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const lit = hovered ?? pinned;

  return (
    <div className="w-full mb-5 space-y-3">
      <RunText
        letters={report.letters}
        averageMs={report.averageMs}
        lit={lit}
        onLetterHover={setLetter}
      />
      <RunKeys
        report={report}
        linking={{
          lit,
          letter,
          pinned,
          onHover: setHovered,
          onPin: (keycap) =>
            setPinned((now) => (now === keycap ? null : keycap)),
        }}
      />
    </div>
  );
};
