/**
 * PROTOTYPE (#148): the Analytics variants (`?analytics=A|B|C`) over a
 * made-up two months of beginner play, and the floating bar that flips them.
 * Dev builds only. Throwaway: branch prototype/debrief-flight-log only.
 */
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ANALYTICS_VARIANTS,
  AnalyticsA,
  AnalyticsB,
  AnalyticsC,
} from './analyticsVariants';
import { sampleJourney } from './journey';

type Key = (typeof ANALYTICS_VARIANTS)[number]['key'];

const read = (): Key => {
  const v = new URLSearchParams(window.location.search).get('analytics');
  return ANALYTICS_VARIANTS.some((x) => x.key === v) ? (v as Key) : 'A';
};

function useVariant(): [Key, (k: Key) => void] {
  const [variant, setVariant] = useState<Key>(read);
  useEffect(() => {
    const update = () => setVariant(read());
    window.addEventListener('prototype-params', update);
    return () => window.removeEventListener('prototype-params', update);
  }, []);
  const set = (k: Key) => {
    const url = new URL(window.location.href);
    url.searchParams.set('analytics', k);
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event('prototype-params'));
  };
  return [variant, set];
}

export const AnalyticsPrototype: React.FC = () => {
  const journey = useMemo(() => sampleJourney(), []);
  const [variant, setVariant] = useVariant();
  const i = ANALYTICS_VARIANTS.findIndex((v) => v.key === variant);
  const go = (delta: number) =>
    setVariant(
      ANALYTICS_VARIANTS[
        (i + delta + ANALYTICS_VARIANTS.length) % ANALYTICS_VARIANTS.length
      ].key,
    );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (!import.meta.env.DEV) return null;
  return (
    <>
      {variant === 'A' && <AnalyticsA journey={journey} />}
      {variant === 'B' && <AnalyticsB journey={journey} />}
      {variant === 'C' && <AnalyticsC journey={journey} />}
      <div className="mt-2 pt-4 border-t border-dashed border-fuchsia-500/50 text-[11px] font-mono uppercase tracking-wider text-fuchsia-300">
        Today's Analytics screen, unchanged below: what stays?
      </div>
      <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-full bg-fuchsia-600 text-white shadow-2xl shadow-black/60 px-2 py-1.5 font-mono text-xs">
        <button
          type="button"
          onClick={() => go(-1)}
          className="w-7 h-7 rounded-full hover:bg-fuchsia-500 cursor-pointer"
          aria-label="Previous variant"
        >
          ‹
        </button>
        <span className="min-w-36 text-center font-bold">
          {variant} · {ANALYTICS_VARIANTS[i].name}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="w-7 h-7 rounded-full hover:bg-fuchsia-500 cursor-pointer"
          aria-label="Next variant"
        >
          ›
        </button>
        <span className="w-px h-5 bg-fuchsia-300/50" />
        <span className="px-2">data: two sample months</span>
      </div>
    </>
  );
};
