# When adaptive tutors act, and how they avoid frustrating the learner

Research for [When adaptive tutors act, and how they avoid frustrating the learner](https://github.com/k-electron/astro-type/issues/179), under the map [Phase 3: a curriculum that teaches, with practice that fits the player](https://github.com/k-electron/astro-type/issues/175). Written 2026-11-26.

**Question:** when do adaptive tutors and the research act on a weak key, and how do they avoid frustrating the learner? How much evidence do they wait for, how long does a remedial loop run, how does it end and how does the learner rejoin the main course, and which signs of frustration or disengagement do they watch for and answer?

This builds on [What adaptive typing tutors read to choose practice](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md) (which per-key numbers tutors keep, how they smooth them, and how they choose a weak key) and on [Accuracy and speed benchmarks for beginner touch typists](beginner-typing-benchmarks.md) (bars, and how Monkeytype treats idle time). Neither is repeated here.

**How much to trust each source:**

- **Primary, read in the source code (2026-11-26), each pinned to a commit:**
  - keybr.com, from its GitHub repository.
  - Klavaro 3.14, read from Debian's copy of the upstream release, because SourceForge refused automated requests. The earlier note read the SourceForge trunk; where they differ, this note says so.
  - TIPP10 3.3.4, from the project's official GitLab repository (the earlier note had to use an unofficial GitHub copy of 2.1.0).
  - Amphetype, from a GitHub export of its Google Code project.
  - KTouch, from KDE's own GitLab.
  - GNU Typist's manual, from a GitHub mirror of the GNU project.
- **Primary, papers read in full or in the sections cited:**
  - Mastery learning and knowledge tracing: Corbett & Anderson 1995 (a scanned copy; I read the abstract and section 3, pp. 253 and 260–261) and their 1992 conference paper in full; Pelánek & Řihák 2018; Pelánek 2018; Matayoshi et al. 2025 (a randomised experiment in ALEKS).
  - Wheel-spinning and quitting: Gong 2014, chapter 5 (a PhD thesis whose chapter is the long form of Beck & Gong 2013, which I couldn't get); Kai et al. 2018; Zhang et al. 2019; Botelho et al. 2019.
  - Gaming the system, and affect: Baker et al. 2004 and Baker et al. 2010.
  - Difficulty, choice and engagement in games: Lomas et al. 2013, a field experiment with about 80,000 players; Smeddinck et al. 2016.
  - Typing: Yechiam et al. 2003.
  - Where the publisher's copy is paywalled, I read an author's or a course's copy of the same text (Baker et al. 2010, Lomas et al. 2013, Smeddinck et al. 2016, Yechiam et al. 2003). The links go to the DOI or to that copy.
- **Weaker, and marked where used:**
  - Zhang, Vanacore, Baker et al. 2025 is a short, correlational conference paper.
  - Hunicke & Chapman is a workshop-style design paper with no player study.
  - Wilson et al. 2019 is a mathematical result for one class of machine-learning tasks, not a study of people learning a motor skill.
  - Every mastery and wheel-spinning study here is about school mathematics or programming, not typing. Applying them to typing is my inference, and is marked.
- **Not used:** blogs, and papers I couldn't read (listed at the end).

**Terms:** this note uses the names in `GLOSSARY.md` (Stage, Sector, Run, Keystroke, First attempt, Clean hit, Mix-up, Letter pair, Logbook, Run summary, Flight log, Star bar, Debrief) and the map's names for the parts (the orchestrator, the main path, a reinforcement loop, or "loop"). Where a source uses its own word ("skill", "knowledge component", "lesson", "problem", "opportunity"), it is kept in quotes or explained. Each section keeps **what the sources say** apart from **inference** (my reading, marked _Inference_). Figures about astro-type come from `src/analytics/` at commit `43c0cc0`.

---

## Bottom line

These are inputs for the decision tickets, not decisions.

1. **Typing tutors act on very little evidence; the research says the threshold matters more than the model.**
   - **keybr** focuses a newly added key straight away, before it has any data, and a key's estimate is set by its first lesson.
   - **TIPP10** ranks keys by lifetime error ratio with no minimum count.
   - **Klavaro** waits longest: 60 errors in total, or 40 timed keys, before it offers special practice.
   - **Tutoring systems** decide mastery on a handful of "opportunities", such as three correct in a row. The usual knowledge-tracing bar is 0.95; in simulations, the best knowledge-tracing thresholds (0.90–0.97) made almost the same decisions as 1–8 correct answers in a row.
   - **What the research says matters** is what data the decision reads and where the threshold sits, not how clever the model is. It is clearer to keep "how weak is this key" apart from "how sure are we" (Pelánek & Řihák 2018; Pelánek 2018).

   _Inference:_ a single key's First-attempt accuracy is noisy. With 30 First attempts, a key that is truly 90% accurate has a 95% interval of about 74–97%, so separating a 90% key from a 97% one takes something like 100 or more. That argues for ranking keys against each other and requiring a minimum count, rather than acting on a fixed accuracy bar. The Logbook already reads a key over its last 5 days with at least 10 tries each (section 1).
2. **Loops that only end on success trap a minority of learners; good systems add a cap and a way out.**
   - **In Cognitive Tutor and ASSISTments** data, a learner who hadn't reached "three in a row" after 10 problems went on to reach it only about 9% of the time. Between 18% and 58% of all practice time went to such "wheel-spinning", depending on the system and the assumptions (Gong 2014).
   - **ASSISTments** therefore stops a learner for the day at the 10th problem and tells them to get help and come back the next day.
   - **ALEKS** ends a topic after five wrong answers in a row and "gently" prompts another topic.
   - **Typing tutors** mostly have no cap. Amphetype repeats a generated drill until 97% accuracy; KTouch repeats a lesson until 98% and 180 strokes a minute. Their escape hatches are manual: GNU Typist's Esc Esc skips a lesson, KTouch's "Advanced" profile unlocks every lesson, and keybr, TIPP10 and Klavaro let the player choose any lesson.
3. **The loop ends on a short success criterion, or on its cap, and the main path then checks the key again later.**
   - **Ending on success:** ASSISTments ends on three correct in a row; ALEKS on a score of 5 (3 when the system isn't sure the topic is unknown); Cognitive Tutor on 0.95.
   - **Checking again:** ASSISTments re-tests a mastered skill at growing intervals and sends the learner back to it on a miss. ALEKS does the same in its progress assessments.
   - **A stricter bar buys little:** in a randomised experiment, ALEKS's stricter mastery bar bought a little more retention, but the gap shrank to under 2 percentage points within several weeks, and fewer topics were finished (0.789 against 0.809) (Matayoshi et al. 2025).
   - **keybr has no separate loop:** its weak key is a weighting inside every ordinary lesson. TIPP10 alternates a targeted text with an ordinary one.
4. **The signs the research can actually measure are failing to improve, quitting early, and fast systematic guessing.**
   - **Failing to improve ("wheel-spinning"):** a model that reads only the share of correct answers flags it after about 4 opportunities, with 93.5% precision and 77.1% recall on one measure (Zhang et al. 2019).
   - **Quitting early ("stopout")** is detectable at about the same point (Botelho et al. 2019).
   - **Fast systematic guessing ("gaming the system")** goes with much worse learning (Baker et al. 2004).
   - **Frustration itself matters less than expected:** across three learning environments it was short-lived, wasn't tied to poor learning and didn't lead to gaming, while _boredom_ persisted and did lead to gaming. The authors conclude that frustration "may not need remediation" in many cases (Baker et al. 2010).
   - **No typing tutor I read detects frustration.** Klavaro prints "maybe you're getting upset, so go to another kind of exercise" near its accuracy goal, GNU Typist lets the typist give up and restart with Esc, and Monkeytype voids a test that ends with 5 idle seconds.
5. **The responses that have evidence are switching, stopping, and making it easier. Easier keeps players longer but can slow learning.**
   - **More play:** in Lomas et al.'s field experiments, the easier the game, the longer people played, with no inverted U at the success rates tested (up to about 70%). Tight time limits were the most disengaging design factor of all.
   - **Repetition:** repeating a failed item straight away raised success but not engagement, while more different items raised engagement.
   - **Slower learning:** the easiest settings also gave the slowest learning.
   - **How to adjust:** Hunicke & Chapman's design rule is to intervene "just enough", and to make changes before the encounter rather than during it, to avoid erratic swings.
   - **Choosing, or being adjusted:** players say they prefer to choose their difficulty. Automatic adjustment changed only how much autonomy they felt, not the rest of their experience (Smeddinck et al. 2016).
6. **For typing, early struggle is built in.** Learners who could already type by looking managed about 18 WPM that way but only about 8 WPM by touch at the start. It took about 8 hours of training before touch typing caught up, and when looking pays off sooner, people drift back to it (Yechiam et al. 2003). _Inference:_ a beginner's slow, error-prone first weeks are expected, not a sign of a broken loop. Easing should lower speed pressure, not reward looking at the keys.
7. **Today's Logbook can't see most frustration signals.**
   - **It keeps only cleared Runs,** so an abandoned Run (a quit) leaves no trace.
   - **It counts only the First attempt on each character,** so a burst of wrong keys after a Miss isn't counted.
   - **A gap over 5 s is simply left out of the timing,** so long pauses aren't counted.
   - **Pause Menu use isn't recorded.**
   - **What can be read:** replays of a Stage, Stars against Star bars, and accuracy and speed per Run.

   If the orchestrator is to react to quits, bursts or pauses, something new must be recorded. The vision asks the planner to say so. That would be a Save change, so `SAVE_VERSION` would rise.

---

## 1. How much evidence tutors wait for before acting

### What the sources say

**Typing tutors**

- **keybr** (open source, [commit `05a37bc`](https://github.com/aradzie/keybr.com/tree/05a37bc5265f65ff538c59c613db29442f345d51)):
  - **A key's estimate starts at its first lesson.** The smoothed time is an exponential moving average whose first value is simply the first sample: `if (n > 1) { value = alpha * v + (1 - alpha) * value; } else { value = v; }`, with `alpha` 0.1 ([`filter.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-math/lib/filter.ts#L19-L26), [`keystats.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-result/lib/keystats.ts#L109)).
  - **A key with no data is treated as the weakest.** The lesson focuses "the least confident of all included keys", and a key with no estimate counts as confidence 0 (`key.confidence ?? 0`). So a newly added key becomes the focus key at once ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/guided.ts#L95-L105)).
  - **The focus key is in every word:** the generator's filter holds the "letter which must appear in each generated word" ([`filter.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-phonetic-model/lib/filter.ts#L15-L18)).
  - **Only its forecast waits for data.** The "learning rate" forecast needs at least 5 lessons with the key (`hasData`: `length >= 5`) and reports only when the fitted curve explains at least half the variation (`certainty >= 0.5`) ([`learningrate.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/learningrate.ts#L17-L18), [`util.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-math/lib/util.ts#L3-L5)).
- **TIPP10** (official repository, [3.3.4 at `637f9fd8`](https://gitlab.com/tipp10/tipp10/-/tree/637f9fd83ba598e67979334a1c6eb9e3e936788c)):
  - **No minimum count.** Its targeted text choice ranks characters by `(user_char_target_errornum * 100) / user_char_occur_num`, so one error on a character seen once ranks it at 100% ([`trainingsql.cpp`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/sql/trainingsql.cpp#L236-L262)).
  - **Always on for the course:** training lessons always use it (`useIntelligence = true`) ([`trainingwidget.cpp`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/widget/trainingwidget.cpp#L633-L640)).
- **Klavaro** (3.14, [Debian's copy of the upstream source](https://sources.debian.org/src/klavaro/3.14-2/src/)):
  - **It waits for a total, not a per-key count:** special practice becomes available when the error total reaches `ERROR_LIMIT 60` "errors to start a special practice on adaptability", or, once 40 keys are timed, when the 10th-slowest key is over `PROFI_LIMIT 2.2` times as slow as the 40th ([`accuracy.h`](https://sources.debian.org/src/klavaro/3.14-2/src/accuracy.h/#L25-L28)).
  - **Errors fade:** a key's error count drops by one after every 10 further correct touches (`ERROR_INERTIA 10`, "How many correct touchs to eliminate a wrong one (it was 30 first)") ([`accuracy.c`](https://sources.debian.org/src/klavaro/3.14-2/src/accuracy.c/#L277-L290)).
- **Amphetype** doesn't act by itself. The player sends a ranked list from the analysis screen to the lesson generator (see the earlier note).

**Tutoring systems and mastery criteria**

- **Cognitive Tutor's knowledge tracing:**
  - **The model:** it keeps, for each rule, the probability that the student has learned it, updated after each "opportunity to apply a rule" from whether the step was right. It has four parameters: the chance it was known beforehand, the chance of learning it at each opportunity, a guess and a slip.
  - **The bar:** "That mastery criterion in the tutor is a knowledge probability of 0.95" ([Corbett & Anderson 1995](http://act-r.psy.cmu.edu/wordpress/wp-content/uploads/2012/12/893CorbettAnderson1995.pdf), pp. 260–261).
- **Simple criteria do as well as the models.** Pelánek & Řihák compared knowledge tracing with "N consecutive correct" (NCC) and an exponential moving average (EMA):
  - **The models barely beat a streak.** On data simulated by the knowledge-tracing model itself, the best thresholds were 0.90–0.97 for knowledge tracing and 1–8 in a row for NCC, and "even in the best case scenario … BKT does not bring significant improvement over the basic mastery decision criterion" (Table 3, section 5.2.1).
  - **The input data matters more than the model.** On real arithmetic data, adding response times to the input changed who reached mastery more than switching from the moving average to a full model did (section 5.2.2).
  - **Their summary:** "the choice of data sources used for mastery decision and the setting of thresholds are more important than the choice of a learner modeling technique" (abstract).
  - **The cost of a strict bar:** for a voluntary practice system, "if learners are forced to do unnecessary practice, they may lose interest and stop using the system", so false "not yet" verdicts cost more there than in testing (section 1).
  - **Their own system** uses an EMA with threshold 0.95, tuned so that "mastery should be achievable in around 3 minutes for those who … answer all questions correctly" (section 6).

  ([Pelánek & Řihák 2018](https://www.fi.muni.cz/~xpelanek/publications/nrhm-mastery.pdf), the journal version of their UMAP 2017 paper)
- **How many answers in a row an EMA needs.** With threshold 0.95 and weight α on the old value, these are the answers in a row that guarantee mastery:

  | α            | 0.7 | 0.75 | 0.8 | 0.85 | 0.9 | 0.95 |
  | :----------- | --: | ---: | --: | ---: | --: | ---: |
  | Correct in a row | 9   | 11   | 14  | 19   | 29  | 59   |

  ([Pelánek & Řihák 2018](https://www.fi.muni.cz/~xpelanek/publications/nrhm-mastery.pdf), section 5.3)
- **Keep "how good" apart from "how sure".**
  - **Two numbers, not one:** usual criteria fold "the degree of achieved knowledge and the uncertainty of the estimate" into one number compared with one threshold. Pelánek proposes two thresholds instead: which level counts as mastery, and how sure the system must be.
  - **The pragmatic version:** "it may be preferable to utilize a simple approach that explicitly separates the estimated degree of knowledge [and] the uncertainty of the estimate. Even using statistics like 'average performance' and 'number of attempts' may be in some cases sufficient."

  ([Pelánek 2018](https://www.fi.muni.cz/~xpelanek/publications/mastery-modeling.pdf), sections 2 and 4.1)
- **Streaks punish typos:** with NCC, "any mistake (even if it is just a typo) means that the learner has to 'start again from zero' and this can be demotivating". A progress bar should have "motivating behavior": a "large decrease after a typo is demotivating" ([Pelánek & Řihák 2018](https://www.fi.muni.cz/~xpelanek/publications/nrhm-mastery.pdf), sections 3.3 and 4.2.1).

### Inference

- **The tutors' "wait" is mostly not waiting.** keybr's estimate starts with the first lesson, and TIPP10 has no minimum count. Both work because the response is mild: a weighting inside ordinary practice, not a detour. A detour is a stronger act. It takes the player off the main path, and the map says the orchestrator acts from overall progress and "never chases noise". So the orchestrator needs more evidence than these tutors do.
- **How noisy one key is.** These are binomial intervals for a single key's First-attempt accuracy (Wilson score interval, 95%), worked out by me:

  | First attempts | Truly 90% accurate | Truly 95% accurate |
  | -------------: | :----------------- | :----------------- |
  | 10             | 60–98%             | 66–100%            |
  | 30             | 74–97%             | 81–99%             |
  | 100            | 83–95%             | 89–98%             |
  | 200            | 85–93%             | 91–97%             |

  So below about 100 First attempts a key's accuracy can't place it against a 95% or 97% bar. Two Misses in 20 First attempts happen 12% of the time to a key that is truly 97% accurate.
- **Ranking keys against each other needs less data than placing one against a bar.** A key with many more Misses than the player's own average stands out sooner than an absolute bar can be checked. That is what keybr (weakest of the included keys) and TIPP10 (top four by error ratio) both do.
- **Speed is noisier still for rare keys.** If a beginner's Clean-hit times for a key vary with a coefficient of variation of 0.4–0.6 (an assumption; the simulated beginner or the owner's own Logbook can measure it), a key's mean time is known to within ±18–26% after 20 Clean hits and ±9–13% after 80.
- **The Logbook already sets a sensible floor.** A key's reading uses its last 5 days played with at least 10 First attempts each (`TREND_DAYS`, `MIN_DAY_TRIES` in `src/analytics/keyDays.ts`), so at least 50 First attempts spread over 5 days. Rankings need 3 Clean hits or 3 First attempts (`MIN_CLEAN_HITS`, `MIN_FIRST_ATTEMPTS` in `src/analytics/keys.ts`). That is a floor for showing a key, not yet for detouring on it.
- **How fast evidence comes in.** At about 12 WPM, a beginner types about 60 characters a minute. A day with 10 minutes of actual typing is roughly 600 First attempts, spread over the keys of the Stages played. A home-row key in a home-row Stage gets dozens a day; a rare key gets a handful. So "enough evidence" arrives within a day for common keys and over many days for rare ones. The decision should use a count, not a number of days.
- **Pelánek's split fits the map's rule:** a key is acted on when it is _both_ clearly weaker than the player's other keys _and_ has enough First attempts behind it. Each of the two is a separate, explainable number, which also serves "every suggestion tells the player … why".

---

## 2. How long a loop runs, how it ends, and how the learner rejoins

### What the sources say

**Tutoring systems**

- **Cognitive Tutor (ACT Programming Tutor):**
  - **The shape:** each section has "a minimal set of required exercises", and then "the tutor continues presenting remedial exercises in the section until the student has 'mastered' each rule", at 0.95.
  - **How long it ran:** students did on average 23 remedial exercises on top of the 40 required, ranging from 1 to 49.
  - **Needing more didn't mean learning more:** the more exercises a student needed to reach the bar, the worse they did on the test afterwards (r = −0.52 in one study, −0.44 in the next).

  ([Corbett & Anderson 1992](https://escholarship.org/uc/item/0873k1nz), pp. 623–625)
- **The tutor can run out of exercises.** "Eventually, however, the tutor runs out of problems to assign and re-assigns problems the student has already seen; also, teachers have reported advancing students to the next lesson to keep them from falling too far behind the rest of the class" ([Baker et al. 2004](https://hci.rwth-aachen.de/materials/conferences/CHI2004/1p383.pdf), pp. 388–389).
- **ASSISTments "Skill Builders":**
  - **Ending on success:** a skill is mastered after three questions right in a row on the first attempt with no help.
  - **A daily cap:** "the system implements a 'daily limit,' stopping students on the skill builder assignment for the day if the completion threshold is not reached by the tenth problem … the system provides the student with an instruction to seek additional help and return to the assignment on the subsequent day" ([Botelho et al. 2019](https://par.nsf.gov/servlets/purl/10095357), data section).
  - **A spaced re-check:** after mastery, a single-question re-test comes "with a gradually increasing space in between reassessments", and a failed re-test assigns the Skill Builder again ([Kai et al. 2018](https://learninganalytics.upenn.edu/ryanbaker/ShiminJEDM.pdf), section 3).
- **ALEKS** (a randomised experiment on about 33 million learning sequences):
  - **The score:** a topic starts at 0. A right answer adds 1, or 2 if it follows a right answer. A wrong answer takes 1 away, but never below 0, and never on the second try at the same question.
  - **The bar:** a score of 5 for topics the system believes unknown, and 3 for topics it is unsure about, giving "the benefit of the doubt".
  - **The way out:** "in the event that a student gives five consecutive incorrect answers, this is considered to be a failed learning attempt, and the student is gently prompted to try another topic". Elsewhere the paper says that "the system suggests they take a break and work on something else".
  - **The result:** students were randomly given the higher or the lower bar on the same topics.
    - **Topics learned:** 0.789 of topics with the higher bar against 0.809 with the lower. Topics failed: 0.024 against 0.022.
    - **Time:** the median time per topic was 3.2 against 2.4 minutes.
    - **Retention:** the higher bar retained a little better, but "after several weeks the estimated difference in retention rates between the two mastery thresholds is less than 0.02", against retention of about 0.6.
    - **Who gained most:** students who started a topic with a wrong answer gained more (over 0.04 at most), and that gap also shrank with time.

  ([Matayoshi et al. 2025](https://jedm.educationaldatamining.org/index.php/JEDM/article/view/900), sections 3, 6, 11)
- **A higher bar may help the next lesson.** In one online maths tutor, ending a lesson at a knowledge-tracing estimate of 0.98 went with better performance in the next lesson than ending at 0.95. This is _weaker_ evidence: a short, correlational conference paper ([Zhang, Vanacore, Baker et al. 2025](https://learninganalytics.upenn.edu/ryanbaker/edm25_short_bkt%20threshold_CR_final.pdf)).

**Typing tutors**

| Tutor          | What the targeted practice is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | How it ends and rejoins                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **keybr**      | No separate loop. Every lesson is built from the included keys with the focus key in every word ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/guided.ts#L110-L129)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The focus moves to the next-weakest key once a key reaches the target speed. A new key joins only when every included key has been fast enough. By default (`recoverKeys: false`) a key that was _once_ fast enough counts forever, so a slip never re-locks progress or brings the key back into focus ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/guided.ts#L72-L105), [`settings.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/settings.ts#L22)). The lesson always holds at least 6 keys (`minSize = 6`).                                                                                                                                                         |
| **TIPP10**     | The lesson's pre-written texts, sorted by how many of the four highest-error characters they hold. Every second text is an ordinary random one (`num_intelligent_queries = 2`), and none of the last 10 texts repeats ([`trainingsql.cpp`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/sql/trainingsql.cpp#L264-L317), [`defines.h`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/def/defines.h#L57-L63)).                                                                                                                                                                                                                                                                                                                            | A lesson ends on a time limit, 5 minutes by default ([`trainingwidget.cpp`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/widget/trainingwidget.cpp#L597-L615)). There is no gate: the player picks any lesson.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Klavaro**    | Once the error total or the slowness ratio passes its limit, a toggle button appears. Only if the player presses it are the exercise's words built from their problem characters ([`adaptability.c`](https://sources.debian.org/src/klavaro/3.14-2/src/adaptability.c/#L58-L70)). (The earlier note, reading the SourceForge trunk, described this as switching automatically. In 3.14 it is the player's choice.)                                                                                                                                                                                                                                                                                                                                                                                                | The error table is cleared when the player reaches the exercise's accuracy goal, 98% by default, which ends the special practice ([`adaptability.c`](https://sources.debian.org/src/klavaro/3.14-2/src/adaptability.c/#L256-L272), [`tutor.c`](https://sources.debian.org/src/klavaro/3.14-2/src/tutor.c/#L184-L196)). The basic course moves to the next lesson at 95% ([`basic.c`](https://sources.debian.org/src/klavaro/3.14-2/src/basic.c/#L377-L399)), and the player can set any lesson by hand ([`callbacks.c`](https://sources.debian.org/src/klavaro/3.14-2/src/callbacks.c/#L379-L391)).                                                                                                                                                                                                           |
| **Amphetype**  | Drills the player generates from the analysis list, each item copied 3 times by default ([`Lesson.py`](https://github.com/alexjj/amphetype/blob/369c7e29b4e34127b6acdf510aae214d16cc7970/Lesson.py#L108-L111)). After an ordinary text, an optional "auto review" builds a drill from that text's mistyped and slowest words ([`Quizzer.py`](https://github.com/alexjj/amphetype/blob/369c7e29b4e34127b6acdf510aae214d16cc7970/Quizzer.py#L255-L266)).                                                                                                                                                                                                                                                                                                                                                          | A drill repeats until the player beats `min_lesson_acc`, 97% by default, and the minimum WPM, 0 by default. There is no cap on repeats ([`Config.py`](https://github.com/alexjj/amphetype/blob/369c7e29b4e34127b6acdf510aae214d16cc7970/Config.py#L45-L48), [`Quizzer.py`](https://github.com/alexjj/amphetype/blob/369c7e29b4e34127b6acdf510aae214d16cc7970/Quizzer.py#L248-L254)). By default, drill typing isn't saved into the statistics that choose practice (`use_lesson_stats: False`, "Save key/trigram/word statistics from generated lessons") ([`Quizzer.py`](https://github.com/alexjj/amphetype/blob/369c7e29b4e34127b6acdf510aae214d16cc7970/Quizzer.py#L242), [`Config.py`](https://github.com/alexjj/amphetype/blob/369c7e29b4e34127b6acdf510aae214d16cc7970/Config.py#L42)). |
| **KTouch**     | No targeted practice. A fixed course with a gate on each lesson.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | The next lesson unlocks at 98% accuracy and 180 strokes a minute, both per run ([`ktouch.kcfg`](https://invent.kde.org/education/ktouch/-/blob/e1ac963b0c8c2e24efc3986d0d7ffed89886c5fd/src/ktouch.kcfg#L34-L45), [`ScoreScreen.qml`](https://invent.kde.org/education/ktouch/-/blob/e1ac963b0c8c2e24efc3986d0d7ffed89886c5fd/src/qml/scorescreen/ScoreScreen.qml#L21)). A failed run says: "Repeat the lesson. Your skills will improve automatically over time." A profile set to "Advanced" has every lesson unlocked ([`ScoreScreen.qml`](https://invent.kde.org/education/ktouch/-/blob/e1ac963b0c8c2e24efc3986d0d7ffed89886c5fd/src/qml/scorescreen/ScoreScreen.qml#L31-L35), [L238](https://invent.kde.org/education/ktouch/-/blob/e1ac963b0c8c2e24efc3986d0d7ffed89886c5fd/src/qml/scorescreen/ScoreScreen.qml#L236-L241)). |
| **GNU Typist** | No targeted practice. A lesson script can name an "on-failure label", a place the learner is sent when they fail an exercise ([manual](https://github.com/alexei-matveev/gtypist/blob/14447d5a3951329193a6e39a9f0dc8f967db5d1e/doc/gtypist.texi#L648-L655)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | A drill reruns while errors exceed the limit (3% by default). "Practice only" drills never have to be repeated. Esc gives up and starts again, and Esc Esc skips the lesson, unless the `--no-skip` option forbids it ([manual](https://github.com/alexei-matveev/gtypist/blob/14447d5a3951329193a6e39a9f0dc8f967db5d1e/doc/gtypist.texi#L163-L172), [L257](https://github.com/alexei-matveev/gtypist/blob/14447d5a3951329193a6e39a9f0dc8f967db5d1e/doc/gtypist.texi#L257-L259), [L574](https://github.com/alexei-matveev/gtypist/blob/14447d5a3951329193a6e39a9f0dc8f967db5d1e/doc/gtypist.texi#L574-L577)).                                                                                                                                                            |

Monkeytype's "practise words" is a one-off: one test built from the last test's missed and slow words (see the earlier note).

### Inference

- **Three shapes of loop exist:**
  - **Weighting inside normal practice** (keybr, TIPP10's alternation). No detour, so nothing to rejoin.
  - **A detour that ends on success** (Cognitive Tutor, Amphetype, KTouch, GNU Typist).
  - **A detour that ends on success or on a cap**, with a later re-check (ASSISTments, ALEKS).

  Only the third has a stated answer to "what if it doesn't work". The map's orchestrator "detours into a short reinforcement loop, then rejoins the path", which is the third shape.
- **A short success criterion is enough, and a strict one buys little.** ALEKS's experiment is the strongest evidence here, because it was randomised: the stricter bar cost more time and finished fewer topics, for a retention gain that faded within weeks. A loop is not the gate: P4 has the gate's Star bars doing the strict job. The loop only needs to show the key has moved.
- **What "one opportunity" is in astro-type.**
  - **Per Keystroke is too fine.** A key is pressed dozens of times in one Run, and Keystrokes in one Run aren't independent: fatigue, the text and the Drone pace all colour them.
  - **Per loop Run is a natural unit.** "Three in a row" becomes, for example, "the key's First-attempt accuracy and Clean-hit time are at or near the player's own norm on two or three loop Runs". "Ten problems without mastery" becomes "N loop Runs without the key moving".
  - **This is my mapping, not a source's.** The numbers need tuning with the simulated beginner.
- **A loop must not use a "consecutive" rule on single Keystrokes.** One slip resets a streak (Pelánek & Řihák), and beginners slip often, so that would be the frustrating kind of loop. An exponential moving average or a per-Run share avoids it.
- **Whether loop Runs feed the evidence is a real choice.**
  - **Amphetype leaves drill typing out by default.** Drill text concentrates the weak key, so the key may look better inside the drill than in words.
  - **The Logbook folds every cleared Run** and records where it was flown, so the orchestrator can tell loop Runs from main-path Runs as long as each Run's copied Stage says which it was.
  - _Inference:_ judging the loop's _exit_ on the loop's own Runs, but judging whether the key is _fixed_ on the next main-path Runs, matches ASSISTments' and ALEKS's later re-check.
- **The rejoin should be the main path itself, with a re-check.** Both large systems put the topic back into later practice at a spacing and send the learner back on a miss. In astro-type the main path's next Stages already contain the key, so the "re-check" can simply be the orchestrator reading the key again after the next few main-path Runs.

---

## 3. When practice stops working: wheel-spinning and quitting

### What the sources say

- **Wheel-spinning, defined (Beck & Gong 2013, read here in Gong's thesis):**
  - **The definition:** wheel-spinning is "a non-progressive state in learning that leads to no mastery or costs too much time to master a skill". It comes from a mastery loop with only one way out: "the student can possibly become trapped if he repeatedly fails to achieve mastery".
  - **Why ten problems:** in ASSISTments, after 10 problems 45% of student-skill pairs hadn't reached three in a row, and only 4% more reached it by the 30th problem. "If a student did not demonstrate mastery after 10 problems, then the conditional probability he will master the skill with more practice is 0.04 / 0.45 = 0.089". For the Cognitive Algebra Tutor the cut-off chosen was 15.
  - **The cost:** wheel-spinning took between 18.3% and 54.5% of all practice time in ASSISTments and between 27.4% and 57.7% in the algebra tutor, depending on how unfinished cases are counted.
  - **The link to gaming:** problems in wheel-spinning skills had an average gaming score of 0.11, against 0.01 for mastered ones.

  ([Gong 2014](https://digital.wpi.edu/downloads/9306sz45f), chapter 5, sections 1, 4.2, 5.2, 6.2)
- **Not all struggle is wheel-spinning.**
  - **The fixed cut-off over-counts:** Kai et al. added a delayed retention test to the definition. With it, 9.1% of the student-skill pairs with a re-test were wheel-spinning, against 46.9% under the 10-problem definition: "Not all students who struggle are spinning their wheels."
  - **Many quit before the cut-off:** of the student–problem-set pairs that ended before the 10th problem, 42.7% ended in quitting without mastery; the rest had mastered.
  - **Massed practice went with more wheel-spinning:** consistently short gaps between problems (under two weeks) were associated with it. The authors suggest spacing, but say all findings are correlational.

  ([Kai et al. 2018](https://learninganalytics.upenn.edu/ryanbaker/ShiminJEDM.pdf), sections 2.2, 4, 7)
- **Early detection is possible with correctness alone.**
  - **The two definitions disagree:** "three correct in a row within the first 10" and a model-based definition agreed on only 14–42% of the learners either one flagged.
  - **One number is enough to start:** a logistic regression on a single feature, the share of correct answers, "detected wheel spinning with 93.5% precision and 77.1% recall after just 4 steps" under the model-based definition. Under that definition, most detectors passed 60% precision and recall after 4 steps and 80% after 6.
  - **The caveat:** such a detector "may overlook … that some students can learn from solving the steps and reach mastery slightly later (e.g. getting the first four steps wrong but answering correctly on the next four)".

  ([Zhang et al. 2019](https://files.eric.ed.gov/fulltext/ED594575.pdf), sections 2.1, 3.1–3.3)
- **Quitting early ("stopout")** is the other side of the same problem, too little persistence where wheel-spinning is too much.
  - **How common:** in 123,539 ASSISTments assignments, 4.72% ended in stopout (quitting before the 10th problem without finishing) and 4.85% in wheel-spinning.
  - **When it can be detected:** detectors for both did best around the third problem.
  - **The proposed responses, untested:** "If the model predicts if the student is going to wheel spin, we could stop providing the student with more problems for the day … if the model predicts if a student is going to stopout, we could try to lower the difficulty of the problems so that the student gains confidence".

  ([Botelho et al. 2019](https://par.nsf.gov/servlets/purl/10095357), introduction, data section and conclusion)
- **Pelánek & Řihák's mastery work leaves wheel-spinning out on purpose:** "We also do not consider wheel-spinning learners" (section 7.4). Stopping rules that cover both mastery and wheel-spinning exist ("predictive stability"), but I didn't read them.

### Inference

- **Every loop needs a stop rule that isn't success.**
  - **A cap:** a number of loop Runs, a day's limit, or ALEKS's "five wrong in a row".
  - **A different next step:** what happens at the cap should not be "more of the same". ASSISTments says get help and come back tomorrow, ALEKS says try another topic, Botelho suggests easier problems.
  - **In astro-type:** that could be rejoining the main path and coming back to the key on a later day. It could also be stepping down to the key on its own in short patterns (P8 says that is where a weak key goes to be rebuilt), or a Stage that drops the key's hardest Letter pairs.
- **"No progress across loop Runs" is the typing version of wheel-spinning, and it is cheap to detect.** Per Zhang et al., a correctness-only signal works after a few opportunities. For astro-type, the key's per-Run First-attempt accuracy and Clean-hit time, across the loop's Runs, are already in the Run summaries.
- **The 10-problem cut-off is a fact about maths skill builders, not about typing.** A key reach is a motor skill that improves with repetition over days, and Kai et al.'s spacing result points the same way: what looks like failure within a day can be progress across days. So the cap is better per day than per loop. A key that didn't move today is retried on a later day, not hammered now.

---

## 4. Signs of frustration and disengagement

### What the sources say

- **Frustration versus boredom.** Baker, D'Mello, Rodrigo & Graesser observed or self-reported learners' affect in three systems: a dialogue tutor, a maths tutor and a puzzle game.
  - **Frustration was short-lived:** it "was less persistent, less associated with poorer learning, and did not appear to be an antecedent to gaming the system".
  - **Boredom persisted:** it "was very persistent across learning environments and was associated with poorer learning and problem behaviors, such as gaming the system".
  - **Their conclusion:** boredom "should receive greater research attention than frustration, and … in many cases frustration may not need remediation". They cite the view that frustration matters when it comes from something outside the user's control, "such as a program bug": it leads "to a negative cognitive loop" in which the user keeps choosing the same wrong option over and over.

  ([Baker et al. 2010](https://doi.org/10.1016/j.ijhcs.2009.12.003), abstract and section 5.1)
- **Gaming the system:**
  - **What it is:** "behavior aimed at obtaining correct answers and advancing within the tutoring curriculum by systematically taking advantage of regularities in the software's feedback and help". Examples are asking for hints until the answer appears, and "inputting answers quickly and systematically … until the tutor identifies a correct answer".
  - **How common:** 24% of students gamed at least once, and 11% more than 10% of the time.
  - **What it costs:** high-gaming students scored 44% on the post-test, against 68% for never-gaming students who started just as low.
  - **How to respond:** the authors warn against redesigning the tutor for everyone ("an arms race"). They advise detecting it in real time and responding only to those students. They suggest "learned helplessness or performance orientation" as better explanations than lack of interest.

  ([Baker et al. 2004](https://hci.rwth-aachen.de/materials/conferences/CHI2004/1p383.pdf), abstract and sections on gaming)
- **Flailing.** Hunicke & Chapman's DDA system watches for the player "flailing: repeatedly edging towards a state where her current means can no longer accomplish necessary and immediate ends", and intervenes when "an undesirable but avoidable state is predicted". In their shooter, that state is running short of health and ammunition. _Weaker:_ a design paper with no player study ([Hunicke & Chapman](https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf), "Hamlet System" and "Assessment").
- **Typing tutors:**
  - **No tutor I read detects frustration.** The nearest things are:
    - **Klavaro's message** when accuracy is between its 95% level and the 98% goal: "You are almost there, but your accuracy rate is still below 98%. Try a few more times, or maybe you're getting upset, so go to another kind of exercise." Below 50% it prints only ":-(" ([`adaptability.c`](https://sources.debian.org/src/klavaro/3.14-2/src/adaptability.c/#L248-L262)).
    - **GNU Typist's Esc and Esc Esc** (section 2).
    - **Monkeytype's AFK rules**, which void a test whose last 5 seconds had no keypress (see [Accuracy and speed benchmarks](beginner-typing-benchmarks.md), section 2).
  - **TIPP10 blocks the cursor on an error by default** (`check_stop` true), as astro-type's Drone waits. It can beep on errors, off by default ([`trainingwidget.cpp`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/widget/trainingwidget.cpp#L617-L621)).
- **Typing's own built-in frustration.**
  - **Touch typing starts slower than looking:** experienced computer users with no touch-typing training, told not to look, slowed by about 90%. In the training study, learners typed about 18 WPM by looking but about 8 WPM by touch at the start, and needed about 8 hours of training before touch typing caught up.
  - **Melioration:** the authors argue that people drift back to looking because of "an intuitive tendency to choose typing strategies that lead to a better immediate performance level than that obtained by touch-typing". Changing the immediate rewards so that looking at the screen paid off raised touch-typing scores by 25–30%.

  ([Yechiam et al. 2003](https://yeldad.net.technion.ac.il/files/2016/12/type.pdf), pp. 1–2, 8, 11–12)

### What astro-type can see today

These are read from `src/analytics/` at commit `43c0cc0`:

| Sign named in the map                       | In the Logbook today?                                                                                                                                                                                                                                         |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quitting a Run                              | **No.** The Logbook keeps "a summary of each cleared Run" (`RunSummarySchema` in `runs.ts`). An abandoned Run leaves nothing.                                                                                                                                 |
| Replaying a Stage without a new Star        | **Yes, by combining.** Each Run summary copies its Stage's id, day, WPM and accuracy. Stars live in the Profile.                                                                                                                                            |
| Long pauses                                 | **No.** A gap over 5 s is left out of a key's timing (`LONGEST_GAP_STEPS` in `keys.ts`) but not counted. Pause Menu use isn't recorded. Run Time already excludes paused time.                                                                               |
| Bursts of wrong keys                        | **Partly.** A Run summary counts First attempts and First-attempt Misses per key, and Mix-ups. Wrong keys pressed after the first Miss on a character aren't counted. The Flight log has them, but it is dropped when the Debrief is left.                   |
| Rhythm                                      | **Yes:** each Run summary keeps its Rhythm.                                                                                                                                                                                                                  |

### Inference

- **Watch for boredom as well as frustration.** The vision lists frustration signs (quitting a Run, long pauses, bursts of wrong keys) and asks the orchestrator to ease the next step. The best evidence (Baker et al. 2010) says boredom is the state that persists and leads to gaming, while frustration usually passes by itself. For a loop, the boredom risk is repetition: the same key, the same patterns, again. Lomas et al. (section 5) found repetition didn't raise engagement and variety did. So "keep loops short and varied" protects against boredom as much as easing protects against frustration.
- **A burst of wrong keys is ambiguous.** In astro-type a wrong key is a Miss and the Drone waits, so fast repeated wrong keys on one character can mean three things:
  - **a Mix-up the player can't resolve**, which is frustration of Mentis's "same erroneous option over and over" kind;
  - **mashing to get past**, which is gaming;
  - **looking for the key**, which is a beginner's search.

  Accuracy counts only First attempts, so mashing doesn't raise the score. It is a sign, not an exploit. Telling the three apart needs the time between the wrong keys, which the Flight log has and the Run summary drops.
- **Quitting is the most direct sign, and today it is invisible.** Stopout research treats quitting before success as the low-persistence failure. A Run abandoned at the same point of the same Stage several times is the clearest "this is too hard" signal astro-type could have. It isn't recorded.
- **The vision says to record nothing new unless a gap is found, and then to say so. This is a gap.** If the orchestrator is to react to quits, wrong-key bursts or long pauses, the Save needs one or more of these:
  - abandoned Runs, perhaps as a small count per Stage per day;
  - per Run, the wrong keys after a First-attempt Miss;
  - per Run, the gaps over 5 s.

  Each is a Save change, so `SAVE_VERSION` rises and the Profile is wiped. Without them, the orchestrator can only use replays without a new Star, falling accuracy and Rhythm across Runs, and a key's lack of progress.

---

## 5. How systems respond: easing, switching, and choice

### What the sources say

- **Easier means longer play, at least up to about 70% success.** Lomas, Patel, Forlizzi & Koedinger ran two online experiments with a maths number-line game, with 10,478 and 69,642 sessions.
  - **The headline:** they tested the "inverted U" idea that moderate challenge engages most. "in almost all cases, subjects were more engaged and played longer when the game was easier".
  - **The numbers:** the largest targets succeeded 63% of the time and the smallest 29%. The larger targets gave "34% more estimates and 18% more time spent".
  - **Time limits:** "Longer time limits increased both success and engagement … the shortest time limits were the most disengaging of any design factor."
  - **Repetition and variety:** repeating unsuccessful items straight away "had the effect of significantly increasing player success" but "a minimal effect on engagement", while more distinct items raised engagement.
  - **The catch:** "the most engaging design conditions produced the slowest rates of learning".
  - **Their caveat:** the easiest conditions were still under 70% success, so an inverted U above 90% wasn't tested.

  ([Lomas et al. 2013](https://doi.org/10.1145/2470654.2470668), Experiments 1–2, Analysis of Learning Curves, Discussion)
- **How to intervene:**
  - **The aim:** "support the player without eliminating negative feedback", and "intervene just enough, so that system behavior is relatively stable and predictable over time".
  - **Reactive and proactive changes:** reactive changes act on what is on screen now. Proactive changes act on what has yet to appear, and carry a risk of "a spiraling loop of change, resulting in erratic and unpredictable behavior".
  - _Weaker:_ a design paper ([Hunicke & Chapman](https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf), "Goals" and "Adjustment").
- **Automatic or chosen difficulty.** Two studies compared a difficulty menu, a choice built into the game, and automatic adjustment:
  - **Only autonomy differed:** the kind of adjustment "has an impact on perceived autonomy, but other player experience measures were not affected as expected".
  - **Players like to choose:** "most players express a preference for manual difficulty choices", yet experience "was not notably impacted by automated difficulty adjustments".

  ([Smeddinck et al. 2016](https://www.cs.mcgill.ca/~jeromew/data/COMP766/CHI2016/p5595-smeddinck.pdf), abstract and conclusion)
- **A theoretical "sweet spot".** For one class of learning algorithms on two-choice tasks, learning is fastest when training accuracy is about 85%. The authors note that experimenters' difficulty staircases are commonly set to 80–85%. _Weaker for typing:_ it is a mathematical result about gradient-descent learners. The authors say it "remains to be generalized to a broader class of circumstances" ([Wilson et al. 2019](https://doi.org/10.1038/s41467-019-12552-4), Discussion).
- **What the large systems do when a learner struggles:**
  - **Switch:** ALEKS "gently" prompts another topic after five wrong in a row.
  - **Stop for the day:** ASSISTments stops at the daily limit and says to seek help.
  - **Lower difficulty:** this is proposed for stopout but untested (Botelho et al. 2019).
  - None of these changes how the work is _scored_. They change what comes next.

### Inference

- **The map's "ease the next step" is supported, with a limit.** Easier keeps people playing (Lomas), and every large system answers struggle by changing what comes next, not by scoring differently. But easier also learned slower in the same study. So easing is a short response to a signal, not a standing setting. Hunicke's "just enough" and the 85% figure (weaker) point the same way: back off to a level where the player mostly succeeds, then return.
- **In astro-type, easing has to come from Stage choice.** The scoring rules and Star bars are settled. Easing can be:
  - **an easier text:** fewer new keys, a shorter text, more of the player's strong keys, the weak key in easy Letter pairs;
  - **a loop step back** to the key on its own;
  - **rejoining the main path** at a Stage the player already cleared.

  Lomas's time-limit result says speed pressure is the most disengaging lever. If the generator or library tags a Stage's speed demands, an eased Stage should lower those first.
- **Easing must not pay for looking at the keys.** Yechiam's beginners typed faster by looking than by touch for about their first 8 hours. Anything that makes the short term pay more for the old habit works against the skill. The game can't see the eyes, so this is a design aim, not a measured one, like the map's finger aim. Concretely, easing should slow the pace, not hide difficulty in a way that rewards hunting for keys.
- **Proactive, between Runs, matches the map.** The orchestrator acts between Runs, never inside one. That is Hunicke's "proactive" kind, and its risk is see-sawing. A rule that needs several Runs of evidence before it changes the plan, and doesn't flip back on one good Run, avoids it.
- **Suggest, never force, fits Smeddinck's result.** Automatic choices didn't harm experience; autonomy is what a forced choice costs. A suggestion with a reason, which the player can decline, keeps autonomy. Klavaro's toggle button is the same design: the tutor notices, the player decides.

---

## 6. Questions this leaves for the decision tickets

For [How the orchestrator decides](https://github.com/k-electron/astro-type/issues/191):

1. What minimum First attempts and Clean hits a key needs before it can start a loop, kept apart from how far below the player's own average it must be (section 1)?
2. What one "opportunity" is: a loop Run, or a day? What short success rule ends a loop: an EMA, or a share per Run, rather than a streak of single Keystrokes?
3. What cap a loop has (loop Runs, per day), and what happens at the cap: rejoin and retry the key on a later day, or step back to the key on its own?
4. How the main path re-checks a key after a loop, and how soon.
5. Whether loop Runs count as evidence that the key is fixed, or only main-path Runs do (Amphetype's default leaves drills out).
6. Which signs ease the next step, and what "ease" means when the rules can't change.

For [Progress and gates](https://github.com/k-electron/astro-type/issues/185) and [What the player sees of a suggestion](https://github.com/k-electron/astro-type/issues/193):

7. Whether a loop Run counts toward a gate (P4: the practice the player needs "counts toward getting past the gate"), given that the loop's bar can be gentler than a Star bar.
8. How the player declines or leaves a loop, and what the suggestion says when the cap ends a loop that didn't work (ALEKS's "try something else", ASSISTments' "come back tomorrow").

For [What the generator builds](https://github.com/k-electron/astro-type/issues/189) and [What a Stage carries](https://github.com/k-electron/astro-type/issues/186):

9. Which tags let the orchestrator ask for an easier Stage (new keys, length, speed demand, hard Letter pairs), and how loop texts stay varied so repetition doesn't breed boredom.

For the Save (the map's "How the Save changes"):

10. Whether to record abandoned Runs, wrong keys after a Miss, and gaps over 5 s, each a `SAVE_VERSION` raise and a Profile wipe (section 4).

For [A beginner's month, simulated](https://github.com/k-electron/astro-type/issues/192):

11. Tune the minimum counts, the loop's exit and its cap with the simulated beginner. Measure a beginner's per-key spread of Clean-hit times, which this note had to assume (section 1).

---

## What I couldn't find or read

- **Typing-specific evidence on any of this.** No study I found tests when a typing tutor should detour to a weak key, how long such a loop should run, or how typing learners react to it. Every number on loops, caps and wheel-spinning comes from maths and programming tutors.
- **Papers I couldn't read** (paywalled, or the host refused automated requests):
  - Beck & Gong 2013 (read through Gong's thesis instead);
  - Ritter et al. 2016, "How mastery learning works at scale";
  - Fancsali, Nixon & Ritter 2013 on knowledge-tracing thresholds;
  - Xue et al. 2017, EA's difficulty adjustment against churn;
  - Hunicke 2005, "The case for dynamic difficulty adjustment in games";
  - Constant & Levieux 2019 on DDA and player confidence;
  - Allart et al. 2017 on difficulty and retention in commercial games;
  - Ang & Mitchell 2017 on comparing DDA systems;
  - Epp, Lippold & Mandryk 2011 on detecting emotion from keystrokes;
  - Guadagnoli & Lee 2004, the "challenge point" framework;
  - Kulik, Kulik & Bangert-Drowns 1990, the mastery-learning meta-analysis;
  - Bloom 1968.

  The practice-scheduling side of motor learning (challenge point, blocked against random practice, spacing) belongs to [What learning science says about practising a skill like typing](https://github.com/k-electron/astro-type/issues/182). I didn't cover it here.
- **Closed tutors.** Typing.com, TypingClub and Mavis Beacon don't publish how they choose or end remedial practice.
- **Klavaro's newer forks and its SourceForge trunk.** I read the 3.14 release as Debian ships it. The toggle-button behaviour may differ from the trunk the earlier note read.
- **Corbett & Anderson 1995 in full.** The copy is a scan. I read the abstract and the knowledge-tracing section (pp. 253, 260–261), and their 1992 paper in full.
