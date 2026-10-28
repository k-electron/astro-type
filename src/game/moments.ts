import type { FingerZone } from '../curriculum/keyboardLayout';
import type { Judgement } from './rules';

/**
 * What just happened, as one stream. The sound and the Action Deck both listen
 * to it, so a moment carries everything either needs and neither looks up the
 * key table: a hit names its Drone, and the lane and finger of the key.
 *
 * The Judgement cases are the Judgement itself (exactly one per keystroke that
 * counts); a hit adds the Drone it hit. Then come the other things with a
 * sound or an effect of their own: Overdrive catching fire, the Stage clear
 * (heard once the Debrief is on show), and a purchase.
 */
export type Moment =
  | (Extract<Judgement, { type: 'hit' }> & {
      /** The Drone that was hit. */
      droneId: string;
      lane: number;
      finger: FingerZone;
    })
  | Extract<Judgement, { type: 'miss' | 'shield' }>
  | { type: 'ignition' }
  | { type: 'cleared'; stars: number }
  | { type: 'upgrade' }
  | { type: 'equip' };

/** The Judgement cases of a moment: a hit, a Miss, or a shield taking one. */
export type JudgementMoment = Extract<
  Moment,
  { type: 'hit' | 'miss' | 'shield' }
>;

export function isJudgement(moment: Moment): moment is JudgementMoment {
  return (
    moment.type === 'hit' || moment.type === 'miss' || moment.type === 'shield'
  );
}
