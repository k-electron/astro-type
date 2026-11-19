# Philosophy

The principles every decision in astro-type traces back to. When a ticket, ADR or change conflicts with this document, either the work changes or this document changes, deliberately, with the reason in the commit.

Capitalised terms are defined in [`GLOSSARY.md`](../GLOSSARY.md).

## Vision

A browser game that turns a beginner into a fluent touch typist through about a month of short daily play. Players should feel they are playing an arcade game, not doing lessons, and come out the other side typing without looking.

## Who it's for

Beginner typists who come for the game and stay because it's fun.

## Principles

Each principle has an ID so tickets, ADRs and commits can cite it.

### P1. The learning is the game

There is one way to win: type well. Every mechanic is a typing measurement: a hit is a correct keystroke, the Streak is an accuracy run, Overdrive fills from steady rhythm, and Drone pressure is the target speed. A hit is a hit; the game never rewards waiting for a Drone to reach the Strike Line. If a player can do well at the game without typing well, the design is wrong.

Drills are welcome. They just have to be played, not sat through.

### P2. Accuracy before speed

Clean typing is rewarded before fast typing. Speed targets rise only after accuracy holds. At 90% accuracy, roughly every other word has a mistake. That is the lowest a Star allows: no Star is earned below 90%, on any Stage.

### P3. Simpler machines, not training wheels

Players never fly a complex machine with aids bolted on. They start on a simple craft that is complete in itself, whose Action Deck holds only the keys they have learned, and graduate to bigger craft as they learn more keys. What the Action Deck shows (lanes, keycaps, hands) is part of the craft.

Guidance that points at the answer, such as the lit keycap or the hand showing which finger, is strongest when a key is new and fades as that key is mastered, so the player learns to find it without it. The fade is shown as progress, flying on instruments, never as something taken away.

### P4. A ramp, never a wall

Each Stage adds one small new thing. Progress has real gates (Stars on a Stage, a Star total for a Sector), but every gate has several ways through, and the way past a sticking point is the practice the player needs.

### P5. Earned, not bought

Stars, unlocks and Upgrades come only from typing performance. Nothing can be bought, or grinded for, that makes a Star easier to earn. Credits buy Cosmetics only: they change how the game looks and sounds, never how it plays. A Cosmetic may reshape the ship or a Drone's hull, but never changes what the player reads to type or to judge themselves: the finger colours, a Drone's size and the key on it, the keyboard and hands, the Strike Line, Miss marks and the Multiplier's colours. A player's ship reflects their typing ability.

### P6. Never punish absence

Stars, Upgrades and Cosmetics are never taken away. Returning players are offered an optional warm-up that refreshes everything learned so far, weighted toward what is most likely to have faded.

### P7. Short and daily

The game is designed around 15–20 minutes of play a day. Short, frequent practice beats long, infrequent practice, so a day's play should feel complete at that length.

### P8. Letters build the reach, words build the fluency

A new key is drilled on its own and in short patterns (`fff jjj fjf jfj`) until the reach is automatic, the way any motor skill is built: by repetition. Once the reach holds, the key moves into real words as soon as possible, because skilled typists plan whole words, not single keystrokes. Drills never go away; they are where a weak key goes back to be rebuilt. A Stage's text uses only learned keys where practical, and bends that rule when real words matter more.

### P9. Spectacle is a requirement

Big visual payoff, smooth transitions and satisfying feedback are core features, not polish for later. Sound is synthesized and responds to the player's typing, so flow sounds good and mistakes sound broken.

### P10. An honest mirror

The game measures how the player types, key by key and finger by finger, and shows it in a form they enjoy reading. The same data decides what the game asks them to practice next. Numbers are measured honestly: accuracy counts first attempts, and WPM counts typing time, not time spent away.

### P11. Your data stays with you

The full game works with no account. The Profile lives in the player's browser and can be backed up and restored by the player. Typing data never goes to a third party.

### P12. Evidence over dogma

The curriculum follows the established consensus of typing instruction and the available research. Inspiration games are spiritual guides: we take what serves the learning and leave the rest.

