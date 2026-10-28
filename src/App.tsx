import type { ComponentType } from 'react';
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
import { useGameState } from './store/useGameState';
import type { Screen } from './store/gameMachine';

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
  const headerRef = useHeaderHeight();

  // App selects only what it shows itself. The Run's moving fields (Drones,
  // score, Streak, the typed index) belong to the deck, the HUD and the text
  // prompt, which select them on their own.
  const screen = useGameState((state) => state.screen);
  // The screen on top, if one covers the page. The Flight Deck behind it can't
  // be reached by key, click or screen reader until it goes.
  const Overlay = overlayFor(screen);

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
