# Predicting how hard a text is to type

Research for [Predicting how hard a text is to type](https://github.com/k-electron/astro-type/issues/178), under the map [Phase 3: a curriculum that teaches, with practice that fits the player](https://github.com/k-electron/astro-type/issues/175). Written 2026-11-26.

**Question:** what predicts how hard a text is to type, for a beginner and for a fluent typist, so that Star bars can be shown to be fair across the many Stages of one step without anyone playing them? This covers Letter-pair speeds and the datasets that hold them (with their licences), hand alternation, same-finger pairs, row changes and reach, word length, word frequency, capitals and symbols, published models of typing time and text difficulty, and how tutors set a speed goal for each lesson.

**How much to trust each source:**

- **Primary, papers read in full:**
  - Dhakal et al. 2018, the 136-million-Keystroke study.
  - Salthouse 1986, the review of 29 typing phenomena, read from the author's lab copy.
  - Ostry 1983, a book chapter, read from the author's lab copy.
  - Feit, Weir & Oulasvirta 2016, "How We Type".
  - Card, Moran & Newell 1980, the keystroke-level model, read from a scan in Carnegie Mellon's Newell archive.
  - Hiraga, Ono & Yamada 1980, read from the ACL Anthology.
  - Behmer & Crump 2017, a book chapter, read from the author's copy.
  - van den Bergh et al. 2015.
  - Pinet et al. 2022.
  - Williams et al. 2026, "The Typability Index", which is CC BY 4.0.
- **Primary, read only in part:**
  - **Salthouse 1984** is a scan with no text layer, so I read only its first page. Its numbers here come from Salthouse's own summary of it in his 1986 review, and from Feit et al. 2016, Table 1.
  - **Salthouse 1986, "Effects of practice on a typing-like keying task":** abstract only, from a scan.
  - **Pinet, Ziegler & Alario 2016:** abstract only.
- **Primary, datasets, code and manuals:**
  - Licence texts read inside the 136M Keystrokes archive, and on the Zenodo, GitHub and OSF records.
  - Source code of KTouch, Klavaro and GNU Typist.
  - TypingClub's _Typing Jungle_ teacher handbook and Typing.com's teacher guide.
- **Own analysis, marked "own analysis":** I computed Letter-pair times and first-attempt Miss rates from a sample of 3,919 typists in the 136M Keystrokes dataset. Its licence allows non-commercial research use with attribution. The method is in the appendix. No data from it is in this repository beyond the summary numbers quoted here.
- **Weaker, and marked where used:** claims about papers I couldn't open, taken from a paper that cites them; and Typing Pal's help page, which gives no numbers.
- **Not used:** blogs, typing-test sites, and press releases. Some papers were paywalled, or on DTIC, which refused automated requests. They are listed under "What I couldn't find".

**Terms:** this note uses the names in `GLOSSARY.md`: Keystroke, First attempt, Clean hit, Miss, Mix-up, Letter pair, Shift hand, Stage, Sector, Run, Star bar, Typing Time. A source's own word is kept in quotes ("bigram", "digraph", "IKI", "lesson"). Where a source counts its own speeds, "WPM" means its own words per minute; this game's Star bars use gross WPM over Typing Time (`grossWpm` in `src/game/rules.ts`). Each section keeps **what the sources say** apart from **inference** (my reading, marked _Inference_).

**Builds on:**

- [Accuracy and speed benchmarks for beginner touch typists](https://github.com/k-electron/astro-type/blob/main/docs/research/beginner-typing-benchmarks.md) gives the tutors' accuracy bars, how WPM is clocked, and month-long speed goals.
- [What adaptive typing tutors read to choose practice](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md) covers per-key and per-pair timing, Grudin's Mix-up tables and Dhakal's rollover finding.

Neither is repeated here.

---

## Bottom line

1. **For typists in general, a text's speed is mostly predictable from its characters.**
   - The Typability Index explains 68% of the variance between sentences in held-out data, and 88% on a new dataset. Its eight measures come from the text alone: the share of non-space characters that are lower-case letters, total keystrokes, syllables per word, the share of common words, the share of symbols, average Letter-pair frequency, characters in non-words, and right-hand keys.
   - The older 1949 index (syllables per word, keystrokes per word, common words) explains 37% on the same data (Williams et al. 2026).
2. **What makes a text hard changes with skill, and on Letter pairs beginners behave unlike experts.**
   - **Experts:** for fluent typists, two keys on different hands are faster than two on one hand, and the same finger twice is slowest. That is 30–60 ms on typewriters and 5–20 ms on modern keyboards.
   - **The slowest tenth (under about 26 WPM):** alternating hands is 20–28 ms _slower_, and a repeated letter is over 150 ms _faster_ than other pairs (Dhakal et al. 2018).
   - **Learners on a course:** the same pattern holds. A repeated key took about half the time of other keys in van den Bergh et al. (2015).
   - **Why the Typability Index leaves this out:** its authors dropped the hand and finger measures because they reverse between slow and fast typists.
3. **For slow typists, the large costs come from word starts, capitals, punctuation, digits and symbols, not from fingers** _(own analysis, typists at 10–26 WPM)_. Each figure is that typist's time for a Clean hit, against their own median Clean hit:
   - **Word starts:** the first letter of a word takes about **2×** the median.
   - **Space:** the Space that ends a word takes about **0.7×**.
   - **Capitals:** a capital after a space takes about **3.5×**.
   - **Punctuation:** about **2.7–2.9×**.
   - **Shifted symbols:** about **4.5×**.
   - **Digits:** the first digit of a number takes about **3.5–4×**.
   - **Same finger:** two different keys on the same finger cost only **1.05–1.1×**.
   - **Bottom row:** a letter on the bottom row costs **1.07–1.13×**.
   - **Repeats:** a repeated letter is fast, at **0.5–0.7×**.
   - **Fast typists, for contrast:** a repeat is 1.4× and the same finger 1.6×, but a word start only 1.1×.
4. **Plain sentences differ only modestly; mixed texts differ a lot** _(own analysis)_.
   - **How much plain sentences differ:** among short, plain English sentences, a slow typist's time per Keystroke varies by about 8% (one standard deviation, after removing measurement noise).
   - **How well a Letter-pair table predicts it:** a table built from other slow typists predicts that variation with r = 0.51. Because the measured sentence times are noisy, the best any score could reach here is about r = 0.71. So the table captures about half of the real differences. Pair classes alone (word start, repeat, same finger and so on) capture about a fifth.
   - **Mixed text:** once a text mixes in capitals, digits or symbols, those classes dominate, and the differences between texts grow several-fold.
5. **Words matter less than the characters they are made of.**
   - **Shuffled words:** typing speed barely changes when prose is shuffled into random word order (2.8% in a study of 190 typists).
   - **Random letters:** a typist types random letters at half the speed of prose: 27 against 58 WPM in Feit et al., and 326 against 140 ms per Keystroke in older data.
   - **Word length:** it does not change the time per Keystroke in continuous typing (Salthouse 1986).
   - **Words against non-words:** novices type words and non-words at about the same pace. Only with practice do real words get faster, and only a little (van den Bergh et al. 2015).
6. **Published typing-time models are either constant per Keystroke or tuned to skilled typists.**
   - **The keystroke-level model** gives one time per Keystroke for each skill level. It counts Shift as a Keystroke of its own, and puts random letters at 0.5 s, codes at 0.75 s, and someone unfamiliar with the keyboard at 1.2 s per Keystroke (Card, Moran & Newell 1980).
   - **Hiraga et al. (1980):** a linear model of key-pair times from one professional typist. Alternating hands saves 40 ms; within one hand, each row crossed costs 18 ms. It explains about half of what Letter-pair frequency leaves unexplained.
   - **None is tuned to beginners:** I found no published model of typing time or text difficulty built for people learning to touch type.
7. **No tutor I found computes a lesson's speed goal from its text.**
   - **One target for every lesson:**
     - keybr: 35 WPM per key.
     - KTouch: 180 strokes per minute and 98% accuracy.
     - Klavaro: a 10 WPM goal that is only shown; a lesson passes on 95% accuracy.
     - GNU Typist: no speed goal.
   - **A teacher's setting for the whole class:** Typing.com.
   - **Set by hand for each section:** TypingClub's speed goal is 10 WPM for the first 88 lessons. It then rises to 20, 30, 40 and 45 WPM, and drops back to 10–25 WPM in the sections that bring in numbers and symbols.
8. **Of the Letter-pair timing datasets I found, only one licence plainly allows shipping derived tables in this MIT-licensed public repository: KeyRecs (CC BY 4.0, 99 typists).**
   - **Non-commercial only:** 136M Keystrokes ("non-commercial use … with attribution"), How We Type (CC BY-NC 4.0), and the Typability Index's repositories (CC BY-NC-SA 4.0).
   - **No licence at all:** Behmer & Crump's data ("License: TBD"), and Pinet et al.'s OSF project.
   - **A route around datasets:** the coefficients and class-level figures published in papers can be cited. The player's own Logbook needs no licence.

_Inference, in one line:_ fair bars across one step's Stages can be shown with an automated check. Each Stage gets a predicted relative time from beginner-shaped Letter-pair class costs (not skilled ones). Then a step's Stages are held within a narrow band of that score, or each Stage's WPM bars are scaled by it. Drills ("fff jjj fjf") lie outside every dataset, so the simulated beginner and, later, the Logbook have to cover them. See "Implications" at the end.

---

## 1. Letter pairs: what makes one slow

### What the sources say

**Typewriter-era studies of trained typists:**

- **Hand alternation:** "Successive keystrokes from fingers on alternate hands are faster than successive keystrokes from fingers on the same hand … Typists of average ability are generally between 30 and 60 ms faster" (Salthouse 1986, phenomenon 7, citing more than a dozen studies). Larochelle's video analysis is the explanation it gives: the next finger starts moving 32 ms _before_ the last key ends for alternating hands, but 39 ms _after_ it for one hand.
- **Letter-pair frequency:** "Letter pairs that occur more frequently in normal language are typed faster than less frequent pairs" (phenomenon 8). Grudin & Larochelle showed the effect holds even when hand and finger are controlled, by comparing the two orders of the same letters.
- **Context:** a key's time depends on the one or two keys before it (phenomenon 11). Typists of 18–113 WPM were sensitive to "an average of 1.76 characters" of prior context.
- **Times by kind of pair:** Feit et al. 2016 (Table 1) give values for professional touch typists, taken from Salthouse 1984. I couldn't check them in the scan myself.

  | Kind of pair                           | Time per pair |
  | :------------------------------------- | :------------ |
  | Hand alternation                       | 155 ms        |
  | Different fingers of the same hand     | 194 ms        |
  | Same finger                            | 223 ms        |
  | Letter repetition                      | 176 ms        |

- **Skill:** "Digrams typed with two hands or with two different fingers of the same hand exhibit greater changes with skill than do digrams typed with one finger" (phenomenon 23). Across 74 typists, each extra net WPM shortened the interval by:

  | Kind of pair      | ms shorter per extra WPM |
  | :---------------- | :----------------------- |
  | Two hands         | 2.08                     |
  | Two fingers       | 2.38                     |
  | One finger        | 1.91                     |
  | One letter (a repeat) | 0.85                 |

- **Learning:** in Salthouse's 20-hour practice study, "the efficiency of making keystrokes involving overlap of successive finger movements improved more than that for keystrokes with no possibility of overlap" (Salthouse 1986, _Acta Psychologica_, abstract).
- **The size of the alternation gain:** Ostry (1983), with 15 typists of 37–89 WPM, found alternating hands averaged 147 ms against 192 ms for one hand, a 45 ms gap. The gap was "relatively constant over differences in speed".

**Hiraga, Ono & Yamada 1980** (one professional typist, about 294,000 intervals) fitted a linear model. Interval = a + b₀·frequency + b₁·hand + b₂·rows + b₃·finger distance + b₄·row weight + b₅·finger weight, where:

| Term                                                            | Estimate         |
| :-------------------------------------------------------------- | :--------------- |
| a (the constant)                                                | 185.8 ms         |
| b₀, per unit of Letter-pair frequency                           | −0.013 ms        |
| b₁, alternating hands                                           | −40.0 ms         |
| b₂, per row crossed within one hand                             | +18.3 ms         |
| b₃, per column between fingers of one hand                      | −11.0 ms         |
| b₄ and b₅, row and finger weights                               | 0.5 and 1.1 ms   |

They write that alternation "is the dominant factor", that a row change in one hand "causes a slowdown of around 20ms", and that row and finger weights "do not make noticeable contributions". The model "enabled us to explain only half of the residue" left by frequency alone. The rest they put down to context: the pairs before and after.

**Modern keyboards, everyone** (Dhakal et al. 2018, 168,000 typists, Table 3 and "Differences between Hands"):

- **Alternation:** alternating hands is 5–20 ms faster for fast, trained and untrained typists. "Interestingly, slow typists show the opposite effect: hand alternation is ∼20–28 ms slower."
- **Repeats:** "typing the same letter twice is over 150 ms faster for slow typists, while it is 20–40 ms slower for fast typists."
- **The slowest tenth's times:**

  | Kind of pair     | Time   |
  | :--------------- | :----- |
  | Left hand        | 385 ms |
  | Right hand       | 380 ms |
  | Alternating      | 409 ms |
  | Repeated letter  | 231 ms |

- **Left and right:** the left hand is slower than the right by 7–15 ms, which is within their timing precision.

**How We Type** (Feit et al. 2016, 30 typists of 34–79 WPM, motion capture):

- **Kinds of pair:** a touch typist's Letter pairs were 46.5% alternating hands, 35.9% different fingers of one hand, 11.1% the same finger and 6.7% repeats.
- **Times:** alternating hands 151 ms, different fingers of one hand 162 ms, same finger 195 ms, repeats 159 ms.
- **Random letters:** random 6-letter strings were typed at 27 WPM against 58 WPM for sentences. "The percentage loss in performance when typing random strings was found to be smaller for typists of high skill."

**Frequency and skill:**

- **Behmer & Crump (2017)**, 346 online typists:
  - Keystroke times correlate with letter frequency (mean r = −0.41), Letter-pair frequency (−0.28) and three-letter frequency (−0.22).
  - "The fastest typists show the smallest correlations [with letter frequency], and the slowest typists show the largest correlations."
  - Sensitivity to Letter-pair and three-letter frequency grew slightly with skill.
- **Pinet et al. (2022)**, 1,301 students, French AZERTY:
  - "The effect of transition type [one hand or two] was larger for most than least proficient typists. However, the effect of bigram frequency and word length was stronger for least than most proficient typists."
  - They summarise Gentner (1983) and Larochelle (1983) as finding the alternation effect "much more rarely observed in novices". I couldn't read those papers.

**Learners** (van den Bergh et al. 2015):

- **Who:** 1,091,707 Keystroke times from 62 learners on the home-row level of an adaptive touch-typing course. Only correct Keystrokes after a correct one were counted, which is this game's Clean hit.
- **Repeats:** at the end, a repeated key averaged about e^4.59 ≈ 98 ms, against e^5.28 ≈ 197 ms for other keys.
- **The start:** at the very start the average Keystroke was e^6.79 ≈ 885 ms, and repeats were already faster. The authors note the course had "a set of very easy items with many repetitions (such as 'fff,' 'aass,' 'aaasssdddfff')".

### Own analysis: Letter-pair classes by skill (136M Keystrokes sample)

**How to read the table:** each cell is the median, over all Clean-hit pairs in that class, of the pair's time divided by that typist's own median Clean-hit time. The method is in the appendix. The columns are typists who reported using 9–10 fingers on a physical QWERTY keyboard, banded by their measured WPM. Each band's own median Clean hit is 390, 269, 151 and 101 ms. The class is that of the pair that _ends_ on the character, by this game's finger table.

| Pair class (example)                                  | 10–20 WPM (n = 1,306) | 20–26 WPM (n = 1,027) | 45–60 WPM (n = 539) | 78+ WPM (n = 529) |
| :---------------------------------------------------- | :-------------------: | :-------------------: | :-----------------: | :---------------: |
| Alternating hands (`th`)                              |         0.93          |         0.90          |        0.86         |       0.92        |
| One hand, same row, different finger (`as`)           |         0.83          |         0.89          |        0.94         |       0.92        |
| One hand, row change, different finger (`ec`)         |         1.00          |         1.02          |        1.07         |       1.00        |
| Same finger, different key (`ed`)                     |         1.05          |         1.08          |        1.32         |       1.59        |
| Repeated letter (`ll`)                                |       **0.52**        |         0.68          |        1.01         |       1.38        |
| Space after a word                                    |         0.68          |         0.78          |        0.88         |       0.90        |
| First letter of a word (after Space)                  |       **1.98**        |         1.95          |        1.23         |       1.12        |
| Capital inside a word                                 |         2.01          |         2.04          |        1.84         |       1.52        |
| Capital starting a word                               |       **3.48**        |         3.61          |        2.33         |       2.02        |
| Digit starting a number                               |         3.52          |         4.08          |        4.26         |       2.43        |
| Digit after a digit                                   |         0.83          |         1.03          |        1.27         |       1.33        |
| Punctuation (`, . ' ;`)                               |         2.71          |         2.91          |        1.78         |       1.42        |
| Shifted symbol (`! ? :`)                              |         4.51          |         4.49          |        3.48         |       2.31        |

Letter-to-letter pairs by the second key's row (alternating or one-hand, different finger):

| Band       | Top row | Home row | Bottom row |
| :--------- | :-----: | :------: | :--------: |
| 10–20 WPM  |  0.92   |   0.89   |    1.13    |
| 20–26 WPM  |  0.91   |   0.92   |    1.07    |
| 78+ WPM    |  0.92   |   0.96   |    0.98    |

**Caveats:**

- **Not beginners:** these are adults typing ordinary sentences with their own technique. Even the slowest band types 16 WPM on average, and few of them are touch typists in training.
- **Rare classes are thin:** the sentences had at most four digits and only simple punctuation, so digit counts are small (a few hundred pairs at most). The digit rows are rough.
- **Word starts:** the "first letter of a word" cost includes reading the next word.

### Inference

- **A skilled-typist model ranks beginner texts wrongly.** For a 16 WPM typist, the finger-level effects that dominate the classic literature are small: alternation 0.93, same finger 1.05, row change 1.00. Two effects are large: repeats are fast (0.52), and every word boundary is slow (0.68 for the Space plus 1.98 for the next letter, 2.66 in all, against 2.0 for two median Keystrokes). A model built from fluent typists (Hiraga's −40 ms for alternation, or the Typability Index's sentence-level fit) would rate an alternating drill (`fjfj`) as easy and a repeat drill (`ffjj`) as hard. For beginners it is the other way round.
- **The beginner's analogue of letter frequency is how practised a key is.** Slow typists are most sensitive to how common a letter is (Behmer & Crump), and the fluent typist's familiarity comes from frequency in language. A player in this game has had different amounts of practice on each key, set by the curriculum's order. So "this key arrived two steps ago" should weigh like "this letter is rare". No source measures this directly. keybr's design assumes it: a new letter starts slow and the lesson focuses on it (see [What adaptive typing tutors read](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md), section 1).
- **Bottom-row letters and the same finger are the finger-level effects worth keeping for beginners,** each about 5–13%. They are smaller than word starts or capitals, but they are what separates two plain-letter Stages of one step.

---

## 2. Words, capitals, numbers and symbols

### What the sources say

- **Word length:** "There is no systematic effect of word length on either the interkey interval between the space and the first letter … or on the interkey interval between letters within the word" in continuous typing (Salthouse 1986, phenomenon 9). Ostry (1983) did find an "inverted U" within a word, with Keystrokes slowest around the fourth letter. The slowing in mid-word was about 75 ms for slow typists and 20 ms for fast ones. Pinet et al. (2022) found longer words slower, more so for the least proficient typists.
- **Word starts:** "The first keystroke in a word in normal continuous typing is generally slower than subsequent keystrokes in the word … approximately 20% longer" (Salthouse 1986, phenomenon 10). It persists when the typist doesn't press Space, so it comes from the word, not the thumb. Ostry measured a word-final Space at 186 ms, faster than letters within the word, with no change by word length.
- **Shuffled words against prose:** "The rate of typing is nearly the same for random words as it is for meaningful text." In West & Sabban's study of 190 typists of 10–114 WPM, "the mean gain for meaningful text over randomly arranged words was only 2.8%", with "little or no relation" to skill (phenomenon 4, as Salthouse reports it).
- **Random letters:** "the average interkey interval … increases as the to-be-typed material becomes less structured or more random", even with Letter-pair frequency controlled (phenomenon 5). Feit et al. list 140 ms for easy prose against 326 ms for random strings, citing Shaffer & Hardwick 1968.
- **Words against non-words for learners:** "Novice typists type words and non-words at the same pace" (van den Bergh et al. 2015, citing Fendrick 1937, Shaffer & Hardwick 1968, and Gentner, Larochelle & Grudin 1988). In their own data, the advantage of words appeared only with practice, and stayed small (an effect size of at most d = 0.20).
- **Word frequency and syllables:** in the Typability Index, syllables per word (β = −0.30) and the share of words among the 1,000 most common (β = +0.27) are the third and fourth strongest predictors. In typing to dictation, "Lexical frequency improved response latencies and accuracy, while bigram frequency speeded up IKIs", and "IKIs were also longer at syllable boundaries" (Pinet, Ziegler & Alario 2016, abstract).
- **Capitals:**
  - In the keystroke-level model, "Pressing the SHIFT or CONTROL key counts as a separate K operation" (Card, Moran & Newell 1980, Fig. 1).
  - In the Typability Index, the share of non-space characters that are lower-case letters is the strongest single predictor (β = +0.53). The share of capitals was a candidate but wasn't kept separately.
  - Behmer & Crump left capitals out of their analysis because "the shift key … produces much slower typing times than keystrokes for lowercase letters".
- **Numbers and symbols:**
  - **Keystroke-level model:** keying times run from 0.20 s for an "average skilled typist (55 wpm)", through 0.50 s for "typing random letters", to 0.75 s for "typing complex codes".
  - **Typability Index:** the share of symbols is a strong negative predictor (β = −0.22).
  - **TypingClub:** its handbook warns that with symbols "accuracy and WPM might dip".

### Inference

- **Count word boundaries, capitals and non-letters before anything finer.** For slow typists they are the biggest per-character costs (section 1), and they vary most between Stage texts. A drill line like `f j f j` is 76% boundary pairs (Sector 1, Stage 1). The pangrams of Sector 3, Stage 4 are 38%. Short words mean more word starts.
- **Real words help fluent typists more than beginners.** For a beginner, a Stage of real words and one of made-up words of the same keys should play about the same. The gap grows as the player gets better. That supports P8's "words build the fluency" as a reason for real words, not as a difficulty adjustment.

---

## 3. Accuracy: which characters draw a Miss

### What the sources say

- **Substitution errors:** many involve adjacent keys or the mirror finger (Salthouse 1986, phenomenon 19; Grudin's tables are in the earlier note).
- **Omissions:** "characters involving the little finger of each hand have a much greater likelihood of being omitted than characters struck by the index finger" (Salthouse 1986, phenomenon 21 and Fig. 4).
- **Word starts:** "the first keystroke in a word has a higher probability of several types of error" (Salthouse 1986, citing MacNeilage 1964).

### Own analysis: first-attempt Miss rate by class (136M Keystrokes sample)

**How to read the table:** each row is the share of First attempts that were Misses, as a multiple of the band's overall Miss rate (6.3% at 10–20 WPM, 5.3% at 20–26, 3.4% at 45–60, 2.8% at 78+). An attempt was counted only when everything before it had been typed right.

| Character class                          | 10–20 WPM | 20–26 WPM | 78+ WPM |
| :--------------------------------------- | :-------: | :-------: | :-----: |
| Alternating hands                        |   1.09    |   1.10    |  0.93   |
| Same finger                              |   1.24    |   1.21    |  1.20   |
| Repeated letter                          |   0.40    |   0.52    |  1.00   |
| Space after a word                       |   0.23    |   0.25    |  0.40   |
| First letter of a word                   |   0.96    |   1.03    |  1.23   |
| Capital (inside or starting a word)      |  3.0–3.5  |  3.4–3.7  | 3.0–3.6 |
| Punctuation                              |   3.33    |   2.98    |  1.42   |
| Shifted symbol                           |   4.39    |   4.05    |  2.35   |

**Lower-case letters by key, 10–20 WPM:** the highest Miss rates were `x` (15.3%), `q` (12.7%), `v`/`b` (10.7%), `k` (10.0%) and `y`/`u` (9.9%). The lowest were `a` (4.5%) and `h`/`j` (4.8%).

**Caveat:** the study let typists leave errors in, and many didn't bother with capitals or punctuation. So the capital and punctuation rates include deliberate shortcuts, and are upper bounds for a game that requires every character.

### Inference

- **Text composition moves accuracy as well as speed.** Every Star bar has an accuracy floor (90 / 95 / 98% First attempts). With Stages of about 100 characters, one Miss is about one point. A Stage with five capitals and five punctuation marks can expect about 1.3–1.5 more Misses from a slow typist than an all-lower-case one of the same length (10 characters at about 19–22% each, instead of the base 6%). That is enough to cost a Star at the 98% bar.
- **Repeats and Spaces make a text both faster and more accurate for beginners.** Drill-heavy texts are therefore doubly easier, and they need either stricter bars or a different step.

---

## 4. Models of typing time and of text difficulty

### What the sources say

| Model                                                       | What it predicts                                       | Inputs                                                                                                                                                                                              | Fit and scope                                                                                                                                                                                                              |
| :---------------------------------------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keystroke-level model** (Card, Moran & Newell 1980)       | Task time = Keystrokes × one time per Keystroke        | The typist's skill class (0.08–1.20 s per Keystroke); Shift counts as a Keystroke                                                                                                                   | A constant per Keystroke, by design: "keying time is different for different keys … We accept both these approximations in the interest of simplicity". Users "differ in their typing rates by as much as a factor of 15" |
| **Hiraga et al. 1980**                                      | Interval for each key pair                             | Letter-pair frequency, hand alternation, rows crossed, finger distance, row and finger weights                                                                                                      | One professional typist; explained about half the residue left by frequency; the rest is context                                                                                                                          |
| **Salthouse 1986**                                          | Not a formula: 29 phenomena any model must explain     | –                                                                                                                                                                                                   | The checklist used by later models                                                                                                                                                                                         |
| **Rumelhart & Norman 1982; John 1996 (TYPIST); Wu & Liu 2008** | Simulations of skilled typing                       | Finger and hand movement rules                                                                                                                                                                      | Skilled typists only. Not read; described in Feit et al. 2016 and Salthouse 1986                                                                                                                                           |
| **Bell 1949 Difficulty Index**                              | A passage's difficulty                                 | Syllables per word, keystrokes per word, % common words                                                                                                                                             | Refitted on the 136M data: R² = 0.37 (Williams et al. 2026). Not read                                                                                                                                                      |
| **Typability Index** (Williams et al. 2026)                 | A sentence's speed relative to the typist's own average | Share of lower-case letters among non-space characters, total keystrokes, syllables per word, share of top-1,000 words, share of symbols, mean Letter-pair frequency, characters in non-words, share of right-hand keys | R² = 0.74 in training, 0.68 on held-out sentences, 0.88 on a new set of 15 film quotes. Fitted across 4–158 WPM; "not been tailored for any specific typing skill level"                                                     |

**The Typability Index in more detail:**

- **The equation:** its coefficients are in the paper's Table 3 (CC BY 4.0). For example, B = 4.694 for the share of lower-case letters, −0.012 per keystroke, −0.431 per syllable per word, and −4.037 for the share of symbols. The intercept is −4.022.
- **What it measures:** its outcome is each sentence's speed as a z-score within each typist, averaged over the 1,488–1,809 typists who typed that sentence.
- **What it dropped:** the authors expected hand and finger measures to matter, but dropped them: "the relationship between the bigram types is not stable across skill level. That is, slower typists are typically faster at bigrams that constitute character repetitions than hand alternations, whereas this pattern is reversed in faster typists".
- **Text length:** "the text unit of the dataset is sentences rather than paragraphs or single words".
- **Suggested uses:** "For typing course developers, it allows for a progressive difficulty approach", and in tests "it ensures fairness by controlling for text difficulty".

### Inference

- **Use the Typability Index for fluent-typist content, not for drills.** It fits the later steps (fluency, capitals in sentences, numbers in context), where Stages are sentence-like. For early steps, its strongest term (share of lower-case letters) is 100% on every Stage, and its word and syllable terms don't apply to drills.
- **Its inputs need replacing before it can run here.** The coefficients can be cited from the CC BY paper. But the word list (Corpus of Contemporary American English top 1,000), the Letter-pair frequencies (Behmer & Crump, no licence) and the dictionaries would have to be swapped for openly licensed ones. That changes the numbers, so it would need re-checking.
- **No published model fits a beginner on a touch-typing course.** The closest thing to a beginner model is a class-cost table like section 1's, from slow typists, with van den Bergh's learner data as a check on the repeat effect.

---

## 5. How much texts of one kind differ

### Own analysis

- **What was compared:** the 136M sentences are plain English, at most 70 characters, with at most four digits and simple punctuation. For each sentence, the measure was the mean Clean-hit time relative to each typist's own median, averaged over typists.

| Band       | Sentences | Between-sentence SD, after removing noise | Letter-pair table, r | Pair classes only, r | Best r possible |
| :--------- | :-------: | :---------------------------------------: | :------------------: | :------------------: | :-------------: |
| 10–26 WPM  |   1,411   |             about 8% of the mean           |         0.51         |         0.30         |   about 0.71    |
| 78+ WPM    |    283    |             about 8% of the mean           |         0.46         |         0.32         |   about 0.77    |

- **How the score was built:** a per-pair table came from half the typists in the same band, and predicted the other half's sentence times. Pairs seen fewer than 20 times fell back to their class's mean.
- **The best r possible:** with only about 10 typists per sentence, the measured times are noisy. The split-half reliability was 0.50 for the slow band and 0.60 for the fast band (Spearman–Brown), so no score can correlate above about 0.71 and 0.77.
- **What that means:** corrected for that noise, the Letter-pair table predicts about half of the real differences between plain sentences for slow typists. Pair classes alone predict about a fifth.

### Inference

- **Plain-English Stages of one step should differ by only a few WPM.** An 8% SD means two plain-English Stages of the same length are usually within about ±1–2 WPM of each other for a 15–20 WPM player, before Misses. A table-based score can sort them into bands, but can't place a bar to the WPM.
- **Most of the unfairness comes from mixing kinds of text inside one step.** For example, one Stage of the step is a drill line and another is sentences, or one has commas and capitals and another doesn't. Composition rules (section 2) remove most of that. The score then cleans up what is left.

---

## 6. How tutors set a speed goal for each lesson

### What the sources say

| Tutor                     | Speed goal per lesson                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **keybr**                 | One target for every key, 35 WPM by default, measured as each key's own time (see the [benchmarks note](https://github.com/k-electron/astro-type/blob/main/docs/research/beginner-typing-benchmarks.md), section 2). A rare or hard key must reach the same speed as `e`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **KTouch** (KDE)          | One rule for every lesson: "The minimum required amount of strokes per minute to unlock the next lesson", default **180** (36 WPM), and "The minimum required typing accuracy in percent", default **98** ([`ktouch.kcfg`](https://github.com/KDE/ktouch/blob/master/src/ktouch.kcfg)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Klavaro**               | A goal for each exercise type, the same for all its lessons: basic course 95% accuracy and 10 WPM; adaptability 98% and 10; velocity 95% and 50; fluidness 97%, 50 WPM and fluidity 70 ([`tutor.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/tutor.c), `tutor_init_goals`). A basic lesson passes on accuracy alone: `if (accuracy < tutor_goal_accuracy ())` repeats it, and otherwise `basic_set_lesson (basic.lesson + 1)` ([`basic.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/basic.c), `basic_comment`). The speed goal is only coloured green or red on the result.                                                                                                                                                                                                                                                                                                                                     |
| **GNU Typist**            | No speed goal; only an error limit per drill ([manual](https://github.com/alexei-matveev/gtypist/blob/master/doc/gtypist.texi)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Typing.com**            | One setting per class: "Set the requirements for Screen Completion (speed and accuracy) and for earning Stars" ([Teacher Guide](https://www.typing.com/resources/learn-to-type/typing-com-teacher-guide.pdf), p. 13).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **TypingClub** (_Typing Jungle_) | A minimum and a goal, set per run of lessons ([teacher handbook](https://login.typingclub.com/m/edclubdocs/media/pdf/typing-jungle-handbook.pdf), pp. 14–21). Lessons 1–88 (home, top and bottom rows): minimum 3, goal 10 WPM. Lessons 89–191: goals of 10–20. Lessons 192–233: goals of 20 and 21–30. Lessons 234–274 (numbers): goals of 25 and **10–25**. Lessons 275–316: goals of 29 and 31–40. Lessons 317–357 (symbols): goals of **10–25** and 30. Lessons 358–418 (more symbols, advanced texts): goals of 41–45 and **10–20**. The handbook's layout doesn't let me tell for certain which range belongs to which named section on each page. The low ranges sit on the pages that introduce numbers and symbols. |
| **Mavis Beacon**          | No speed goal until every key has been introduced (see the [Mavis Beacon note](https://github.com/k-electron/astro-type/blob/research/mavis-beacon/docs/research/mavis-beacon.md), section 7).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Typing Pal** _(weaker)_ | "Typing Pal will automatically adjust the target for each exercise to give you reasonable challenges as you learn" ([help](https://www.taptouche.com/en/documentation/home-edition/guide/training/targets)). How it adjusts isn't published.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Inference

- **Tutors make speed goals fair by structure, not by formula.** Uniform goals ignore text difficulty, and so does keybr's goal per key. TypingClub sets goals by hand for runs of lessons, and drops the goal back when new keys arrive (numbers, symbols). Mavis Beacon and Klavaro keep speed out of passing while keys are being learned.
- **None of them could show fairness without play.** This game's goal (an automated check per Stage) has no precedent among the tutors I read. The closest precedent is the testing tradition: Bell's 1949 index and the Typability Index were built to make timed writings comparable.

---

## 7. Datasets of Letter-pair times, and their licences

| Dataset                                                                                                                                         | What it holds                                                                                                              | Licence, quoted                                                                                                                                                                                                    | Could derived tables ship in this MIT-licensed public repo?                                                                                                                                            |
| :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **136M Keystrokes** (Dhakal et al. 2018; [page](https://userinterfaces.aalto.fi/136Mkeystrokes/))                                               | Every key press and release of 168,000+ typists, 15 English sentences each, with WPM, fingers used and keyboard. 1.4 GB zipped | `readme.txt` inside the archive: "You are free to use this data for non-commercial use in your own research or projects with attribution to the authors." The page: "free to use for research and non-commercial use with attribution". No redistribution terms. (The test's _code_ is MIT, `LICENSE`, © Samuli De Pascale.) | **Not cleanly.** The game is non-commercial today, but MIT lets anyone reuse the repository commercially, so data under "non-commercial" terms would carry a restriction the repo's licence doesn't. It could ship with its own notice, or with the authors' permission (contact: Antti Oulasvirta, per the readme). |
| **How We Type** (Feit et al. 2016; [Zenodo 4034268](https://zenodo.org/records/4034268))                                                       | Key presses with the finger that pressed each key, motion capture and eye tracking; 30 typists; English or Finnish          | **CC BY-NC 4.0**: "The dataset is free for non-commercial use"                                                                                                                                                        | No, for the same reason.                                                                                                                                                                               |
| **Typability Index repositories** ([analysis](https://github.com/EA-Williams/The-Typability-Index), [web app](https://github.com/EA-Williams/The-Typability-Index-Web-App)) | Cleaned 136M files, the 98-typist generalisation set, code, per-sentence scores                                            | **CC BY-NC-SA 4.0**, "to comply with the stipulation of the 136M Keystrokes Dataset". The _paper_ is CC BY 4.0                                                                                                        | The repositories, no. The paper's coefficients and figures can be cited with attribution.                                                                                                              |
| **Behmer & Crump** ([EntropyTyping](https://github.com/CrumpLab/EntropyTyping))                                                                  | About 346 typists' Keystroke times on English paragraphs, with Letter-pair frequencies from Project Gutenberg               | `DESCRIPTION`: "License: TBD"; the repository has no licence                                                                                                                                                          | No: no licence means no permission.                                                                                                                                                                    |
| **Pinet et al. 2022** ([OSF v92fy](https://osf.io/v92fy/))                                                                                       | 1,301 students; French AZERTY                                                                                              | Public project, `node_license: null`                                                                                                                                                                                  | No; also the wrong layout and language.                                                                                                                                                                |
| **KeyRecs** (Dias et al. 2023; [Zenodo 7886743](https://zenodo.org/records/7886743))                                                             | Times between key presses and releases for every pair, from 99 typists transcribing 10 English passages, plus a password task | **CC BY 4.0**                                                                                                                                                                                                         | **Yes, with attribution.** But it is small, the typists' skill and keyboard layouts aren't recorded, and they come from 20 nationalities.                                                              |

### Inference

- **The licence question bites only if a table ships.** The cheapest path ships no table. Use **class-level costs** (about 15 numbers, from section 1 and from published papers), cite where they come from, and later replace them with the player's **own Logbook**, which already keeps Letter pairs (P10, P11). Whether citing a handful of summary numbers counts as "derived data" under the 136M licence is a judgement for the owner, and this note isn't legal advice.
- **A per-pair table** would need KeyRecs, or written permission from the 136M authors.

---

## 8. Today's Stages, through slow-typist class costs (illustration only)

Each Stage text in `src/curriculum/curriculum.ts` (at `43c0cc0`) was scored as the mean of its Letter pairs' class costs for the 10–20 WPM band. The costs are from section 1's pooled ratios; classes with under 100 pairs count as 1.0. A higher score means slower per Keystroke.

| Sector | Stages' scores (1 → 4)          | Stages' 2-Star WPM bars | What drives the score                                    |
| :----: | :------------------------------ | :---------------------- | :------------------------------------------------------- |
|   1    | 1.18, 1.28, 1.15, 1.08          | 10, 11, 12, 13          | Drill lines with a Space every one or two letters       |
|   2    | 1.11, 1.12, 1.11, 1.09          | 13, 14, 15, 16          | Even                                                     |
|   3    | 1.29, 1.20, 1.21, 1.15          | 15, 16, 17, 18          | Commas and full stops in Stages 1–3                      |
|   4    | 1.04, 1.12, 1.01, 1.10          | 18, 18, 19, 20          | Long words (Stage 3) against very short ones (Stage 2)  |
|   5    | 1.42, 1.38, 1.29, 1.21          | 15, 16, 17, 18          | Numbers start after nearly every Space                   |
|   6    | 1.22, 1.37, 1.42, 1.51          | 16, 17, 18, 18          | Capitals, quotes and code symbols                        |
|   7    | 1.20, 1.10, 1.12, 1.21          | 20, 22, 23, 25          | Punctuation and capitals in Stages 1 and 4               |

### Inference

- **Within a Sector, the predicted per-Keystroke cost already moves by 5–25%,** and not always in step with the bars. In Sector 6, the bars rise 16 → 18 WPM while the predicted cost rises about 24%. In Sector 1, Stage 2 is predicted the slowest, but its bar is the second lowest.
- **This is only an illustration.** Sector 1's drill lines are outside the data (section 9), and the scores ignore how new each key is. Its point is that a check like this is cheap to run on every Stage and would flag these cases automatically.

---

## Implications for fair Star bars (inputs, not decisions)

These are inputs for the fairness, library and generator tickets. None of them changes a rule.

1. **Give every Stage a predicted relative time,** computed from its text alone:
   - beginner-shaped class costs: word starts, Spaces, repeats, capitals with Shift, punctuation, digits, shifted symbols, same finger, bottom row;
   - a cost for keys new to the step (the beginner's analogue of letter frequency);
   - a Miss-proneness score from the same classes, for the accuracy bars.

   The check over the library, and over samples of generated Stages, is then: every Stage of a step falls within a band of the step's median score. Section 5's 8% between-sentence spread suggests about ±5% as a starting band.
2. **Control the text's make-up, as the testing tradition did.** Per step, fix the ranges of:
   - length;
   - the share of word boundaries (or average word length);
   - repeats;
   - capitals;
   - punctuation, digits and symbols;
   - keys new to the step.

   This is the job Bell's "controlled copy" and TypingClub's sections do. It removes most of the unfairness before any score is needed.
3. **Or scale each Stage's WPM bars by its score.** If a step's texts must differ in make-up, each Stage's WPM bar = the step's bar × the step's median score ÷ the Stage's score. This keeps "same skill, same Stars" without forcing identical texts. It is a design choice; P2's accuracy floors stay as they are.
4. **The simulated beginner must be beginner-shaped.**
   - **Its timing:** if it times every Keystroke the same, or uses skilled-typist costs, it will call drills hard that are easy, and miss the cost of word starts and Shift. Its Keystroke times should follow the slow-typist class costs above. Repeats are fast; alternation has no advantage; word starts and capitals are slow.
   - **Its Misses:** they should follow the class Miss rates and Grudin's neighbour and mirror Mix-ups.
   - **How to validate it:** it should reproduce section 1's ratios on the 136M sentences before it is trusted on Stages.
5. **Calibrate from the Logbook once there is play.** The Logbook already keeps the player's Letter-pair times and Misses. Comparing each Stage's predicted score with players' actual Runs is the long-run fairness check, and it needs no third-party data.
6. **Short Stages make accuracy, not speed, the fragile bar.** On a 100-character Stage, two extra capitals can cost a 98% Star. Keeping Miss-prone characters even across a step matters as much as keeping speed even.

## Questions this leaves for the decision tickets

- **Band or scale:** are a step's Stages held to a band of predicted difficulty (composition rules plus a score check), or does each Stage carry its own bars scaled by its score? Scaling makes the per-Stage WPM bars the generator's output rather than the author's.
- **The cost table:** ship class-level costs only (about 15 numbers, cited), or seek a per-pair table (KeyRecs under CC BY, or permission for 136M)? And when do the player's own Logbook numbers take over?
- **New keys:** how much extra cost does a key new to the step carry, and for how long? No source measures this for touch-typing learners. It needs the simulated beginner, then the Logbook.
- **Drills:** drill lines like `fjf jfj` are outside every dataset. Are they scored with the same class costs, judged separately, or kept out of the Star bar comparison, as Mavis Beacon and Klavaro keep speed out of early lessons?
- **The tolerance:** how wide a band counts as "fair"? About ±5% of predicted time is about ±1 WPM at 15–20 WPM, which is smaller than Run-to-Run noise. Is that the right yardstick?

---

## What I couldn't find

- **A model of text difficulty for touch-typing learners.** Every model and dataset is of people with an established technique. van den Bergh et al. is the only large learner dataset, and it covers only the home row, isn't released, and doesn't report Letter-pair classes beyond repeats.
- **Drill text at scale:** no dataset has beginners typing drill lines (`fff jjj fjf`), so their difficulty can't be predicted from data.
- **Papers I couldn't open:**
  - Gentner 1983 (both the _Acta Psychologica_ paper on acquiring typing skill and the book chapter on timing).
  - Grudin & Larochelle 1982 on digraph frequency.
  - John 1996 (TYPIST).
  - Wu & Liu 2008.
  - Ulrich, Lindsey & Logan 2016 on Fitts' and Hick's laws in typing.
  - Bell 1949 and West 1957.

  They are paywalled, or on DTIC, which refused automated requests. Where cited, it is through a paper that cites them.
- **Salthouse 1984 in full:** the scan has no text layer, so its figures here are as Salthouse 1986 and Feit et al. 2016 report them.
- **How Typing Pal adjusts each exercise's target,** and TypingClub's goals for each lesson (the handbook gives ranges only).
- **Reach distance as its own effect:** the Typability Index tried distance from the home row and didn't keep it. Hiraga's row term is the only direct figure. In my own analysis the bottom row cost 7–13% for slow typists, and the top row nothing.

---

## Appendix: method of the own analysis

- **Data:** 136M Keystrokes ([Dhakal et al. 2018](https://userinterfaces.aalto.fi/136Mkeystrokes/)), used for non-commercial research with attribution.
- **Who was sampled:** typists who reported a QWERTY layout, a full or laptop keyboard, and 9–10 fingers. I drew a seeded random sample by measured speed (`AVG_WPM_15`):
  - 1,519 at 10–20 WPM;
  - 1,200 at 20–26 WPM;
  - 600 at 45–60 WPM;
  - 600 at 78+ WPM.

  Typists with at least 100 Clean-hit pairs were kept: 1,306, 1,027, 539 and 529.
- **Text simulation:** each sentence's Keystrokes were replayed with Backspace. Shift and other modifiers aren't Keystrokes; a capital's interval runs from the previous character's press to the capital's press, so it includes Shift, as in this game.
- **First attempt:** the first character typed at a position, when all earlier characters were right.
- **Clean-hit pair:** two First-attempt hits in a row with no Backspace between. Intervals over 5,000 ms were dropped, as Dhakal et al. did. This gave 1,347,189 pairs.
- **Classes:** taken from the pair that ends on the character, using this game's finger table (`src/curriculum/keyboardLayout.ts`). In order of precedence:
  1. Space after a word.
  2. Capital or digit starting a word.
  3. First letter of a word.
  4. Capital.
  5. Digit (after a digit or not).
  6. Shifted symbol.
  7. Punctuation.
  8. A letter after a non-letter.
  9. Repeat.
  10. Same finger.
  11. One hand with or without a row change.
  12. Alternating hands.
- **Ratios:** each pair's time was divided by its typist's median Clean-hit time. The tables report the median ratio over all pairs in a class.
- **Sentence prediction:** typists were split into halves by a hash of their id. One half's mean ratio for each Letter pair (n ≥ 20, otherwise its class mean) predicted the other half's sentence means. Observed reliability is the split-half correlation within the second half, corrected with Spearman–Brown.
- **The scripts** were run outside the repository and aren't committed; the description above is enough to repeat them.