### P13. Always playable, then deeper

Every push to `main` ships, so every change leaves a working game. Deepen one system at a time, and build the foundations a feature depends on before the feature. Game feel is the biggest risk; protect it in every change.

### P14. Teach the technique, not just the score

Good habits are taught explicitly, at the moment they matter: posture, finding F and J by touch, one finger per key, returning home after every reach, eyes on the screen, opposite-hand Shift and steady rhythm. What the game can measure (Shift side, rhythm, which keys are slow) it measures and coaches. What it can't (which finger pressed a key) it teaches in words and pictures, and never pretends to have seen.

## Inspirations

Described by what they contribute.

- **Classic adaptive typing tutor:** a structured course from finger placement to the full keyboard, with drills that adapt to each key's speed and accuracy.
- **Lane-based rhythm game:** targets travel down lanes toward a line; Streaks, Multipliers and a power meter reward sustained accuracy.
- **Rhythm game with motion controls:** targets arrive colour-coded by hand, with hazards you must not hit; scoring rewards clean form, not just contact.
- **Arcade space shooter with formations:** enemy waves arrive in patterns, dive at the player, and build to boss fights.
- **Vertical-scrolling shooter with upgrades:** each round has medals for specific challenges that unlock harder versions of the round.
- **Puzzle game with star ratings:** one star to progress, three for mastery, and a reason to replay.

## What success looks like

After about a month of daily play, a player:

- touch types the full keyboard, including capitals, punctuation, numbers, Backspace, Enter and Tab, without looking;
- types at 95% accuracy or better;
- reaches roughly 20–25 WPM;
- can keep improving to 50 WPM and beyond, because the game stays playable and replayable after the curriculum.

## Not now

Out of scope until this document says otherwise:

- Accounts and cloud sync
- Accessibility modes (reduced motion, dyslexia-friendly fonts, colourblind palettes)
- Non-desktop devices and non-US-QWERTY layouts
- Teacher or parent dashboards
- More than one Profile in a browser
- Placement testing
- Voice-over and support for early readers

## Known departures

Rules the game has today that conflict with the principles above. They stay until the project owner changes them; each one is a change to make, not a precedent to follow.

| Today                                                                                                                                         | Conflicts with        |
| :-------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- |
| Judgements grade a hit Perfect, Great or Good by how close its Drone was to the Strike Line                                                   | P1                    |
| Credits buy Upgrades (shields, reactor, sensors) that change play, and shields keep the Streak the 3-Star bar needs                           | P1, P5                |
| Overdrive fills on every correct keystroke, not from steady Rhythm                                                                            | P1                    |
| Drones fall at one speed and wait at the Strike Line, so Drone pressure isn't the Stage's target speed                                        | P1                    |
| 1-Star accuracy bars run from 82% to 92%                                                                                                      | P2                    |
| Every Stage is one fixed text, so practice can't target the player's weak keys and a replay can earn Stars on a text the player has memorised | P4, P10               |
| The Action Deck shows the full keyboard from the first Stage                                                                                  | P3                    |
| The lit keycap and the hands stay the same however well a key is known                                                                        | P3                    |
| Accuracy counts every wrong keystroke, and WPM counts Run Time from launch, before the first keystroke                                        | P10                   |
| Analytics shows per-key hits and misses only, and nothing reads it to choose practice                                                         | P10                   |
| A day's play has no shape, and there is no warm-up                                                                                            | P6, P7                |
| Capitals come after numbers; Backspace, Enter and Tab are never taught                                                                        | P12, success criteria |

## Using this document

Before committing to a design or implementation decision, ask:

1. Which principles does this serve?
2. Which principles does it strain, and is that trade-off worth it?
3. Could a player do well at the game without typing well here (P1)?
4. Could a player get stuck here with no way forward (P4)?
5. Does this leave the game playable, and does it build on foundations that exist (P13)?
6. Does the player know the right technique here, and not just whether they scored (P14)?

Changing a principle, the "Not now" list or the known departures is the project owner's call, made in a commit that changes this file and says why.
