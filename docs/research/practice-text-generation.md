# Generating practice text from allowed keys

Research for [Generating practice text from allowed keys](https://github.com/k-electron/astro-type/issues/177), under the map [Phase 3: a curriculum that teaches, with practice that fits the player](https://github.com/k-electron/astro-type/issues/175). Written 2026-11-26.

**Question:** how can practice text be built from a set of allowed keys, both ahead of time for the Stage library and from a seed for reinforcement loops? That covers English word-frequency lists and their licences; how many real words each growing key set can spell; how keybr, Monkeytype, Klavaro, TIPP10 and GNU Typist build text from allowed keys; drills, patterns and weighting toward target keys; seeded random numbers that give the same output in every browser; and offensive-word blocklists, their licences, and how to keep pseudo-words from spelling something offensive.

**How much to trust each source:**

- **Primary, read in the source code:** keybr.com, Monkeytype, Klavaro, TIPP10 and GNU Typist. Code is quoted from each project's repository as it stood on 2026-11-26, pinned to a commit where the host allows it. TIPP10 is read from its official GitLab repository ([gitlab.com/tipp10/tipp10](https://gitlab.com/tipp10/tipp10)), which [What adaptive typing tutors read to choose practice](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md) couldn't find. GNU Typist is read from a GitHub mirror, because the GNU site refuses automated requests.
- **Primary, dataset pages and licence texts:** the wordfreq README, Peter Norvig's n-gram page, the google-10000-english licence, the Linguistic Data Consortium's Web 1T licence agreement, SCOWL and ESDB's README and Copyright files, the 12dicts readme, the FrequencyWords README, the NGSL and SUBTLEX-US pages, the blocklists' READMEs and source, and the Creative Commons BY-SA 4.0 legal code.
- **Primary, specifications and libraries:** the ECMAScript 2025 specification, the xoshiro reference code with Blackman & Vigna (2021), RFC 9923 (FNV hashing), and the seedrandom and pure-rand READMEs.
- **Papers:** Crump, Lai & Brosowsky (2019), read in full from the authors' own draft. Behmer & Crump (2017) and Shaffer & Hardwick (1968) appear only as Crump et al. report them; I couldn't read either, so they are **weaker**, and marked where used.
- **My own counts:** small throwaway scripts in my scratch space, not committed. Section 2 says exactly how I counted. They are measurements of word lists, not of players.
- **Not used:** blogs, gists (such as the popular "mulberry32" PRNG, which lives only in a gist), the "google-profanity-words" list (it claims a Google origin I couldn't trace), and the Leipzig Corpora terms (the page refused automated requests).
- **Not legal advice.** The licence findings say what each licence text says. Whether a plain list of words is protected at all is a legal question I don't try to answer; the findings assume each licence means what it says.

**Terms:** this note uses the names in `GLOSSARY.md` (Stage, Sector, Run, Keystroke, First attempt, Mix-up, Letter pair, Star bar). A source's own word ("lesson", "drill", "focus letter") is kept when quoting it. Each section keeps **what the sources say** apart from **inference** (my reading, marked _Inference_). Figures about astro-type itself come from this repo at commit `43c0cc0`. This note doesn't repeat what [Accuracy and speed benchmarks for beginner touch typists](beginner-typing-benchmarks.md) and [What adaptive typing tutors read to choose practice](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md) already establish; it cites them.

**A note on wording:** this note never prints an offensive word. Where a finding depends on one, it describes it ("a three-letter swear word that every list flags").

---

## Bottom line

These are inputs for the decision tickets, not decisions.

1. **Real words are scarce until the top row is under way.** Of the 10,000 most common English words (section 2 says which list), F and J spell none, and F, J, D and K spell none. The whole home row spells 42, about 30 of which read as ordinary words; with "a" they make up about 4% of running English, and "a" alone is 2.3%. Adding E and I brings 245 words, R and U 546, T and Y 1,227, and the full top row 2,613. Today's key order reaches about a thousand common words after its 7th Stage. TIPP10's frequency-first order (E O, T I, N R, H C after the home row) gets there after its 4th lesson.
2. **Tutors build text from allowed keys in three ways.**
   - **Hand-written lists, filtered to learned keys:** TIPP10 and GNU Typist. In TIPP10's first five English lessons, every word uses only learned keys and every word holds one of the new keys (I checked all 567).
   - **A dictionary filtered by the allowed keys, each word holding a required letter:** keybr's "natural words" and Monkeytype's word filter.
   - **Generated strings:** random letters (Klavaro's basic course), consonant-vowel pseudo-words (Klavaro's adaptive exercise), and pseudo-words from a letter-level Markov model trained on real words (keybr, Monkeytype's "pseudolang"). keybr mixes the last two kinds: real words first, topped up with pseudo-words when fewer than 15 real words fit the keys.
3. **Weighting toward the target keys** happens in four ways:
   - every word holds the focus key (keybr, TIPP10);
   - letters are drawn in proportion to their errors or slowness (Klavaro);
   - the next word is the highest-scoring, meaning slowest and most error-prone, of 20 random words (Monkeytype's weak spot);
   - TIPP10 sorts its pre-written texts by how often they hold the player's four most error-prone characters, and does so on every second text.

   Drills follow a set shape in the old tutors: anchored reaches (`frf juj`, `dedc kik,`), then every pair of the new keys (`as al ad ak`), then words and sentences (GNU Typist).
4. **No English frequency list is both fine-grained and permissively licensed.**
   - **Shippable under a permissive notice:** SCOWL and ESDB (MIT-like). They can tell a real word from a non-word, and they sort words into coarse commonness sizes (10, 20, 35 and so on). 12dicts is public domain, apart from MIT-like notices (AGID's and WordNet's) on its frequency-banded lists.
   - **Shippable with attribution and share-alike:** wordfreq's data, FrequencyWords and the NGSL (all CC BY-SA 4.0). wordfreq's author asks people not to convert its data into a plain list.
   - **Not shippable:** Norvig's `count_1w.txt` and google-10000-english (derived from Google's Web 1T corpus, whose licence forbids redistribution), SUBTLEX-US (no licence stated), and every tutor's word lists and lesson texts (keybr is AGPL-3.0, Monkeytype GPL-3.0, TIPP10 GPL-2.0, Klavaro and GNU Typist GPL-3.0 or later).
5. **Seeded randomness is easy to get the same in every browser, if only integer arithmetic is used.**
   - `Math.random` can't be seeded, and its algorithm is left to each engine.
   - Integer operations (`Math.imul`, `>>>`, `^`) and IEEE double `+ - * /` are exactly specified, so a small integer PRNG gives the same numbers everywhere. Two candidates: xoshiro128++ (public domain) or pure-rand (MIT).
   - `Math.exp`, `Math.log`, `Math.pow` and `Math.sin` are only "implementation-approximated". keybr's pseudo-word generator calls `Math.pow` and Monkeytype's word picker calls `Math.exp`, so neither is a safe model to copy as it is.
   - `localeCompare` is locale-dependent; a sort is only reproducible with a consistent comparator.
6. **Generated text needs an offensive-word check; real-word lists need one too.**
   - **Real words:** 39 of the 10,000 most common words are on LDNOOBW's list, and one of them is a home-row word.
   - **Generated pseudo-words:** in my keybr-style sample, between 0% and 1.1% of generated words were flagged, depending on the step. At the T and Y step, about one generated Stage of 30 words in five would hold one.
   - **What the tutors do:** keybr checks its pseudo-words against a 525-word exact list, but not its natural words. Monkeytype's pseudolang has no check.
   - **Exact match isn't enough:** it misses invented words that contain a swear word. Plain substring matching flags innocent words. obscenity (MIT) solves this with whitelisted terms and matching that sees through spelling tricks.
   - **Blocklist licences:** LDNOOBW is CC BY 4.0; dsojevic/profanity-list (MIT) adds severities, tags and exceptions; cuss (MIT) rates how likely a word is profane, and its README says not to build a filter from it.
7. **The research doesn't say which practice text teaches beginners best.**
   - **What is known:** typists type natural text much faster than random letter strings, and slow typists lean on single-letter frequency more than fast typists, who lean on Letter pairs and three-letter sequences (Behmer & Crump 2017, as reported by Crump et al. 2019; weaker).
   - **What is open:** Crump et al. call "which training texts (e.g., natural texts, random letter texts, parametrically scaled approximations to natural text) provide optimal transfer" an open question.

---

## 1. English word-frequency lists and their licences

### What the sources say

| List                                         | What it is                                                                                                                                                                                                                                                                                                                                                            | Licence, as its owner states it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Public MIT repo?                                                                                                     | Browser bundle?                                                                                     |
| :------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **wordfreq** (Robyn Speer), v3.1.1            | Frequencies blended from Wikipedia, subtitles (OpenSubtitles 2018, SUBTLEX), news, Google Books, web text, Twitter and Reddit. "A snapshot of language usage through about 2021"; the author says the data "is unlikely to be updated again" ([README](https://github.com/rspeer/wordfreq/blob/912caf64b657478d1dff1138efdc078947d54bb1/README.md#L1-L7), [sources](https://github.com/rspeer/wordfreq/blob/912caf64b657478d1dff1138efdc078947d54bb1/README.md#L204-L224)). | Code Apache-2.0; data "may be redistributed under a Creative Commons Attribution-ShareAlike 4.0 license". SUBTLEX is included by e-mailed permission on condition that the SUBTLEX authors are credited. The FAQ asks: "Can I convert wordfreq to … a CSV file? No. The CSV format does not have any space for attribution or license information, and therefore does not follow the CC-By-SA license" ([License and FAQ](https://github.com/rspeer/wordfreq/blob/912caf64b657478d1dff1138efdc078947d54bb1/README.md#L460-L519)). | Yes, with attribution, a note of changes, and the derived list itself under CC BY-SA 4.0. Against the author's stated wish. | Same conditions; the attribution must be reachable by players.                                       |
| **Norvig `count_1w.txt`**                    | "The 1/3 million most frequent words, all lowercase, with counts", from the Google Web Trillion Word Corpus ([norvig.com/ngrams](https://norvig.com/ngrams/)).                                                                                                                                                                                                        | Only the code is licensed: "You are free to use this code under the MIT license". The data is "derived from the Google Web Trillion Word Corpus", distributed by the LDC. That corpus's agreement says the user "shall not publish, retransmit, display, redistribute, reproduce or commercially exploit the Data in any form" ([LDC2006T13](https://catalog.ldc.upenn.edu/LDC2006T13), [agreement PDF](https://catalog.ldc.upenn.edu/license/web-1t-5-gram-version-1.pdf), §1.2).                                                                                                                                                                                                                                                                                                                                                                         | No.                                                                                                                  | No.                                                                                                 |
| **google-10000-english** (first20hours)       | The top 10,000 words of Norvig's list, with "swear-free" variants filtered by three blocklists ([README](https://github.com/first20hours/google-10000-english/blob/master/README.md)).                                                                                                                                                                                 | "Educational and personal/research use of this data is permitted under the LDC license … I do not recommend using this data for commercial purposes without licensing it from the Linguistic Data Consortium" ([LICENSE.md](https://github.com/first20hours/google-10000-english/blob/master/LICENSE.md)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | No: it inherits the LDC terms above.                                                                                 | No.                                                                                                 |
| **SCOWL / ESDB** (Kevin Atkinson)             | Spell-checker word lists in sizes, "with larger numbers meaning less common words": 35 small, 50 medium, 60 the default spell-checker size, 70 large ([ESDB README](https://github.com/en-wl/wordlist/blob/v2/README.md)). The 2020.12.07 release's sizes 10 and 20 hold about 4,400 and 8,100 words (the README in the [2020.12.07 release](https://sourceforge.net/projects/wordlist/files/SCOWL/2020.12.07/)). ESDB marks the worst offensive and vulgar words with usage notes. | "Permission to use, copy, modify, distribute, and sell any part of the English Speller Database … or word lists created from it, is hereby granted without fee, provided that the above copyright notice appears in all copies". Most sources are public domain; lists larger than size 80 and Australian spellings carry extra notices ([Copyright](https://github.com/en-wl/wordlist/blob/v2/Copyright)).                                                                                                                                                                                                                                                                                                                                                                                                                    | Yes, with the notice.                                                                                                | Yes, with the notice.                                                                               |
| **12dicts** (Alan Beale), v6.0.2              | Word lists built from 12 dictionaries. `2+2+3frq` groups lemmas into frequency bands, each "twice the frequency of the following band", using Brigham Young University's commercial COCA data. `2+2+3cmn` is bands 1–17 ([12dicts readme](http://wordlist.aspell.net/12dicts-readme/)).                                                                                   | "I explicitly release them to the public domain, but request acknowledgment of their use." The `2+2+3` lists depend on AGID, which "prevents their release into the public domain", but the author imposes no requirements beyond AGID's ([12dicts readme](http://wordlist.aspell.net/12dicts-readme/)). AGID carries Kevin Atkinson's permissive notice ("Permission to use, copy, modify, distribute and sell this database … provided that the above copyright notice appears in all copies") and Princeton's WordNet 1.6 notice, which also asks only that the notice be kept ([AGID readme](http://wordlist.aspell.net/agid-readme/)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Yes, with acknowledgement (and AGID's and WordNet's notices for the frequency lists).                                               | Yes.                                                                                                |
| **FrequencyWords** (Hermit Dave)              | Word counts from OpenSubtitles 2016 and 2018 ([README](https://github.com/hermitdave/FrequencyWords/blob/master/README.md)).                                                                                                                                                                                                                                             | "MIT License for code. CC-by-sa-4.0 for content." GitHub shows the repository as MIT, but that covers only the code ([README](https://github.com/hermitdave/FrequencyWords/blob/master/README.md)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Yes, under CC BY-SA 4.0 conditions.                                                                                  | Same.                                                                                               |
| **NGSL 1.2** (Browne, Culligan & Phillips)    | 2,809 core words for learners of English, with frequency statistics in a separate file ([NGSL page](https://www.newgeneralservicelist.com/new-general-service-list)).                                                                                                                                                                                                  | "Licensed under a Creative Commons Attribution-ShareAlike 4.0 International License" ([NGSL page](https://www.newgeneralservicelist.com/new-general-service-list)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Yes, under CC BY-SA 4.0 conditions.                                                                                  | Same.                                                                                               |
| **SUBTLEX-US** (Brysbaert & New)              | Frequencies from 51 million words of American subtitles; 74,286 words ([SUBTLEX-US page](https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexus)).                                                                                                                                                                                           | No licence or terms of use appear on the download page. wordfreq needed the author's e-mailed permission to include it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | No: no licence is granted.                                                                                           | No.                                                                                                 |
| **COCA** (english-corpora.org)                | The Corpus of Contemporary American English. SCOWL and 12dicts both used its data under purchase terms.                                                                                                                                                                                                                                                                | SCOWL's Copyright file says its COCA 3-gram data "is not freely available", and it was used "within the rights given by the NDA that was signed when purchasing the data" ([Copyright](https://github.com/en-wl/wordlist/blob/v2/Copyright)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | No.                                                                                                                  | No.                                                                                                 |
| **Tutors' own lists**                        | keybr's `words-en.json` (10,000 words); Monkeytype's `english_1k` … `english_450k`; TIPP10's lesson texts; Klavaro's and GNU Typist's lessons.                                                                                                                                                                                                                       | keybr: GNU AGPL-3.0 ([LICENSE](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/LICENSE)). Monkeytype: GNU GPL-3.0 ([LICENSE](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/LICENSE)). TIPP10: GNU GPL-2.0-only ([LICENSE](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/LICENSE)). Klavaro and GNU Typist: GNU GPL-3.0 or later (file headers). None names a separate licence for its data.                                                                                                                                                                                                                                                                                                                                 | No: copying them into an MIT repo would bring their copyleft with them.                                              | No.                                                                                                 |

**What CC BY-SA 4.0 asks of a shipped list.** Anyone sharing the material must keep the attribution the licensor supplies, link to the material where practicable, and "indicate if You modified the Licensed Material". Attribution may be given "in any reasonable manner based on the medium", for example by a link to a page holding it. An adapted list must itself be shared under a Creative Commons licence with "the same License Elements, this version or later", or a BY-SA compatible licence. For database rights, reusing a substantial part of the contents is allowed under the same attribution conditions ([CC BY-SA 4.0 legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en), sections 1(a), 3(a), 3(b) and 4).

**Where tutors' lists come from.**

- **keybr** builds both its pseudo-word model and its 10,000-word list from a word-and-count file per language, keeping the 10,000 most frequent words ([`generate-languages.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-generators/lib/generate-languages.ts#L34)). The repository doesn't say where `dictionary-en.csv.gz` came from; its documentation reads "TBD any info about dictionary file and it's content" ([`custom_language.md`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/docs/custom_language.md)).
- **Monkeytype's** language files carry a name and an "orderedByFrequency" flag, but no source ([`english_1k.json`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/frontend/static/languages/english_1k.json)).

### Inference

- **Two kinds of list do different jobs.** A **dictionary** answers "is this a real word?" A **frequency list** answers "is it common enough to practise?" SCOWL covers the first fully and the second coarsely, under a permissive notice. Fine-grained frequency is only open under CC BY-SA (wordfreq, FrequencyWords, NGSL) or as 12dicts' COCA-derived bands.
- **The library is built ahead of time, so the list could stay in the build.** If the library and the generator's vocabulary are built from a list at build time, and only the chosen words ship, the full frequency list never enters the browser bundle. It would still sit in the public repo, and the shipped vocabulary would still be "adapted material" of it.
- **The clean option** is SCOWL's commonness sizes for "real and common", optionally refined by 12dicts' bands, with the notices in a `LICENSES`-style file. The finer option is wordfreq under CC BY-SA, with an attribution players can reach and the derived word file marked CC BY-SA. That works legally, but goes against wordfreq's own FAQ. Choosing between them is an owner call.
- **Size isn't a concern.** SCOWL's sizes 10 and 20 hold 10,902 lower-case words, which is 91 KB raw and 30 KB gzipped.

---

## 2. How many real English words each key set can spell

### How I counted

- **Word list:** `wordfreq.top_n_list('en', 60000)` (wordfreq 3.1.1). I kept only lower-case `a`–`z` tokens that also appear in SCOWL 2020.12.07's `english-words` or `american-words` lists up to size 50. That removes names, fragments like "ll" and web noise. The result is a frequency-ranked list of 35,209 dictionary words. "Top 10,000" below means the first 10,000 of it.
- **What counts as spellable:** every letter of the word is in the key set. The word is 2 letters or longer, so "a" and "i" are left out. Punctuation keys (`;`, `,`, `.`, `/`) never count towards a word.
- **"With a new key":** how many of those words hold at least one of the step's new letters, which is TIPP10's rule (section 3).
- **Share of running text:** the sum of wordfreq's frequencies of the spellable words, plus "a" where A is allowed. It says roughly what share of the words in ordinary English text the set can type.
- **Key orders:** today's Sectors 1–3 (`src/curriculum/curriculum.ts`); TIPP10's English order (its `lesson_list` rows 101–114); and, for comparison, the full home row followed by the most frequent letters.

### What the counts say

**Today's order** (each row adds keys to the ones above):

| Step                    | Top 1,000 (with a new key) | Top 5,000 (with a new key) | Top 10,000 (with a new key) | Top 20,000 | Share of running text | SCOWL sizes 10–20 |
| :---------------------- | -------------------------: | -------------------------: | --------------------------: | ---------: | --------------------: | ----------------: |
| F J                     |                          0 |                          0 |                           0 |          0 |                    0% |                 0 |
| + D K                   |                          0 |                          0 |                           0 |          0 |                    0% |                 0 |
| + A S L ;               |                      7 (7) |                    16 (16) |                     20 (20) |         27 |                  3.3% |                12 |
| + G H (full home row)   |                     12 (5) |                    29 (13) |                     42 (22) |         62 |                  3.9% |                32 |
| + E I                   |                    51 (39) |                  153 (124) |                   245 (203) |        374 |                  8.0% |               223 |
| + R U                   |                    93 (42) |                  313 (160) |                   546 (301) |        930 |                 10.5% |               524 |
| + T Y                   |                  202 (109) |                  709 (396) |                 1,227 (681) |      2,074 |                 24.7% |             1,188 |
| + W O Q P (top row)     |                  381 (179) |                1,466 (757) |               2,613 (1,386) |      4,700 |                 45.0% |             2,562 |
| + V M C ,               |                  587 (206) |              2,616 (1,150) |               4,870 (2,257) |      9,239 |                 57.6% |             4,970 |
| + B N X .               |                  975 (388) |              4,948 (2,332) |               9,893 (5,023) |     19,705 |                 87.0% |            10,745 |
| + Z / (alphabet)        |                    978 (3) |                 4,974 (26) |                 9,974 (81) |     19,974 |                 87.3% |            10,901 |

Running text tops out at 87%, not 100%, because "I", contractions, numbers and names are left out. The word "a" alone is 2.3% of it, which is most of the home row's share.

**TIPP10's order, for comparison:**

| Step      | Top 10,000 (with a new key) | Share of running text |
| :-------- | --------------------------: | --------------------: |
| asdf jkl; |                     20 (20) |                  3.3% |
| + E O     |                   132 (112) |                  7.5% |
| + T I     |                   395 (263) |                 15.5% |
| + N R     |                 1,177 (782) |                 27.8% |
| + H C     |               2,336 (1,159) |                 42.8% |
| + W       |                 2,699 (363) |                 49.1% |
| + G       |                 3,510 (811) |                 53.2% |

**The full home row, then frequent letters (E I, T N, O R, U C):** 42, then 245, 854, 2,041 and 3,974 words.

**Examples from the top 10,000** (the first by frequency that hold a new key):

- **A S L ;:** as all ask fall add dad sad ad falls asks adds ads salad lad lads alas.
- **G H:** has had half shall gas glad hall glass ah flag ha flash ash flags dash saga.
- **E I:** is he his if like she see said did life high feel head side less else idea age deal asked.
- **R U:** are her us here use used sure free real full read hard far area large girl air due.

**Rarer dictionary words don't change the picture at the start.** With every SCOWL word up to size 70 (about 112,000 words), F J D K still spell nothing, and the full home row spells 135 words, most of them rare.

**Today's Stage texts already bend the rule.** The R U Stage (`s2-l2`) has "run", "true" and "drum", with N, T and M not yet taught. The T Y Stage (`s2-l3`) has "rhythm" and "today", with M and O not yet taught. All other Stages in Sectors 1–3 use only keys taught so far.

### Inference

- **The first two steps can only be drills.** F J and F J D K spell no words in any list I tried. P8 already puts drills first, and this makes it a necessity rather than a choice.
- **The home-row steps can't support "a large library" of word Stages.** About 30 usable common words, many of them very short, can't fill many 20–30-word Stages without heavy repetition. Section 6's generator sample adds little: 20,000 home-row pseudo-words held only 40 distinct strings. Variety there has to come from drill patterns, word order and length, not new words.
- **Word variety opens up at E I and R U, and becomes plentiful at T Y.** A step with a few hundred spellable words can fill library Stages that rarely repeat a word. From the top row on, the constraint is no longer how many words exist but which ones are worth practising.
- **Key order matters a great deal for words.** Frequency-first orders (TIPP10's) reach real text much sooner, at the cost of departing from row-by-row teaching. The path's shape belongs to its own ticket. This is evidence for it, not a recommendation.
- **"With a new key" roughly halves the pool from R U on.** If every word must practise a new key, as TIPP10 requires, R U keeps 301 of 546 words and the top row 1,386 of 2,613. At E I it keeps 203 of 245. Either way it is still plenty from E I on.

---

## 3. How tutors build text from allowed keys

### What the sources say

**keybr.com** (AGPL-3.0):

- **Which keys are in play:** a lesson starts with at least 6 letters and adds one at a time, in English frequency order (or a keyboard-weighted order). It "focus[es] on" the least confident key ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/guided.ts#L41-L108)). The earlier note covers how confidence is measured.
- **Text from the allowed keys:** a `Filter` holds the allowed letters and a focused letter that "must appear in each generated word" ([`filter.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-phonetic-model/lib/filter.ts#L8-L45)).
- **Pseudo-words:** a Markov chain of order 4, so the next letter depends on the three before it. It is trained on the 10,000 most frequent words, each counted in proportion to its frequency ([`generate-languages.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-generators/lib/generate-languages.ts#L34-L47)). Generation:
  - starts from a prefix that holds the focus letter;
  - drops any next letter outside the filter;
  - won't end a word before 3 letters;
  - makes ending more likely as the word grows, by `frequency * Math.pow(1.3, word.length)`;
  - retries up to 5 times if it gets stuck or passes 10 letters ([`phoneticmodel.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-phonetic-model/lib/phoneticmodel.ts#L64-L139), prefixes at [L200–L214](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-phonetic-model/lib/phoneticmodel.ts#L200-L214)).
- **Real words:** with the "natural words" setting, keybr takes up to 1,000 dictionary words that use only the allowed letters and hold the focus letter. If fewer than 15 are found, it tops them up with pseudo-words, then picks words at random ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/guided.ts#L143-L161), [`dictionary.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/dictionary.ts#L35-L44)). Words of 2 letters or fewer are dropped ([`guided.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/guided.ts#L30-L34)).
- **Lesson length and repeats:** a lesson runs to 100–200 letters, by setting ([`fragment.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/text/fragment.ts#L10)). The same word never comes twice in a row, if three tries can avoid it ([`words.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/text/words.ts#L54-L72)).
- **Randomness:** lessons draw from an LCG seeded with `Date.now()`, so two players never share a lesson ([`lesson.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-lesson/lib/lesson.ts#L14)).

**Monkeytype** (GPL-3.0; a typing test, not a course):

- **No adaptive key-restricted course.** Its word filter can build custom text from a word list. Presets such as "home keys", "home row", "top row", "left hand" and "right hand" turn on an exact match, which keeps words made only of those keys (`^[keys]+$`) ([`WordFilterModal.tsx`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/frontend/src/ts/components/modals/WordFilterModal.tsx#L52-L173)).
- **Pseudo-words:** the "pseudolang" mode, "Nonsense words that look like the current language", is a Markov chain with two letters of context, built from the current word list ([`funbox-functions.ts`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/frontend/src/ts/test/funbox/funbox-functions.ts#L123-L167), [`list.ts`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/packages/funbox/src/list.ts#L319-L326)).
- **How words are picked:** words are drawn uniformly, or by Zipf's law in the "zipf" mode, which inverts the cumulative distribution with `Math.exp` ([`wordset.ts`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/frontend/src/ts/test/wordset.ts#L26-L32), [`misc.ts`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/frontend/src/ts/utils/misc.ts#L366-L380)).
- **Randomness:** all of it comes from `Math.random` ([`numbers.ts`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/packages/util/src/numbers.ts#L2)).

**Klavaro** (GPL-3.0 or later; read from [SourceForge](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/)):

- **The basic course is random letters, no words.** Each of 43 lessons lists its keys as a bitmap ([`data/basic_lessons.txt`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/data/basic_lessons.txt)). Decoded for US QWERTY, the lessons run:
  - `fj`, `dk`, `sl`, `a;` (each pair on its own), then `asdf`, `jkl;`, `gh`, `asdfg`, `hjkl;` and the whole home row;
  - then `ru`, `ei`, `wo`, `qp`, each hand's four keys, `ty`, each hand's five keys, and the whole top row;
  - then the same pattern for the bottom row, then numbers and symbols.
- **How a basic exercise is drawn:** 8 lines of nine 5-letter "words". Letters are drawn from a pool of the lesson's keys without replacement, so each key comes up equally often. For lessons of 5 to 13 keys the pool holds every key twice, and it refills when empty ([`src/basic.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/basic.c), `basic_draw_lesson`).
- **Pseudo-words in the adaptive exercise:** consonants and vowels alternate, with a 1-in-25 chance of a symbol and a 1-in-7 chance of a capital first letter. One word in 15 is a number ([`src/adaptability.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/adaptability.c), `adapt_create_word` and `adapt_draw_random_pattern`).
- **Weak keys:** when there are too many errors, each letter is drawn by rejection sampling in proportion to its error count or its slowness ([`src/accuracy.c`](https://sourceforge.net/p/klavaro/code/HEAD/tree/trunk/src/accuracy.c), `accur_create_word`). The trigger is in the earlier note.

**TIPP10** (GPL-2.0; official [GitLab repository](https://gitlab.com/tipp10/tipp10/-/tree/637f9fd83ba598e67979334a1c6eb9e3e936788c)):

- **English order:** the home row (`asdf jkl;`), then E O, T I, N R, H C, then capitals in lesson 6, then W . , and G, B U, Y M, V P, X ?, Q !, Z ( ) -, then special characters and numbers ([`update/sql.tipp10v210.utf`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/update/sql.tipp10v210.utf), `lesson_list` rows 101–120).
- **Hand-written words, then sentences:**
  - Lessons 1–6 are word lists: 39, 59, 103, 203 and 163 words for lessons 1–5, then 232 capitalised words. I checked lessons 1–5. Every word uses only the keys learned so far, and every word in lessons 2–5 holds one of that lesson's new keys.
  - From lesson 7 the texts are sentences ("We want to wash the car.") (same file, `lesson_content`).
- **How a lesson is assembled:** without the "intelligent" mode, a lesson is all its texts in their stored order. With it, texts come one at a time, in random order except as below, and none of the last 10 repeats (`num_text_until_repeat 10`) ([`trainingsql.cpp`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/sql/trainingsql.cpp#L205-L368), [`defines.h`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/def/defines.h#L56-L65)).
- **Tags on each text:** TIPP10 builds a table holding each text's count of every character ([`startsql.cpp`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/sql/startsql.cpp#L409-L506), `analyzeLessons`). The "intelligent" mode sorts texts by those counts for the player's top four error characters. It does so on every second text; the others are random ([`trainingsql.cpp`](https://gitlab.com/tipp10/tipp10/-/blob/637f9fd83ba598e67979334a1c6eb9e3e936788c/sql/trainingsql.cpp#L265-L301)).

**GNU Typist** (GPL-3.0 or later; [GitHub mirror](https://github.com/alexei-matveev/gtypist/tree/14447d5a3951329193a6e39a9f0dc8f967db5d1e)):

- **Fixed lessons:** every line is written by hand.
- **Lesson Q1** starts with `asdf ;lkj`, then `asdef ;lkij`. Next comes every two-letter pair of the keys (`as al ad ak af aj fa ka da la sa ja …`), then sentences of home-row words with E and I ("Dad adds a salad") ([`q.typ`](https://github.com/alexei-matveev/gtypist/blob/14447d5a3951329193a6e39a9f0dc8f967db5d1e/lessons/q.typ#L101-L116)).
- **Later lessons follow a set shape** ([`q.typ`](https://github.com/alexei-matveev/gtypist/blob/14447d5a3951329193a6e39a9f0dc8f967db5d1e/lessons/q.typ#L169-L211)):
  - "Rhythm Drill": anchored reaches such as `dedc kik, frfv jujm swsx lol. aqaz ;p;p` ([L322](https://github.com/alexei-matveev/gtypist/blob/14447d5a3951329193a6e39a9f0dc8f967db5d1e/lessons/q.typ#L322));
  - "Balanced Keyboard Drill": letter pairs such as `as os es us is an on en`;
  - "Continuous Copy": sentences;
  - "Rhythmic Review".
- **Repeats:** a line with a mistake is typed again ([`q.typ`](https://github.com/alexei-matveev/gtypist/blob/14447d5a3951329193a6e39a9f0dc8f967db5d1e/lessons/q.typ#L92-L97)).

**Research on practice text:**

- **Natural text against random strings:** inter-keystroke intervals "are much shorter for letter strings from a natural language, compared to random letter strings". Crump et al. cite Shaffer & Hardwick (1968) and Behmer & Crump (2017) for this; I read neither (**weaker**).
- **Skill and Letter pairs:** in Behmer & Crump's data, as Crump et al. report it, "slower typists were more strongly correlated with letter frequency than bigram or trigram frequency; whereas faster typists showed the opposite pattern". On random strings, fast typists slowed down.
- **The open question:** Crump et al. write that "the applied question for everyday typists is to determine which training texts (e.g., natural texts, random letter texts, parametrically scaled approximations to natural text) provide optimal transfer of automatized typing performance to natural texts". They suggest that "experience with typing letters in all functional contexts is required for automatizing letter typing".

  ([Crump, Lai & Brosowsky 2019](https://doi.org/10.1037/cep0000182), _Canadian Journal of Experimental Psychology_ 73(4); read from the [authors' draft](https://www.crumplab.com/EntropyTyping/articles/EntropyTyping_Draft.html), Introduction and General Discussion.)

### Inference

- **Two families, matching the map's two needs.**
  - **Curated text** (TIPP10, GNU Typist) fits the **library**: hand-made or machine-made ahead of time, checked, and tagged. TIPP10's per-text character counts are the simplest form of the tags the map asks for.
  - **Filtered dictionary plus pseudo-words** (keybr) fits the **generator**: it works for any key set and any focus key.
- **keybr's "natural words, topped up with pseudo-words below 15" is a ready-made rule** for when a generated loop should fall back. Section 2's counts say that would happen at the home-row steps, and hardly ever from E I on.
- **Pseudo-words keep English Letter pairs; random letters don't.** A Markov model trained on English keeps English Letter pairs and three-letter sequences, which skilled typing tracks. Random letters, as in Klavaro's basic course, practise every pair equally, including ones English never uses. Which transfers better for beginners is the open question above. Real words are the only option whose transfer isn't in doubt.
- **The "very likely" of the map's "wax on, wax off" aim rests on drill shape, not data.** GNU Typist's anchored reaches (`frf`, `dedc`) and Klavaro's pair-by-pair, hand-by-hand order are both built around fingers. Neither tutor measured the effect.

---

## 4. Drills, patterns, and weighting toward target keys

### What the sources say

| Tutor           | Drill shapes                                                                                                                                                                                                                                                         | How the target keys are weighted                                                                                                                                                                                                                                                                                                                                                                                                       |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GNU Typist**  | Rows in order (`asdf ;lkj`), anchored reaches (`frfv jujm`), all pairs of the lesson's keys (`as al ad ak`), then sentences (section 3).                                                                                                                              | By hand: each lesson's lines are written around its new keys.                                                                                                                                                                                                                                                                                                                                                                          |
| **Klavaro**     | Random 5-letter strings over the lesson's keys. The keys come as a pair, then one hand, then the whole row (section 3).                                                                                                                                                | **Basic:** uniform over the lesson's keys only. Earlier keys aren't mixed in. **Adaptive:** letters drawn in proportion to their errors or slowness (`accur_create_word`).                                                                                                                                                                                                                                                              |
| **TIPP10**      | Word lists, then sentences. No letter drills in the English lessons.                                                                                                                                                                                                   | Every word holds a new key (measured, section 3). The "intelligent" mode sorts texts by the player's four most error-prone characters, every second text.                                                                                                                                                                                                                                                                                |
| **keybr**       | No drills: pseudo-words or real words only.                                                                                                                                                                                                                            | Every word holds the focus letter, which is the least confident key ([`filter.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-phonetic-model/lib/filter.ts#L15-L18)). Other letters follow their English frequencies in the model.                                                                                                                                                       |
| **Monkeytype**  | None.                                                                                                                                                                                                                                                                  | Weak spot: the highest-scoring of 20 random words, by mean per-letter score (see [What adaptive typing tutors read to choose practice](https://github.com/k-electron/astro-type/blob/research/adaptive-practice-data/docs/research/adaptive-practice-data.md), section 1).                                                                                                                                                                   |
| **astro-type today** | Each Stage opens with anchored triplets (`fgf jhj`, `ded kik`, `frf juj`) and goes on to words (`src/curriculum/curriculum.ts`).                                                                                                                                  | By hand.                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Inference

- **A drill grammar covers everything the sources do.** Every drill in these tutors is one of a few shapes, each easy to generate from a key set:
  - **repeats:** `fff jjj`;
  - **alternation:** `fjfj`, `fj jf`;
  - **anchored reaches:** home key, target, home key (`frf`, `dedc`);
  - **every pair:** each ordered pair of the step's keys (`as al ad`);
  - **row and hand runs:** `asdf`, `;lkj`, `a;sldkfjgh`.

  P8's `fff jjj fjf jfj` is the first two. Because these are built from rules, the same key set always gives the same family of drills. That suits both the library and the generator.
- **"Every word holds a target key" is the common floor.** Both keybr and TIPP10 use it, it is easy to check, and it guarantees a Stage practises what it claims. Weighting beyond it varies: proportional to errors in Klavaro, worst-of-N in Monkeytype, sorting in TIPP10. None of these tutors published a test of their weighting (see the earlier note's "What I couldn't find").
- **A share, not every word, when a loop targets several keys.** If a loop works on a weak key and a Mix-up pair, requiring every word to hold the weak key can shrink the pool sharply at early steps. A target share (say, at least one target key per word, with a minimum count of each) is the obvious generalisation. That is a spec decision.
- **Mix-ups suggest their own drill.** Grudin's finding that beginners' Mix-ups are mostly a neighbour or the mirror key (earlier note, section 4) points to a drill that puts the two keys side by side: for "e typed as r", `ded frf ere`, or words that hold both ("here", "free"). No tutor I read builds such a drill from a Mix-up pair, so this would be new.

---

## 5. Seeded random numbers that match in every browser

### What the sources say

**The ECMAScript specification** ([ECMAScript 2025](https://tc39.es/ecma262/2025/)):

- **`Math.random`** returns a number "chosen randomly or pseudo randomly … using an implementation-defined algorithm or strategy". It takes no seed (§21.3.2.28).
- **Integer operations are exact.** `Math.imul` returns "(a × b) modulo 2³²" of the two `ToUint32` values (§21.3.2.20). `ToUint32` is defined exactly as truncation modulo 2³² (§7.1.7). The bitwise and shift operators are built on these.
- **Doubles are IEEE.** Numbers are IEEE 754-2019 binary64 values, and `Number::multiply` works "according to the rules of IEEE 754-2019 binary double-precision arithmetic" (§6.1.6.1, §6.1.6.1.4).
- **Transcendental functions are not exact.** `acos`, `cos`, `exp`, `log`, `pow`, `sin` and similar functions are "not precisely specified". Each returns an "implementation-approximated" value. fdlibm is recommended but "not specified by this standard" (§21.3.2; `Math.exp` §21.3.2.14; `Number::exponentiate` §6.1.6.1.3).
- **Sorting is stable, if the comparator is consistent.** `Array.prototype.sort` must be stable ("i.e., the sort is stable"). The order is "implementation-defined if SortCompare is not a consistent comparator" (§23.1.3.30.1).
- **`localeCompare` follows the locale.** It is "an implementation-defined locale-sensitive String comparison" (§22.1.3.12).
- **Property order is fixed.** An object's own keys come back integer keys first in ascending order, then string keys in creation order (§10.1.11.1).

**Generators and libraries:**

- **xoshiro128++** (Blackman & Vigna):
  - **What it is:** "one of our 32-bit all-purpose, rock-solid generators", with 128 bits of state that "must be seeded so that it is not everywhere zero" ([`xoshiro128plusplus.c`](https://prng.di.unimi.it/xoshiro128plusplus.c)).
  - **Licence:** the code is dedicated "to the public domain worldwide" (same file).
  - **Seeding and quality:** the authors "suggest to use SplitMix to initialize the state of a generator starting from a 64-bit seed". They say the `+` variants' lowest bits "have low linear complexity and will fail linearity tests" ([prng.di.unimi.it](https://prng.di.unimi.it/)); the xoshiro128++ source says it "passes all tests we are aware of".
  - **Paper:** Blackman & Vigna, "Scrambled Linear Pseudorandom Number Generators", _ACM Transactions on Mathematical Software_ 47(4), 2021 ([doi:10.1145/3460772](https://doi.org/10.1145/3460772)).
- **pure-rand** (MIT, v8.4.2, maintained):
  - **What it offers:** `congruential32`, `mersenne`, `xorshift128plus` and `xoroshiro128plus`; it recommends xoroshiro128plus.
  - **Uniform integers:** it warns that `min + floor(random() * (max - min + 1))` "will not generate the values with equal probabilities", and provides `uniformInt` to avoid that bias.
  - **Pure instances:** a "pure" instance "will never be altered in-place" ([README](https://github.com/dubzzz/pure-rand/blob/main/README.md)).
- **seedrandom** (MIT, v3.0.5, last released 2019):
  - **What it offers:** ARC4-based by default, plus Alea, xor128, xorwow, xorshift7, xor4096 and Tyche-i. Its README gives fixed outputs for a fixed seed ("Always 0.9282578795792454").
  - **A trap:** calling `Math.seedrandom('…')` without `new` "will make `Math.random()` predictable globally" ([README](https://github.com/davidbau/seedrandom/blob/released/README.md)).
- **FNV-1a hashing:** for turning a text seed into a number, RFC 9923 (February 2026) specifies FNV, with a 32-bit offset basis of 0x811C9DC5 and prime 0x01000193. It is an Informational RFC on the Independent Submission stream, with "No assertion of suitability for cryptographic applications" ([RFC 9923](https://www.rfc-editor.org/rfc/rfc9923.html), [datatracker](https://datatracker.ietf.org/doc/draft-eastlake-fnv/)).

**What the tutors do:**

- **keybr** has its own seeded `LCG` and `XorShift128Plus` ([`lcg.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-rand/lib/rng/lcg.ts#L9-L18), [`xorshift128plus.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-rand/lib/rng/xorshift128plus.ts)). Lessons seed the LCG from the clock (section 3).
- **Monkeytype** uses `Math.random` throughout (section 3).
- **Klavaro** uses C's `rand()`.

### Inference

- **What "the same Stage in every browser" needs:**
  - a PRNG built only from 32-bit integer operations (`Math.imul`, `>>> 0`, `^`, `<<`, rotations);
  - integer sampling without modulo bias (rejection, as pure-rand's `uniformInt` does);
  - no `Math.random`, no `Math.exp/log/pow/sin` in any decision, no `localeCompare`;
  - only sorts with total, consistent comparators.

  Floats are safe when they come from IEEE `+ - * /`, such as dividing a 32-bit integer by 2³², which is exact.
- **keybr's generator would need a change before it is reproducible everywhere.** Its `Math.pow(1.3, word.length)` could in principle round differently in another engine. Since `word.length` is a small integer, a precomputed table of powers removes the doubt. Monkeytype's Zipf sampler uses `Math.exp`, and a lookup table would fix it the same way.
- **keybr's LCG isn't the textbook LCG.** `a * x` with `a = 0x41c64e6d` and `x` up to 2³¹ exceeds 2⁵³, so the double product is rounded before `& (m - 1)`. It still gives the same numbers everywhere, because IEEE multiplication rounds the same way in every engine, but its quality is unknown. `Math.imul` avoids the problem.
- **Two easy choices:**
  - **pure-rand** is a maintained MIT dependency with unbiased integer helpers.
  - **xoshiro128++** is about 15 lines of public-domain code, which removes a dependency, but then the repo owns the sampling helpers.

  Neither needs a licence notice in the bundle beyond MIT's.
- **What goes into the seed is a spec decision.** The map says "the same inputs and seed always give the same Stage". The inputs are what the orchestrator asks for (keys, focus, step), plus a seed. Hashing a canonical string of them (FNV-1a, or SplitMix over the parts) gives the PRNG state. Two things change the output for a given seed and must be versioned together: the word list and the blocklist.
- **Testing determinism fits the repo's rules.** A few fixed seeds with their expected texts, as a golden test, prove reproducibility in Node. Integer-only arithmetic means the result holds for other engines without running them, which fits the "Chromium only" testing preference.

---

## 6. Offensive words: blocklists, licences, and pseudo-words

### What the sources say

**Blocklists:**

| List                                                                        | What it is                                                                                                                                                                                                                                                                                                                       | Licence                                                                                                                                                             | Public MIT repo / browser bundle?                                                                 |
| :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| **LDNOOBW** (Shutterstock)                                                  | 403 English entries, 124 of them phrases. Built for "autocomplete server and recommendation engine"; "what goes in these lists is subjective" ([README](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/blob/5faf2ba42d7b1c0977169ec3611df25a3c08eb13/README.md)).                        | "Creative Commons Attribution 4.0 International License", © 2012–2020 Shutterstock (same README).                                                                    | Yes, with attribution. No share-alike.                                                            |
| **dsojevic/profanity-list**                                                 | 434 English entries with 809 patterns. Each has a severity from 1 (mild) to 4 (severe), tags (`general`, `lgbtq`, `racial`, `religious`, `sexual`, `shock`), and exceptions for partial matching ("`sp*` would be a valid exception (`'sparse'`) for the profanity `arse`"). Most entries "started their life with a Severity Level of 3" before classification ([README](https://github.com/dsojevic/profanity-list/blob/c27924319aa9bd6f917e3782b4f4b6604a50b652/README.md)). | MIT (GitHub licence field). The repository was last pushed in 2021.                                                                                                  | Yes.                                                                                              |
| **obscenity** (npm, v0.4.6)                                                 | A matcher with an English dataset of 70 phrases and whitelisted terms. Transformers resolve look-alike characters, leetspeak and repeated letters. Its README shows it finding a swear word buried inside a longer run of letters, yet not matching "the pen is mightier" or "grapes". "Use its output as a heuristic, and not as the sole judge" ([README](https://github.com/jo3-l/obscenity/blob/32c9061c1ad18de43432e4e59084189628f2a2a4/README.md), [`english.ts`](https://github.com/jo3-l/obscenity/blob/32c9061c1ad18de43432e4e59084189628f2a2a4/src/preset/english.ts#L1-L60), whitelist examples at [L113–L133](https://github.com/jo3-l/obscenity/blob/32c9061c1ad18de43432e4e59084189628f2a2a4/src/preset/english.ts#L113-L133)). | MIT ([README](https://github.com/jo3-l/obscenity/blob/32c9061c1ad18de43432e4e59084189628f2a2a4/README.md)). Pushed this week.                                         | Yes.                                                                                              |
| **cuss** (words/cuss)                                                       | About 1,770 English words and phrases, each with a 0–2 rating of "how likely it is to be used as either profanity or clean text". Sources include a Carnegie Mellon research list and Wikipedia's list of ethnic slurs. The README says: "Don’t use it to make a 'profanity filter'. Those are bad." ([readme](https://github.com/words/cuss/blob/main/readme.md)) | MIT © Titus Wormer (same readme). The licence of the upstream Carnegie Mellon list isn't stated.                                                                     | Yes, though its own README advises against filter use.                                            |
| **ESDB usage notes** (SCOWL v2)                                             | Marks `offensive-1`, `offensive-2`, `vulgar-1` and `vulgar-3` words. The marking "only covers the worst offenders" ([ESDB README](https://github.com/en-wl/wordlist/blob/v2/README.md), USAGE-NOTE).                                                                                                                                      | SCOWL's MIT-like notice (section 1).                                                                                                                                 | Yes.                                                                                              |
| **keybr's blacklist**                                                       | 525 English words, stored scrambled so the source doesn't show them ([`scramble.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-phonetic-model/lib/blacklist/scramble.ts)).                                                                                                       | AGPL-3.0.                                                                                                                                                            | No.                                                                                               |
| **Monkeytype's disallowed words**                                           | About 390 words, used to check user names ([`validation.ts`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/packages/schemas/src/validation/validation.ts#L395-L415)).                                                                                                                      | GPL-3.0.                                                                                                                                                             | No.                                                                                               |

**What the tutors do with them:**

- **keybr checks pseudo-words only, by exact whole word.** Its `censor` wraps the pseudo-word model and draws again until `blacklist.allow(word)`. `allow` is `!blacklist.has(lowerCase(word))` ([`censor.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-phonetic-model/lib/censor.ts#L17-L24), [`blacklist.ts`](https://github.com/aradzie/keybr.com/blob/05a37bc5265f65ff538c59c613db29442f345d51/packages/keybr-phonetic-model/lib/blacklist/blacklist.ts#L47-L54)). The natural-word dictionary doesn't pass through it (section 3).
- **Monkeytype** checks user names, matching words that start with a listed word or, in its stricter mode, contain one anywhere ([`validation.ts`](https://github.com/monkeytypegame/monkeytype/blob/63ea5370b7bb155633fd22f26975887afa4165c7/packages/schemas/src/validation/validation.ts#L395-L415)). Its pseudolang and word lists have no check (section 3).

### What my sample showed

**Method:**

- **Real words:** each list as an exact whole-word check (LDNOOBW's single words; dsojevic's patterns with `*` as "one or more"; cuss at rating 2, and at any rating), plus obscenity's English preset.
- **Pseudo-words:** a generator written in keybr's manner. It is an order-4 Markov chain trained on the top 10,000 words weighted by wordfreq frequency. It requires a focus letter, makes ending more likely by 1.3 to the power of the word's length, and makes words of 3 to 11 letters. It draws 20,000 words per step with a fixed seed. **It is not keybr's own model or data**, so the rates show the size of the problem, not keybr's exact numbers.

**Real words:**

- **In the top 10,000:** LDNOOBW flags 39 words, dsojevic 36, cuss at rating 2 flags 30, cuss at any rating 236, and obscenity 37.
- **On the home row:** one word is flagged, a three-letter swear word that is also a word for a donkey. Every list flags it.
- **Lists flag clinical words too.** LDNOOBW and obscenity also flag ordinary or clinical words, such as anatomy terms, "sex" and "sexual", and (obscenity) one word whose letters merely contain a swear word.
- **The tutors' own lists:** keybr's 10,000-word natural list holds 5 LDNOOBW words and 8 cuss rating-2 words. Monkeytype's `english_1k` holds none.

**Generated pseudo-words, per step** (20,000 drawn per step; Stage risk assumes 30 words per Stage):

| Step      | Distinct strings | Share that are dictionary words | Flagged, exact lists (worst list)            | Flagged, obscenity | Stages of 30 words with at least one flagged word |
| :-------- | ---------------: | ------------------------------: | :------------------------------------------- | -----------------: | ------------------------------------------------: |
| Home row  |               40 |                             67% | 0                                            |                  0 |                                                0% |
| + E I     |            1,000 |                             56% | 218 (1.1%; dsojevic, one mild swear word)     |       102 (0.51%) |                                        14% to 28% |
| + R U     |            1,934 |                             58% | 2 (cuss rating 2)                            |                  0 |                                              ~0.3% |
| + T Y     |            2,204 |                             71% | 74 (0.37%; LDNOOBW and dsojevic)              |       135 (0.68%) |                                         about 18% |
| + W O Q P |            2,833 |                             60% | 7 (cuss rating 2)                            |        29 (0.15%) |                                         about 4% |
| + V M C   |            3,671 |                             57% | 0                                            |        11 (0.06%) |                                       about 1.6% |
| + B N X   |            5,209 |                             59% | 39 (0.20%; dsojevic)                          |        44 (0.22%) |                                       about 6% |

- **Stage risk** is `1 − (1 − p)^30`, where p is the share of flagged words.
- **Exact lists miss words with a swear word inside.** At T Y, obscenity flagged invented words such as "fish" or "year" joined to a common swear word. No exact list caught them, because they aren't on any list.
- **Exact lists flag a real word at E I.** dsojevic's whole-word hits there were all one real, mild word, which obscenity doesn't flag.
- **Joins between words:** joining each pair of neighbouring words with a space made no new obscenity matches.

### Inference

- **A check is required, not optional.** At most of the steps I sampled, an unchecked generator would put a flagged word in somewhere between 1 Stage in 60 and 1 in 4 (and almost never at R U). P1 and the map's "no offensive words" check rule that out.
- **Real-word vocabularies need the same check.** keybr's natural-word list shows a tutor can ship flagged words through the "real words" path.
- **Check substrings, and keep exceptions.** Exact lists miss invented words with a swear word inside. Plain substring matching flags innocent words ("grapes", "class"). obscenity's whitelist approach, or dsojevic's `exceptions`, handles both.
- **Where the check runs: two options.**
  - **Vet the vocabulary at build time.** If the generator only draws from a vetted vocabulary (real words, plus pseudo-words enumerated and vetted ahead of time), every string a player can see was checked in the repo. The generator then can't produce an unvetted word, and the browser needs no blocklist.
  - **Generate freely and check in the browser.** If the generator builds pseudo-words freely at play time, the check must ship and run in the browser. Rejection sampling ("draw again until allowed", as keybr does) stays deterministic with a seeded PRNG, as long as the blocklist's version is part of the input.
- **How strict is a product call.** Lists disagree. LDNOOBW flags clinical and everyday words. dsojevic flags a mild swear word that obscenity allows. cuss lists hundreds of everyday words, such as "addict" (rating 1, "maybe") and "angry" (rating 0, "unlikely"). A typing game for beginners probably also wants to avoid words that aren't profane but jar: anatomy, violence, slurs inside other words. Severity tiers (dsojevic) and tags let the owner pick a line, and a short project-owned allowlist and blocklist can sit on top.
- **Licences allow a permissive setup.** Under MIT, obscenity (matcher) and dsojevic (list with exceptions) need only the MIT notice. Adding LDNOOBW needs an attribution line (CC BY 4.0, no share-alike). keybr's and Monkeytype's lists can't be used.
- **Sampling is the right test for generated Stages,** as the map says. With flag rates around 0.1–1% of words before checking, a test over a few thousand generated Stages per step finds a leak quickly if the check is ever bypassed.

---

## Questions for the decision tickets

These belong to the library, generator and path tickets, not to this note.

- **Which word list ships:** SCOWL (and 12dicts) under permissive notices, or wordfreq under CC BY-SA, with a player-visible attribution and a CC BY-SA word file, against its author's stated wish?
- **Real words only, or pseudo-words too?** If pseudo-words, are they generated freely in the browser (the blocklist ships) or chosen from a vocabulary vetted at build time (nothing ships)?
- **How strict is the offensive-word line:** severe only, or also mild swear words, anatomy and violence? Is a project-owned list kept on top?
- **What does a step with too few words do?** At the home row, are Stages drills only, drills plus the few real words, or drills plus pseudo-words? How far may P8's "bends that rule when real words matter more" go: how many untaught keys per Stage, and which?
- **The key order:** today's row-by-row order or a frequency-first one. That is the path ticket's call, and section 2 is the evidence for it.
- **How a loop weights its targets:** every word holds a target key (keybr, TIPP10), a share of words, or letters in proportion to errors (Klavaro)?
- **Determinism:** which PRNG (pure-rand or vendored xoshiro128++), what goes into the seed, and how the word list's and blocklist's versions are tied to it.
- **Where attribution lives** if any CC BY or CC BY-SA data ships.

## What I couldn't find

- **Evidence on which practice text trains beginners best** (real words, pseudo-words, random letters or drills). Crump et al. (2019) name it as an open question. I found no controlled study.
- **Behmer & Crump (2017) and Shaffer & Hardwick (1968)** in full; I used them only as Crump et al. report them.
- **Where keybr's English word counts come from.** The repository has the file but no source note.
- **Where Monkeytype's English lists come from.** `english_5k` and `english_10k` begin like google-10000-english, but no file says so.
- **The Leipzig Corpora Collection's terms,** because the page refused automated requests. I left it out.
- **A permissively licensed, fine-grained frequency list from a modern corpus.** Every fine-grained list I found is CC BY-SA, restricted, or unlicensed.
- **The licence of the Carnegie Mellon list** that cuss draws on. cuss itself is MIT.
- **obscenity's bundled size.** I didn't measure it. Its English data is 70 phrases, so it is likely small.
- **The legal status of word lists as facts.** This note takes every licence at its word.
