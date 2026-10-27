import type { ComponentType } from 'react';
import { useEffect } from 'react';
import { soundEngine } from './audio/soundEngine';
import { AcademyHome } from './components/AcademyHome';
import { PauseMenu } from './components/PauseMenu';
import { HeaderNav } from './components/HeaderNav';
import { useHeaderHeight } from './components/useHeaderHeight';
import { HUD } from './components/HUD';
import { TextPromptStream } from './components/TextPromptStream';
import { StageSelectModal } from './components/StageSelectModal';
import { HangarUpgradesModal } from './components/HangarUpgradesModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { PixiActionDeck } from './components/pixi-deck/PixiActionDeck';
import { CustomPracticeModal } from './components/CustomPracticeModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { GlobalCosmicBackground } from './components/GlobalCosmicBackground';
import { useGame } from './store/gameContext';
import { useGameState } from './store/useGameState';
import type { Screen } from './types/game';

/**
 * The starfield behind everything. It selects the two fields that speed it up
 * itself, so a change to either re-renders only the starfield, not the app.
 */
function CosmicBackdrop() {
  const { onFlightDeck, hyperspaceActive, multiplier } = useGameState(
    (state) => ({
      onFlightDeck: state.screen === 'flight-deck',
      hyperspaceActive: state.run.hyperspaceActive,
      multiplier: state.run.multiplier,
    }),
  );
  return (
    <GlobalCosmicBackground
      hyperspaceActive={onFlightDeck && hyperspaceActive}
      multiplier={onFlightDeck ? multiplier : 1}
    />
  );
}

/**
 * The screens that cover the page, by name, each an overlay in the shell.
 * Adding a Screen to the type breaks the build here until it has a component.
 */
type OverlayScreen = Exclude<Screen, 'academy-home' | 'flight-deck'>;
const OVERLAYS: Record<OverlayScreen, ComponentType> = {
  'pause-menu': PauseMenu,
  'galaxy-map': StageSelectModal,
  hangar: HangarUpgradesModal,
  analytics: AnalyticsModal,
  'free-flight': CustomPracticeModal,
  debrief: LevelCompleteModal,
};

function overlayFor(screen: Screen): ComponentType | undefined {
  return screen in OVERLAYS ? OVERLAYS[screen as OverlayScreen] : undefined;
}

export default function App() {
  const game = useGame();
  const { send } = game;
  const headerRef = useHeaderHeight();

  // App selects only what it shows itself. The Run's moving fields (Drones,
  // score, Streak, the typed index) belong to the deck, the HUD and the text
  // prompt, which select them on their own.
  const { screen, phase, profile } = useGameState((state) => ({
    screen: state.screen,
    phase: state.phase,
    profile: state.profile,
  }));
  // The screen on top, if one covers the page. The Flight Deck behind it can't
  // be reached by key, click or screen reader until it goes.
  const Overlay = overlayFor(screen);

  // Synchronize audio engine with current profile settings
  useEffect(() => {
    soundEngine.setGlobalMute(Boolean(profile.globalMuted));
    soundEngine.setSoundEnabled(profile.soundEnabled);
    soundEngine.setSoundVolume(profile.soundVolume);
    soundEngine.setMusicEnabled(profile.musicEnabled !== false);
    soundEngine.setMusicVolume(profile.musicVolume ?? 0.4);
    soundEngine.setBeatTheme(profile.beatTheme || 'NEON_SYNTHWAVE');
    soundEngine.setCore(profile.upgrades.equippedAudioCore);
  }, [
    profile.globalMuted,
    profile.soundEnabled,
    profile.soundVolume,
    profile.musicEnabled,
    profile.musicVolume,
    profile.beatTheme,
    profile.upgrades.equippedAudioCore,
  ]);

  // Main Keystroke Handler (Active touch-typing listener with down/up press duration tracking)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc is a player event on every screen; the machine decides what it
      // means there. It is never a keystroke. A header dropdown that took the
      // Esc to close itself has already marked it handled.
      if (e.key === 'Escape') {
        if (!e.repeat && !e.defaultPrevented) send({ type: 'PRESS_ESC' });
        return;
      }

      if (phase !== 'running') return;

      // Prevent Spacebar from scrolling the page
      if (e.key === ' ') {
        e.preventDefault();
      }

      // A shortcut such as Cmd+R types nothing. (Ctrl with Alt is how some
      // layouts type AltGr characters, so that pair still counts.)
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return;

      // Which keys count, and dropping auto-repeat, is the game's call.
      game.pressKey(e.key, { repeat: e.repeat });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (phase !== 'running') return;
      game.releaseKey(e.key);
    };

    const handleBlur = () => {
      game.releaseKey();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [phase, game, send]);

  // Leaving the page (another window, another tab) is a player event: the
  // machine pauses a running Run and ignores it anywhere else.
  useEffect(() => {
    const handleLostFocus = () => send({ type: 'LOST_FOCUS' });
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') handleLostFocus();
    };
    window.addEventListener('blur', handleLostFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleLostFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [send]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Global Cosmic Starfield Background: tranquil on home & modals; hyperwarp ONLY during active flight */}
      <CosmicBackdrop />

      {/* Strict Top Bar Contract */}
      <HeaderNav ref={headerRef} />

      {/* Main Game Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4">
        {screen === 'academy-home' ? (
          /* Title Screen / Academy Briefing */
          <AcademyHome />
        ) : (
          /* Active Cockpit Flight Deck */
          <div
            className="flex-1 flex flex-col gap-4"
            inert={Overlay !== undefined}
          >
            {/* Top HUD Telemetry */}
            <HUD />

            {/* Text Prompt Stream */}
            <TextPromptStream />

            {/* Interactive Rhythm Keyboard Flight Deck */}
            <PixiActionDeck />
          </div>
        )}
      </main>

      {/* The screen on top, in the shell */}
      {Overlay && <Overlay />}
    </div>
  );
}
