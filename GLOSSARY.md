# astro-type

A space-themed typing game that teaches touch typing to beginner typists who come for the game.

## Language

### Curriculum

**Sector**:
A themed group of Stages that forms one step of the curriculum.
_Avoid_: Zone, world, chapter

**Stage**:
A fixed text to type, either from a Sector or set up by the player in Free Flight. Only a Sector Stage has Star bars.
_Avoid_: Level, mission, lesson

### Play

**Run**:
One attempt at a Stage, from launch until it is cleared or abandoned. Replaying a Stage starts a new Run. Leaving the Flight Deck mid-Run pauses it; going to Academy Home or starting a Stage abandons it.
_Avoid_: Session, attempt, mission

**Flight Deck**:
The screen a Run is played on, made up of the HUD, the text prompt and the Action Deck.
_Avoid_: Cockpit, play screen, game view

**Action Deck**:
The lower part of the Flight Deck: the lanes, the Drones, the keyboard and the hands showing which finger to use.
_Avoid_: Highway, keyboard area, lanes keyboard, Tactile Rhythm Flight Deck, Audio Flight Deck

**Drone**:
A falling target in the Action Deck that carries one character for the player to type.
_Avoid_: Tile, note, target

**Strike Line**:
The line just above the keyboard where the lead Drone comes to rest and waits to be typed.
_Avoid_: Receptor, hit line, target line

**Keystroke**:
One key press the game judges in a Run: a hit or a Miss. A key that types nothing, or a held key's repeat, is not a Keystroke; Shift is part of the Keystroke it changes, not one of its own.
_Avoid_: Keypress, input, stroke

**Judgement**:
The verdict on one Keystroke: a hit for the right key, or a Miss for a wrong key.
_Avoid_: Timing, timing feedback, rating, Perfect, Great, Good

**First attempt**:
The first Keystroke on a character of the text. Accuracy, and each key's accuracy, count First attempts only.
_Avoid_: First try

**Clean hit**:
A First-attempt hit straight after a First-attempt hit on the character before. Only Clean hits time a key.
_Avoid_: Clean keystroke

**Opposite-hand Shift**:
A Shift pressed with the other hand from the finger that types the key it changes.
_Avoid_: Correct Shift, cross Shift

**Mix-up**:
A wrong key pressed for the expected one, named as the pair: "e typed as r".
_Avoid_: Confusion, substitution, swap

**Letter pair**:
Two characters next to each other in the text. Its speed is the time between their Keystrokes.
_Avoid_: Bigram, digraph

**Flight log**:
A Run's Keystrokes, kept only until its Debrief is left; it is never saved.
_Avoid_: Run log, keystroke history

**Clean word**:
A word of the text, with the space that finishes it, typed with no Miss mark. Finishing one sets off the biggest explosion and pays a bonus.
_Avoid_: Perfect word

**Miss mark**:
A character of the text where a wrong key was pressed, marked in the text prompt. However many wrong keys the player presses on one character, it carries one Miss mark.
_Avoid_: Error mark, typo

**Streak**:
The number of correct keystrokes in a row in the current Run. A Miss resets it.
_Avoid_: Combo, chain

**Multiplier**:
The x1 to x4 factor on each hit's score, rising as the Streak grows.
_Avoid_: Combo multiplier

**Overdrive**:
A boosted mode that doubles the score of each hit: during Overdrive a hit scores 100 points times the Multiplier times 2, and that number is what the Overdrive badges show. Correct keystrokes fill the Overdrive meter, and Overdrive starts when the meter is full.
_Avoid_: Hyperspace, warp, hyperdrive

**Run Time**:
The time a Run has spent running, with pauses left out. WPM is measured against Typing Time; Run Time is what practice time counts.
_Avoid_: Elapsed time, stage time

**Typing Time**:
The time from a Run's first keystroke to the one that clears it, with pauses left out. WPM is measured against it.
_Avoid_: Typing duration, active time

**Rhythm**:
How evenly the player types, from 0 to 100%: the HUD shows it as Steady, Paced or Uneven, and the Debrief gives the percentage. It is measured in Run Time.
_Avoid_: Cadence

### Progress

**Profile**:
Everything the game remembers about the player between visits: Stage progress, Stars, Credits, Cosmetics, settings and the Logbook.
_Avoid_: Account, player data, user

