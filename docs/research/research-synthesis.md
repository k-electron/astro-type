# What the research agrees on

Research for [What the research agrees on](https://github.com/k-electron/astro-type/issues/183), under the map [Phase 3: a curriculum that teaches, with practice that fits the player](https://github.com/k-electron/astro-type/issues/175). Written 2026-11-26.

**Question:** where do the seven Phase 3 research notes agree, and where do they conflict? What single picture should the path, the library, the generator and the orchestrator be designed from? And which conflicts are still open for the tickets that decide them?

**Sources:** the seven notes, cited by short name and section ("Order §3"):

- **Order:** [How established tutors order and size their steps][order] (#176).
- **Text:** [Generating practice text from allowed keys][text] (#177).
- **Difficulty:** [Predicting how hard a text is to type][diff] (#178).
- **Loops:** [When adaptive tutors act, and how they avoid frustrating the learner][loops] (#179).
- **Mavis:** [What Mavis Beacon Teaches Typing teaches, and how][mavis] (#180).
- **Technique:** [How tutors and research teach typing technique][tech] (#181).
- **Science:** [What learning science says about practising a skill like typing][sci] (#182).

The two earlier notes, [Benchmarks][bench] and [Adaptive data][adapt], are background.

**How strong the evidence is:** each agreed point carries one of three tags.

- **(typing):** studies of people typing.
- **(other skill):** research on maths tutors, key-press tasks or games.
- **(tutors):** what typing tutors do, never tested.

**What I checked myself:**

- **Loops' binomial intervals:** recomputed; they match.
- **First attempts on rare keys in a month:** computed here (conflict 4).
- **KeyRecs' licence:** confirmed on Zenodo as CC BY 4.0.
- **West 1974** is a scan I couldn't render here. Three notes read it independently and quote it the same way.
- **The beginner Letter-pair pattern** is reproduced by Difficulty's own analysis of the 136M data, not just quoted.

**Settled, so not treated as conflicts:** the owner's calls in the map's Notes and Out of scope.

- Accuracy first is a lean.
- No retraining of hunt-and-peck typists.
- No LLM at play time.
- Learn a tutor's method, never copy its lists.
- Finger habits are an unmeasured aim.
- The game may be unplayable between specs.

---

## Bottom line

1. **Nothing found argues against the Vision's shape, and every part has prior art.**
   - **The path:** its order is TypingClub's almost exactly (Order, bottom line).
   - **The orchestrator:** its rules are Mavis Beacon's 1987 adaptive design (Mavis §3).
   - **The library and generator:** they are TIPP10's curated texts and keybr's filtered dictionary (Text §3).

   No source shows that any of them teaches better than a fixed course.
2. **The path:**
   - **Steps:** home row first, two new keys a step (often a mirror pair), seconds of drill and then words inside the step, capitals before numbers, symbols last, and review every few steps.
   - **The catch:** the home row spells almost no words. Bringing E and I into the first Sector fixes that.
3. **Practice:** short, daily and varied. A key is learned with its neighbours. Blocked drills look better than they are, so judge a key from later mixed Runs, never from its drill.
4. **Difficulty:** beginners aren't slow experts.
   - **What costs them time:** word starts, capitals, punctuation and symbols, not fingers.
   - **Fairness:** composition rules per step do most of the work; a beginner-shaped score checks the rest.
   - **Drills** are in no dataset.
5. **The orchestrator:** keep "how weak" apart from "how sure", rank keys against the player's own, give every loop an exit and a daily cap, and re-check later on the main path. The evidence for loops is almost all from maths tutors.
6. **Technique:** the habit worth building is the same finger every time, with still hands and eyes on the screen. Teach each habit when it first matters. Keystroke data can't show the finger.
7. **Seven conflicts are open.** Most resolve the same way: strict judgements (gates, "this key is fixed") sit on mixed text, later; drills stay brief and outside gates. Five calls go back to the owner (see Challenges).

---

## Where the reports agree

### The path

- **Order.** Home row, top, bottom, capitals with Opposite-hand Shift, numbers, then symbols is the tutors' consensus. No order is proven better. The one requirement is real words from the first lesson _(tutors; typing, West)_. Order §1–2, Mavis §1, Technique §3, Science §3.
- **Two new keys a step,** usually a mirror pair (F J, D K, E I, R U). Nothing shows one key or two is better _(tutors)_. Order §1, Mavis §1, Science §3.
- **Within a step:** a few seconds of drill, then Letter pairs, then words. Nonsense drill as the main medium lost to real words in every study West reviewed _(typing, West; tutors)_. Order §3, Science §5, Technique §4.
- **Capitals before numbers; symbols last,** in a common set and a rare set. Numbers need practice throughout the course _(tutors; West)_. Order §2, Mavis §1.
- **Review every 8–12 new keys or once per row.** Each Stage could open with known keys and close on a mixed line _(tutors; West)_. Order §5.
- **Present the letters fast,** in about the first third of the month. That is about 15 letter steps of 3–10 Runs each, so a step is several Stages _(West; inference)_. Order §4.
- **A month (7.5–10 hours) builds the reach map and the habit, not fluency.** 20–25 WPM on letters is plausible; the full keyboard at that speed is more than any study shows _(typing)_. Science §9, Benchmarks §5.
- **Short daily practice beats long sessions,** so P7 holds _(typing)_. Science §1.

### The library

- **Variety beats repetition.** A replay should bring new text, because it transfers to new Letter pairs, not only to stop memorisation _(typing, West)_. Order §3, Science §4, Technique §4.
- **The first steps can only be drills.** F J D K spell no common words. The home row spells 42, E I brings 245, T Y 1,227 and the top row 2,613 _(the note's own counts)_. Text §2.
- **Curated, tagged text fits the library.** In TIPP10 every word uses only learned keys and holds a new key _(tutors)_. Text §3.
- **West's Letter-sequence rule** becomes a check: put each new key beside every learned key it commonly sits next to. A key is learned in its context _(typing)_. Order §1, Science §3.
- **Real words need the offensive-word check too:** 39 of the 10,000 commonest words are on LDNOOBW's list. Text §6.

### The generator

- **A small drill grammar** covers every tutor's drills: repeats, alternation, anchored reaches (`frf`), every pair, and row and hand runs. Text §4, Technique §4.
- **A filtered dictionary, topped up with pseudo-words** below about 15 real words (keybr). Every word holds a target key; a loop with several targets uses a share _(tutors)_. Text §3–4.
- **Loops end in words.** A Mix-up loop puts the pair side by side in real words (West's "rotate the tires"; never tested with modern learners). Science §5, Technique §4.
- **Vary loops against boredom,** for example with Mavis's "least recently used remedy" _(other skill; tutors)_. Loops §4, Mavis §3.
- **Determinism:** an integer-only PRNG, no `Math.pow` or `exp`, and the versions of the word list and blocklist tied to the seed. Text §5.

### Star bars and fairness

- **For slow typists, the costs are in the text's make-up.** Against the typist's own median Keystroke time:
  - **word starts** cost about 2×;
  - **capitals** 3.5×;
  - **punctuation** about 2.8×;
  - **shifted symbols** 4.5×;
  - **the same finger** only 1.05–1.1×;
  - **repeats** 0.5–0.7×, so they are faster.

  _(typing, but adults at 10–26 WPM with their own technique.)_ Difficulty §1–2.
- **Composition rules remove most unfairness.** Plain sentences differ by about 8%; mixing kinds of text within a step is the real problem. Difficulty §5.
- **Accuracy is the fragile bar:** two extra capitals can cost a 98% Star on a short Stage. Difficulty §3.
- **Tutors make goals fair by structure, not by formula.** TypingClub lowers its goals when new keys arrive; Mavis and Klavaro keep speed out early _(tutors)_. Difficulty §6, Mavis §2.
- **Early WPM bars below what touch typing can reach then,** because speed pressure brings old habits back _(typing: Yechiam; other skill: Hardwick)_. Science §6, Benchmarks §5.
- **Gates stay below perfection.** Mavis's 100% quizzes were the flaw reviewers named. Mavis §2.

### The orchestrator

- **The Vision's rules are Mavis's 1987 rules.**
  - **Its picks:** Stage keys first, weak keys next, weighted by English frequency.
  - **A standout kind of mistake** comes before a weak finger, row or hand.
  - **The player sees** a reason and may decline.
  - **Frustration:** the same three signs.

  Mavis adds a coverage weight for rarely practised keys. Its weights were never published or tested _(tutors)_. Mavis §3.
- **Keep "how weak" apart from "how sure".** The data and the threshold matter more than the model _(other skill)_. Loops §1.
- **A loop is a detour that ends on a short success rule or a cap,** with a later re-check on the main path. A stricter exit bought little in a randomised test _(other skill)_. Loops §2.
- **No streaks of single Keystrokes.** Judge per Run or with a moving average. Cap per day: a reach improves across days _(other skill; typing)_. Loops §2–3, Science §1.
- **Ease by the choice of Stage, lowering speed demand first.** Easing must never pay for looking at the keys. Loops §5, Science §6.
- **Early struggle is expected.** People who already type by looking start slower by touch, so the Debrief shouldn't call the dip failure _(typing)_. Loops §6, Science §7.

### Technique

- **What sets the ceiling:** the same finger for each key every time, still hands and eyes up, more than which table is used _(typing)_. Technique §5, Science §6.
- **Teach each habit when it first matters** _(tutors)_. Technique §3, Mavis §6.
  - home and the bumps on step one;
  - returning home on the first reach;
  - Opposite-hand Shift on the first capital, with text full of capitals;
  - the right finger even when looking, on numbers and symbols.
- **Talk about fingers while a key is new, then stop.** Attention to the hands slows fluent typing _(typing)_. Technique §4, Science §8.
- **Relapse to looking is the main documented failure;** making looking cost something helped _(typing)_. Technique §4, Science §7.
- **Keystroke data can't show the finger.** Mix-ups hint at hand position. Same-finger timing is useless at a beginner's speed _(typing)_. Technique §6, Difficulty §1.
- **astro-type's finger table is the majority one; keep it consistent.** Give extra drills to the ring and little fingers and the index fingers' second column. Technique §2.

---

## Where they conflict or the evidence is thin

### 1. Early looking against P14's "eyes on the screen"

- **For looking early:** West says insisting on touch from the start makes strokes hesitant. Beginners should look at first and move to touch gradually. This is typewriter-era classroom evidence whose studies no one could read (Technique §1, Science §7).
- **For eyes up:**
  - every tutor and Mavis teach eyes on the screen;
  - looking is what learners relapse to (Yechiam, 22 modern students);
  - freeing the eyes is what touch typing adds (Feit) (Technique §4–5).
- _Inference:_ keep "eyes on the screen" as the habit taught. A new key is "looked at" on the Action Deck's lit keycap and hands, not on the hands themselves, which is TypingClub's argument. Never tell a player to look down. Leave room for P3's fading.
- **Decided in:** [#184][t184], [#187][t187].

### 2. Rhythm coaching against the finding that it doesn't help

- **For it:**
  - P14 lists "steady rhythm" as a habit.
  - Today's Stages coach a beat ("Metronome Rhythm Endurance", "Lock in an alternating left/right rhythm").
  - GNU Typist and Ratatype drill even rhythm.
  - Mavis 1987 cites unnamed studies.
- **Against it:** West lists metronome pacing as useless ("the best typing rhythms are least metronomic"). Salthouse shows evenness is a result of skill, not a cause (Technique §1).
- **A related finding:** Sector 4's "Alternating Hand Rhythm" Stage says alternation "builds effortless speed". Slow typists show no such gain (Difficulty §1).
- _Inference:_ Rhythm stays a measure the HUD and Debrief show. Drop beat coaching and "metronome" from Stage text, and don't sell alternation as a speed builder. Overdrive from Rhythm stays out of scope.
- **Decided in:** [#187][t187] for the text, [#186][t186] for no "rhythm drill" kind. Rewording P14 is the project owner's.

### 3. Expert against beginner models of difficulty

- **Expert models:** the Typability Index (68–88%), Hiraga and the classic literature say alternation is fast and the same finger slow.
- **Slow typists invert this:** repeats are fast, alternation brings no gain and word starts dominate. An expert model ranks drills backwards.
- **Even the slow data** is from adults with their own technique, and drills appear nowhere (Difficulty §1, §4).
- _Inference:_
  1. **Composition rules per step.**
  2. **A beginner class-cost score** within about ±5%. The Typability Index at most for sentence-like later steps.
  3. **Drills compared only with drills.**
  4. **The simulated beginner must reproduce Difficulty §1's ratios** before it is trusted.
  5. **Calibrate from the Logbook later.**
- **Decided in:** [#190][t190], with [#188][t188], [#189][t189], [#192][t192].

### 4. How much evidence a key needs against short loops and one month

- **The evidence needed is large:**
  - **To place a key against a 95–97% bar** takes about 100+ First attempts. At 30, a truly 90% key reads anywhere from 74% to 97% (Loops §1).
  - **Keys keep improving for thousands of Keystrokes** (Science §3).
- **But the Vision wants short loops within a month,** and keybr and TIPP10 act on almost nothing, because their response is a weighting, not a detour.
- **New here:** a month is 18,000–37,500 Keystrokes of English-like text. That gives q and z about 13–38 First attempts, and x and j about 27–56, so "wait for 100" never acts on them. Common keys pass 100 in a day.
- _Inference:_ two tiers.
  - **Weighting a key inside upcoming Stages** needs only a relative ranking above the Logbook's floor (50 First attempts over 5 days).
  - **A detour** needs "clearly weaker than the player's own keys" and a count of about 100, as a named constant.
  - **Rare keys** get evidence from their own step and from loops that concentrate them, plus Mavis's coverage weight.
- **Decided in:** [#191][t191], tuned in [#192][t192].

### 5. Judging a key from drills against later mixed Runs

- **Later mixed Runs:**
  - blocked practice looks better than it is (Science §2);
  - drills are both faster and more accurate (Difficulty §3);
  - Amphetype leaves drill typing out, and Mavis counts accuracy only from quizzes (Loops §2, Mavis §7).
- **Against it:** a Star comes from one Run, a rule that stays. A loop's exit must be judged on its own Runs. P4 wants loop practice to count toward the gate.
- **Thin:** the interleaving benefit is small in applied settings, one meta-analysis calls it a myth, and it is untested on keyboards.
- _Inference, as cheap insurance:_
  - **The loop's exit** is judged on its own Runs.
  - **"Fixed"** is judged on main-path mixed Runs on a later day.
  - **Gates never sit on a drill-only Stage.**
  - **Each Run summary carries its Stage's kind.**
- **Decided in:** [#185][t185], [#191][t191], [#186][t186].

### 6. Mavis-style quiz gates against P4's "several ways through"

- **For strict gates:** Mavis's quiz can't be skipped and is often 100%, and it asks for no speed until every key is in (Mavis §2). GNU Typist and KTouch repeat until near perfect.
- **Against them:**
  - **P4** asks for several ways through.
  - **Uncapped loops trap learners:** only about 9% of those not at mastery after 10 problems got there (Gong).
  - **Strict bars make voluntary learners quit** (Pelánek).
  - **A stricter bar bought little** in ALEKS (Loops §2–3).
- _Inference:_ no single quiz Stage. Stars on any Stage the step draws pass its gate, so every replay and every loop Stage of the step is a way through. The bars stay as they are. "No speed until all keys" changes the Star bar rule, so it is the project owner's call.
- **Decided in:** [#185][t185].

### 7. Licences that limit what data can ship

- **Word lists:**
  - **Can ship:** SCOWL and 12dicts (permissive).
  - **CC BY-SA:** wordfreq, against its author's wish.
  - **Can't ship:** Norvig, google-10000 and SUBTLEX-US (Text §1).
- **Timing data:**
  - **Can ship:** KeyRecs (CC BY 4.0), but it is small and its typists are undescribed.
  - **Non-commercial:** 136M and How We Type.
  - **CC BY-NC-SA:** the Typability Index's repositories; its paper is CC BY.
  - **No licence:** Behmer & Crump (Difficulty §7).
- **The catch:** Difficulty's class costs come from its own run over the non-commercial 136M data. Whether about 15 summary ratios count as derived data is unclear.
- **Blocklists:** obscenity, dsojevic (MIT) and LDNOOBW (CC BY) can ship.
- _Inference:_ SCOWL's size bands refined by 12dicts. Frequency lists at build time only, with only vetted vocabulary shipped. Costs from published papers or KeyRecs, or by asking 136M's authors. All notices in one file. Not legal advice.
- **Decided in:** [#188][t188], [#189][t189], [#190][t190]. Two calls go to the project owner: SCOWL or wordfreq, and whether the 136M numbers may ship.

### Smaller tensions, each with a default

- **Drill length:** P8 says "until the reach is automatic"; the research says seconds. _Inference:_ a short drill in the step, with "automatic" reached across steps by mixing. Settled by #184 and #187; rewording P8 is the owner's.
- **Mirror pairs against mirror Mix-ups:** 16% of beginners' Mix-ups are the mirror key, and nothing tests whether pairing causes them. _Inference:_ follow the consensus and watch the Logbook; the simulation can't tell, because its Mix-ups are its model's. Settled by #184.
- **Row order against real words:** no words until E and I. _Inference:_ bring E and I into the first Sector, as GNU Typist Q does. Settled by #184.
- **Frustration against boredom:** boredom persists and leads to gaming, while frustration passes (Baker 2010, Loops §4). _Inference:_ #191 also watches repetition.

---

## What each decision ticket should take from this

- **[#184 The path's shape][t184]:**
  - **Keys:** two keys a step, mirror pairs by default, E and I in the first Sector. Capitals straight after the letters, numbers from the index fingers out, symbols in two sets.
  - **Size:** about 15 letter steps of 3–10 Runs each, and a review every 2–4 steps.
  - **Loops** branch off a step and rejoin it.
  - **Finger habits** come from anchored reaches, varied text and tips at the moment.
- **[#185 Progress and gates][t185]:** Stars on any Stage of the step pass its gate. No gate sits on a drill-only Stage. A loop Stage of the step is a way through.
- **[#186 What a Stage carries][t186]:**
  - **Its kind:** drill, pattern, words or review.
  - **Its keys:** new, learned and target keys.
  - **Its fingers and rows.**
  - **Its make-up:** length, word boundaries, repeats, capitals, punctuation, digits and symbols, and keys new to the step.
  - **Its scores:** difficulty and Miss-proneness.
  - **Its tip.**
  - **Its speed demand,** so a Stage can be asked for "easier".

  The Run summary copies the kind.
- **[#187 The whole path, step by step][t187]:** each step runs a seconds-long anchored drill, then every pair of its keys, then words. It opens with known keys and closes on a mixed line. Tips come at the moment. Text full of capitals for Shift. No metronome text.
- **[#188 How the library is built][t188]:**
  - **Vocabulary:** SCOWL and 12dicts at build time.
  - **Checks:**
    - allowed keys only;
    - every word holds a target key;
    - West's Letter-pair coverage;
    - a substring offensive-word check with exceptions;
    - the step's composition ranges;
    - the step's score band.
  - **Home-row variety** comes from drill patterns.
- **[#189 What the generator builds][t189]:**
  - **Text:** the drill grammar, plus a dictionary topped up with pseudo-words.
  - **Targets:** a share of words per target, and Mix-up pairs placed in real words.
  - **Loops** end in words and vary by the least recently used remedy.
  - **Determinism:** an integer PRNG, with the word list's and blocklist's versions in the seed.
- **[#190 How Star bars are shown fair][t190]:** composition rules first, then a beginner score within about ±5%, with Miss-prone characters kept even. Drills are compared only with drills. Early WPM bars stay below 20–25. Validate the simulated beginner first.
- **[#191 How the orchestrator decides][t191]:**
  - **Evidence:** weak and sure kept apart, two tiers, and a coverage weight for rare keys.
  - **What a loop targets:** a standout kind of mistake, then a weak finger, row or hand.
  - **How a loop ends:** a per-Run exit and a daily cap, then a re-check on main-path Runs.
  - **Easing** lowers speed demand first.
  - **Signs to watch:** no progress, quits, fast wrong keys and repetition.
  - **Save gaps** to decide on: quits, wrong keys after a Miss, and gaps over 5 s.
- **[#192 A beginner's month, simulated][t192]:** beginner-shaped timing and Misses, validated against Difficulty §1. Tune the evidence counts, the exit and the cap, and measure the per-key spread Loops had to assume. It can't validate finger hints or mirror-pair effects.
- **[#193 What the player sees of a suggestion][t193]:** Mavis's Chalkboard is the model: the problem, the remedy, the reason, and "another suggestion". A capped loop says "back to it tomorrow". Finger hints are worded as hand position, never as a finger seen.
- **[#194 How the Galaxy Map shows the new path][t194]:** about 25 steps for the whole keyboard (Mavis §1), several Stages per step, review steps, and loops that leave and rejoin. A beginner's early dip isn't shown as failure.

---

## What no one knows

| Gap                                                          | How the map works around it                                              |
| :----------------------------------------------------------- | :----------------------------------------------------------------------- |
| Difficulty for touch-typing learners, and for drills at all   | Composition rules, a beginner-shaped simulation, the Logbook later        |
| Typing-specific evidence on loops and caps (all maths)        | Named constants tuned in #192                                             |
| Mixed against blocked practice on a keyboard                  | Design that is right either way (conflict 5)                              |
| The cost of a key new to the step                             | A named constant, simulated, then measured                                |
| A beginner's per-key spread of Clean-hit times                | Measure in #192 and in the owner's Logbook                                |
| Which practice text trains best                               | Real words wherever the keys allow                                        |
| Whether mirror pairs cause mirror Mix-ups                     | Follow the consensus; watch the Logbook                                   |
| Mavis's weights, and whether its design worked                | Prior art for the shape only                                              |
| Finger use from Keystroke timing                              | Never inferred; Mix-ups are hand-position hints only                      |
| A month-long study of QWERTY beginners                        | 20–25 WPM stays an aim                                                    |
| Whether Drones that wait make looking free                    | Out of scope (P1's Known departure); leave room                           |

---

## Challenges to the map

1. **No ticket owns the simulated beginner.** #190 and #192 both rest on it, and it must be beginner-shaped and validated against the 136M ratios first. Add a `task` ticket before both, or put it in #190's scope.
2. **"Wait for enough Keystrokes" never acts on rare keys.** #191 needs a relative rule and a coverage term (conflict 4).
3. **Save gaps with no ticket.**
   - **What's missing:** quits, wrong keys after a Miss, long pauses, and a Run summary's Stage kind are all unrecorded. Each would be a Save change.
   - **Who decides:** #191 says what to record. "How the Save changes" sits under Not yet specified, so #196 must pick these up when it pairs Save changes with specs.
4. **The Vision names frustration only.** The evidence says boredom matters more. Widen #191 to repetition.
5. **Calls for the owner:**
   - **P14's "steady rhythm"** and today's metronome text (conflict 2).
   - **P8's "until the reach is automatic".**
   - **"No speed until all keys"**, which changes the Star bar rule. Low per-Stage WPM bars on drills and early steps are within the rules (conflict 6).
   - **SCOWL or wordfreq,** and whether the 136M summary numbers may ship (conflict 7).
   - **E and I in the first Sector,** a small bend of the Vision's "home row, top row, bottom row".

[order]: https://github.com/k-electron/astro-type/blob/research/tutor-course-order/docs/research/tutor-course-order.md
[text]: https://github.com/k-electron/astro-type/blob/research/practice-text-generation/docs/research/practice-text-generation.md
[diff]: https://github.com/k-electron/astro-type/blob/research/text-typing-difficulty/docs/research/text-typing-difficulty.md
[loops]: https://github.com/k-electron/astro-type/blob/research/adaptive-loops-and-frustration/docs/research/adaptive-loops-and-frustration.md
[mavis]: https://github.com/k-electron/astro-type/blob/research/mavis-beacon/docs/research/mavis-beacon.md
[tech]: https://github.com/k-electron/astro-type/blob/research/teaching-typing-technique/docs/research/teaching-typing-technique.md
[sci]: https://github.com/k-electron/astro-type/blob/research/typing-learning-science/docs/research/typing-learning-science.md
[bench]: https://github.com/k-electron/astro-type/blob/main/docs/research/beginner-typing-benchmarks.md
[adapt]: https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md
[t184]: https://github.com/k-electron/astro-type/issues/184
[t185]: https://github.com/k-electron/astro-type/issues/185
[t186]: https://github.com/k-electron/astro-type/issues/186
[t187]: https://github.com/k-electron/astro-type/issues/187
[t188]: https://github.com/k-electron/astro-type/issues/188
[t189]: https://github.com/k-electron/astro-type/issues/189
[t190]: https://github.com/k-electron/astro-type/issues/190
[t191]: https://github.com/k-electron/astro-type/issues/191
[t192]: https://github.com/k-electron/astro-type/issues/192
[t193]: https://github.com/k-electron/astro-type/issues/193
[t194]: https://github.com/k-electron/astro-type/issues/194
