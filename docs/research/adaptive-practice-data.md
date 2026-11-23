# What adaptive typing tutors read to choose practice

Research for [What adaptive typing tutors read to choose practice](https://github.com/k-electron/astro-type/issues/146), under the map [Know how every key is typed](https://github.com/k-electron/astro-type/issues/143). Written 2026-11-22.

**Question:** what do adaptive typing tutors and the research read to choose what a player practises next, so that this map's lasting data already holds it and the next phase records nothing new?

**How much to trust each source:**

- **Primary, read in the source code:** keybr.com, Monkeytype, Klavaro, TIPP10 and Amphetype. Code is quoted from each project's own repository on 2026-11-22, with two exceptions, marked where they're used: TIPP10 is read from an unofficial GitHub copy of version 2.1.0, and Amphetype from a GitHub export of its old Google Code project. GNU Typist is cited from its manual, as in [Accuracy and speed benchmarks](beginner-typing-benchmarks.md).
- **Primary, papers read in full:** Dhakal et al. 2018 (the 136-million-keystroke study), Grudin 1983 (a book chapter, read from a copy hosted on gwern.net) and van den Bergh et al. 2015.
- **Not used:** blogs, closed-source tutors whose method isn't published (Typing.com and TypingClub say they track "problem keys" but don't say how), and anything I couldn't trace to a source.

**Terms:** this note uses the names in `GLOSSARY.md`: Keystroke, First attempt, Mix-up, Letter pair, Rhythm, Run, Stage, Sector. Where a source uses its own word ("lesson", "bigram", "substitution"), it is quoted as the source's word. Each section keeps **what the sources say** apart from **inference** (my reading, marked _Inference_).

---

## Bottom line: what the lasting data should keep

These are inputs for the spec, not decisions. The first five are what tutors read today. The last two are what the research and this game's principles add.

1. **Per key, accuracy:** First attempts and the First attempts that were Misses. keybr, Klavaro, TIPP10 and Amphetype each keep a per-key error count beside a count of how often the key came up. Monkeytype's weak-spot mode folds errors into its per-key score as a time penalty.
2. **Per key, speed:** the time of the key's clean hits, kept as a count and a sum (a mean), plus a spread. keybr, Klavaro, Amphetype and Monkeytype all choose practice from per-key time. keybr and Klavaro leave out the time of Keystrokes that had a mistake and drop extreme times; Amphetype uses medians, which extreme times barely move.
3. **Smoothing, and the best value:** tutors choose from _recent_ performance, not lifetime totals. keybr smooths each key's time with an exponential moving average (weight 0.1 per lesson the key appears in) and also keeps the best smoothed time ever reached. Monkeytype averages about the last 50 occurrences, Klavaro the last 30 times per key, Amphetype the last 30 days. Only TIPP10 chooses from lifetime counts, and it never forgets.
4. **Mix-ups as pairs:** the expected key and the key pressed, with a count. Amphetype stores exactly this. TIPP10 keeps the two sides as separate per-key counts. Research on novice errors says Mix-ups bunch on a few neighbours of each key, so this table stays small.
5. **Per Letter pair (and longer sequences, if wanted):** a count, the time of clean pairs, and the Misses on the pair's second character. Amphetype keeps keys, three-character sequences and words (not Letter pairs) this way and can rank them by "most damaging". keybr and Monkeytype don't keep Letter pairs per player.
6. **Per Run:** when, which Stage or Free Flight, Run Time, WPM, First-attempt accuracy and Rhythm. keybr, Monkeytype and Amphetype keep a summary of every lesson or test. keybr's summary also holds the per-key counts and mean times for that lesson, and its per-key smoothing is replayed from those summaries. That is the "summaries, not every Keystroke" model the owner asked for.
7. **Shift side:** for each shifted character, how many First attempts used the opposite-hand Shift and how many the same-hand one. No tutor I found records this. P14 asks for it, and the map's Keystroke record already carries it.

