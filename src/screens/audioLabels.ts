/**
 * The names of the audio controls, as a player (and a screen reader) finds
 * them: the header's mute and panel buttons, and the panel's two channel
 * toggles. The button says what pressing it does, so it changes with the
 * state it toggles.
 */

/** The header's button that opens the audio panel. */
export const OPEN_AUDIO_PANEL = 'Open Audio Flight Deck Settings';

/** The header's mute button: Unmute while all audio is muted. */
export function muteAllLabel(muted: boolean): string {
  return muted ? 'Unmute All Audio' : 'Mute All Audio';
}

/** The panel's Laser SFX toggle. */
export function laserSfxLabel(enabled: boolean): string {
  return enabled ? 'Mute Laser SFX' : 'Enable Laser SFX';
}

/** The panel's Rhythm Beats toggle. */
export function rhythmBeatsLabel(enabled: boolean): string {
  return enabled ? 'Mute Rhythm Beats' : 'Enable Rhythm Beats';
}
