/**
 * PROTOTYPE (#147): the floating bar that flips the Debrief's variants
 * (`?variant=A|B|C`) and its data (`?data=sample|mine`). Dev builds only.
 */
import type React from 'react';
import { useEffect, useState } from 'react';
import { VARIANTS, type VariantKey } from './variants';

export type DataSource = 'sample' | 'mine';

function readParams(): { variant: VariantKey; data: DataSource } {
  const p = new URLSearchParams(window.location.search);
  const v = p.get('variant');
  const variant = VARIANTS.some((x) => x.key === v) ? (v as VariantKey) : 'A';
  const data = p.get('data') === 'mine' ? 'mine' : 'sample';
  return { variant, data };
}

function writeParam(name: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new Event('prototype-params'));
}

export function usePrototypeParams() {
  const [params, setParams] = useState(readParams);
  useEffect(() => {
    const update = () => setParams(readParams());
    window.addEventListener('prototype-params', update);
    return () => window.removeEventListener('prototype-params', update);
  }, []);
  return params;
}

export const PrototypeSwitcher: React.FC<{ mineCount: number }> = ({
  mineCount,
}) => {
  const { variant, data } = usePrototypeParams();
  const i = VARIANTS.findIndex((v) => v.key === variant);
  const go = (delta: number) =>
    writeParam(
      'variant',
      VARIANTS[(i + delta + VARIANTS.length) % VARIANTS.length].key,
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
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-full bg-fuchsia-600 text-white shadow-2xl shadow-black/60 px-2 py-1.5 font-mono text-xs">
      <button
        type="button"
        onClick={() => go(-1)}
        className="w-7 h-7 rounded-full hover:bg-fuchsia-500 cursor-pointer"
        aria-label="Previous variant"
      >
        ‹
      </button>
      <span className="min-w-40 text-center font-bold">
        {variant} · {VARIANTS[i].name}
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
      <button
        type="button"
        onClick={() =>
          writeParam('data', data === 'sample' ? 'mine' : 'sample')
        }
        className="px-2 h-7 rounded-full hover:bg-fuchsia-500 cursor-pointer"
      >
        charts from:{' '}
        {data === 'sample'
          ? 'a sample Run'
          : `this Run (${mineCount} Keystrokes)`}
      </button>
    </div>
  );
};