_Inference, on how to store it:_ keep the **per-Run, per-key summary** (item 6, keybr's model). It is small, and the next phase can then choose any smoothing or window without recording anything new. Letter pairs are too many to keep per Run for long, so keep them, and Mix-ups, as running totals plus a recent, decayed copy. Sizes are estimated in section 7.

---

## 1. Per-key speed and accuracy

### What the sources say

**keybr.com** (open source):

- **What a lesson keeps per key:** each lesson's result holds a histogram with one entry per character: `hitCount` (how many times the character came up), `missCount` (how many of those had a typo) and `timeToType`, the mean time of the characters typed without a typo. Characters with a typo don't count towards the time ([`histogram.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-textinput/lib/histogram.ts#L77)).
- **A typo is a First-attempt measure.** A character's step is marked as a typo if any wrong key was pressed before the right one (see [Accuracy and speed benchmarks](beginner-typing-benchmarks.md), section 1).
- **Extreme times are dropped:** a per-character mean faster than 40 ms ("300WPM") or slower than 12,000 ms ("1WPM") is rejected ([`histogram.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-textinput/lib/histogram.ts#L100)).
- **A key's time is the time since the previous character.** It is the gap between this input and the last one, divided by the number of keys pressed for it, so a Shift and a letter count as two keys and halve the time ([`timetotype.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-textinput-events/lib/timetotype.ts#L84)).
- **Choosing practice reads speed only.** A key's "confidence" is the target time divided by its smoothed time, and the lesson focuses on "the least confident of all included keys" ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-lesson/lib/guided.ts#L96), [`target.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-lesson/lib/target.ts)). The miss counts are stored and shown, but they don't decide the focus key.
- **New keys unlock** when every included key's confidence reaches 1. By default, a key that was once fast enough counts (its best confidence); with the "recover keys" setting, it must be fast enough now ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-lesson/lib/guided.ts#L79-L90)).

**Monkeytype** (open source; a typing test with an optional adaptive "weak spot" mode):

- Each Keystroke updates a per-character score: the time since the previous input, plus a 5,000 ms penalty when the key was wrong ([`weak-spot.ts`](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/weak-spot.ts#L14)). So speed and accuracy are folded into one number.
- The next word is the highest-scoring of 20 random words, scored by the average of its letters' scores ([`weak-spot.ts`](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/weak-spot.ts#L11)).
- The scores live in a module variable, and the file has no code that saves them ([`weak-spot.ts`](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/weak-spot.ts#L16)). As far as I can see, they start empty when the page loads.

**Klavaro** (open source, read from its SourceForge repository):

- **Errors:** a per-character table of `wrong` and `correct` counts. A wrong key counts against the _expected_ character ([`tutor.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/tutor.c), where `real_chr = cursor_get_char ()`; [`accuracy.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/accuracy.c), `accur_wrong`).
- **Times:** per character, the last 30 touch times are kept, and a character's speed is the simple mean of those under 3 seconds. Upper and lower case share one entry ([`accuracy.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/accuracy.c), `accur_correct` and `accur_profi_aver`; `MAX_TT_SAVED 30` in [`accuracy.h`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/accuracy.h)).
- **Choosing practice:** the "adaptability" exercise switches to words built from the player's problem characters when the error total reaches 60, or, once at least 40 keys are timed, when the 10th-slowest key is more than 2.2 times as slow as the 40th-slowest. It then draws characters roughly in proportion to their errors or their slowness ([`adaptability.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/adaptability.c), `adapt_draw_random_pattern`; [`accuracy.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/accuracy.c), `accur_create_word`).

**TIPP10** (open source; read from [an unofficial GitHub copy](https://github.com/KarlZeilhofer/Tipp10) whose README says it is a fork of the official 2.1.0):

- **Three lifetime counters per character** in a `user_chars` table: how often it came up (`user_char_occur_num`), how often it was expected when a wrong key was pressed (`user_char_target_errornum`), and how often it was the wrong key pressed (`user_char_mistake_errornum`). Every wrong press counts, not only the first ([`trainingwidget.cpp`](https://github.com/KarlZeilhofer/Tipp10/blob/master/widget/trainingwidget.cpp#L368), lines 368 and 455–463).
- **No time per character.**
- **Choosing practice:** its "intelligent" mode ranks characters by `target_errornum * 100 / occur_num`. It then picks, from the lesson's pre-written texts, one that holds the most of the top four characters. Every second text is an ordinary random one, and none of the last 10 texts is repeated ([`trainingsql.cpp`](https://github.com/KarlZeilhofer/Tipp10/blob/master/sql/trainingsql.cpp#L251-L322); `NUM_INTELLIGENT_QUERYS 2` and `NUM_TEXT_UNTIL_REPEAT 10` in [`defines.h`](https://github.com/KarlZeilhofer/Tipp10/blob/master/def/defines.h#L63-L69)).

**Amphetype** (open source; read from [a GitHub export](https://github.com/alexjj/amphetype) of the original Google Code project):

- **What each text keeps:** for every key, every three-character sequence and every word longer than three letters, one row with the median time, the count, the number with mistakes, and a "viscosity" (how uneven the times were). The rows are stamped with the time of the text ([`Quizzer.py`](https://github.com/alexjj/amphetype/blob/master/Quizzer.py#L206-L247)).
- **A key's time is the time since the previous correct character.** A three-character sequence's time is the mean of its three characters' times ([`Quizzer.py`](https://github.com/alexjj/amphetype/blob/master/Quizzer.py#L214-L221)).
- **Choosing practice:** the analysis screen ranks keys, sequences or words over the last N days (30 by default), taking the median of the per-text medians. The player chooses the order: slowest, least fluid, least accurate, most mistyped, most common, or "most damaging", which is count × time² × (1 + misses/count). The list can be sent straight to the lesson generator ([`StatWidgets.py`](https://github.com/alexjj/amphetype/blob/master/StatWidgets.py#L47-L93); `"history": 30.0` in [`Config.py`](https://github.com/alexjj/amphetype/blob/master/Config.py#L22)).

**GNU Typist** doesn't adapt. Its drills are fixed, and a drill repeats when the error rate goes over its limit ([manual](https://github.com/alexei-matveev/gtypist/blob/master/doc/gtypist.texi)).

**Research on measuring a key's time:**

- van den Bergh et al. (2015) studied 1,091,707 Keystroke times from 62 learners on an adaptive online course. They counted "only correct keystrokes that were also preceded by a correct keystroke", to avoid "post-error slowing". They removed times under 21 ms or over 3,999 ms, and log-transformed the rest because the times were skewed ([van den Bergh et al. 2015](https://pure.uva.nl/ws/files/29156171/23.25.PMS.pdf), Participants and Analysis).
- Dhakal et al. (2018) found that a letter after a space is among the slow pairs, the "word-initiation effect" ([CHI 2018 paper](https://userinterfaces.aalto.fi/136Mkeystrokes/resources/chi-18-analysis.pdf), Differences between Hands).

### Inference

- **A key's speed is really the speed of the Letter pair that ends on it.** Every tutor here times a key from the previous character. The first letter of a word, a key after a Miss, and a key after a reach will all look slow for reasons that aren't the key itself. Counting only clean hits (a First-attempt hit after a First-attempt hit, as van den Bergh does, and close to what keybr and Klavaro do) removes the post-Miss part. Keeping Letter pairs (section 3) lets the next phase tell "slow key" from "slow pair".
- **Drop extreme times before they enter a sum:** keybr, Klavaro and van den Bergh all do, with caps of 3–12 s. In astro-type a pause doesn't count towards Run Time, but a player who stops to think while the Drone waits will still leave one long gap.
- **Keep a spread, not only a mean.** Amphetype's viscosity and Dhakal's finding that slow typists are less consistent on Letter pairs (section 3) both read variation. A count, a sum and a sum of squares give the mean and the spread, and they add up across Runs.
- **Capitals:** keybr keys by character, so `A` and `a` are separate keys. Klavaro pools them. Keeping each character the player must type as its own entry keeps both options open: the next phase can pool a capital with its lower-case key through the key table, but it can't split them once they're pooled.

---

## 2. Smoothing, decay and how much history

### What the sources say

| Tutor          | What it reads to choose                                                                                                                                                   | How it forgets                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | What it stores                                                                                                                                                                                                                                                                                                                                                                                                          |
| :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **keybr**      | Each key's smoothed time, and its best smoothed time ever ([`keystats.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-result/lib/keystats.ts#L148)). | An exponential moving average with weight 0.1, updated once per lesson the key appears in ([`keystats.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-result/lib/keystats.ts#L110), [`filter.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-math/lib/filter.ts)). Its learning-rate forecast fits a curve to the key's last 30 lessons, or to the latest unbroken session within them ([`learningrate.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-lesson/lib/learningrate.ts#L18)). | Every lesson's result: time stamp, length, time, errors and the per-character histogram (count, misses, mean time) ([`binary.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-result-io/lib/binary.ts)). The smoothed values aren't stored: they're rebuilt by replaying all the results ([`keystats.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-result/lib/keystats.ts)). |
| **Monkeytype** | Each character's score.                                                                                                                                                   | A running mean for the first 50 occurrences, then a moving average weighted about 1/50 ("very roughly the score for a char is based on last perCharCount occurrences", with `perCharCount = 50`) ([`weak-spot.ts`](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/weak-spot.ts#L5-L7)).                                                                                                                                                                                                                                  | Nothing per key. Each test result keeps WPM, accuracy, consistency, a per-second chart, and the mean and spread of key spacing for the whole test ([`results.ts`](https://github.com/monkeytypegame/monkeytype/blob/master/packages/schemas/src/results.ts#L76-L109)).                                                                                                                                                  |
| **Klavaro**    | Per-character errors and mean time.                                                                                                                                       | **Times:** the last 30 per character. **Errors:** once a character in the error table has more than 10 correct touches, the next correct touch takes one wrong touch away and starts the count again (`ERROR_INERTIA 10`). The error table is cleared when the player meets the exercise's accuracy goal ([`accuracy.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/accuracy.c), `accur_correct`; [`adaptability.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/adaptability.c), `adapt_comment`).                      | Two small files per keyboard: per character, the error counts, and the mean time only (the 30 times aren't saved) ([`accuracy.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/accuracy.c), `accur_close`).                                                                                                                                                                                               |
| **TIPP10**     | Lifetime error ratio per character.                                                                                                                                       | Never; the player can reset the table ([`startsql.cpp`](https://github.com/KarlZeilhofer/Tipp10/blob/master/sql/startsql.cpp), `deleteUserChars`).                                                                                                                                                                                                                                                                                                                                                                                                      | Three lifetime counters per character.                                                                                                                                                                                                                                                                                                                                                                                  |
| **Amphetype**  | Medians over the last 30 days (configurable).                                                                                                                             | A window in days.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | One row per key, sequence and word for every text typed, plus the Mix-ups.                                                                                                                                                                                                                                                                                                                                              |

### Inference

- **Weight 0.1 per lesson means about the last 10–20 lessons decide.** With keybr's weighting, the last 10 lessons that contain a key carry about 65% of its smoothed time, and the last 20 about 88%. Monkeytype's window is about 50 occurrences, Klavaro's 30, and Amphetype's a month. So the tutors agree on "recent", measured either in lessons or in occurrences. None of them uses lifetime totals to choose, except TIPP10.
- **Per Run or per occurrence?** keybr updates once per lesson, so a rare key (one occurrence in a lesson) moves as far as a common one. Monkeytype updates per occurrence. astro-type's Stage texts are 56–196 characters, about keybr's lesson size. So per-Run smoothing fits, but a punctuation key seen once per Run will be noisy either way.
- **Keep the best value.** keybr's unlock rule and its "recover keys" setting both need the best smoothed time as well as the current one. P3's fading guidance ("fades as that key is mastered") is the same question: does fading use the best or the current value? Keeping both leaves the next phase free to choose.
- **keybr's approach is the one that needs nothing new later.** It stores a per-key summary of every lesson and derives everything from them. A per-Run summary is far smaller than the Keystrokes, and it keeps every choice of window, weight and best value open.

---

## 3. Letter pairs and longer sequences

### What the sources say

- **What tutors keep:**
  - **Amphetype** is the only tutor I found that keeps per-player statistics for sequences: every three-character sequence and every word over three letters, each with its median time, count, mistakes and viscosity ([`Quizzer.py`](https://github.com/alexjj/amphetype/blob/master/Quizzer.py#L219-L227)). It doesn't keep Letter pairs as such.
  - **Monkeytype**'s "practise words" builds a new test from the last test only. It takes the missed words (or each missed word with the one before it) and the slowest words, up to a fifth of the words typed (and at most 10 or 20), measured by each word's burst speed ([`practise-words.ts`](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/practise-words.ts#L48-L111)).
  - **keybr** keeps nothing per pair. It writes its practice text from a phonetic model of the language, whose letter-to-letter odds come from a language corpus, not from the player ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-lesson/lib/guided.ts), `phoneticWords`).
- **Research: which Letter pairs tell skill apart.** Dhakal et al. (2018), with 168,000 participants:
  - **Speed:** Letter pairs typed by two hands, or by one hand with two fingers, are "more predictive of typing speed than, for example, letter repetitions". The correlation with WPM is about −0.7 for one-hand and alternating-hand pairs, against −0.32 for repeated letters (Abstract and Table 3).
  - **Consistency:** variation in one-hand and alternating-hand pair times "is smaller for fast than slow typists", while repeated-letter pairs are similarly narrow for both groups (Typing speed versus bigram-level IKIs).
  - **Hand alternation:** pairs typed by alternating hands were 5–20 ms faster than one-hand pairs for most typists, but 20–28 ms _slower_ for the slowest tenth (Differences between Hands).
  - **Which pairs they measured:** they counted a pair for a participant only if it occurred at least five times. For clustering they used the 38 most frequent pairs, including pairs that end in a space, each divided by the participant's mean over the 38 so that it shows a pair's speed relative to their own average (Differences between Hands; Feature Construction).
  - **Rollover:** fast typists press the next key before releasing the last on 40–70% of Keystrokes, slow typists almost never. The rollover ratio correlates 0.73 with WPM (Rollover Behaviour, Table 3).

  ([CHI 2018 paper](https://userinterfaces.aalto.fi/136Mkeystrokes/resources/chi-18-analysis.pdf))

- **Research: Keystrokes before words.** van den Bergh et al. found that the gains within the finger movements (the repeated-finger effect) settled before the gains from typing whole words, in line with Logan and Crump's "inner loop" and "outer loop" ([van den Bergh et al. 2015](https://pure.uva.nl/ws/files/29156171/23.25.PMS.pdf), Discussion).

### Inference

- **Keep every Letter pair the player types, and decide "common" when reading.** The map leaves open whether "common" means common in English or common for this player (Not yet specified). Storing every pair typed answers both:
  - **Common in English:** filter the pairs by a fixed list. That is how Dhakal chose theirs and how keybr's model writes text.
  - **Common for this player:** filter by the player's own count. That is how Amphetype ranks.

  A minimum count (Dhakal used 5) keeps rare pairs out of rankings. The set is bounded: Sector Stage texts are fixed, and only Free Flight brings new pairs.
- **What to keep per pair:** a count, the clean-time count and sum (and spread), and the First-attempt Misses on the pair's second character. That is enough for "slowest", "least accurate" and Amphetype's "most damaging" ranking. Keeping the pair relative to the player's own mean, as Dhakal did, can be done when reading.
- **Longer sequences and words** are only Amphetype's. Sequences grow fast, and words are tied to the Stage texts. A generated practice Stage can be built from slow keys and slow Letter pairs, so _(inference)_ I'd not keep sequences or words in the Save. The Run's own slow words belong in the Debrief, which already holds every Keystroke of the Run, as Monkeytype's "practise words" does.
- **Rollover** needs key-release times, which the map's Keystroke record doesn't carry. I note it because it is the strongest single predictor of speed in the 136-million-keystroke study, but it is not an input that P10 or P14 ask for.

---

## 4. Mix-ups

### What the sources say

- **What tutors keep:**
  - **Amphetype** stores the expected and pressed characters as a pair, with a count, for each text. It keeps one per character position: the last wrong key pressed there ([`Quizzer.py`](https://github.com/alexjj/amphetype/blob/master/Quizzer.py#L125-L137), [`Quizzer.py`](https://github.com/alexjj/amphetype/blob/master/Quizzer.py#L246-L247)).
  - **TIPP10** counts both sides, but separately: the expected character's error count and the pressed character's mistake count. The pair isn't kept, and only the expected side is used to choose texts (section 1).
  - **Klavaro** and **keybr** count errors against the expected character only.
  - **Monkeytype** keeps missed _words_ from the last test, not key pairs.
- **Research:** Grudin (1983) built Mix-up tables (expected key against key pressed) for about 70 beginners on a typing course (about 3,300 errors of this kind) and for skilled typists (about 500).
  - **Beginners' errors are mostly Mix-ups:** 75% of their errors were substitutions (a Mix-up), against 4–69% for the skilled typists.
  - **Most Mix-ups are a neighbour:** the key right next to the expected one in the same row was 59% of beginners' Mix-ups (31% for experts), and the key above or below on the same finger was 8%.
  - **Next comes the mirror key:** the same finger of the other hand was 16% of beginners' Mix-ups (4% for experts). Restricted to Mix-ups across hands, it was 62% for beginners, against a chance level of about 7%.
  - **The more frequent letter intrudes:** for 9 of 10 mirror pairs, the more frequent letter replaced the rarer one.

  ([Grudin 1983](https://gwern.net/doc/design/typography/1983-grudin.pdf), Table 6.1 and Results)

### Inference

- **Keep the pair, not two separate counts.** A per-pair count is what the map's Analytics shows ("each key's most common Mix-ups"). It is also what a practice generator needs to put the two keys side by side. Grudin's numbers say the table is sparse: most of a key's Mix-ups go to two or three neighbours and one mirror key. So a few entries per key cover most of them.
- **Count the First-attempt Mix-up, as accuracy does.** Amphetype keeps one per position, and P10 counts First attempts. Counting only the first wrong key on a character keeps the Mix-up counts consistent with per-key accuracy.
- **A mirror-key Mix-up is a sign of the hand being confused, not the finger.** Grudin found the mirror key mostly with beginners. Analytics could show it as its own kind, but that is a display choice; the pair count already holds it.

---

## 5. Rhythm

### What the sources say

- **Monkeytype** stores a "consistency" score with every test result: a curve applied to the coefficient of variation (spread divided by mean) of per-second speed. It also stores a "key consistency" from the spread of the gaps between keys ([`result-data.ts`](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/engine/result-data.ts#L193-L215), [`results.ts`](https://github.com/monkeytypegame/monkeytype/blob/master/packages/schemas/src/results.ts#L86-L87)). It doesn't use them to choose practice.
- **Klavaro**'s "fluidness" exercise scores 100 × (1 − spread/mean) of the touch times, with 70 as the goal. It writes the last exercise's times to a file ([`tutor.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/tutor.c), `tutor_calc_stats`).
- **Amphetype** keeps a viscosity for each key, three-character sequence and word, and can rank them by "least fluid" ([`Quizzer.py`](https://github.com/alexjj/amphetype/blob/master/Quizzer.py#L206-L227), [`StatWidgets.py`](https://github.com/alexjj/amphetype/blob/master/StatWidgets.py#L47-L56)).
- **astro-type** today measures Rhythm from the coefficient of variation of the last ten hit intervals (`rhythmAfterHit` in `src/game/rules.ts`). That is the same idea as Monkeytype's and Klavaro's.

### Inference

- **The Run's Rhythm belongs in the per-Run summary,** as Monkeytype keeps consistency with every result. That also serves the Analytics graph of Rhythm over the journey.
- **The per-key and per-pair spread from sections 1 and 3** is Amphetype's per-item viscosity. It lets the next phase pick the "least even" keys or pairs, and it costs one more sum per entry.

---

## 6. Shift side

### What the sources say

- **No tutor I read records which Shift was used.** keybr counts the Shift as an extra key and divides the character's time by the number of keys ([`timetotype.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-textinput-events/lib/timetotype.ts)). Klavaro pools capitals with their lower-case keys for timing.
- **I found no study** that measures opposite-hand against same-hand Shift for speed or errors. The nearest evidence is the general one-hand against two-hand Letter pair result in section 3.

### Inference

- **P14 asks for it, and the map's Keystroke record already carries the Shift side.** So the lasting data needs one more pair of counts per shifted character: First attempts with the opposite-hand Shift and with the same-hand Shift. Nothing else in the sources needs Shift data.
- **A shifted character is slower by nature,** as keybr's division shows, so compare its speed with other shifted characters, not with its lower-case key.

---

## 7. Size: does it fit in localStorage?

These are estimates, not measurements.

- **What keybr stores per lesson:** a time stamp, three totals, and four small integers per character typed ([`binary.ts`](https://github.com/aradzie/keybr.com/blob/master/packages/keybr-result-io/lib/binary.ts)).
- **The same for astro-type, in JSON:**
  - A Run of up to 196 characters touches perhaps 20–40 distinct keys.
  - At about 30–40 bytes per key entry (First attempts, Misses, clean count, time sum, sum of squares), plus the Run's own facts, a per-Run summary is roughly 1–2 KB.
  - 1,000 cleared Runs would be 1–2 MB. Browsers allow up to 5 MiB of localStorage per origin ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). That is comfortable for months of daily play, and old Runs could later be merged into per-day totals if it ever weren't.
- **Letter pairs and Mix-ups as running totals:**
  - English text uses a few hundred distinct Letter pairs. At about 40 bytes each, with a lifetime copy and a decayed copy, that is tens of KB.
  - Mix-ups are a few per key, a few KB.
  - Keeping Letter pairs per Run instead (perhaps 100 pairs a Run) would roughly double or triple the per-Run size. That is why item 5 of the bottom line keeps them as totals.

---

## What I couldn't find

- **Evidence that adaptive practice beats a fixed course.** I found no controlled study comparing weak-key practice against a fixed curriculum. The tutors' choices (keybr's weakest key, TIPP10's top-four error characters, Klavaro's thresholds, Amphetype's "most damaging") are design choices, not tested ones. van den Bergh et al. studied learners on an adaptive course but didn't compare it with a fixed one.
- **Shift side:** no tutor or study, as section 6 says.
- **Typing.com and TypingClub:** both mention problem keys, but they publish neither what they store nor how they choose.
- **The official TIPP10 repository:** I read an unofficial GitHub copy of version 2.1.0, not the project's own repository.
- **Klavaro's newer forks** add an "error practice" mode. I read only the original SourceForge code.
