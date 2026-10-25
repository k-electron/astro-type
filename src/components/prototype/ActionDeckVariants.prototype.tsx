/**
 * PROTOTYPE (issue #9) - throwaway. Do not merge to main.
 *
 * Question: can a PixiJS Action Deck match today's look and feel?
 *
 * Four variants of the Action Deck on the existing Flight Deck, switched with
 * `?variant=`. UI.md asks for radically different variants; this one is a
 * parity check, so the variants are the same deck drawn different ways:
 *   dom      today's IntegratedLanesKeyboard (the reference)
 *   pixi     PixiJS stage in the same frame (DOM header bar kept)
 *   overlay  Pixi drawn at 55% over the live DOM deck (pointer-events: none)
 *   diff     Pixi over the DOM deck with mix-blend-mode: difference
 *            (identical pixels go black)
 *
 * No arrow-key shortcuts on the switcher: arrows would count as typed keys.
 */
import { Award, Flame, Hand, Sparkles } from 'lucide-react';
import { Application } from 'pixi.js';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { FINGER_COLOR_MAP } from '../../data/curriculum';
import { IntegratedLanesKeyboard } from '../IntegratedLanesKeyboard';
import { DeckScene } from './pixiDeckScene.prototype';

type DeckProps = React.ComponentProps<typeof IntegratedLanesKeyboard>;

const VARIANTS = [
  { key: 'dom', name: 'DOM (today)' },
  { key: 'pixi', name: 'PixiJS' },
  { key: 'overlay', name: 'Overlay 55%' },
  { key: 'diff', name: 'Difference' },
] as const;
type VariantKey = (typeof VARIANTS)[number]['key'];

function readVariant(): VariantKey {
  const v = new URLSearchParams(window.location.search).get('variant');
  return VARIANTS.some((x) => x.key === v) ? (v as VariantKey) : 'dom';
}

/** Mounts one PixiJS Application into a div that fills its parent. */
function PixiStage({ style }: { style?: React.CSSProperties }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let inited = false;
    let scene: DeckScene | null = null;
    let ro: ResizeObserver | null = null;
    const app = new Application();

    (async () => {
      // Text bakes in whatever font is loaded at creation time.
      await Promise.all([
        document.fonts.load('700 16px "JetBrains Mono"'),
        document.fonts.load('400 16px "JetBrains Mono"'),
      ]).catch(() => undefined);
      await app.init({
        width: host.clientWidth || 1,
        height: host.clientHeight || 1,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        preference: 'webgl',
      });
      inited = true;
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      host.appendChild(app.canvas);
      app.canvas.style.display = 'block';
      scene = new DeckScene(app);
      ro = new ResizeObserver(() => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w > 0 && h > 0) {
          app.renderer.resize(w, h);
          scene?.resize(w, h);
        }
      });
      ro.observe(host);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      scene?.destroy();
      if (inited) {
        app.ticker.stop();
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" style={style} />;
}

/** Same card + header bar as the DOM deck, with the stage drawn by Pixi. */
function PixiActionDeck(props: DeckProps) {
  const {
    hyperspaceActive,
    multiplier,
    currentStreak,
    handsVisible,
    onToggleHands,
  } = props;
  return (
    <div className="w-full flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md relative">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/90 bg-slate-900/90 z-30 relative">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tactile Rhythm Flight Deck</span>
          </div>
          {hyperspaceActive && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
              WARP x{multiplier}
            </span>
          )}
          {currentStreak >= 10 && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              {currentStreak} STREAK
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleHands}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-all border ${
              handsVisible
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Hand Visualizer Guides"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Hands: {handsVisible ? 'ON' : 'OFF'}</span>
          </button>
          <span className="hidden sm:inline text-slate-500">Home:</span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 font-bold border"
            style={{
              color: FINGER_COLOR_MAP.LEFT_INDEX,
              borderColor: `${FINGER_COLOR_MAP.LEFT_INDEX}60`,
            }}
          >
            [F]
          </span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 font-bold border"
            style={{
              color: FINGER_COLOR_MAP.RIGHT_INDEX,
              borderColor: `${FINGER_COLOR_MAP.RIGHT_INDEX}60`,
            }}
          >
            [J]
          </span>
        </div>
      </div>
      <div className="relative w-full h-[620px] sm:h-[700px] bg-transparent overflow-hidden select-none">
        <PixiStage />
      </div>
    </div>
  );
}

/** Pixi stage laid exactly over the DOM deck's stage; DOM stays clickable. */
function OverlayDeck(props: DeckProps & { blend: 'normal' | 'difference' }) {
  const { blend, ...deckProps } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const stage = wrap?.querySelector<HTMLElement>('.h-\\[620px\\]');
    if (!wrap || !stage) return;
    const w = wrap.getBoundingClientRect();
    const r = stage.getBoundingClientRect();
    setBox({
      top: r.top - w.top,
      left: r.left - w.left,
      width: r.width,
      height: r.height,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div ref={wrapRef} className="relative">
      <IntegratedLanesKeyboard {...deckProps} />
      <div
        className="absolute pointer-events-none z-50"
        style={{
          ...box,
          opacity: blend === 'difference' ? 1 : 0.55,
          mixBlendMode: blend,
        }}
      >
        <PixiStage />
      </div>
    </div>
  );
}

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: VariantKey;
  onChange: (v: VariantKey) => void;
}) {
  const idx = VARIANTS.findIndex((v) => v.key === current);
  const go = (d: number) =>
    onChange(VARIANTS[(idx + d + VARIANTS.length) % VARIANTS.length].key);
  // onMouseDown preventDefault: keep focus off the buttons so typing Space never "clicks" them.
  const btn =
    'w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white font-bold leading-none cursor-pointer';
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 rounded-full bg-black/90 text-white px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.6)] ring-1 ring-white/30 font-mono text-xs">
      <button
        type="button"
        tabIndex={-1}
        className={btn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => go(-1)}
      >
        ←
      </button>
      <span className="min-w-[200px] text-center" data-testid="variant-label">
        {current} ({VARIANTS[idx].name})
      </span>
      <button
        type="button"
        tabIndex={-1}
        className={btn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => go(1)}
      >
        →
      </button>
    </div>
  );
}

export function ActionDeckVariants(props: DeckProps) {
  const [variant, setVariant] = useState<VariantKey>(readVariant);

  useEffect(() => {
    const onPop = () => setVariant(readVariant());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const change = (v: VariantKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set('variant', v);
    window.history.replaceState(null, '', url);
    setVariant(v);
  };

  return (
    <>
      {variant === 'dom' && <IntegratedLanesKeyboard {...props} />}
      {variant === 'pixi' && <PixiActionDeck {...props} />}
      {variant === 'overlay' && <OverlayDeck {...props} blend="normal" />}
      {variant === 'diff' && <OverlayDeck {...props} blend="difference" />}
      {import.meta.env.DEV && (
        <PrototypeSwitcher current={variant} onChange={change} />
      )}
    </>
  );
}
