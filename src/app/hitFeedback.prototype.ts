/**
 * PROTOTYPE, throw away: the sound and the variant switcher for "Hit feedback
 * without grades" (issue #129). See `src/deck/hitFeedback.prototype.ts`.
 * Without `?hits=` on the URL, nothing here changes anything.
 */
import { soundEngine } from '../audio/soundEngine';
import {
  HITS_VARIANT_NAMES,
  HITS_VARIANTS,
  hitFeedback,
  hitsVariant,
} from '../deck/hitFeedback.prototype';
import type { GameState } from '../game/game';
import type { Sound } from '../game/sound';

/** The engine's sound, with each hit's size and chime taken from the variant. */
export function withPrototypeHitSound(
  sound: Sound,
  getState: () => GameState,
): Sound {
  if (!hitsVariant) return sound;
  return {
    sync: (state) => sound.sync(state),
    play(cue) {
      if (cue.type !== 'hit') {
        sound.play(cue);
        return;
      }
      const { run } = getState();
      const feedback = hitFeedback(run, 0, run.overdriveActive);
      soundEngine.playLaneHit(cue.lane, feedback?.size ?? cue.grade, cue.space);
      const chime = feedback?.chime;
      if (chime) soundEngine.playStarChime(chime);
    },
  };
}

/** A small bar in the corner that reloads the page on another variant. Shown only with `?hits=`. */
export function mountHitsSwitcher(): void {
  if (!hitsVariant) return;
  const bar = document.createElement('div');
  bar.style.cssText =
    'position:fixed;right:12px;bottom:12px;z-index:9999;display:flex;gap:6px;align-items:center;padding:6px 10px;border-radius:999px;background:#fde047;color:#111;font:600 12px system-ui;box-shadow:0 2px 12px #0008';
  const title = document.createElement('span');
  title.textContent = 'PROTOTYPE hits:';
  bar.append(title);
  for (const variant of [...HITS_VARIANTS, null]) {
    const link = document.createElement('a');
    const url = new URL(window.location.href);
    if (variant) url.searchParams.set('hits', variant);
    else url.searchParams.delete('hits');
    link.href = url.toString();
    link.textContent = variant
      ? `${variant} (${HITS_VARIANT_NAMES[variant]})`
      : 'today';
    link.style.cssText = `color:#111;text-decoration:${
      variant === hitsVariant ? 'underline' : 'none'
    };padding:2px 6px;border-radius:999px;background:${
      variant === hitsVariant ? '#fff8' : 'transparent'
    }`;
    bar.append(link);
  }
  document.body.append(bar);
}
