# What learning science says about practising a skill like typing

Research for [What learning science says about practising a skill like typing](https://github.com/k-electron/astro-type/issues/182), under the map [Phase 3: a curriculum that teaches, with practice that fits the player](https://github.com/k-electron/astro-type/issues/175). Written 2026-11-26.

**Question:** what does research on motor learning and skill acquisition say that should shape the path and the loops? In particular: practising one key at a time against mixed practice, spacing and retrieval; how fast new keys should come, and how many at once; how long a drill should be, and how many repetitions it needs; isolated drills against real words (P8), chunking, and the move from typing letters to typing words; how bad habits form and how hard they are to unlearn; and what a month of 15–20 minutes of play a day can be expected to build.

**How much to trust each source:**

- **Primary, studies of typing read in full:** Baddeley & Longman 1978 (a scanned copy), Yechiam et al. 2003, Feit et al. 2016, Dhakal et al. 2018, Yamaguchi & Logan 2014, van den Bergh et al. 2015, Keith & Ericsson 2007 (the authors' preprint), Behmer & Crump 2017 (a book chapter), and Logan & Crump 2011, a chapter that reports their own experiments, including Logan & Crump 2009 and Liu et al. 2010.
- **Primary, studies of typing read as abstracts only** (marked where used): Logan, Ulrich & Lindsey 2016; Snyder et al. 2014; Yamaguchi, Crump & Logan 2013; Weigelt Marom & Weintraub 2015.
- **Other motor skills, read in full:** Simon & Bjork 2001 (key sequences on a number pad), Hardwick et al. 2019 (key presses to symbols), Bönstrup et al. 2019 and Gupta & Rickard 2022 (finger-tapping sequences), Rickard & Pan 2017; the meta-analyses of Donovan & Radosevich 1999, Czyż et al. 2024 and Macnamara et al. 2014; and the reviews of Soderstrom & Bjork 2015 and Abrahamse et al. 2013. **Read as abstracts only:** Pan & Rickard 2015, McKay et al. 2024, Heathcote et al. 2000, Karni et al. 1995, Walker et al. 2002 and Lally et al. 2010.
- **Weaker, and marked where used:**
  - **West 1974** (and its 1962 first edition) is a digest of mid-century classroom research on typewriting, written by that field's main researcher. It is primary for what that research concluded, but the studies behind it are mostly unpublished theses I couldn't read, they used typewriters, and its reasoning leans on a theory of skill ("chaining", "kinesthetic cues") that later work has replaced.
  - **Second-hand:** Ammar et al. 2023 and Brady 2004 (known only from Czyż et al.'s account of them), Lee & Genovese 1988 (known from Donovan & Radosevich), Shea & Morgan 1979 (known from Soderstrom & Bjork), Chua et al. 2021 (known from McKay et al.'s re-analysis), Wulf & Shea 2002 (known from its abstract and citations), Bryan & Harter 1899 and Keller 1958 (known from Logan & Crump), Grudin 1983 (read for the adaptive practice note), and Fitts & Posner's 1967 stages (known from Taylor & Ivry 2012).
- **Not used:** blogs, tutor marketing, and popular summaries, including the widely repeated "66 days to form a habit", which I couldn't trace to the paper's own text.

**Terms:** this note uses the names in `GLOSSARY.md`: Stage, Sector, Run, Keystroke, First attempt, Letter pair, Mix-up, Rhythm, Star bar, Logbook. "Step" is the map's placeholder for a unit of the path. Logan's **inner and outer loops** (keystrokes and words, inside a typist's head) are not the map's **reinforcement loops** (detours the orchestrator offers); this note always names which it means. Each section keeps **what the sources say** apart from my reading of it, marked _Inference_.

The earlier notes are cited, not repeated: [Accuracy and speed benchmarks for beginner touch typists](beginner-typing-benchmarks.md) (the benchmarks note) and [What adaptive typing tutors read to choose practice](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md) (the adaptive practice note).

---

## Bottom line

1. **Short, daily practice beats long practice, in a study of learning to type.** Postal workers learning a typewriter keyboard for one hour a day learned it in fewer hours (35 against 50), typed faster and made fewer errors than those trained two hours twice a day. They also rated their schedule the least satisfying. Meta-analyses put the benefit of spacing at about d = 0.46 overall and near d = 1 for simple motor tasks, smaller for complex tasks and in more rigorous studies. P7's 15–20 minutes a day is on the right side of this evidence. Nobody has tested 15 minutes against 45 for typing.
2. **Mixing practice helps retention but hurts how practice looks, and the size of that benefit is disputed.** Interleaved practice of key sequences gave worse scores during practice and better ones a day later, and learners wrongly judged blocked practice the better one. Across motor learning the benefit is medium in the lab (SMD 0.57–0.75) but small and often not significant in applied settings (0.19–0.34), and one 2023 meta-analysis calls it a myth. No study tests it for learning a keyboard. _Inference:_ drill a new key on its own briefly, mix it with learned keys soon, and judge whether it is learned from later mixed Runs, never from the drill itself. That matches the map's "decisions come from overall progress, not single Runs".
3. **A key is learned in its context, not on its own.** When skilled typists learned a moved key, part of what they learned belonged to the practised words and to the Letter pairs before and after the key, and was lost on new words. The classic typewriting research says the same: each key needs "several different motions", one for each key that comes before it. _Inference:_ drills and generated Stages for a key should vary its Letter pairs widely, and a key that is fast in one drill is not yet learned.
4. **Letters build the reach; word-level typing comes much later.** Typing whole words as units (Logan's outer loop handing words to the inner loop) is well documented in skilled typists, who type real words faster than scrambled ones. Novices type words and non-words at about the same speed. In 62 learners practising only the home row, a word advantage appeared with practice but stayed small (d ≤ 0.20) after 10,000–20,000 Keystrokes each. Slower typists' speed tracks how common single letters are; faster typists' speed tracks how common Letter pairs and three-letter sequences are. The classic research found that drills of nonsense letters work worse than real words as the main way to learn the keyboard, though a few seconds of `frf` per new reach is fine. P8's shape is supported. _Inference:_ in the first month, gains will come mostly from single keys and Letter pairs; real words matter because they carry the language's Letter pairs in their natural mix, not because players will type them as chunks yet.
5. **A consistent finger for each key is what predicts skill, more than touch-typing training.** Fast typists, trained or not, press each key with the same finger and keep their hands still. Typists who use the standard mapping were faster and more accurate than those who don't, most of all when they couldn't see the keys, yet both groups typed just as automatically. A typing course on its own predicts only a small speed gain (d = 0.27). This supports the owner's "wax on, wax off" aim in one specific form: the habit to build is one finger per key, every time.
6. **Old habits don't go away; time pressure brings them back.** After 4 days (4,000 trials) of practising a symbol-to-key mapping, people learned a changed mapping in about 40 trials. But when forced to respond within about 300–600 ms they fell back on the old one, and 20 days of practice made the old habit stronger and faster. The task was choosing keys for symbols, not typing, so this is the best available model, not proof. _Inference:_ it is the strongest case for building the habit before speed. At 25 WPM a Keystroke takes about 480 ms, inside that window, so speed pressure on a key whose new reach is not yet practised invites an old hunt-and-peck reach back.
7. **Touch typing starts slower than the player's old way, and people relapse when it does.** Students who could already type 18 WPM by looking typed 8 WPM by touch. Those with the biggest gap improved least once they went back to everyday typing (r = −.63), and a small on-screen task that rewarded keeping eyes on the screen reversed that. In another course, typing speed fell by the end of the course and rose above the starting point three months later. The benchmarks note already says early Star bars must not ask for more than the player's old speed; this is the mechanism behind it.
8. **The classic typewriting research disagrees with P2, and the newer evidence partly disagrees with it.** West's digest says early stress on speed beats early stress on accuracy, that accuracy drills are useless, and that beginners should be allowed to look at the keys at first. This rests on typewriter-era classroom studies I couldn't check. Newer evidence cuts against parts of it: fast typists make fewer errors (r = −0.21 to −0.36), and looking at the keys is what people relapse to. This is a tension for the owner, not a finding against the rules; P2 governs what Stars reward, which West's advice doesn't touch.
9. **A month of 15–20 minutes a day (7.5–10 hours) builds the map and the habit, not fluency.** In the closest study, about 8 hours of a touch-typing course brought students to 21 WPM on a text they had typed every hour, and they typed a new text at 14 WPM two weeks after about 14 hours. Postal trainees took 35–50 hours to learn the keyboard. Learners on the home row alone had not, on average, stopped improving after 10,000–20,000 Keystrokes. The benchmarks note's 20–25 WPM at 95% is a reasonable aim for the letters, but the full keyboard with capitals, numbers and symbols at that level in 10 hours is ambitious, and skill lost without practice is about 30% of speed over 9 months.

---

## 1. Spreading practice over days, and how long to practise in one sitting (P7)

### What the sources say

- **The one experiment on learning to type** (Baddeley & Longman 1978, _Ergonomics_; [scanned copy](https://www.gwern.net/doc/psychology/spaced-repetition/1978-baddeley.pdf)):
  - **Design:** 4 groups of 18 postal workers who had never typed learned a typewriter keyboard to enter postcodes: 1 hour once a day, 1 hour twice a day, 2 hours once a day, or 2 hours twice a day. The instructor followed the standard Post Office course and decided when to introduce new material, so the schedule of new keys wasn't controlled.
  - **Hours to learn the whole keyboard:** 34.9 (1 × 1 h), 42.6 (2 × 1 h), 43.2 (1 × 2 h), 49.7 (2 × 2 h). The fastest learner in the 2 × 2 h group was slower than the slowest in the 1 × 1 h and 1 × 2 h groups.
  - **Speed after 60 hours** (correct keystrokes a minute on code material): 79.3, 73.4, 71.1 and 66.8 in the same order. One-hour sessions beat two-hour ones (p < .01), and once a day beat twice (p = .05). The 1 × 1 h group after 60 hours was faster and more accurate than the 2 × 2 h group after 80.
  - **Errors left in the text after 60 hours:** 1.09%, 1.14%, 1.41% and 2.06%.
  - **What learners thought:** the 2 × 2 h group rated its schedule the most satisfactory and the 1 × 1 h group the least. The 1 × 1 h group took 12 weeks to reach 60 hours, the 2 × 2 h group 3 weeks. The authors warn against choosing a schedule by how learners rate it.
  - **Retention:** after 1, 3 or 9 months without typing, speed was about 30% lower, and most of the loss came in the first 3 months.
- **Meta-analyses of spacing in motor tasks:**
  - Donovan & Radosevich 1999 (63 studies, 112 effect sizes; [copy](https://www.gwern.net/docs/spaced-repetition/1999-donovan.pdf)): spaced practice beat massed practice by d = 0.46 overall. The effect was d = 0.97 for simple, mainly physical tasks, and only 0.07–0.11 for complex tasks; more complex tasks gave smaller effects (r = −.25). More rigorous studies found smaller effects (d = 1.22 for the least rigorous group, 0.40 for the others). Most "retention" tests were only 24 hours later, which the authors say may be too short.
  - They report Lee & Genovese's 1988 meta-analysis of motor tasks at d = 0.96, from many of the same studies (I didn't read Lee & Genovese myself). Soderstrom & Bjork's review ([PDF](https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/11/soderstorm_ra_learningvsperformance.pdf)) notes that massed practice clearly depresses performance during practice, while its effect on learning has been less certain.
- **Within a sitting:** in finger-tapping sequence tasks, people slow down over each continuous block and recover after a break, an effect called reactive inhibition.
  - Gupta & Rickard 2022 (159 people; [open access](https://doi.org/10.1038/s41539-022-00140-z)): the less break time there was relative to practice time (30 s blocks against 10 s, 10 s breaks against 30 s), the bigger the jump after a 5-minute rest. They argue the jump is recovery, not learning during the rest.
  - Bönstrup et al. 2019 ([Current Biology](https://doi.org/10.1016/j.cub.2019.02.049)) read similar gains during 10-second rests as a fast form of consolidation. The two readings are still argued over.
  - **Sleep:** an early study reported a 20% speed gain after a night's sleep (Walker et al. 2002, abstract). A meta-analysis of 34 articles found no evidence that sleep enhances motor learning once averaging artefacts, reactive inhibition, time of testing and training length were accounted for (Pan & Rickard 2015, abstract; their reply to critics, [Rickard & Pan 2017](https://sc-pan.github.io/pdf/RP_PB_2017.pdf)).
- **Days of practice on one sequence:** daily practice of a five-movement finger sequence kept improving speed and accuracy for several weeks, reaching its limit around week 4, and the gain didn't carry over to the same movements in another order (Karni et al. 1995, _Nature_, abstract).

### Inference

- **P7 is supported in direction.** The only typing study found that less practice a day gave more learning per hour, better accuracy and better retention. Its shortest session was an hour, so it says nothing about 15 minutes against 30. The meta-analyses agree for simple motor tasks; for complex ones the effect is small. Typing a keyboard sits between the two.
- **Learners prefer what works worse.** Baddeley & Longman's trainees and Simon & Bjork's (section 2) both preferred the schedule that taught them less. A game should not take "the player wants to keep going" as evidence that long sessions are good, and the orchestrator should not judge learning from how practice feels or looks in the moment.
- **Within a day, short Runs with breaks between them are the safe shape.** Long continuous typing depresses speed through reactive inhibition, which recovers with rest. A Run's WPM therefore partly reflects where it fell in a session. The orchestrator should weigh evidence across days rather than within one long sitting, which the map's "overall progress" already says.
- **Don't build on "sleep makes you better".** The behavioural benefit of spacing over days is the robust part; the sleep-specific claims did not survive re-analysis.
- **The warm-up (P6, a later phase) has support:** about 30% of speed was lost over months without practice, mostly early.

---

## 2. One key at a time against mixed practice, and retrieval

### What the sources say

- **Key sequences, blocked against random** (Simon & Bjork 2001; [copy](https://www.gwern.net/docs/spaced-repetition/2001-simon.pdf)): 48 people learned three five-key sequences on a number pad, each to a target time, pressing with one finger. Practising each sequence in a block gave better scores during practice; mixing them gave better scores on a test the next day. Throughout practice, the blocked group predicted it would do better the next day, and it was wrong.
- **The classic result** (Shea & Morgan 1979, as Soderstrom & Bjork describe it): blocked practice of three arm movements was better during practice, random practice was better after 10 minutes and after 10 days, and it transferred better to a new movement.
- **How big, and how reliable:**
  - Brady's 2004 meta-analysis (as Czyż et al. report it): d = 0.57 in the lab, a negligible 0.19 in applied research.
  - Czyż et al. 2024, on transfer only (34 studies, 86 effect sizes; [open access](https://doi.org/10.3389/fpsyg.2024.1377122)): SMD 0.55 overall, 0.40 without outliers, 0.75 in the lab (significant) and 0.34 in applied settings (not significant); 0.54 for adults.
  - Ammar et al. 2023, a meta-analysis of sport practice, found small and non-significant effects and called the benefit "a myth". Czyż et al. criticise its methods (how it handled several results from one sample, the databases it searched, no preregistration). I didn't read Ammar et al. myself.
- **Why simple lab results may not carry over:** Wulf & Shea 2002 argue that principles found with simple lab tasks often fail to generalise to complex skills (known from the abstract; I couldn't read the paper). The Donovan & Radosevich task-complexity result in section 1 points the same way.
- **Retrieval:** I found no study of retrieval practice, in the sense of the testing effect, for typing or for learning key locations. Two nearby findings:
  - Skilled typists can't say where most keys are. Asked to point from one key to another without a keyboard, their errors averaged 47° (Liu et al. 2010, via Logan & Crump 2011). Typists who completed a 2-hour Dvorak touch-typing tutorial knew that layout no better explicitly than the QWERTY layout they had used for 12 years (Snyder et al. 2014, abstract). Key location is known by the fingers, not recalled.
  - Recalling a reach without looking is what touch typing is, and looking at the keys is the habit people fall back to (section 6).

### Inference

- **Expect blocked drills to look better than they are.** A new key drilled alone (`fff jjj fjf`) will show fast, clean Keystrokes that won't hold when the key is mixed with others. If a step's gate is measured on a blocked drill, it will pass players too early.
- **Mix early, but don't count on a large effect.** The lab effect is medium, the applied one small and disputed, and none of it was tested on a keyboard. The safe reading is: a short blocked introduction, then mixed practice with learned keys soon, and the orchestrator judges a key from mixed Runs on later days.
- **"Retrieval" in typing means finding the key without looking.** The explicit "where is the key" knowledge that a quiz could test doesn't track skill. The practice that builds the reach is pressing it from memory, with eyes on the screen.

---

## 3. How fast new keys come, how many at once, and how many repetitions

### What the sources say

- **No controlled research on the rate of new keys.** West's digest says so outright: "there has been no research on rate of keyboard presentation", apart from old studies where the whole alphabet in one lesson with real prose beat weeks of nonsense drills (West 1974, [ERIC ED107884](https://files.eric.ed.gov/fulltext/ED107884.pdf), "Learning the Keyboard"). It also says "there is no particular order of presentation of keys that has been shown to be most advantageous", and the only requirement is that the keys allow real words from the first lesson.
- **West's argument for presenting keys fast:** a key isn't one response but several, one for each key before it (the reach to `r` differs in _from_, _cream_ and _brought_). A key learned in one context early can still be mistyped weeks later when a new neighbour arrives. He recommends presenting the alphabet in about 4–5 lessons of 40–50 minutes for a fast class, 9–10 for an average one and no more than about 15 for slow learners, and letting the following weeks make it "sink in". This is reasoning, not a tested result.
- **What courses in the studies did:**
  - The tutor in Yechiam et al. 2003 taught 2 new keys per lesson over 14 lessons. Learners were advised to move on after beating an 18 WPM pacer and passing a test of three lines with at most three mistakes.
  - The online course in van den Bergh et al. 2015 starts with all 8 home-row keys at once.
  - keybr adds one letter at a time, when every current key reaches its target speed (the adaptive practice note).
- **Context matters for each new key.** Skilled typists who practised a moved key learned it partly at the word level, partly at the Letter-pair level (both the letter before and the letter after) and partly as a single letter. On new words, part of the gain was lost: about 67 ms of their improvement belonged to the practised words, about 56 ms carried to new ones (Yamaguchi & Logan 2014, Experiment 3; [archived copy](https://web.archive.org/web/2022/http://www.psy.vanderbilt.edu/faculty/logan/YamaguchiLogan2014B.pdf), [DOI](https://doi.org/10.1037/xlm0000026)).
- **How many repetitions:** no source gives a count per key. The nearest numbers:
  - Learning a changed mapping for 4 symbols explicitly took about 40 trials; making the original mapping a habit that intruded under time pressure took 4,000 trials over 4 days (Hardwick et al. 2019).
  - Key-press sequence studies give each sequence 500–1,000 repetitions to make it a practised chunk (Abrahamse et al. 2013, [open access](https://doi.org/10.3389/fnhum.2013.00082)).
  - Learners on the home row alone, selected for more than 10,000 Keystrokes and for finishing in the top quarter, had on average not stopped improving after 10,000–20,000 Keystrokes (van den Bergh et al. 2015, [PDF](https://pure.uva.nl/ws/files/29156171/23.25.PMS.pdf)).
- **The shape of improvement:** fitted to individual learners in 24 experiments, practice curves are exponential: fast early gains that slow down (Heathcote et al. 2000, abstract). Averaging learners makes curves look like a power law, which is why "the power law of practice" is often quoted.
- **Mix-ups:** beginners' Mix-ups go mostly to the neighbouring key and to the mirror key on the other hand (Grudin 1983, in the adaptive practice note). West recommends drills that put the commonly confused letters side by side ("Try to rotate the tires" for `r` and `t`), as discrimination training. He notes no study had tested it.

### Inference

- **The pace of new keys is a design choice the evidence doesn't settle.** P4 (one small new thing per step) and West's argument for fast presentation pull in opposite directions. They can be reconciled: a step can add a key quickly, as long as later steps keep mixing it with every new neighbour, so the key is "presented" fast and "learned" over the following weeks. One or two keys per step is the range the courses used; nothing shows which is better.
- **Order is a convention, not a finding.** Home row first, then top and bottom rows, is what courses do. What the evidence asks for is that real words become possible as early as possible, which home row first allows (`ask`, `all`, `dad`, `salad`).
- **There is no research number of repetitions to aim for.** The map's "enough Keystrokes behind a key before acting" is the right shape, and the threshold has to be tuned. The scale is large: thousands of Keystrokes on a handful of keys before improvement slows.
- **Mirror and neighbour keys introduced in the same step deserve care.** Putting `f` and `j` (mirrors) or `r` and `t` (neighbours) side by side is exactly West's discrimination drill, but nothing tests whether introducing them together helps or confuses. A Mix-up loop that pairs a key with its common Mix-up follows the same untested idea.

---

## 4. How long a drill should be

### What the sources say

- **West's rule:** a timed practice is "too long" if the typist can't hold the target rate to the end, and too short to transfer if it is much shorter than real typing. He recommends durations growing from about 30 seconds to 2–3 minutes over the course, and moving off timings under a minute after about the first week (West 1974, "Duration of Practice Timings"). He rejects studies that favour very short timings as methodologically weak.
- **Repetition of the same text:** West reports that typing more different lines once each beat typing fewer lines several times ("better one trial at each of ten sentences than two trials at each of five"), in two classroom studies over the first 30 lessons and the first semester. For timed speed goals, he recommends repeating the same text until its goal is met, then moving to new text for the next goal.
- **Reactive inhibition** (section 1): speed drops within continuous practice and recovers with breaks; 10-second blocks built up less of it than 30-second blocks.

### Inference

- **Today's Stage texts already fit.** At 56–196 characters, a Run lasts about 1–3.3 minutes at 12 WPM and 30 seconds to 1.6 minutes at 25 WPM. That is West's range.
- **Variety beats repetition, which favours the library and generator.** A large library where a replay brings a different text is the extensive practice West found better, and it also closes the memorisation gap the benchmarks note found in Yechiam's test.
- **Longer Stages for later steps are reasonable.** Durations should grow as players can hold a pace, and the first drills of a new key should be short.

---

## 5. Letters, Letter pairs and words: chunking and the move to word typing (P8)

### What the sources say

- **Skilled typists plan in words** (Logan & Crump 2011, [chapter](https://www.crumplab.com/publications/Crump/files/3898/Logan%20and%20Crump%20-%202011%20-%20Hierarchical%20control%20of%20cognitive%20processes%20The%20c.pdf)):
  - Scrambling the words of a sentence barely slows skilled typists, while scrambling the letters within words, or typing random letter strings, slows them a lot. Preview of the text helps up to about 8 characters, roughly a word, and not beyond.
  - Their reading: an outer loop passes whole words to an inner loop, which turns each into Keystrokes. The outer loop doesn't know which hand types which letter or where keys are.
  - These typists had about 11 years of practice. The authors are "reasonably sure that extensive practice is necessary" to develop this control, and they don't yet know how it develops.
- **Novices don't, at first.** Novices type words and non-words at the same pace, while experts type words faster (van den Bergh et al. 2015, summarising older studies). In their own data, 62 learners on the home row of an adaptive online course:
  - Real words came to be typed slightly faster than non-words with practice, but the effect peaked at d = 0.20 and ended at 0.15.
  - Repeating the same finger (as in `fff`) was much faster than changing finger at first (d = 1.43), and the gap fell to 0.32 with practice. The authors read that as the inner loop developing faster than the outer.
  - The mean time per Keystroke across the data was about 657 ms, about 18 WPM.
- **What typists' speed tracks changes with skill** (Behmer & Crump 2017, 346 typists online; [chapter](https://www.crumplab.com/publications/Crump/files/4991/Behmer%20and%20Crump%20-%202017%20-%20Crunching%20big%20data%20with%20finger%20tips%20How%20typists%20t.pdf)): slower typists' Keystroke times follow how common single letters are; faster typists' follow how common Letter pairs and three-letter sequences are. This is across typists, not following anyone over time.
- **The classic typewriting view** (West 1974, "How Stroking Skill Is Acquired"):
  - Beginners type letter by letter. Even a 40 WPM typist "performs mainly on a letter-by-letter basis", sequences typed as units are "mostly limited to 2- and 3-letter sequences", and they don't become prominent until about 60 WPM.
  - "Nobody types by phrases, and word-level typing is prominent only among experts."
  - Practice material should be ordinary prose over a wide vocabulary, because it holds Letter pairs in their natural proportions. Specially selected words or "speed sentences" transfer only to the sequences they contain.
  - For keyboard learning, "nonsense drill has been shown in all the studies of it to be less effective than the immediate use of dictionary words, phrases, and sentences", though "for the first few seconds of practice at each new reach there is no objection to nonsense drill of the frf variety". The best material puts each new letter next to each earlier letter that it follows or precedes in English.
- **Practising one key on its own leaves part of it unlearned:** see section 3; part of a newly learned key belonged to the practised words and Letter pairs (Yamaguchi & Logan 2014).
- **Other key-press sequence work:** with hundreds of repetitions, people split a 6-key sequence into 2 or more chunks, with a pause between them, and the chunks can later merge (Abrahamse et al. 2013).

### Inference

- **P8 is supported in its shape:** drill a new reach briefly on its own, then move it into real words as soon as possible. The evidence is stronger for "words soon" than for long drills.
- **Words matter in the first month for a different reason than P8 gives.** P8 says words build fluency because skilled typists plan whole words. That is true of skilled typists, but at 20–25 WPM players will still type mostly letter by letter and Letter pair by Letter pair. Words matter now because they hold the right Letter pairs in the right proportions, and because practice on real text transfers to real text. Word-level chunking is what comes after the curriculum (P13's "keep improving to 50 WPM").
- **Letter pairs are the unit to watch.** Both the key-learning result (the letter before and after both mattered) and the skill result (faster typists tuned to Letter pairs) point at Letter pairs. The Logbook already keeps them (the adaptive practice note). A generated Stage for a weak key should present it with many different neighbours, and especially with the common ones.
- **"Drills never go away" is fine, but drills alone won't fix a key.** A reinforcement loop made only of `kkk kik` would improve the drill and transfer partly. Loops should end in words.

---

## 6. Habits: how they form, how hard they are to unlearn, and the case for the habit before speed (P2, P14)

### What the sources say

- **What predicts skill in everyday typists:**
  - Feit et al. 2016 (30 typists, 34–79 WPM, with motion capture and eye tracking; [PDF](https://userinterfaces.aalto.fi/how-we-type/resources/HowWeType_CHI16.pdf)):
    - Touch-typing-trained and self-taught typists were equally fast (57.8 against 58.9 WPM).
    - The self-taught looked at the keyboard for 41% of the time, against 20%, and used 6.2 fingers against 8.5.
    - Three things predicted speed in both groups: pressing each key with the same finger every time (the spread of fingers per key: 0.26 for touch typists, 0.38 for the self-taught), moving towards the next key early, and keeping the hand still.
    - The three typists who said they deliberately practise typing were all touch typists.
  - Logan, Ulrich & Lindsey 2016 (abstract, [DOI](https://doi.org/10.1037/xhp0000272)): typists using the standard QWERTY finger mapping were faster and more accurate than those using fewer fingers less consistently, "especially when visual guidance was reduced by removing the letters from the keys or covering the keyboard". Both groups showed the same signs of automatic, word-level typing: the non-standard typists' habits are just as automatic, only less efficient.
  - Dhakal et al. 2018 (in both earlier notes): more fingers went with more speed (r = .38), and having taken a typing course went with a small speed gain (d = 0.27).
- **Old habits stay and come back under time pressure** (Hardwick et al. 2019, _Nature Human Behaviour_; [PDF](https://baslaboratory.github.io/papers/Hardwick_2019_Habit.pdf)):
  - 22 people practised pressing one of four keys for each of four symbols for 4 days (4,000 trials). Two symbols then swapped keys.
  - They learned the change in about 40 trials, the same as after minimal practice.
  - When forced to respond at a set time, they pressed the old key far more often when they had only about 300–600 ms to prepare. In the first 300 ms after the earliest time anyone could respond correctly, habitual errors were 25 percentage points more common than after minimal practice. Some old responses showed even with 900–1,200 ms.
  - After 20 days (20,000 trials, 14 people), habitual errors were more frequent and came faster.
  - The authors' reading: a habit prepares its response early and a goal-directed choice replaces it if there is time; so "limiting the time available for response preparation can unmask latent habits".
- **Unlearning in skilled typists** (Yamaguchi & Logan 2014): after skilled typists practised a moved key for 8 blocks of 72 trials, putting it back cost them only about 12 ms on the first block and nothing measurable on the second. A newly learned mapping interfered only briefly with a habit of many years. I found no study of the reverse case that matters here: retraining a self-taught typist to touch type.
- **Melioration: people choose what pays off now** (Yechiam et al. 2003, _Human Factors_; [PDF](https://yeldad.net.technion.ac.il/files/2016/12/type.pdf)):
  - 22 university students who already typed by looking (18.4 WPM on a short test) typed 8.1 WPM by touch. In a pilot, experienced computer users told not to look lost about 90% of their speed (unpublished pilot, weaker).
  - After about 8 hours of a course (lessons of 2 new keys each, with non-word drills), their touch typing matched their old speed on the test text.
  - In the next phase, typing their own coursework for 6 hours, those whose old way had the biggest advantage improved least by touch (r = −.63). During the course itself there was no such link (r = .16).
  - A secondary task that made not looking at the screen costly (a faint square to respond to, or the screen went dark) raised touch-typing gains (d = 0.84 at the end, 0.81 two weeks later, 0.42 on a new text).
  - The authors: training material of non-words hides the advantage of looking, because looking is slower on non-words; on real text, looking regains its advantage, and that is where people relapse.
- **The dip in a real course** (Weigelt Marom & Weintraub 2015, 74 higher-education students, 14 lessons twice a week, abstract only, [DOI](https://doi.org/10.1016/j.ridd.2015.09.014)): at the end of the course, the speed of the 30 students without learning disabilities had fallen; three months later both groups were significantly faster than at the start. Accuracy stayed above 95%.
- **How long everyday habits take:** people repeating a chosen daily behaviour took between 18 and 254 days to reach 95% of their own maximum automaticity; missing one day didn't matter (Lally et al. 2010, abstract, [DOI](https://doi.org/10.1002/ejsp.674)). These were eating, drinking or exercise behaviours, measured by self-report, so they transfer weakly to finger habits.

### Inference

- **The habit to build is specific: one finger for each key, every time, with the hands still and the eyes on the screen.** That is what predicts speed in modern typists, and it is the part of touch typing that makes typing without looking work. The game can't see fingers (P14), but it can make the consistent mapping the easy path: the hands on the Action Deck, drills built around one finger's keys, and technique tips at the moment a key arrives.
- **Habit before speed has the best support available, from outside typing.** Hardwick's result says that a well-practised response comes back when time is short, and that more practice makes it come back faster. Two consequences:
  - Speed pressure on a key before its new reach is practised invites the old reach back. Star WPM bars and Drone pressure (a later phase) are both speed pressure.
  - For a player who already hunts and pecks, the old habit will not be erased, only outcompeted. Under pressure it will reappear for a long time.
- **Make the new way pay off now.** Yechiam's result is the strongest typing evidence on relapse: people stay with touch typing only if it pays off in the moment. In this game, early Stages should not reward speeds touch typing can't reach yet (the benchmarks note), and keeping the eyes on the screen should pay off immediately. Something on screen the player must notice is one tested way; whether the game's Drones and HUD already do this is a design question.
- **Real words are where relapse happens.** Yechiam found relapse when training moved from non-words to real text. That doesn't argue against real words (section 5); it argues for real words while the player is still in the game, where touch typing is rewarded, rather than leaving them for everyday typing.

---

## 7. Speed against accuracy in practice: the classic typewriting evidence (P2)

### What the sources say

- **West's digest** (West 1974; the 1962 first edition, [ERIC ED018630](https://files.eric.ed.gov/fulltext/ED018630.pdf), says the same) is the main dissent:
  - "Early emphasis on speed is superior, both in the short and in the long run, to early emphasis on accuracy of typescript" (1962 abstract).
  - "Dozens of investigations over many decades covering thousands of students" found "an essentially zero relationship between stroking speed and stroking accuracy", so the two need separate practice.
  - Accuracy drills of every kind (one-hand, double-letter, reach drills, retyping missed words, rhythm drills to a beat, "stringent standards of accuracy early in learning") had "not the slightest positive effect".
  - His recommended cycle: practise for speed with generous error limits, 1–2 WPM above one's best, then drop back 2 WPM and practise for accuracy; "up 5, down 2".
  - On looking at the keys: insisting on touch typing from the start leads to "hesitant" strokes; beginners should be allowed to look at first, and the move to touch typing should be gradual, helped by pushing the speed.
- **Newer evidence on the same questions:**
  - In 168,000 modern typists, faster typists made fewer errors: r = −0.21 for errors left in the text and −0.36 for corrections (Dhakal et al. 2018, [PDF](https://userinterfaces.aalto.fi/136Mkeystrokes/resources/chi-18-analysis.pdf)). That is a cross-section of finished typists, not learners.
  - Skilled typists can trade speed for accuracy when asked. Most of the trade-off comes from the inner loop, and pushing the outer loop faster costs a lot of errors (Yamaguchi, Crump & Logan 2013, abstract).
  - Looking at the keys is what learners relapse to (Yechiam et al. 2003, section 6).
  - Everyday typists who had taken a typing class and who said they try to type fast in everyday typing were the fastest; a speed goal predicted performance only among those who had taken a class (β = .73 and .72 on meaningful and nonsense text, against a non-significant .15 and .05 without one) (Keith & Ericsson 2007, 60 students; [preprint](https://www.humanw.tu-darmstadt.de/media/orgpsy/keithericsson2007_preprint.pdf)).

### Inference

- **This is a real tension, and it is the owner's to weigh.** West's claims are strong but rest on typewriter classrooms, unpublished studies and a theory of skill that has been replaced. The newer work doesn't test early speed emphasis directly; it shows only that accuracy and speed go together in finished typists, and that looking at the keys wins in the short run.
- **The two views can sit together.** P2 governs what Stars reward (no Star below 90%, and higher Star bars ask for accuracy first). West's advice is about practice, not reward: some practice at a pace "a little bit uncomfortably fast", with errors allowed, may help Letter pairs run together. A practice mode that pushes pace without affecting Stars would be compatible with P2. Whether to have one is a product call.
- **But speed pushing interacts with habit.** Section 6's evidence says time pressure brings old habits out. If the game ever pushes speed, the safe time is after a key's new reach is well practised, which is the order the owner already wants.

---

## 8. Phases of skill, deliberate practice and attention (P14)

### What the sources say

- **Fitts and Posner's three stages of skill** (not the game's Stages; 1967, as Taylor & Ivry 2012 describe them, [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4330992)): a **cognitive** stage where the learner works out what to do, using explicit knowledge; an **associative** stage where attention goes to refining the details; and an **autonomous** stage where practice makes the action an automatic routine. Learning curves across many tasks show fast early gains and then a slower phase, and "initial, explicit control gives way to more routinized forms of control". They give no durations; the autonomous stage takes "countless hours".
- **Deliberate practice, measured:**
  - Across 88 studies, deliberate practice explained 12% of the differences in performance overall: 26% in games, 21% in music, 18% in sports, 4% in education and under 1% in professions. It explained 24% for highly predictable activities such as running (Macnamara et al. 2014, [PDF](https://www.psychologie.uzh.ch/dam/jcr:658d39fe-2f4b-467f-9ae2-ffeb25caf2b6/McNamara.PsychSci.25.2014.pdf)). Typing is a highly predictable activity.
  - In typing, a class plus a speed goal predicted skill (Keith & Ericsson 2007, section 7).
- **Attention to the fingers disrupts skilled typing.** When skilled typists were asked to type only the letters of one hand, they dropped from 80 to 14 WPM and made errors on 33% of words instead of 6%. Asking for the same letters by colour caused no disruption, so the cost came from working out which hand types which letter (Logan & Crump 2009, via Logan & Crump 2011).
- **Attentional focus in motor learning:** seven earlier meta-analyses, the largest by Chua et al. 2021, reported that focusing on the movement's effect rather than on the body helps learning (as McKay et al. describe them). Re-analysed with corrections for publication bias, the effects were negligible (g = 0.15 for retention, 0.09 for transfer) (McKay et al. 2024, abstract, [DOI](https://doi.org/10.1037/bul0000451)). McKay et al. say publication bias has "obfuscated the motor learning literature".
- **Plateaus:** Bryan & Harter (1899) described plateaus as telegraphers moved from letters to words to phrases; a later review found little objective evidence for plateaus, which "may be a subjective phenomenon" (Keller 1958, both via Logan & Crump 2011).

### Inference

- **A month of play sits in the cognitive and associative stages.** Players will need explicit guidance (which finger, where the key is, the lit keycap) at first, and it is right that P3 fades it as keys are learned. The autonomous, word-level typing of the studies' skilled typists is years away.
- **Teach technique before and between Runs, not as something to think about while typing fast.** Explicit attention to which finger types a key is useful for a novice working out a reach, and harmful once typing is fluent. P14's "at the moment it matters" fits: when a key is new, before the Run.
- **Treat "attentional focus" advice for technique tips as unproven.** The published benefit mostly disappears after bias correction.
- **Setting a goal a little above current speed is the most consistent practice finding in typing.** West recommends goals 1–2 WPM above one's best; Keith & Ericsson found the speed goal mattered. This doesn't change the Star bars; it suggests the game could show a player's own next target.

---

## 9. What a month of 15–20 minutes a day can build

### What the sources say

- **The amount:** 15–20 minutes a day for about a month is 7.5–10 hours (the benchmarks note).
- **The closest course** (Yechiam et al. 2003): about 8 hours over about 3–4 weeks, with lessons of 2 keys each, brought touch typing from 8.1 to 21.1 WPM on a test text that was the same every hour. After 6 more hours of everyday typing it was 28.7 WPM on that text; two weeks later, 25.8 on that text and 14.4 on a new one. The course was in Hebrew, on a 26-letter layout.
- **Postal trainees** (Baddeley & Longman 1978) took 35–50 hours to learn a keyboard with extra postal keys. After 60 hours at one hour a day they entered postcodes at 79 correct keystrokes a minute (about 16 WPM, on code material that is slower than prose).
- **Home-row learners** (van den Bergh et al. 2015) typed an average of about 17,600 Keystrokes on 8 keys and were still improving.
- **Daily practice of one finger sequence** reached its limit around week 4 (Karni et al. 1995).
- **keybr's self-selected users** went from under 20 to 40 WPM in 5.5 hours, but already typed with some method (the benchmarks note). Gopher & Raij's 35-session study of novices remains unread (the benchmarks note).
- **Forgetting:** about 30% of speed lost over months without practice (Baddeley & Longman 1978); 3 WPM lost over two weeks after Yechiam's course.

### Inference

- **The month builds the map and the habit:** every letter key's reach, one finger per key, hands home, eyes on the screen, with typing still mostly letter by letter. That matches P8's "letters build the reach" and the owner's "wax on, wax off". It does not build word-level fluency.
- **20–25 WPM at 95% on letters is plausible, not assured.** Yechiam's students reached about 21 WPM on a familiar text in 8 hours and 14 WPM on a new one; this game's texts will vary. The benchmarks note's goal stands as an aim. The full keyboard with capitals, numbers and symbols at that level in 10 hours is more than any study here shows.
- **Keystroke budget:** at 12–25 WPM, 10 minutes of actual typing a day is about 600–1,250 Keystrokes, so about 18,000–37,500 in a month. The home-row learners spent 10,000–20,000 Keystrokes on 8 keys alone without levelling off. A month spreads a similar budget over the whole keyboard, so most keys will still be improving when the curriculum ends, which is what P13 asks the game to keep supporting.
- **Expect a dip.** Players who already type by looking will be slower at first (Yechiam, Weigelt Marom & Weintraub). The Debrief and Analytics should not present that as failure.

---

## Implications for the decision tickets (inputs, not decisions)

These are inputs for the owner and the planner. None of them changes a rule.

1. **The path's shape:** one or two new keys per step both have precedent; nothing shows which is better. Real words should be possible from the first step. Later steps should keep mixing each key with every new neighbour, so a key keeps being learned after its own step.
2. **What a step is made of:** a short drill of the new reach (seconds, not minutes), then words built from learned keys. Words carry the Letter pairs that matter.
3. **When a key counts as learned:** judge it from mixed Runs on later days, not from the drill where it was introduced. A step gate passed on a blocked drill will pass players too early.
4. **The generator and the library:** vary a key's Letter pairs, both before and after it. A large library where replays differ is better than repeating one text (it also ends memorisation).
5. **Reinforcement loops:** loops can start with a drill but should end in words. A Mix-up loop that pairs a key with its common Mix-up (West's discrimination drill) is a reasonable design but untested; so is weak-key practice in general (the adaptive practice note found no controlled study either).
6. **Speed and habit:** time pressure brings old habits back. Early Star WPM bars should sit below what touch typing can reach at that point (the benchmarks note), and any added speed pressure should come after a key's reach is practised.
7. **Eyes on the screen:** relapse to looking is the main documented failure of touch-typing courses. Whether the Flight Deck rewards keeping the eyes on the screen is worth a look in the design tickets.
8. **Evidence for the orchestrator:** improvement is fast early and slows, varies widely between players, and a Run's speed depends on how long the player has been typing. Weigh evidence across days, and expect thousands of Keystrokes before a key levels off.
9. **Practice at pace, if wanted:** the classic typewriting research favours some practice at a pace "a little bit uncomfortably fast". That could exist alongside P2 only if it doesn't touch Stars, and it is the owner's call.
10. **P7 and P6:** the evidence supports short daily play and a warm-up after time away. It doesn't say whether 15 minutes is better than 30.

---

## What I couldn't find

- **A study of retraining self-taught typists.** I found no study that follows people who already hunt and peck through touch-typing training and measures how their old habit interferes. The nearest are Yechiam et al. 2003 (relapse), Weigelt Marom & Weintraub 2015 (the dip, abstract only) and Hardwick et al. 2019 (habits under time pressure, not typing).
- **Any controlled study of how fast to introduce keys, how many at once, or in what order.** West says there was none by 1974, and I found none since.
- **A controlled study of blocked against mixed practice for keyboard learning**, or of drills against words with modern learners.
- **A month-long study of adult beginners on a QWERTY keyboard** with day-by-day speed and accuracy. Gopher & Raij 1988 is still unread (paywalled).
- **Papers I could read only as abstracts:** Logan, Ulrich & Lindsey 2016 (no numbers), Snyder et al. 2014, Weigelt Marom & Weintraub 2015 (no speeds), Pan & Rickard 2015, McKay et al. 2024, Heathcote et al. 2000, Karni et al. 1995, Walker et al. 2002 and Lally et al. 2010. Ammar et al. 2023, Lee & Genovese 1988, Shea & Morgan 1979, Wulf & Shea 2002 and Fitts & Posner 1967 are known only second-hand.
- **The studies behind West's digest.** His _Acquisition of Typewriting Skills_ (1969) and its 276 references weren't available.
- **A per-key repetition count** from any study. The numbers in section 3 are from other tasks or are totals.
