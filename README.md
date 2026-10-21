# 🚀 AstroType: Cosmic Touch Typing Academy

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web_Audio_API-emerald.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

> **A space-futuristic touch-typing rhythm simulator that blends time-tested touch-typing pedagogy with arcade rhythm mechanics.** Master the entire keyboard matrix across 7 star-gated galaxy sectors, guide falling laser notes onto a physical mechanical receptor deck, and track real-time ergonomic telemetry.

---

## 🌟 Table of Contents
1. [Overview & Philosophy](#-overview--philosophy)
2. [Key Features](#-key-features)
3. [The 8-Finger + Thumb Color System](#-the-8-finger--thumb-color-system)
4. [7-Sector Pedagogical Curriculum](#-7-sector-pedagogical-curriculum)
5. [Rhythm Highway & Laser Guidance](#-rhythm-highway--laser-guidance)
6. [Synthesized Audio Engine](#-synthesized-audio-engine)
7. [Diagnostics, Analytics & Heatmap](#-diagnostics-analytics--heatmap)
8. [Starship Hangar Upgrades](#-starship-hangar-upgrades)
9. [Architecture & Project Structure](#-architecture--project-structure)
10. [Getting Started & Development](#-getting-started--development)
11. [License](#-license)

---

## 🌌 Overview & Philosophy

Most typing tutors feel like sterile word processors; rhythm games often lack structured educational progression. **AstroType bridges both worlds**:

- **Real Muscle-Memory Pedagogy**: Grounded in classic touch-typing fundamentals (anchor keys `F` & `J`, strict finger-to-column isolation, and the opposite-hand shift pinky rule).
- **Physical Keycap Alignment**: Falling notes match the exact shape and unit width (`1u`, `1.5u`, `2.25u`, `6.25u`) of your physical keys and land directly on the keyboard receptor deck.
- **Diffused Single-Beam Laser Guidance**: A constant-width, vertically ramped laser beam guides your eyes to the center of each falling note, eliminating jarring visual shifts across keys of different sizes.
- **Ergonomic Bilateral Hand Guides**: Vector SVG hands flank the keyboard to illuminate target fingers in real-time, complete with smart spacebar thumb alternation.
- **Zero-Latency Web Audio Synthesis**: Completely procedural sound design—no heavy audio samples. Keystroke blasters and rhythm beats are synthesized live with Web Audio oscillators.

---

## 🎮 Key Features

| Feature | Description |
| :--- | :--- |
| **Tactile Flight Deck** | 1:1 ANSI layout with tactile homing nubs (`F` & `J`), reactive duration-of-press glow, and dynamic keycap labels. |
| **Laser Guidance Marker** | Single center line with vertical ramp up and down glow; constant width regardless of whether targeting letter keys or the spacebar. |
| **Dual SVG Hand Visualizers** | Ergonomic left and right palms indicating finger positions, tactile bumps, and intelligent spacebar hand recommendations. |
| **Blind Touch-Typing Mode** | Toggle deck legends off to replace key characters with tactile muscle-memory dots for true sightless mastery. |
| **Overdrive Warp Mode** | Maintain combos to fill your warp reactor. Activates a `x4` score overdrive with hyperspace starfield trails. |
| **Interactive Heatmap** | Color-coded keyboard diagnostic matrix revealing hit rates, bilateral hand balance, and struggling finger reaches. |
| **Hangar Progression** | Earn cosmic credits to purchase Deflector Shields, Hyperdrive Reactors, Precision Sensors, and Synth Cores. |
| **Offline Data Portability** | Full profile progress, stars, and key statistics are stored locally with JSON export and import capabilities. |

---

## 🎨 The 8-Finger + Thumb Color System

Every single finger (except thumbs, which share emerald green) has a unique, high-contrast neon hue that remains consistent across:
1. **The physical keyboard deck keycaps and bottom accent bars**
2. **The falling rhythm notes and their glow trails**
3. **The central diffused laser guidance beam**
4. **The anatomical left and right hand visualizers**
5. **The live target guidance pill in the prompt stream**
6. **The analytics diagnostic reach report**

| Hand | Finger | Color Code | Hex Code | Assigned Keys (ANSI) |
| :--- | :--- | :---: | :---: | :--- |
| **Left Hand** | Pinky | 🌸 Vibrant Pink | `#ec4899` | `` ` 1 Q A Z Tab Caps Shift Left Ctrl `` |
| **Left Hand** | Ring | 🔮 Deep Violet | `#8b5cf6` | `2 W S X Alt Left` |
| **Left Hand** | Middle | ⚡ Electric Blue | `#3b82f6` | `3 E D C` |
| **Left Hand** | Index | 💎 Bright Cyan | `#06b6d4` | `4 5 R T F G V B` *(Home Anchor: [F])* |
| **Thumbs** | Thumbs | 🌲 Emerald Green | `#10b981` | `Spacebar (6.25u)` + `Cmd / Meta` |
| **Right Hand** | Index | 🍋 Neon Lime | `#84cc16` | `6 7 Y U H J N M` *(Home Anchor: [J])* |
| **Right Hand** | Middle | ☀️ Golden Yellow | `#eab308` | `8 I K , <` |
| **Right Hand** | Ring | 🍊 Sunset Orange | `#f97316` | `9 O L . > Alt Right` |
| **Right Hand** | Pinky | 🔴 Crimson Red | `#ef4444` | `0 - = P [ ] \ ; ' / Enter Backspace Shift Right` |

---

## 🗺️ 7-Sector Pedagogical Curriculum

Progress through **28 stages across 7 galaxy sectors**, earning up to **84 Stars** (3 stars per stage based on WPM, Accuracy, and Combo Streaks):

```
🌌 GALAXY SECTORS MAP
├── Sector 1: Asteroid Outpost · Home Row Foundations (A, S, D, F, J, K, L, ;, G, H)
├── Sector 2: Orbital Shipyards · Upper Deck Ascent (E, I, R, U, T, Y, W, O, Q, P)
├── Sector 3: Subterranean Foundry · Lower Hull Reaches (V, M, C, ,, B, N, X, ., Z, /)
├── Sector 4: Nebula Transit Route · Frequent Words & Cadence (Top 100 core English words)
├── Sector 5: Astral Telemetry Station · Celestial Coordinates (Full number row 0–9)
├── Sector 6: Pulsar Beacon Array · Capitalization & Symbols (Opposite-Hand Shift Pinky rules)
└── Sector 7: Cybernetic Core Citadel · Code Syntax & Matrix Mastery (JS/TS brackets, logic, operators)
```

### Pedagogical Touch-Typing Rules Enforced:
1. **The Anchor Law**: Never lift index fingers without maintaining tactile awareness of the `F` and `J` homing bumps.
2. **Opposite-Shift Rule**: When typing a capital letter with the left hand, press `Right Shift` with the right pinky (and vice versa).
3. **Smart Thumb Alternation**: Recommends pressing Space with the thumb opposite to the hand that typed the preceding letter, preserving hand balance and momentum.
4. **Cadence Consistency**: Real-time standard deviation metric encourages steady metronomic flow over erratic speed bursts.

---

## ⚡ Rhythm Highway & Laser Guidance

AstroType features a falling-highway mechanic designed specifically for typing accuracy:

- **1:1 Keycap Proportions**: Each falling note has the exact shape, border radius, and unit width of the underlying physical keycap. Spacebars fall as full 6.25u bars; standard letters fall as 1u blocks.
- **Center Diffused Laser Beam**: A single vertical beam passes through the horizontal center of the target key. It has a constant width across all keys and features a vertical glow ramp-up from top and ramp-down to bottom, dissolving softly into the destination keycap.
- **Target Help Text Exclusivity**: Helper badges (`SPACE ◀ L. THUMB [REC] ▶`) appear exclusively on the physical destination keycap to keep the falling highway clean and uncluttered.
- **Timing Windows**: Keystrokes are rated as **PERFECT**, **GOOD**, **EARLY**, or **LATE**, triggering directional particle sparks, sound bursts, and combat multiplier scores.

---

## 🔊 Synthesized Audio Engine

Built entirely on the browser's native **Web Audio API** with zero external audio assets:

### 4 Audio Synth Cores:
1. **Cyber Synth (Default)**: Dual-oscillator harmonic space chime with shimmering overtone decay.
2. **Retro 8-Bit Arcade**: Authentic square-wave chiptune blasters with pitch-bend attack.
3. **Deep Space Drone**: Resonant sub-bass and warm sine-wave chimes.
4. **Neo Acoustic Harp**: Warm triangular bell harmonics and organic kalimba tones.

### Real-Time Procedural Rhythm Beat Tracks:
- **Neon Synthwave**: 106 BPM retro-futuristic bassline and snare pocket.
- **Cyber Pulse**: 122 BPM high-tempo energetic electro groove.
- **Cosmic Lo-Fi**: 84 BPM relaxed chillout beat for focused training.

---

## 📊 Diagnostics, Analytics & Heatmap

Access the **Touch Typing Diagnostic Center** anytime from the flight deck:

- **Interactive Key Accuracy Heatmap**: Every keycap is dynamically styled based on lifetime accuracy:
  - 🟢 **>95%**: Flawless mastery
  - 🔵 **88%–95%**: Proficient touch reach
  - 🟡 **80%–88%**: Developing reach
  - 🔴 **<80%**: High error rate
- **Bilateral Hand Balance**: Real-time split measuring left-hand vs. right-hand accuracy.
- **Struggling Reaches Breakdown**: Identifies error-prone fingers and provides targeted ergonomic tips.
- **Data Backup & Restore**: One-click JSON backup export and import to preserve progress across devices.
- **Curriculum Reset Utility**: Safely wipe achievements to start fresh on newly unlocked curriculum versions while keeping hangar unlocks.

---

## 🛠️ Starship Hangar Upgrades

Earn credits on every completed mission to unlock starship enhancements:

- 🛡️ **Deflector Shields (Levels 1–3)**: Absorbs 1–3 typing mistakes per mission without breaking your combo streak.
- ⚡ **Hyperdrive Reactor (Levels 1–3)**: Accelerates Overdrive warp energy charging by +20% to +60%.
- 🎯 **Precision Sensors (Levels 1–3)**: Widens the hit timing window for PERFECT ratings by +15% to +45%.
- 🌈 **Laser Trail Themes**: Equip Cyan Nebula, Solar Flare Amber, Ion Emerald, Pulsar Violet, or Supernova Prism.

---

## 📁 Architecture & Project Structure

```
astrotype/
├── public/                     # Static assets and icons
├── src/
│   ├── audio/
│   │   └── soundEngine.ts      # Web Audio API procedural synthesis & rhythm tracks
│   ├── components/
│   │   ├── AnalyticsModal.tsx  # Interactive heatmap & bilateral diagnostic center
│   │   ├── CustomPracticeModal.tsx # Free-flight custom text practice runner
│   │   ├── GlobalCosmicBackground.tsx # Canvas starfield & hyperspace warp particle engine
│   │   ├── HangarUpgradesModal.tsx # Upgrades shop for shields, reactor, and audio cores
│   │   ├── HeaderNav.tsx       # Navigation, audio mixer menu, and telemetry bar
│   │   ├── HUD.tsx             # Flight telemetry: WPM, Accuracy, Streak, Rhythm Cadence
│   │   ├── IntegratedLanesKeyboard.tsx # Falling rhythm highway, keycap deck & laser beam
│   │   ├── LevelCompleteModal.tsx # Victory debriefing, star calculation & score rating
│   │   ├── SmallHandVisualizer.tsx # Ergonomic bilateral SVG hand guides
│   │   ├── StageSelectModal.tsx # 7-Sector galaxy mission selector & achievement reset
│   │   └── TextPromptStream.tsx # Prompt stream with live finger guidance pill
│   ├── data/
│   │   └── curriculum.ts       # 28 stages, 7 sectors, finger maps, and color definitions
│   ├── store/
│   │   ├── gameMachine.ts      # Finite state machine logic
│   │   ├── schemas.ts          # Zod validation schemas for player profiles & stages
│   │   └── useGameStore.ts     # Zustand persistent reactive state store
│   ├── types/
│   │   └── game.ts             # TypeScript interfaces and domain type definitions
│   ├── utils/
│   │   └── storage.ts          # LocalStorage persistence, upgrades catalog, star math
│   ├── App.tsx                 # Root application controller and modal orchestrator
│   ├── index.css               # Tailwind CSS v4 styling & typography
│   └── main.tsx                # React 19 bootstrap entry point
├── index.html                  # HTML5 entry with JetBrains Mono and Outfit fonts
├── LICENSE                     # MIT License
├── metadata.json               # AI Studio project metadata
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

---

## 🚀 Getting Started & Development

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- `npm` or `bun`

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/astrotype.git

# Navigate into the project directory
cd astrotype

# Install dependencies
npm install
```

### Running Locally
```bash
# Start the Vite development server (port 3000)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production
```bash
# Typecheck and build optimized bundle
npm run build

# Preview the production build locally
npm run preview
```

### Type Checking & Linting
```bash
npm run lint
```

---

## ⌨️ Controls & Shortcuts

| Action | Shortcut / Control |
| :--- | :--- |
| **Type Falling Keys** | Physical keyboard keys |
| **Virtual Keystroke** | Click or tap any key on the visual keyboard |
| **Pause Mission** | `Esc` key or click the **Pause** button in the HUD |
| **Resume Flight** | Click **Resume Flight** or press `Enter` / `Space` in the pause modal |
| **Toggle Deck View** | Click **Hide Deck / Show Deck** in the top HUD |
| **Toggle Hands Guide** | Click **Hands: ON/OFF** in the keyboard deck header |
| **Audio Controls** | Click the Volume icon in the navigation bar to mix music and sound effects |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.

---

<p align="center">
  <b>AstroType</b> · Built for touch-typists, rhythm game enthusiasts, and cosmic explorers.
</p>
