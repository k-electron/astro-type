import type React from 'react';
import type { KeyStory } from '../analytics/keyStory';
import { MIX_UPS_HEADING } from './debriefLabels';
import {
  KEY_ACCURACY_TREND,
  KEY_BEST,
  KEY_FIRST_DAYS,
  KEY_MIX_UPS_HINT,
  KEY_MIX_UPS_NONE,
  KEY_NO_TREND,
  KEY_NOT_ENOUGH_LATELY,
  KEY_NOW,
  keyRebuilding,
  KEY_SPEED_TREND,
  KEY_STORY_HEADING,
  KEY_STORY_PROMPT,
  KEY_TREND_HINT,
  keyBestText,
  keyFirstDaysText,
  keyFirstTyped,
  keyInsteadText,
  keyReadingText,
  keyStoryFinger,
  keyStoryTitle,
  keyTimesTyped,
  keyTrendPointText,
} from './journeyLabels';
import { roundDown } from './roundDown';

interface KeyStoryPanelProps {
  /** The story to read, or undefined when no key has been picked or typed. */
  story: KeyStory | undefined;
  /** The picture of how the player types now is rebuilding: "now", the trend and the Mix-ups wait. */
  rebuilding: boolean;
  /** The player has been away (so it is rebuilding), not new (so it builds up). */
  returning: boolean;
  /** The panel, so the page can bring it into view when a key in the logbook is clicked. */
  panelRef?: React.Ref<HTMLElement>;
}

const TREND_WIDTH = 220;
const TREND_HEIGHT = 40;
const PAD = 4;

/** A point of a trend: its day, and the number drawn (null when it has none). */
interface TrendValue {
  day: string;
  value: number | null;
  text: string;
}

/**
 * A key's smoothed trend as a small line: the points drawn higher when the
 * number is better, scaled to the trend's own highest and lowest. Every point
 * says its day and number in its tooltip.
 */
const Trend: React.FC<{
  name: string;
  tone: string;
  values: readonly TrendValue[];
  /** Plot the number upside down, for one where lower is better (milliseconds). */
  lowerIsBetter?: boolean;
}> = ({ name, tone, values, lowerIsBetter = false }) => {
  const drawn = values.filter((point) => point.value !== null);
  if (drawn.length < 2) {
    return (
      <div className="text-xs text-slate-400">
        <span className="font-mono text-slate-500 mr-2">{name}</span>
        {KEY_NO_TREND}
      </div>
    );
  }
  const numbers = drawn.map((point) => point.value ?? 0);
  const low = Math.min(...numbers);
  const span = Math.max(...numbers) - low;
  const place = (point: TrendValue, at: number) => {
    // A flat trend (every point the same) is drawn mid-height, not on an edge.
    const share = span === 0 ? 0.5 : ((point.value ?? 0) - low) / span;
    return {
      x: PAD + (at * (TREND_WIDTH - 2 * PAD)) / (drawn.length - 1),
      y: PAD + (lowerIsBetter ? share : 1 - share) * (TREND_HEIGHT - 2 * PAD),
      point,
    };
  };
  const placed = drawn.map(place);
  return (
    <div>
      <span className="type-label text-slate-500">{name}</span>
      <svg
        role="img"
        aria-label={name}
        width={TREND_WIDTH}
        height={TREND_HEIGHT}
        viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
        className="block"
      >
        <polyline
          points={placed
            .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
            .join(' ')}
          fill="none"
          stroke={tone}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {placed.map(({ x, y, point }) => (
          <circle key={point.day} cx={x} cy={y} r={2.5} fill={tone}>
            <title>{keyTrendPointText(point.day, point.text)}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
};

/**
 * One key's story: its finger, the day it was first typed, how often it has
 * been typed, its first days against now, a smoothed speed and accuracy trend
 * and what it gets typed as instead. While the picture of how the player
 * types now is rebuilding, "now", the trend and the Mix-ups say so; the
 * first days, the count and the best are kept for good and still show.
 */
export const KeyStoryPanel: React.FC<KeyStoryPanelProps> = ({
  story,
  rebuilding,
  returning,
  panelRef,
}) => {
  if (story === undefined) {
    return (
      <section
        ref={panelRef}
        aria-label={KEY_STORY_HEADING}
        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
      >
        <h3 className="type-label text-slate-400 mb-2">{KEY_STORY_HEADING}</h3>
        <p className="type-sentence text-slate-400">{KEY_STORY_PROMPT}</p>
      </section>
    );
  }
  const best = keyBestText(story.best);
  return (
    <section
      ref={panelRef}
      aria-label={KEY_STORY_HEADING}
      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
    >
      <h3 className="type-label text-slate-400 mb-2">{KEY_STORY_HEADING}</h3>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h4 className="text-lg font-bold font-display text-white">
          {keyStoryTitle(story.keycap)}
        </h4>
        {story.finger !== null && (
          <span className="text-sm text-cyan-300">{keyStoryFinger(story)}</span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-slate-300">
        <span>{keyFirstTyped(story.firstDay)}</span>
        <span>{keyTimesTyped(story.typed)}</span>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
        <dt className="text-slate-500">{KEY_FIRST_DAYS}</dt>
        <dd className="text-slate-200">{keyFirstDaysText(story.first)}</dd>
        <dt className="text-slate-500">{KEY_NOW}</dt>
        <dd className="text-cyan-300">
          {rebuilding
            ? keyRebuilding(returning)
            : story.now === null
              ? KEY_NOT_ENOUGH_LATELY
              : keyReadingText(story.now)}
        </dd>
        {best !== null && (
          <>
            <dt className="text-slate-500">{KEY_BEST}</dt>
            <dd className="text-emerald-300">{best}</dd>
          </>
        )}
      </dl>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        {rebuilding ? (
          <p className="type-sentence text-slate-400">
            {KEY_SPEED_TREND} and {KEY_ACCURACY_TREND.toLowerCase()}:{' '}
            {keyRebuilding(returning)}
          </p>
        ) : (
          <>
            <Trend
              name={KEY_SPEED_TREND}
              tone="#22d3ee"
              lowerIsBetter
              values={story.trend.map((point) => ({
                day: point.day,
                value: point.ms,
                text:
                  point.ms === null ? '' : `${Math.round(point.ms)} ms a key`,
              }))}
            />
            <Trend
              name={KEY_ACCURACY_TREND}
              tone="#34d399"
              values={story.trend.map((point) => ({
                day: point.day,
                value: point.accuracy,
                text:
                  point.accuracy === null
                    ? ''
                    : `${roundDown(point.accuracy)}% right`,
              }))}
            />
            <p className="basis-full type-sentence text-slate-500">
              {KEY_TREND_HINT}
            </p>
          </>
        )}
      </div>
      <div className="mt-3">
        <h4 className="type-label text-slate-500">{MIX_UPS_HEADING}</h4>
        {rebuilding ? (
          <p className="type-sentence text-slate-400">
            {keyRebuilding(returning)}
          </p>
        ) : story.mixUps.length === 0 ? (
          <p className="type-sentence text-slate-400">{KEY_MIX_UPS_NONE}</p>
        ) : (
          <>
            <p className="text-xs text-slate-500">{KEY_MIX_UPS_HINT}</p>
            <ul className="flex flex-wrap gap-1.5 mt-1">
              {story.mixUps.map((mixUp) => (
                <li
                  key={mixUp.pressed}
                  className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 type-caption font-mono text-slate-200"
                >
                  {keyInsteadText(mixUp.pressed, mixUp.count)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
};