**Logbook**:
The player's typing, kept in the Profile: a summary of each cleared Run from the last eight weeks, plus lifetime totals, Sector summaries and each key's beginnings and best. It records how the player types, not their progress: Stars and unlocks stay outside it.
_Avoid_: Key stats, telemetry, analytics data, typing record

**Run summary**:
What the Logbook keeps of one cleared Run: its day, where it was flown (copies of the Sector's and Stage's ids and names, or none for a Free Flight), its numbers and its tallies by key, Mix-up and Letter pair. Summaries older than eight weeks are deleted.
_Avoid_: Run record, run log

**Sector summary**:
What the Logbook keeps for good of one Sector the player has flown: its first and last day, days, Runs and Run Time, speed and accuracy over its first and last three days, the keys first typed in it and a sparkline of its Run speeds. It is keyed by the Sector's id and name as its Runs copied them, in the order the player first reached the Sectors, and a Free Flight never touches one. Analytics shows each as an entry of the logbook.
_Avoid_: Chapter

**Day**:
The player's own local calendar date at the moment a Run is cleared, as the wall clock gives it. A Run that crosses midnight counts on the day it was cleared.
_Avoid_: Session, 24 hours

**Journey**:
The player's whole history of play as Analytics shows it, by day played, Sector and Stage. Its detail covers the last eight weeks; older play survives only as Sector summaries and lifetime totals.
_Avoid_: History, progress log

**Save**:
The Profile as stored in this browser.
_Avoid_: Save file, storage

**Backup**:
A Profile exported to a file, which can be imported again.
_Avoid_: Export, save file

**Stars**:
The 0–3 result a Sector Stage earns from a cleared Run; a Stage keeps its best. Stars open new Sectors. A Free Flight earns none.
_Avoid_: Rating, score

**Star bar**:
The accuracy and WPM a cleared Run must reach for a Star: 1 Star needs 90% accuracy and no speed, 2 Stars 95% and the Stage's 2-Star WPM, 3 Stars 98% and its 3-Star WPM. The accuracy bars are the same on every Stage; the WPM bars are each Stage's own.
_Avoid_: Threshold, star threshold, Goal, Target WPM

**Credits**:
Currency earned on each Debrief and spent in the Hangar.
_Avoid_: Coins, money, points

**Cosmetic**:
A Hangar purchase that changes only the look or sound: a Trail, Sound Kit, Burst, Backdrop, Ship or Hull. It never changes what the player reads to type or to judge themselves: finger colours, a Drone's size, its key, the keyboard, the Strike Line, Miss marks or the hit colours by Multiplier.
_Avoid_: Skin, theme, upgrade

**Trail**:
A Cosmetic colour for the lasers fired on each hit.
_Avoid_: Trail theme

**Sound Kit**:
A Cosmetic set of sounds for the lasers and the music.
_Avoid_: Audio core, synthesizer voice

**Burst**:
A Cosmetic style for the explosion on a hit.
_Avoid_: Explosion skin

**Backdrop**:
A Cosmetic for the space behind the Flight Deck.
_Avoid_: Background, theme

**Ship**:
A Cosmetic shape for the small ship at the Strike Line, which keeps the finger colour.
_Avoid_: Skin

**Hull**:
A Cosmetic shape for the Drones' border and body, which keeps their size, key and finger colour.
_Avoid_: Drone skin

### Screens

**Academy Home**:
The title screen the game opens on.
_Avoid_: Menu, main menu, home screen

**Pause Menu**:
The screen shown over the Flight Deck while a Run is paused.
_Avoid_: Pause screen, paused screen

**Galaxy Map**:
The screen for choosing a Stage from the Sectors.
_Avoid_: Stage select, level select, galaxy sectors

**Hangar**:
The screen for spending Credits on Cosmetics.
_Avoid_: Shop, upgrades screen

**Analytics**:
The screen showing the player's lifetime totals, hand balance and per-key stats.
_Avoid_: Telemetry, stats screen, Report

**Free Flight**:
The screen where the player sets up a Stage from their own text. A Free Flight is practice: it earns no Stars and leaves no Stage record, and pays Credits for its score alone. Its typing still goes into the Logbook.
_Avoid_: Custom practice, free flight drill, custom flight

**Debrief**:
The screen shown when a Run is cleared, with its result, the Credits paid and, for a Sector Stage, the Stars earned.
_Avoid_: Victory, level complete, mission debriefing
