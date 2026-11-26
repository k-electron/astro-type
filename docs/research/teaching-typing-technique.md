# How tutors and research teach typing technique

Research for [How tutors and research teach typing technique](https://github.com/k-electron/astro-type/issues/181), under the map [Phase 3: a curriculum that teaches, with practice that fits the player](https://github.com/k-electron/astro-type/issues/175). Written 2026-11-26.

**Question:** how do tutors and research teach the technique that sets a typist's ceiling (posture, finding F and J by touch, one finger per key, returning home, eyes on the screen, Opposite-hand Shift, steady Rhythm)? When in a course, and in words, pictures or drills? How do they build the right finger for each key when no one can see the fingers? And what, if anything, in Keystroke data hints that the wrong finger was used (P14)?

**How much to trust each source:**

- **Primary, a tutor's own lesson text, help or source code:**
  - GNU Typist's lesson files `q.typ` and `t.typ`, read from a [GitHub mirror](https://github.com/alexei-matveev/gtypist/tree/14447d5/lessons) at `14447d5` (the GNU site refuses automated requests, as in [Accuracy and speed benchmarks](https://github.com/k-electron/astro-type/blob/main/docs/research/beginner-typing-benchmarks.md)).
  - keybr.com's source at `05a37bc`.
  - KTouch (KDE) at `e1ac963`, from KDE's GitHub mirror.
  - TIPP10: help pages and the finger table in its database update script, read from [an unofficial GitHub copy](https://github.com/KarlZeilhofer/Tipp10) of version 2.1.0 at `66e391e`, as in [What adaptive typing tutors read](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md).
  - Klavaro's finger data file, from its SourceForge repository.
  - TypingClub's [Typing Jungle Teacher Handbook](https://login.typingclub.com/m/edclubdocs/media/pdf/typing-jungle-handbook.pdf) (169 pages), read in full.
  - Typing.com's [keyboarding curriculum](https://www.typing.com/curriculum/keyboarding) and a support article.
  - Ratatype's [learn page](https://www.ratatype.com/learn/).
- **Primary, research read in full:**
  - Feit, Weir & Oulasvirta 2016, motion capture of 30 everyday typists.
  - Dhakal et al. 2018, 168,000 typists online.
  - Yechiam, Erev, Yehene & Gopher 2003, a touch-typing course and what happened afterwards.
  - Logan & Crump 2009, attention to the hands.
  - Salthouse 1986, a review of 29 typing phenomena.
  - Leonard J. West, _Implications of Research for Teaching Typewriting_ (2nd edition, 1974), a research monograph for typing teachers that rests on hundreds of classroom studies. It is the nearest thing to an evidence-based keyboarding textbook I could read.
- **Primary, standards and guidance:** the Texas TEKS for Technology Applications (2022) and OSHA's Computer Workstations eTool.
- **Weaker, and marked where used:**
  - **Logan, Ulrich & Lindsey 2016:** known only from Vanderbilt's news release, because the paper's host refused connections.
  - **Trudeau, Asundi & Dennerlein (about 2011):** a two-page conference abstract, not a full paper.
  - **West's evidence** comes from typewriter-era classrooms, before 1974.
  - **Ratatype's and Typing.com's pages** were read through a page-reading tool that quotes the page. Everything else was downloaded and read directly.
- **Not used:** blogs, Wikipedia, school and course-seller pages, and any secondary page I couldn't trace to a source.

**Terms:** this note uses the names in `GLOSSARY.md`: Stage, Run, Keystroke, First attempt, Clean hit, Mix-up, Letter pair, Opposite-hand Shift, Shift hand, Rhythm, Action Deck, Drone. "Step" is the map's placeholder for a point on the new path. A source's own word ("lesson", "digram", "substitution error") is kept when quoted. Each section keeps **what the sources say** apart from **inference** (my reading, marked _Inference_). Facts about astro-type come from this repo at `43c0cc0` (`src/curriculum/keyboardLayout.ts`, `src/curriculum/curriculum.ts`).

---

## Bottom line

1. **Tutors agree on the habits, and most teach them once, up front, in words and a picture.** Every tutor read teaches home row, the F and J bumps, one finger per key, returning home, eyes on the screen and Opposite-hand Shift. After that, most rely on a keyboard or hands display that shows the finger for every Keystroke.
   - TIPP10, Ratatype, keybr and KTouch put the habits on one intro page.
   - GNU Typist and TypingClub also repeat a habit at the moment it first matters: returning home at the first reach off the home row, Opposite-hand Shift when Shift arrives, and "look if you must, but use the right finger" for rare symbols.
2. **The finger table is settled for the letters and disputed on the number row.**
   - **Letters:** every table read puts B on the left index finger and Y on the right index finger.
   - **The 6 key:** GNU Typist, KTouch, Klavaro and keybr's default put 6 on the right index finger, as astro-type does. TIPP10's US table and keybr's optional "Symmetric" zones put 6 on the left index finger. TIPP10 also moves the whole number row one finger inward, so its 2 is on the left little finger and its 0 on the right ring finger.
   - **Space:** GNU Typist says always the right thumb, Ratatype says either thumb, and KTouch says both thumbs rest over it.

   astro-type's table matches the majority.
3. **Research says the habit that sets speed is consistency, not the textbook table itself.**
   - Fast typists press each key with the same finger every time, move their hands less, and start moving to the next key early. That holds whatever their system, even with one or two fingers per hand (Feit et al. 2016).
   - What touch typing adds is the eyes. Touch typists looked at the keyboard for 20% of the time against 41% for the others.
   - When the keyboard was hidden, only the standard typists held their speed (Logan et al. 2016, weaker).
   - _Inference:_ "the same finger every time, without looking" is the habit worth building. The standard table is the easiest consistent mapping to teach.
4. **The research disagrees with three pieces of tutor dogma.** West's review of the classroom studies says:
   - **Looking:** beginners should watch their fingers at first. Insisting on touch from the start makes hesitant motions, and the move to touch typing is gradual.
   - **Rhythm:** rhythm drills and metronome pacing are useless, because "the best typing rhythms are least metronomic".
   - **Home row:** pictures of every other finger "glued" to the home row while one finger reaches are "patently wrong".

   Ratatype teaches keystrokes "at equal intervals", and today's Stages coach a "metronome" Rhythm.
5. **Repetition that builds the right finger, as tutors and research describe it:**
   - **For a new key:** a few seconds of reach drills from the home key (`frf`, `f4f`), then real words at once.
   - **Drills that force the hand:** TypingClub's "anchoring" lessons hold F or J down so one hand can't wander, and its "travel" lessons follow each finger's diagonal column.
   - **For capitals:** sentences loaded with capitals train Shift.
   - **For Mix-ups:** sentences that jam a commonly confused pair together, such as "Try to rotate the tires" for r and t.
   - **After that:** a wide variety of real text. West reports that varied text beats repeating the same lines, and that drill content alone never improved accuracy in any study.
6. **The biggest threat to good habits is relapse to looking, and the cure is to make looking cost something.**
   - Learners who already hunt and peck go back to it when it is faster for them, even after finishing a touch-typing course (Yechiam et al. 2003).
   - A task on the screen that punished looking away raised touch-typing scores by 25–30%.
   - _Inference:_ a game whose action happens on the screen applies the same pressure, but only if looking down actually costs the player something.
7. **Keystroke data says little about fingers, and nothing reliable at a beginner's speed.**
   - **Mix-ups say more about hand position than about fingers.** Mirror-finger Mix-ups point to hand confusion (Grudin, in the earlier note). Mispositioned hands cause Mix-ups with neighbours (Long 1976, via Salthouse 1986).
   - **Same-finger timing appears with skill, and is small on modern keyboards.** In professional typists, a Letter pair typed by one finger is slower than one typed by two fingers. The gap is much smaller on modern keyboards (Feit; Dhakal). Slow typists don't show it: their letter repeats are over 150 ms faster than other pairs, and alternating hands is slower for them, not faster (Dhakal).
   - **No study I found validates working out finger use from keystroke timing.** Typists' own reports are unreliable too: 14 of 24 self-described touch typists weren't (Logan et al. 2016, weaker).
8. **Order:** TypingClub, Typing.com and KTouch teach capitals with Shift after the letters and before numbers. GNU Typist's quick course uses Shift from its first lesson. West found that no order of keys has been shown to be best, as long as real words are possible from the first lesson. Teaching numbers early or late gave equal results, and no special tactic stopped learners looking at the number row.

---

## 1. What is taught

### What the sources say

| Habit                    | What the tutors say                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Posture**              | TIPP10: "Make sure your posture is straight", "Bring your arms to the side of your body and relax your shoulders. Your upper arm and lower arm should be at a right angle. Do not rest your wrists" ([`behaviour.html`](https://github.com/KarlZeilhofer/Tipp10/blob/66e391e/release/help/en/content/behaviour.html)). TypingClub: "position their monitors directly in front of their eyes, sit up straight, hover their wrists just above the keyboard, and sit close to their desks so that their arms form the shape of an L" (Handbook, "Tips to Help Students Excel"). Ratatype: back straight, elbows at a right angle, eyes about 45–70 cm from the screen, no weight on the wrists.                                                                                                                                                                                       |
| **F and J by touch**     | keybr: "There are small bumps on the keys 'F' and 'J', put your index fingers on the bumps" ([`HelpPage.tsx`](https://github.com/aradzie/keybr.com/blob/05a37bc/packages/page-help/lib/HelpPage.tsx)). KTouch: "Place your two index fingers on the two keys … with the two little tactile markers" ([handbook](https://github.com/KDE/ktouch/blob/e1ac963/doc/index.docbook)). TypingClub: "Remind your students to feel for the bumps on the F & J keys and encourage them to look up!" GNU Typist: "Whenever you are about to type a line, look at your fingers and make sure they are in the HOME position. Then don't look at them again" ([`t.typ`](https://github.com/alexei-matveev/gtypist/blob/14447d5/lessons/t.typ)).                                                                                                                                                                       |
| **One finger per key**   | keybr: "Each finger is responsible for its own set of keys". Ratatype: "Hit keys only with the fingers for which they have been reserved", and pay attention to the ring and little fingers, "since they are considerably underdeveloped". GNU Typist names the finger for each new key ("Use your F-finger for the B-key", `t.typ`). Its quick course, on the last letters, says "Concentrate on using the correct finger for each key" ([`q.typ`](https://github.com/alexei-matveev/gtypist/blob/14447d5/lessons/q.typ)).                                                                                                                                                                                                                                                                                                                                                                                                |
| **Return home**          | GNU Typist: "When you reach for any of these keys, be sure to return your finger to its home position … Tap the H-key and immediately bring your finger back over the J." TIPP10: "The fingers return to the home row after each key is pressed." KTouch: "Try to move your hands as little as possible and always try to return your fingers to their resting positions after you have typed a character." TypingClub: "After a key on the top row is pressed, all fingers must return to the home row." Ratatype: "Always return to the starting position".                                                                                                                                                                                                                                                                                                                            |
| **Eyes on the screen**   | GNU Typist: "Avoid the tendency to look down at your fingers while typing. This is a very bad habit and is hard to break later", and "If you lose track of where your fingers are guess. Don't look!" TIPP10: "Your eyes should be directed toward the monitor at all times." TypingClub: "The best thing teachers can do is make sure that students don't look at the keyboard." Ratatype: "You cannot learn touch typing if you constantly glance at the keyboard." The one exception: GNU Typist's lesson on shifted number-row symbols says "If you … cannot remember where a key is, look. But, always make sure to hit the key with the correct finger."                                                                                                                                                                                                                         |
| **Opposite-hand Shift**  | GNU Typist: "Whenever you want to capitalize a key on the left side, you must use the right shift-key", then "Immediately bring your fourth finger back to the ;-key." TypingClub: "Our method encourages students to use the opposite shift key from the hand being used to type the character. This allows students to maintain the correct finger placement and easily return to the home row position." Ratatype: "The SHIFT key is always pressed by the pinky finger opposite to the one hitting the other key." KTouch and TIPP10 build it into their key tables: every left-hand capital names the right Shift as its modifier, and every right-hand capital the left ([KTouch `us.xml`](https://github.com/KDE/ktouch/blob/e1ac963/data/keyboardlayouts/us.xml); TIPP10's `keyboard_layouts` table in [`sql.tipp10v210.utf`](https://github.com/KarlZeilhofer/Tipp10/blob/66e391e/update/sql.tipp10v210.utf)). |
| **Steady rhythm**        | Ratatype: "Establish and maintain a rhythm while typing. Your keystrokes should come at equal intervals." GNU Typist's lessons open with a "Rhythm Drill" and close with a "Rhythmic Review". The Texas standards (below) don't mention rhythm in the grades checked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Accuracy before speed** | TIPP10: "Try to keep typing errors to a minimum. It is much less efficient to type fast if you are making a lot of mistakes." TypingClub: "Students should focus on accuracy first, and speed will progressively increase." Ratatype: "Speed up only when your fingers hit the right keys out of habit."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Never revert**         | TIPP10: "Once you have begun touch typing you have to avoid reverting back to the way you used to type before (even if you are in a hurry)." TypingClub: "Use all 10 fingers … and not only when practicing on TypingClub!"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

**Standards and guidance:**

- **Teaching standards:** the Texas standards ask Grade 1 to "practice ergonomically correct keyboarding techniques and developmentally appropriate hand and body positions" ([§126.2(9)(D)](https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-126-2)). Grade 5 must "demonstrate proper touch keyboarding techniques with increasing speed and accuracy and ergonomic strategies such as correct hand and body positions" ([§126.10(12)(C)](https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-126-10)). Neither lists the habits themselves.
- **Ergonomics:** OSHA asks for wrists "straight and in-line with your forearms". Shoulders should be relaxed, with elbows "close to your body" and at about keyboard height, and forearms "approximately parallel with the floor" ([Keyboards](https://www.osha.gov/etools/computer-workstations/components/keyboards)).
- **Typing style and joint loads (weaker, a conference abstract):** 15 two-finger typists showed "larger dynamic loading and increased variability in joint torques and postures" than 16 touch typists. That included higher wrist torque and higher static shoulder-muscle load ([Trudeau, Asundi & Dennerlein](https://stacks.cdc.gov/view/cdc/224409/cdc_224409_DS1.pdf), Harvard, funded by NIOSH).

**Where the research disagrees with the tutors** (West 1974, [ERIC ED107884](https://files.eric.ed.gov/fulltext/ED107884.pdf); quotes have the scan's OCR slips corrected):

- **Looking at the keys early.** "Hesitancy is exactly what results when full touch typing is insisted on from the start." West calls insisting on touch from the start a "fallacy". He also writes: "Because visual typing at the start makes the motions less variable … dependable muscular sensations develop earlier, sooner leading to full touch typing than under the impossible demand that beginners type by touch from the start." The move to touch typing "is gradual and progressive, not all at once". It takes "a week or two" for some learners and "several months" for others, and he recommends speed forcing to bring it about.
- **On-screen keyboards and charts.** "Wall charts of the keyboard are equally offensive when in view for more than the few seconds it takes to point out a new key location and fingering reach … indefinitely long access to keyboard charts merely cripples the learner." TypingClub argues the opposite for its on-screen keyboard: "The virtual keyboard guide is a visual aid that encourages students to look up at the monitor instead of down at their hands." It adds that its on-screen hands are for early lessons and "When students reach advanced lessons, the guides can be disabled."
- **Rhythm.** Among useless procedures West lists "Rhythm drills, typing to music, or any other stroke-by-stroke pacing involving equal interstroke time intervals. As was shown definitively in the 1920's and early 1930's, the best typing rhythms are least metronomic." He allows a teacher to pace only "the earliest practice at each new key", for "no more than a fraction of a minute".
- **Fingers glued to the home row.** "The fingering photographs or sketches in typing textbooks that show all but the finger in use glued to their home row keys are patently wrong. It is, for example, impossible to strike c while keeping the f finger in place on its key." Salthouse (1986, item 8) suggests that with experience typists "make direct movements from one key to another without a return to the home-row positions", though "the relevant data have apparently not yet been collected". In Feit et al.'s motion capture, most people's right hand "does not show such a home position"; "only highly skilled typists could also keep a static home position in the right hand".
- **Speed and accuracy.** West reports "an essentially zero relationship between stroking speed and stroking accuracy" across decades of studies. He recommends separate speed and accuracy practice, and says "Stress on stroking speed, not accuracy, is the necessary condition" for skill to grow. Every tutor quoted above says accuracy first.

### Inference

- **Accuracy:** the game's rules, including P2's accuracy before speed, stay as they are. West's speed advice is noted here, not proposed.
- **Rhythm:** P14 lists "steady rhythm" among the habits, and today's Stages coach it in metronome terms ("Lock in an alternating left/right rhythm", "Metronome Rhythm Endurance"). West's evidence says evenness is not something to drill. Salthouse (1986, item 25) shows that the spread of interkey times falls as skill grows. So Rhythm reads best as a sign of skill that the game measures and shows, not as a target to coach with a beat.
- **Return home:** "return home" is still the right thing to teach a beginner, as a way of knowing where the hand is. But the teaching should not say every other finger stays still. Today's tips "Keep your remaining fingers resting on the home row" and "Keep the opposite hand resting comfortably on home row" fit the second part. "Move only the striking finger" is the kind West calls wrong for reaches like C.
- **Looking:** "Never look" and "look early" can both hold if looking fades. The Action Deck's keyboard and hands keep the eyes on the screen while a key is new, which is TypingClub's argument. Fading them as a key is learnt (P3, out of scope this phase) answers West's warning about charts kept in view too long.

---

## 2. The finger table and the disputed keys

### What the sources say

Each tutor's key table, for the keys where any source differs. "L" and "R" are the left and right hands.

| Key   | astro-type     | GNU Typist ([`t.typ`](https://github.com/alexei-matveev/gtypist/blob/14447d5/lessons/t.typ)) | KTouch ([`us.xml`](https://github.com/KDE/ktouch/blob/e1ac963/data/keyboardlayouts/us.xml)) | Klavaro ([`fingers_position.txt`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/data/fingers_position.txt)) | keybr default ([`ansi_101.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc/packages/keybr-keyboard/lib/geometry/ansi_101.ts)) | keybr "Symmetric" ([`mod.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc/packages/keybr-keyboard/lib/geometry/mod.ts)) | TIPP10 US ([`sql.tipp10v210.utf`](https://github.com/KarlZeilhofer/Tipp10/blob/66e391e/update/sql.tipp10v210.utf)) |
| :---- | :------------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------- |
| 1     | L little       | L little ("a1a")                                                                            | L little                                                                                  | L little                                                                                                               | L little                                                                                                                    | L little                                                                                                                  | L little                                                                                                       |
| 2     | L ring         | L ring                                                                                      | L ring                                                                                    | L ring                                                                                                                 | L ring                                                                                                                      | L ring                                                                                                                    | **L little**                                                                                                   |
| 3     | L middle       | L middle                                                                                    | L middle                                                                                  | L middle                                                                                                               | L middle                                                                                                                    | L middle                                                                                                                  | **L ring**                                                                                                     |
| 4     | L index        | L index                                                                                     | L index                                                                                   | L index                                                                                                                | L index                                                                                                                     | **L middle**                                                                                                              | **L middle**                                                                                                   |
| 5     | L index        | L index                                                                                     | L index                                                                                   | L index                                                                                                                | L index                                                                                                                     | L index                                                                                                                   | L index                                                                                                        |
| **6** | R index        | R index ("the longest reach of all!")                                                       | R index                                                                                   | R index                                                                                                                | R index                                                                                                                     | **L index**                                                                                                               | **L index**                                                                                                    |
| 7     | R index        | R index                                                                                     | R index                                                                                   | R index                                                                                                                | R index                                                                                                                     | R index                                                                                                                   | R index                                                                                                        |
| 8     | R middle       | R middle                                                                                    | R middle                                                                                  | R middle                                                                                                               | R middle                                                                                                                    | R middle                                                                                                                  | **R index**                                                                                                    |
| 9     | R ring         | R ring                                                                                      | R ring                                                                                    | R ring                                                                                                                 | R ring                                                                                                                      | **R middle**                                                                                                              | **R middle**                                                                                                   |
| 0     | R little       | R little                                                                                    | R little                                                                                  | R little                                                                                                               | R little                                                                                                                    | **R ring**                                                                                                                | **R ring**                                                                                                     |
| B     | L index        | L index                                                                                     | L index                                                                                   | L index                                                                                                                | L index                                                                                                                     | L index                                                                                                                   | L index                                                                                                        |
| Y     | R index        | R index                                                                                     | R index                                                                                   | R index                                                                                                                | R index                                                                                                                     | R index                                                                                                                   | R index                                                                                                        |
| C     | L middle       | L middle                                                                                    | L middle                                                                                  | L middle                                                                                                               | L middle                                                                                                                    | **L index**                                                                                                               | L middle                                                                                                       |
| Z     | L little       | L little                                                                                    | L little                                                                                  | L little                                                                                                               | L little                                                                                                                    | **L ring**                                                                                                                | L little                                                                                                       |
| Space | thumbs (either) | **right thumb** ("always hit the SPACE bar with this thumb")                               | thumbs                                                                                    | –                                                                                                                      | right thumb                                                                                                                 | right thumb                                                                                                               | thumb                                                                                                          |

Notes on the table:

- **Klavaro:** I read its digit code as 1–4 for the left little to index fingers and 6–9 for the right index to little fingers. That reading reproduces the standard table for every letter, which supports it.
- **keybr:** the "Symmetric" zones are an option in keybr's settings; "Standard" is the default ([`geometry.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc/packages/keybr-keyboard/lib/geometry.ts)). The code also defines two "angle" variants that its settings don't offer.
- **TIPP10:** its number row moves one finger inward on both hands, and its Z, X and C are standard.
- **The other tutors:** TypingClub, Typing.com and Ratatype show their tables only as pictures, which I couldn't read, so they are not in the table.
- **Space:** Ratatype says: "Use the thumb of whichever hand is more convenient for you to press the Space bar."
- **Unlisted keys:** GNU Typist sends every unlisted key to the nearest finger: "the ESC, TAB, CAPS LOCK, and SCROLL keys use the A-finger. And, the keys to the far right (BACKSPACE, DELETE, LINE FEED, RETURN, }, {, etc.) use the ;-finger."

**What real typists do** (Feit et al. 2016, 30 typists, motion capture; [CHI paper](https://userinterfaces.aalto.fi/how-we-type/resources/HowWeType_CHI16.pdf)):

- **Few follow the table exactly.** "Of the 13 self-reported touch typists, only 3 had a 'perfect' mapping according to the original system."
- **Left hand:** 7 of the 30 were "offset touch typists", a "variant of touch typing without the use of little finger, thus shifted by one column to the left. The ring finger handles the A key, and the middle finger the S and E keys."
- **Right hand:** 5 were "'lapsed' touch typists", for whom "keys of the Y and U columns are often typed by middle instead of index finger". "Only 12 of 30 participants consistently used more than two fingers for the letter keys on the right hand."

### Inference

- **astro-type's table is the majority table.** That includes 6 on the right index finger and 0 on the right little finger. The disputed keys are on the number row, which is a later part of the path. There is no evidence that either choice is faster; the sources simply differ.
- **The new path should name the finger for each disputed key once and keep it.** Feit et al.'s strongest finding is that consistency is what matters (section 5).
- **The habits real typists drift into are known.** The left little finger drops out, and the right hand gives the Y and U column to the middle finger. Ring and little fingers, and the index finger's second column (T, G, B and Y, H, N), are where a curriculum should spend extra drills.

---

## 3. When and how it is taught

### What the sources say

- **GNU Typist** (text-only, so all in words):
  - **Lesson 1:** the first screens cover the home keys, the right thumb for Space, the "don't look" rule, and the Return reach: "zip the finger back to its home position".
  - **The first reach** (E, G and H in lesson T2): returning home is taught as soon as a finger first leaves the home row.
  - **Shift:** the right Shift is taught with the first capital, in three numbered steps that end with the little finger coming home.
  - **Correct fingers:** each new key's instruction line names its finger ("Use your S-finger for the 2-key").
  - **Shifted symbols:** for this rarely used row, "look" if you must, "but, always make sure to hit the key with the correct finger".
  - **The quick course:** it brings in capitals in its first lesson, with the Shift opposite the home-row letter ("To get capitals use your ';' finger on [right-SHIFT]").
- **TypingClub** (words, video, pictures and drills, spread through a 36-week plan; Handbook sections 3–5 and 12):
  - **Weeks 1–2:** "Introduction to Typing" and "Home, Sweet Home" videos, and a paper keyboard on which students press "keys" with the right fingers. The teacher sets the rules: "never look down at the keyboard, sit up straight, two feet on the floor, fingers on the home row".
  - **Top row:** the "Sit Straight, Be Healthy" posture video.
  - **Bottom row:** "Remind students that they should always return to the home row position."
  - **Shift (weeks 9–12):** Opposite-hand Shift is taught when Shift arrives.
  - **Every key:** "Each new key is introduced in a score-free practice environment which provides written instructions on the correct finger placement. Paying proper attention to introducing new keys is paramount to adopting correct typing technique."
  - **On-screen hands:** "beneficial, especially in the early lessons, to learn proper finger positioning. When students reach advanced lessons, the guides can be disabled."
- **TIPP10:** a six-point intro dialog when the program first runs ([`illustrationdialog.cpp`](https://github.com/KarlZeilhofer/Tipp10/blob/66e391e/widget/illustrationdialog.cpp)). Before each lesson, "Place your fingers in the home row position". During the lesson, a virtual keyboard where "The color indicates which finger should be used" ([`training.html`](https://github.com/KarlZeilhofer/Tipp10/blob/66e391e/release/help/en/content/training.html)).
- **keybr, KTouch, Ratatype:** one page of advice, then a coloured keyboard during practice. keybr gives the least: home row, the bumps, and a picture of the finger zones.
- **Typing.com:** an "Introduction to Typing" lesson opens the course, and on-screen hands can be shown or hidden ([support](https://support.typing.com/en/articles/9048065)). Its lesson pages render in the browser, so I couldn't read their technique text.

**Order of the course:**

| Tutor                                                                                                      | Letters                                                                         | Shift / capitals                           | Numbers                        |
| :--------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ | :----------------------------------------- | :----------------------------- |
| TypingClub (36-week syllabus)                                                                              | By row: home (weeks 1–2), top (3–4), bottom (5–6)                               | Weeks 9–12                                 | Weeks 15–17, symbols from week 21 |
| [Typing.com](https://www.typing.com/curriculum/keyboarding)                                                | By frequency in threes: "J, F, and Space", "U, R, and K", "D, E, and I" … lessons 4–16 | Lesson 20                                  | Lesson 24                      |
| KTouch ([`us.xml` course](https://github.com/KDE/ktouch/blob/e1ac963/data/courses/us.xml))                | In pairs from "j and f" to "y and z"                                            | Last lesson, "Capitalisation"              | Not in this course             |
| TIPP10 ([`lessons.html`](https://github.com/KarlZeilhofer/Tipp10/blob/66e391e/release/help/en/content/lessons.html)) | Home row, then "usually two" keys a lesson, by frequency                        | Not stated                                 | Not stated                     |
| GNU Typist quick course                                                                                    | Home row plus E and I, then by groups                                           | Lesson 1                                   | Separate series                |

**Research on when** (West 1974):

- **Order:** "There is no particular order of presentation of keys that has been shown to be most advantageous (by horizontal rows, by diagonal rows, skip-around). The only requirement is that from the first lesson and continuously thereafter, the keys selected permit the immediate use of dictionary words, phrases, or sentences."
- **Pace:** present all the letters quickly, roughly 5–15 lessons of 40–50 minutes, and let practice make them "sink in". That is because "To each key on the typewriter, there are several different motions to be learned, not one per key": the reach to R differs in _from_, _cream_ and _brought_.
- **Numbers:** "no specialized tactics for teaching the numbers and symbols have been found to reduce the incidence of visual typing of those keys or to increase skill at them". Also, "equal outcomes followed teaching the numbers with the alphabet keys as compared to later teaching of the number keys".

### Inference

- **Teach at the moment, as GNU Typist and TypingClub do.** P14's "taught explicitly, at the moment they matter" is GNU Typist's and TypingClub's pattern, not keybr's or TIPP10's single intro page:
  - finding home and the bumps, on the first step;
  - returning home, on the first reach off the home row;
  - Opposite-hand Shift, on the first capital;
  - "the right finger even when you have to look", on the number and symbol steps.

  Words and a picture carry the habit; the step's drills then exercise it.
- **Capitals before numbers is what the larger tutors do,** and is what the map already asks for.
- **West's finding that each key has many motions** argues for putting a new key next to every learned key it often sits beside, soon after it is introduced. P8's "in short patterns, then real words" fits this.

---

## 4. Building the right finger without seeing it

### What the sources say

**Drills tutors use to make the right finger the easy one:**

- **Reach from the home key and back.** GNU Typist's drill lines are `frfk fvfb jujy jmjn`, `sss s2s sss s2s` and `f5f f54 f5f t5g`. Every reach starts and ends on the home key, and "If you did make a mistake, I will beep at you and make you do the line again." It also watches for a finger that stays put: "Be sure that the F-finger does not linger on the G-key or the J-finger on the H-key."
- **Anchoring.** TypingClub: "Trying to hunt and peck becomes very difficult with our anchoring lessons. With one hand 'anchored' by holding down the F or J key, these lessons have students practice typing with each hand individually."
- **Travel along a finger's column.** TypingClub: "Starting from the home row, each finger has to cover at least one character on home, top, and bottom row, following a diagonal movement." Its number and symbol lessons use the same method "to help students build the necessary muscle memory to type numbers and symbols without looking at the keyboard."
- **Common patterns.** TypingClub repeats frequent letter combinations "as stand alone letter combinations and used in words".
- **Repeat until clean.** TIPP10: "You should repeat each lesson until you have eliminated all mistakes or only make very few and can type without hesitation." TypingClub can "Block on error(s)" and asks for 5 Stars: "Mastery equals 5 stars!"
- **Finger statistics.** TypingClub's statistics show students "their strongest and weakest characters and fingers", which are key tallies grouped by the finger table.

**What the research says about drills** (West 1974):

- **Nonsense drill:** "For the first few seconds of practice at each new reach there is no objection to nonsense drill of the frf variety. However, as a basic medium for teaching the keyboard, nonsense drill has been shown in all the studies of it to be less effective than the immediate use of dictionary words, phrases, and sentences."
- **Varied over repeated:** "extensive practice over a varied body of materials is preferable to intensive practice over a smaller body of materials". So it is "better one trial at each of ten sentences than two trials at each of five sentences or five trials at each of two sentences". He reports two classroom studies that found better accuracy, and in one also better speed, with the varied practice.
- **Excess repetition:** "Excessive repetition, however, is known to cause the accumulation of mental and muscular inhibitions, increased errors, the fixing of undesirable responses and fatigue."
- **Pair new letters with neighbours:** the best materials "deliberately put each new letter in sequence with each previously taught letter that occurs adjacent to it in the language".
- **Make the right response happen:** "Use materials and procedures that make the desired event take place or that preclude the occurrence of undesired responses." His example is capitals chosen so that the letter after a capital is typed by the Shift hand, "forcing" the little finger back off Shift.
- **What did not help:** "All specialized concoctions of drill materials: one-hand, balanced-hand, double-letter, reach-stroke", "Repetitious practice on the particular words mistyped", "Error analysis charts or technique check sheets" and "Stringent standards of accuracy early in learning". Learners given none of these "perform as well as or better than" those given them.
- **What did help:**
  - Capitals: sentences "loaded with capital letters" for the first teaching of Shift and for "flying capitals".
  - Mix-ups: "The substitution error (mainly consisting of striking a key nearby to the desired key) accounts for the overwhelming proportion of all stroking errors". The cure is "jamming together the commonly substituted letters. Thus, for r-t confusion: Try to rotate the tires at intervals; for m-n confusion: Maintain a nominal account in Denman's name."
  - Too many errors: going back to letter-by-letter spelling aloud, for the few learners who need it.

**What the research says about attention and relapse:**

- **Attention to the hands disrupts skilled typing.** Logan & Crump (2009) asked skilled typists to type only one hand's letters: "Cuing the hands disrupted performance markedly, slowing typing and increasing the error rate". They explain that the control loop which picks words "does not know which hand types which characters" ([author's copy](https://www.crumplab.com/publications/Crump/files/3906/Logan%20and%20Crump%20-%202009%20-%20The%20left%20hand%20doesn't%20know%20what%20the%20right%20hand%20Is%20.pdf), _Psychological Science_ 20(10)).
- **Learners relapse to looking** (Yechiam et al. 2003, _Human Factors_ 45(4); [Technion copy](https://yeldad.net.technion.ac.il/files/2016/12/type.pdf), [abstract](https://cris.haifa.ac.il/en/publications/melioration-and-the-transition-from-touch-typing-training-to-ever/)):
  - **The students:** 22 students who already typed by looking, at 18.4 WPM. They touch-typed at only 8.1 WPM before the course. In a pilot, experienced users who were told not to look lost "about 90%" of their speed.
  - **The course:** about 8 hours of course brought touch typing to 21.1 WPM, past their looking speed.
  - **Afterwards:** "the more competent a person was in visually guided typing, the worse he or she performed in typing" when doing their own homework afterwards.
  - **The cure:** blue squares appeared on screen and had to be answered within 2 seconds, which made looking at the keys costly. Touch-typing scores became 25% higher at the end of the phase and 30% higher two weeks later. The effect had faded in a transfer test.
  - **The authors' advice:** train "until touch-typing performance in everyday typing tasks, rather than fixed tests," beats looking. They add that hiding the keyboard works, but leaving the choice to the learner suits self-taught learners better.

### Inference

- **"Wax on, wax off" in the evidence has two parts.** The first is a few seconds of reach drill from the home key for a new key, with the finger named. The second is a great deal of varied real text, in which the right finger is the only easy one. P8 already says this. The Stage library and generator should provide the second part generously, rather than many repeats of one drill line.
- **Hand-forcing drills.** TypingClub's anchoring is the only drill read that physically prevents the wrong hand. Holding F or J down is a key that stays pressed, and `GLOSSARY.md` says a held key's repeat is not a Keystroke. So whether a browser can tell that F is still held while the other hand types is a question for a prototype, not a finding.
- **Mix-up loops follow West's recipe.** When the orchestrator detours for a Mix-up, the generator should put the two keys side by side in real words (West's "rotate the tires"), not drill each key alone. This builds on the earlier note's Mix-up pairs.
- **Teach the finger early, then stop talking about it.** Logan & Crump's result suggests explicit finger talk belongs when a key is new. Once typing is automatic, drawing attention to the hands slows it. That fits P3's fading guidance.
- **Yechiam's blue squares are what a typing game is.** Drones demand eyes on the screen. But the pressure only works if looking down actually costs the player something, and today Drones "wait at the Strike Line". That is a Known departure (P1) and out of this phase's scope. Today, a player who already hunts and pecks may still find looking pays, which is the relapse Yechiam describes.

---

## 5. What research says sets the ceiling

### What the sources say

- **Consistency, preparation and a still hand predict speed, not the number of fingers** (Feit et al. 2016). "Motion capture data exposes 3 predictors of high performance: 1) unambiguous mapping (a letter is consistently pressed by the same finger), 2) active preparation of upcoming keystrokes, and 3) minimal global hand motion." Touch typists had a lower finger-to-key entropy (0.26 against 0.38), meaning more consistent fingers. Entropy correlated with inter-key interval in both groups. Touch and non-touch typists didn't differ in speed (57.8 against 58.9 WPM), and "if performance is the goal it is not necessarily important which fingers a typist uses".
- **Touch typing frees the eyes.** "Non-touch typists used 40% of their time looking at the keyboard, whereas touch typists spent only 20%." In their words, the self-taught techniques "may be worse in interactive tasks that require attention to the display". Touch typists' interkey time also rose more steeply with looking.
- **In a broader sample, fingers and training do matter** (Dhakal et al. 2018, [CHI paper](https://userinterfaces.aalto.fi/136Mkeystrokes/resources/chi-18-analysis.pdf)). The self-reported number of fingers correlated with speed (r = 0.38). Fast typists used 8.4 fingers against 5.3 for slow ones. Trained typists were about 5 WPM faster than untrained ones. The authors say their sample (over 70% had taken a course) may explain the difference from Feit et al.
- **Standard typists don't depend on seeing the keys** (Logan, Ulrich & Lindsey 2016, _JEP: HPP_ 42; **weaker**, from [Vanderbilt's news release](https://news.vanderbilt.edu/2016/10/18/todays-self-taught-typists-almost-as-fast-as-touch-typistsas-long-as-they-can-see-the-keyboard/)). 48 typists took part. Standard typists averaged 80 WPM against 72 for the others. "When the keyboard was obscured the speed and accuracy of the nonstandard typists dropped while that of the standard typists remained about the same." "14 of the 24 typists who said they were standard typists were actually nonstandard typists." On a blank keyboard, standard typists placed 17 of 26 letters correctly and the others 15.
- **Same-finger sequences resist speed-up.** West explains that "ed" (left middle finger twice) "is highly resistant to chaining because the motions involve consecutive strokes by the same finger". Salthouse (1986) reports that the Letter pair speed of two-hand and two-finger pairs improves more with skill than that of one-finger pairs. He explains that "overlapping is only possible with successive keystrokes made by different fingers" ([UVA listing](https://uva.theopenscholar.com/vcap/publications/perceptual-cognitive-and-motoric-aspects-transcription-typing), _Psychological Bulletin_ 99(3)).

### Inference

- **The owner's aim, restated by the evidence:** a ceiling is capped by an inconsistent finger for a key, by a hand that travels, and by eyes that must check the keyboard. The standard table gives the most fingers and the least travel; consistency and not looking are what a game can reward.
- **Two-finger habits cost more than speed.** Same-finger runs can't overlap, so a two-finger typist's ceiling is set by how many Letter pairs land on one finger. The joint-load abstract (weaker) adds a comfort reason for touch typing beyond speed.
- **Why the habits must be taught.** Self-reports are unreliable, and real touch typists drift (Feit et al., Logan et al.). A player who believes they use the right fingers may not. That is a reason to keep teaching the habits in words and pictures (P14), since the game can't check them.

---

## 6. Hints in the data: what Keystroke data says about fingers

### What the sources say

- **Mix-ups** (Grudin 1983; numbers as summarised in [the earlier note, section 4](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md#4-mix-ups)):
  - 59% of beginners' Mix-ups are the key next to the expected one in the same row, usually a different finger.
  - 8% are the key above or below, on the same finger.
  - 16% are the same finger of the other hand (the mirror key).
- **What the Mix-up kinds mean** (Salthouse 1986):
  - About 15% of the Mix-ups in his studies "involved homologous fingers on the opposite hand".
  - "Another probable source of substitution errors, particularly among novice typists, is mispositioning of the hands and fingers above the keys. Indeed, Long (1976) found that the frequency of substitution errors increased when typists were prevented from seeing the keyboard during typing, thereby directly implicating inappropriate positioning as a cause of substitution errors."
- **Timing by finger and hand** (professional touch typists, Salthouse 1984 as tabled in Feit et al.):

  | Letter pair typed by       | Interkey time |
  | :------------------------- | ------------: |
  | Two hands                  |        155 ms |
  | Two fingers of one hand    |        194 ms |
  | One finger, different keys |        223 ms |
  | One key twice              |        176 ms |

- **On modern keyboards the gaps shrink.**
  - Feit et al.'s touch typists: 151 ms for two hands, 162 ms for two fingers of one hand, 195 ms for one finger. Their hand-alternation benefit was not significant.
  - Dhakal et al. found alternating hands only 5–20 ms faster: "On modern keyboards, using different fingers of the same hand allows for a benefit similar to that with fingers of different hands."
- **Slow typists show the reverse.** In Dhakal et al., for the slowest tenth of typists (about 21 WPM), "letter repetitions are much faster (at >150 ms) than any other bigrams, while hand alternation is not efficiently employed and can even be slower than using the same hand".
- **Trained and untrained typists look alike in timing.** Their distributions of interkey times were "very similar", which "indicates that variations in performance cannot be sufficiently explained by differences in which finger presses which key". Dhakal et al. used Feit et al.'s motion-capture data only to label Letter pairs as left-hand, right-hand or two-hand. Their own data "does not include observations about which finger presses which keys".
- **No validated detector.** I found no study that infers which finger pressed a key, or classifies touch typists, from keystroke timing alone and reports how accurate that is.

### Inference

These are hints the orchestrator could read as clues, never claims. P14 forbids pretending to have seen the finger.

| Pattern in the Logbook                                                                                                   | What it may mean                                                                    | How reliable                                                                                                                                                                                                                                                                                                 |
| :----------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mix-ups that all slip the same way across several keys of one hand (j typed as h, k as j, l as k)                        | The hand is resting one key off home                                                | Plausible from Long's finding. No study tests it as a detector, but the pattern is distinctive and cheap to see in Mix-up pairs.                                                                                                                                                                              |
| Mirror-key Mix-ups (d typed as k, f as j)                                                                                | The right finger, but the hand mixed up                                             | Well documented as a category (Grudin, Salthouse). It says nothing about wrong fingers.                                                                                                                                                                                                                     |
| Mix-ups with the key above or below on the same finger (e typed as d)                                                    | The right finger with a short or long reach                                         | A category, not a wrong-finger sign.                                                                                                                                                                                                                                                                        |
| Mix-ups between keys of neighbouring fingers on one row (c typed as v)                                                   | A finger reaching into its neighbour's column, perhaps from a wrong-finger habit    | Weak: these are also the commonest ordinary Mix-up.                                                                                                                                                                                                                                                         |
| A Letter pair that the table gives to one finger (ed, de, ce, un, ny, my, br, ki) typed as fast as pairs that use two fingers | Two fingers are being used, so one of them is the wrong finger (as in Feit's offset or lapsed patterns) | Unreliable for beginners. The one-finger slowdown appears with skill, is about 30–45 ms in modern touch typists, and is buried by the much larger spread of a slow typist's times. Possibly usable well above 40 WPM with many Clean hits per pair, but unvalidated. |
| A key's Clean-hit time much slower than its neighbours on other fingers                                                  | A weak finger, or a reach not learnt                                                | The usual weak-key signal the earlier note covers. It says "practise this key", not which finger.                                                                                                                                                                                                           |

- **At a simulated beginner's ~12 WPM, timing says nothing about fingers.** The useful finger-related evidence is in Mix-up pairs, and even that points to hand position, not finger choice.
- **The finger can still shape the response.** When a Mix-up loop is generated, it can be built around the finger column of the keys involved: a travel drill for that finger, then real words. That uses the finger table without claiming anything was seen.
- **The simulated beginner can't validate these hints.** Its keystrokes are generated from the model it was given, so any finger signal in its data is one the model put there.

---

## Questions this leaves for the decision tickets

1. **Disputed keys:** confirm the finger table for the path as it is today (6 on the right index finger, as the majority). Is Space "either thumb", as today, or "right thumb", as GNU Typist and keybr say?
2. **Where each habit is taught:** which step teaches each habit, and in what form? This note suggests:
   - home row and the bumps on the first step;
   - returning home on the first reach off the home row;
   - Opposite-hand Shift on the first capital, with capital-loaded text;
   - "the right finger even when you look" on the number and symbol steps;
   - posture once early, then again later.

   What do words and pictures carry, and what do drills carry?
3. **Rhythm coaching:** should the new path stop coaching a metronome beat, keep Rhythm as something measured and shown, and drop "metronome" from Stage text? West's evidence says even-beat drills don't help. This touches the P1 Known departure on Overdrive and steady Rhythm, which is out of scope, so this may only change Stage text.
4. **Early looking:** P14 says eyes on the screen; West says beginners need to look at first and move to touch gradually. Does the game ever tell a beginner it's fine to look at a new key, or does it rely on the Action Deck keeping the eyes up? The fading that settles this (P3) is out of scope, but the path should leave room for it.
5. **Drills in the library and generator:**
   - Which drill kinds exist as Stage tags: reach-from-home, finger column ("travel"), Mix-up pair, capital-loaded, common Letter pairs?
   - Should Mix-up loops follow West's paired-word recipe?
   - Is an anchoring drill possible in a browser? That needs a prototype.
6. **Finger hints in the orchestrator:** may it act on "hand off home" Mix-up patterns and mirror-key Mix-ups? If it does, how does it word the reason without claiming to know the finger (P14)? Same-finger timing should probably not be used at all on this path.
7. **Relapse to looking:** does the path need anything beyond the screen-bound action (Yechiam's lesson) to make looking down costly for players who already hunt and peck? Or does that wait for Drone pressure (P1, out of scope)?

---

## What I couldn't find

- **A controlled study of finger-habit training.** I found none comparing ways of teaching which finger presses which key, such as anchoring against free practice. The drills above are tutors' design choices; West's findings are about drill content and repetition in general.
- **A validated way to tell the finger from keystrokes,** as section 6 says.
- **Typing.com's, TypingClub's and Ratatype's finger tables:** they are shown only as pictures, so their 6 and Space choices are unknown. Typing.com's lesson text renders in the browser and couldn't be read.
- **A modern keyboarding textbook in full.** An open textbook (BCcampus, `opentextbc.ca/computerstudies`) refused automated requests. Commercial textbooks (Gregg, _Century 21_) are not open. West's monograph stands in for them, with its typewriter-era caveat.
- **Logan, Ulrich & Lindsey 2016 in full:** the PDF host refused connections, so only the university news release was read.
- **Peer-reviewed posture studies in full:** only OSHA's guidance and one conference abstract were read. Posture can't be measured by the game, so this matters only for what the words teach.
- **Klavaro's technique text:** its intro texts live in translation files I couldn't locate. Only its finger table was read.
