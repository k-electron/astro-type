"""PROTOTYPE, throwaway: the whole Phase 3 Path as an outline (ticket #187).

Not curriculum code. It holds the draft list of Waypoints, generates one sample
Ladder text for each letter Waypoint from SCOWL, checks every sample against its
Waypoint's allowed keys, and writes path.json for index.html to show.

    python3 -I path.py <scowl>/final > path.json
"""

import json
import os
import random
import re
import sys

SCOWL = sys.argv[1]

# ---------------------------------------------------------------- word lists


def load(sizes):
    words = {}
    for prefix in ("english-words", "american-words"):
        for size in sizes:
            path = f"{SCOWL}/{prefix}.{size}"
            if not os.path.exists(path):
                continue
            for line in open(path, encoding="latin-1"):
                w = line.strip()
                if w.isascii() and w.isalpha() and w.islower() and len(w) >= 2:
                    words[w] = min(words.get(w, 99), size)
    return words


WORDS = load([10, 20, 35])  # word -> SCOWL size (smaller = more common)
# A stand-in for the real substring check (#188): enough to keep the samples clean.
BLOCK = {"ass", "asses", "fag", "fags", "dick", "dicks", "dyke", "kike", "jap",
         "slut", "tit", "tits", "piss", "homo", "hell", "damn", "sex", "fart",
         "kill", "kills", "killed", "die", "dies", "died", "dead", "gash", "lush", "hag",
         "hags", "shag", "skag", "fagged", "jew", "gook", "spic", "wop", "faggot", "racism", "racist",
         "killer", "deaths", "death", "privates", "smokers", "victim", "jerk", "drug",
         "drugs", "rape", "suicide", "murder", "gun", "guns", "war", "hided", "flied"}
for w in list(WORDS):
    if w in BLOCK:
        del WORDS[w]

# Letter pairs, weighted by how common the words holding them are.
PAIR = {}
for w, size in WORDS.items():
    weight = {10: 8, 20: 3, 35: 1}[size]
    for a, b in zip(w, w[1:]):
        PAIR[a + b] = PAIR.get(a + b, 0) + weight

# ---------------------------------------------------------------- the path
# kind: keys (new keys), shift, text (a new kind of text), review, speed.
# Hand-written samples are illustrations only; the library (#188) writes the real ones.

SECTORS = [
    {
        "id": "s1", "name": "Home row with E and I",
        "stretch": "The eight home keys, Space, and the first reach (E I)",
        "recipe": "60–100 characters. Ladder: known keys ≤15%, drill ≤25%, Letter pairs ~15%, words, mixed line ~25%. At least 30% of letters are the new keys.",
        "waypoints": [
            {"name": "F and J", "kind": "keys", "new": "fj ", "drill": "fff jjj fjf jfj ff jj",
             "tip": "Find the bumps on F and J without looking down. Rest four fingers of each hand on the home row, and tap Space with your thumb.",
             "habit": "Home keys, the bumps, the thumb on Space",
             "detours": ["F or J accuracy (drill only: no other keys yet)"]},
            {"name": "D and K", "kind": "keys", "new": "dk", "drill": "ddd kkk dkd kdk fdf jkj",
             "tip": "One finger, one key. Your middle fingers rest on D and K, and only the finger that types moves.",
             "habit": "One finger per key",
             "detours": ["D or K accuracy", "Mix-up d↔k (mirror)", "Mix-up d↔f (neighbour)"]},
            {"name": "S and L", "kind": "keys", "new": "sl", "drill": "sss lll sls lsl dsd klk",
             "tip": "Ring fingers are weaker, so go steady. S and L belong to the ring fingers, never to the middle ones.",
             "habit": "Weak fingers get their own key",
             "detours": ["Ring fingers", "Mix-up s↔d, l↔k (neighbours)"]},
            {"name": "A and ;", "kind": "keys", "new": "a;", "drill": "aaa ;;; a;a ;a; sas l;l",
             "tip": "Every finger now has a home. Little fingers rest lightly on A and ;, with your wrists floating above the desk.",
             "habit": "Posture: wrists up, fingers curved",
             "detours": ["Little fingers", "Home row (the first words Detour, topped up with made-up words)"]},
            {"name": "Home row", "kind": "review",
             "tip": "Settle back onto the bumps after every word. Your fingers find home by touch.",
             "habit": "Return to home by touch",
             "detours": ["Weakest home key", "Any Mix-up that stands out"]},
            {"name": "E and I", "kind": "keys", "new": "ei", "drill": "ded kik ded kik de ki",
             "tip": "Your first reach. Middle finger up to E or I, then straight back to D or K. The other fingers stay home.",
             "habit": "Anchor, reach, return (first reach)",
             "detours": ["E or I accuracy", "Mix-up e↔d, i↔k (same finger)", "Mix-up e↔i (mirror)", "Words Detours from here on"]},
            {"name": "G and H", "kind": "keys", "new": "gh", "drill": "fgf jhj fgf jhj gh hg",
             "tip": "Reach sideways with your index finger to G or H, then come back to the F or J bump.",
             "habit": "Index fingers own two columns",
             "detours": ["G or H accuracy", "Mix-up g↔f, h↔j", "Index fingers' second column"]},
            {"name": "Home row, E and I", "kind": "review",
             "tip": "Keep your eyes on the screen, not your hands. The Action Deck shows where every key is.",
             "habit": "Eyes on the screen",
             "detours": ["Weakest key of the Sector", "Any Mix-up that stands out"]},
        ],
    },
    {
        "id": "s2", "name": "Top row",
        "stretch": "R U T Y W O Q P",
        "recipe": "100–160 characters. Ladder: known keys ≤10%, drill ≤15%, Letter pairs ~15%, words, mixed line ~25%. At least 20% of letters are the new keys.",
        "waypoints": [
            {"name": "R and U", "kind": "keys", "new": "ru", "drill": "frf juj frf juj ru ur",
             "tip": "Index fingers reach up and a little left for R and U. Back to F and J after every reach.",
             "habit": "Anchor, reach, return",
             "detours": ["R or U accuracy", "Mix-up r↔e, u↔i (neighbours)", "Mix-up r↔f, u↔j (same finger)"]},
            {"name": "T and Y", "kind": "keys", "new": "ty", "drill": "ftf jyj ftf jyj ty yt",
             "tip": "T and Y are the longest index reaches yet. Stretch the finger, not the whole hand, then return home.",
             "habit": "Move the finger, not the hand",
             "detours": ["T or Y accuracy", "Mix-up t↔r, y↔u", "Mix-up t↔y (mirror)", "Index fingers' second column"]},
            {"name": "W and O", "kind": "keys", "new": "wo", "drill": "sws lol sws lol wo ow",
             "tip": "Ring fingers reach up for W and O. Keep both hands still; only the reaching finger moves.",
             "habit": "Still hands",
             "detours": ["W or O accuracy", "Mix-up w↔e, o↔i", "Ring fingers"]},
            {"name": "Q and P", "kind": "keys", "new": "qp", "drill": "aqa ;p; aqa ;p; qp pq",
             "tip": "Little fingers reach up for Q and P. They are the weakest fingers, so land each one cleanly before you speed up.",
             "habit": "Clean before fast",
             "detours": ["Q or P accuracy", "Mix-up p↔o, q↔a", "Little fingers"]},
            {"name": "Top row", "kind": "review",
             "tip": "Words come easily now. Read the whole word before you type it, then let your fingers run through it.",
             "habit": "Think in words",
             "detours": ["Top row", "Weakest key of the Sector", "Any Mix-up that stands out"]},
        ],
    },
    {
        "id": "s3", "name": "Bottom row",
        "stretch": "V M B N C , X . Z /",
        "recipe": "100–160 characters. As the top row. Comma and full stop sit inside text, never only in drill.",
        "waypoints": [
            {"name": "V and M", "kind": "keys", "new": "vm", "drill": "fvf jmj fvf jmj vm mv",
             "tip": "Curl your index finger down to V or M, keep your wrist up, then come back to the bump.",
             "habit": "Curl down, wrist up",
             "detours": ["V or M accuracy", "Mix-up v↔c, m↔n", "Bottom row"]},
            {"name": "B and N", "kind": "keys", "new": "bn", "drill": "fbf jnj fbf jnj bn nb",
             "tip": "B and N are a long reach down and in. B belongs to the left index finger and N to the right, however a word runs.",
             "habit": "B on the left, always",
             "detours": ["B or N accuracy", "Mix-up b↔v, n↔m", "Mix-up b↔n (mirror)", "Index fingers' second column"]},
            {"name": "C and comma", "kind": "keys", "new": "c,", "drill": "dcd k,k dcd k,k c, ,c",
             "tip": "Middle fingers curl down to C and the comma. A comma is followed by a space, typed with your thumb as always.",
             "habit": "Punctuation is a key like any other",
             "detours": ["C or comma accuracy", "Mix-up c↔x, c↔d", "Middle fingers"]},
            {"name": "Letters so far", "kind": "review",
             "tip": "Go for clean before fast. Speed follows once your fingers stop hunting.",
             "habit": "Accuracy leads",
             "detours": ["Weakest key so far", "Any Mix-up that stands out"]},
            {"name": "X and full stop", "kind": "keys", "new": "x.", "drill": "sxs l.l sxs l.l x. .x",
             "tip": "Ring fingers curl down for X and the full stop. A full stop ends the sentence, and Space follows it.",
             "habit": "Ring fingers own their column",
             "detours": ["X or full stop accuracy", "Mix-up x↔z, x↔c, .↔,"]},
            {"name": "Z and slash", "kind": "keys", "new": "z/", "drill": "aza ;/; aza ;/; z/ /z",
             "tip": "Little fingers curl down for Z and the slash. Keep the wrist still and let the finger curl.",
             "habit": "Little fingers curl, wrists stay",
             "detours": ["Z or slash accuracy", "Mix-up z↔a, z↔x", "Little fingers"]},
            {"name": "Every letter", "kind": "review",
             "tip": "Every letter is yours. Keep each key on its own finger, even when a word feels quicker another way.",
             "habit": "Same finger every time",
             "detours": ["Weakest letter", "A row or a hand that stands out", "Rare letters (q z x j) for coverage"]},
        ],
    },
    {
        "id": "s4", "name": "Capitals",
        "stretch": "Left Shift, Right Shift, ? and :",
        "recipe": "120–180 characters. 15–30% of words start with a capital. Drill ≤10%. A Shift Waypoint's capitals are all on its side's letters.",
        "waypoints": [
            {"name": "Left Shift", "kind": "shift", "new": "HJKLYUIOPNM", "drill": "Jj Kk Ll Hh Jo Ki Lu",
             "tip": "For a capital typed by your right hand, hold Left Shift with your left little finger, type the letter, then let go.",
             "habit": "Opposite-hand Shift",
             "sample": "jj Jj kk Kk ll Ll Jo Ki Lu Hi; Kim, Lily, Hugo, Mona, Pia, Omar; I like Jupiter. Yuki and Nick fly to Pluto. Mona is on the moon.",
             "detours": ["Opposite-hand Shift", "Capitals on the right hand"]},
            {"name": "Right Shift", "kind": "shift", "new": "QWERTASDFGZXCVB", "drill": "Ff Dd Ss Aa Fa De Sa",
             "tip": "Now the mirror. For a left-hand capital, hold Right Shift with your right little finger. Always the Shift on the other side.",
             "habit": "Opposite-hand Shift, both sides",
             "sample": "ff Ff dd Dd ss Ss Fa De Sa Ti; Ada, Ben, Cara, Eva, Theo, Zoe; Venus is bright. Ben and Sam fly past Saturn, then Mars.",
             "detours": ["Opposite-hand Shift", "Capitals on the left hand", "Shift hand: one side for everything"]},
            {"name": "? and :", "kind": "shift", "new": "?:", "drill": ";:; /?/ ;:; /?/",
             "tip": "Shift works for symbols too. ? and : are Shift with the slash and semicolon keys, so hold Left Shift.",
             "habit": "Opposite-hand Shift on symbols",
             "sample": ";:; /?/ ;:; /?/ Ready? Yes. Who flies first? Note: dock at nine. Is Mars near? Not yet: wait for the signal.",
             "detours": ["Opposite-hand Shift", "? or : accuracy"]},
            {"name": "Sentences", "kind": "review",
             "tip": "Capitals start every sentence and every name. Use the Shift on the other side each time; Analytics shows which one you use.",
             "habit": "Opposite-hand Shift in running text",
             "sample": "Mars is red. Is Venus hot? Yes: very hot. Lena and Theo fly the probe past Saturn, then home. Did Kim see it? She did.",
             "detours": ["Opposite-hand Shift", "Weakest capital", "Any Mix-up that stands out"]},
        ],
    },
    {
        "id": "s5", "name": "Fluency",
        "stretch": "Real English: common patterns, common words, apostrophes and quotes",
        "recipe": "150–250 characters. No drill except on ' and \". Text Waypoints have no new keys, so their Recipe sets the kind of text: share of common Letter pairs, of the top 200 words, of sentence punctuation.",
        "waypoints": [
            {"name": "Common patterns", "kind": "text", "new": "",
             "tip": "Letter pairs like th, in and er come up all the time. Type each one as a single quick movement.",
             "habit": "Pairs become one movement",
             "sample": "th he in er an re on at nd; the then there other; ring sing thing bring; ion action station motion; and hand stand; the station is near the other end.",
             "detours": ["Slowest common Letter pairs (if #191 adds them to Targets)", "Weakest key"]},
            {"name": "Common words", "kind": "text", "new": "",
             "tip": "The hundred most common words make up about half of everything you read. Type each one as a whole, not letter by letter.",
             "habit": "Whole words",
             "sample": "the of and to in is you that it was for on are as with they at be this from have or one had by but not what all were we when your can said there use each which she do how",
             "detours": ["Weakest key", "Slowest common words' keys"]},
            {"name": "' and \"", "kind": "keys", "new": "'\"", "drill": ";'; ;\"; ;'; ;\";",
             "tip": "Your right little finger reaches right for the apostrophe. For quote marks, hold Left Shift as well.",
             "habit": "The right little finger's far reach",
             "sample": ";'; ;\"; ;'; ;\"; it's don't I'm we're can't; \"Ready?\" she asked. \"Let's go,\" said Theo. It's Max's turn, so don't wait.",
             "detours": ["Apostrophe or quote accuracy", "Opposite-hand Shift"]},
            {"name": "Paragraphs", "kind": "review",
             "tip": "Longer texts now. Keep your eyes a word ahead of your fingers, at a pace you can hold to the end.",
             "habit": "Read ahead",
             "sample": "The probe left orbit at dawn. Nobody on the crew said a word; they just watched the dark side of the moon slide past. \"We're on course,\" Mona said, and smiled. It was the quietest night of the whole trip.",
             "detours": ["Weakest key", "A hand or row that stands out", "Opposite-hand Shift"]},
        ],
    },
    {
        "id": "s6", "name": "Numbers",
        "stretch": "The number row, from the index fingers out",
        "recipe": "120–180 characters. 20–35% digits, in groups that read as real numbers (counts, years, distances) as well as drill.",
        "waypoints": [
            {"name": "4 and 7", "kind": "keys", "new": "47", "drill": "f4f j7j f4f j7j 47 74",
             "tip": "The number row is two rows up. Reach with your index finger from F or J, and come straight back.",
             "habit": "The long reach, then home",
             "sample": "f4f j7j f4f j7j 47 74 447 774; 4 moons, 7 stars, 47 ships, 74 probes; fly 47 days to Mars, then 74 more to the belt.",
             "detours": ["4 or 7 accuracy", "Number row"]},
            {"name": "5 and 6", "kind": "keys", "new": "56", "drill": "f5f j6j f5f j6j 56 65",
             "tip": "5 and 6 are the index fingers' far reaches: 5 belongs to the left hand, 6 to the right.",
             "habit": "6 on the right, always",
             "sample": "f5f j6j f5f j6j 56 65 456 567; 5 suns, 6 rings, 65 drones; dock 56 is next to dock 45, and 67 is far away.",
             "detours": ["5 or 6 accuracy", "Mix-up 5↔6, 4↔5, 6↔7"]},
            {"name": "3 and 8", "kind": "keys", "new": "38", "drill": "d3d k8k d3d k8k 38 83",
             "tip": "Middle fingers reach two rows up for 3 and 8. Use the same finger every time: the one the Action Deck lights.",
             "habit": "The right finger on far keys",
             "sample": "d3d k8k d3d k8k 38 83 348 837; 38 crew, 83 days, 3 ships at 8 docks; level 8 of 38 is clear.",
             "detours": ["3 or 8 accuracy", "Number row"]},
            {"name": "2 and 9", "kind": "keys", "new": "29", "drill": "s2s l9l s2s l9l 29 92",
             "tip": "Ring fingers reach for 2 and 9. Numbers are easy to fumble, so slow down rather than switch fingers.",
             "habit": "Slow down, don't switch fingers",
             "sample": "s2s l9l s2s l9l 29 92 239 982; 29 probes at 92 per cent; orbit 2 of 9; 2,349 stars by day 29.",
             "detours": ["2 or 9 accuracy", "Ring fingers"]},
            {"name": "1 and 0", "kind": "keys", "new": "10", "drill": "a1a ;0; a1a ;0; 10 01",
             "tip": "Little fingers reach for 1 and 0, the longest reaches on the keyboard. Come home after each one.",
             "habit": "Little fingers, long reach",
             "sample": "a1a ;0; a1a ;0; 10 01 100 1010; 10 ships, 100 stars, 1,000 miles; on day 1 of year 2010 we flew 10 laps.",
             "detours": ["1 or 0 accuracy", "Little fingers", "Number row"]},
            {"name": "Numbers", "kind": "review",
             "tip": "Numbers and words mix now. Keep each digit on its own finger, even inside a long number.",
             "habit": "Same finger every time",
             "sample": "On day 14 the 3 probes passed 2,560 stars. By day 30 they had logged 97,846 miles, and 7 of the 12 cameras still worked.",
             "detours": ["Weakest digit", "Number row", "Mix-ups between neighbouring digits"]},
        ],
    },
    {
        "id": "s7", "name": "Common symbols",
        "stretch": "- ! ( ) $ % @ # & *",
        "recipe": "140–200 characters. 8–15% symbols, at least half of them the Waypoint's new ones, inside text where people really use them.",
        "waypoints": [
            {"name": "- and !", "kind": "keys", "new": "-!", "drill": ";-; a!a ;-; a!a",
             "tip": "The hyphen is your right little finger, up and to the right. ! is Shift and 1, so hold Right Shift.",
             "habit": "Opposite-hand Shift on the number row",
             "sample": ";-; a!a ;-; a!a well-known, two-stage, half-full; Go! Ten-four! Stand by - here it comes! A five-day flight!",
             "detours": ["- or ! accuracy", "Opposite-hand Shift"]},
            {"name": "( and )", "kind": "keys", "new": "()", "drill": "l(l ;); l(l ;);",
             "tip": "Brackets are Shift with 9 and 0, typed by your right ring and little fingers, so hold Left Shift.",
             "habit": "Opposite-hand Shift",
             "sample": "l(l ;); l(l ;); (a) (b) (c); The probe (the small one) left at 10 (not 9). Dock 4 (left side) is open again.",
             "detours": ["( or ) accuracy", "Mix-up (↔9, )↔0"]},
            {"name": "$ and %", "kind": "keys", "new": "$%", "drill": "f$f f%f f$f f%f",
             "tip": "$ and % are Shift with 4 and 5, both on your left index finger. Hold Right Shift.",
             "habit": "Opposite-hand Shift",
             "sample": "f$f f%f f$f f%f $5 50% $12 99%; Fuel is 85% full. A refill costs $40, or $32 with 20% off.",
             "detours": ["$ or % accuracy", "Opposite-hand Shift"]},
            {"name": "@ and #", "kind": "keys", "new": "@#", "drill": "s@s d#d s@s d#d",
             "tip": "@ and # are Shift with 2 and 3, typed by your left ring and middle fingers, with Right Shift.",
             "habit": "Opposite-hand Shift",
             "sample": "s@s d#d s@s d#d #1 #42 crew@base; Mail mona@port.com about bay #7, and copy theo@port.com on ticket #318.",
             "detours": ["@ or # accuracy", "Opposite-hand Shift"]},
            {"name": "& and *", "kind": "keys", "new": "&*", "drill": "j&j k*k j&j k*k",
             "tip": "& and * are Shift with 7 and 8, on your right index and middle fingers, so hold Left Shift.",
             "habit": "Opposite-hand Shift",
             "sample": "j&j k*k j&j k*k Mars & Venus; salt & pepper; 2 * 6 is 12; note* (*see the map); Smith & Sons, est. 1987.",
             "detours": ["& or * accuracy", "Mix-up &↔7, *↔8"]},
            {"name": "Everyday symbols", "kind": "review",
             "tip": "Symbols are rare in text, so they stay slower for a while. Find each one by its finger and its number key.",
             "habit": "The right finger on rare keys",
             "sample": "Bay #4 (north side) is 80% full & ready! Fees are $25 - pay at mona@dock.net. Two-day passes cost $40 (or $36 with code #9).",
             "detours": ["Weakest symbol", "Opposite-hand Shift", "Number row"]},
        ],
    },
    {
        "id": "s8", "name": "Rare symbols",
        "stretch": "= + _ [ ] { } < > ^ \\ | ` ~",
        "recipe": "120–180 characters. 10–20% symbols. Text drawn from where these symbols live: sums, file paths, short code.",
        "waypoints": [
            {"name": "= + and _", "kind": "keys", "new": "=+_", "drill": ";=; ;+; ;_; ;=;",
             "tip": "= and + share the key right of the hyphen, and _ is Shift and hyphen. All three are your right little finger's.",
             "habit": "The right little finger's top corner",
             "sample": ";=; ;+; ;_; ;=; 2 + 2 = 4; x = y + 1; total_fuel = 50 + 12; snake_case and top_speed = 300.",
             "detours": ["= + _ accuracy", "Right little finger"]},
            {"name": "Brackets [ ] { }", "kind": "keys", "new": "[]{}", "drill": ";[; ;]; ;{; ;};",
             "tip": "The bracket keys sit above the apostrophe. Square brackets need no Shift; curly ones need Left Shift. All are your right little finger's.",
             "habit": "The right little finger's far keys",
             "sample": ";[; ;]; ;{; ;}; [1] [2] {a} {b}; list[0] = 7; map[4] = {x: 1}; mode = [on]; {name} is ready.",
             "detours": ["Bracket accuracy", "Mix-up [↔{, ]↔}"]},
            {"name": "< > and ^", "kind": "keys", "new": "<>^", "drill": "k<k l>l j^j k<k",
             "tip": "< and > are Shift with the comma and full stop. ^ is Shift and 6, on your right index finger.",
             "habit": "Opposite-hand Shift",
             "sample": "k<k l>l j^j k<k 3 < 4; 9 > 2; 2^3 = 8; x^2 + 1 > 0; <ok> and <done>; a < b > c.",
             "detours": ["< > ^ accuracy", "Mix-up <↔, and >↔."]},
            {"name": "\\ | ` and ~", "kind": "keys", "new": "\\|`~", "drill": ";\\; ;|; a`a a~a",
             "tip": "The far corners: backslash and | for your right little finger, ` and ~ for your left, at the top left.",
             "habit": "The little fingers' corners",
             "sample": ";\\; ;|; a`a a~a c:\\games\\astro; a | b; ~/home/mona; `run` and `stop`; about ~20 km away.",
             "detours": ["Corner key accuracy", "Little fingers"]},
            {"name": "Every key", "kind": "review",
             "tip": "That is the whole keyboard. Every key has its finger; keep it that way as you speed up.",
             "habit": "Same finger every time",
             "sample": "If fuel < 20% {warn = true;} else [ok]. Score ^2 + 5 = 30 | 40 ~ fine. Save to c:\\logs\\run_7 & mail #ops@base.",
             "detours": ["Weakest key on the keyboard", "Rare keys for coverage"]},
        ],
    },
    {
        "id": "s9", "name": "Open space (speed)",
        "stretch": "Every key. Each Waypoint opens the next on 2 Stars; the last never ends.",
        "recipe": "250–400 characters of real text with every key. Digits ≤5% and symbols ≤3% unless the Waypoint's kind of text says otherwise. 2-Star WPM rises about 5 a Waypoint.",
        "waypoints": [
            {"name": "Cruise 25", "kind": "speed", "wpm": 25,
             "tip": "Speed comes from reading ahead. Look at the next word while you type this one.",
             "habit": "Read ahead", "text": "Everyday prose",
             "detours": ["Slowest keys", "Weakest key", "Anything the orchestrator finds"]},
            {"name": "Cruise 30", "kind": "speed", "wpm": 30,
             "tip": "Relax your hands between words. Tight fingers are slow fingers.",
             "habit": "Relaxed hands", "text": "Prose with numbers (dates, counts, prices)",
             "detours": ["Slowest keys", "Number row"]},
            {"name": "Cruise 35", "kind": "speed", "wpm": 35,
             "tip": "If misses start to climb, ease off a little. Stars still need 95% here.",
             "habit": "Accuracy holds the Stars", "text": "Dialogue and quotes",
             "detours": ["Opposite-hand Shift", "Slowest keys"]},
            {"name": "Cruise 40", "kind": "speed", "wpm": 40,
             "tip": "Keep every key on its finger as you speed up. Old habits come back under pressure.",
             "habit": "Same finger under pressure", "text": "Everyday writing: messages, lists, addresses",
             "detours": ["Weakest symbols", "Slowest keys"]},
            {"name": "Cruise 45", "kind": "speed", "wpm": 45,
             "tip": "Long texts now. Keep a pace you can hold to the last line.",
             "habit": "Pace for the whole text", "text": "Long passages",
             "detours": ["Slowest keys", "Slowest Letter pairs (if #191 adds them)"]},
            {"name": "Cruise 50", "kind": "speed", "wpm": 50,
             "tip": "Fifty words a minute is fluent typing. From here, keep flying: the texts keep coming.",
             "habit": "Keep practising", "text": "Everything, and the generator fills in forever",
             "detours": ["Anything the orchestrator finds"]},
        ],
    },
]

# ---------------------------------------------------------------- generate samples

rng = random.Random(187)


def spellable(known, must=None, limit=None):
    out = [w for w in WORDS if set(w) <= known and (must is None or set(w) & must)]
    common = [w for w in out if WORDS[w] == 10]
    if len(common) >= 30:  # plenty of the commonest words: use only them
        out = common
    out.sort(key=lambda w: (WORDS[w], rng.random()))
    return out[:limit] if limit else out


def pseudo(known, must, n):
    """Made-up groups for Waypoints whose keys spell no words: each holds a must
    key, and no key comes three times in a row."""
    keys = sorted(k for k in known if k.isalpha())
    musts = sorted(k for k in must if k.isalpha())
    groups = []
    while len(groups) < n:
        size = rng.choice([3, 4, 4, 5])
        g = [rng.choice(musts)] + [rng.choice(keys) for _ in range(size - 1)]
        rng.shuffle(g)
        word = "".join(g)
        if re.search(r"(.)\1\1", word) or len(set(word)) < 2 or word in groups:
            continue
        groups.append(word)
    return groups


def pairs(new, known):
    out = []
    for k in sorted(new - {" "}):
        if k in ",.":  # punctuation pairs with the word it ends
            out += [x + k for x in "esd"]
            continue
        if k == "/":
            out += ["s/f", "a/b"] if "b" in known else ["s/f"]
            continue
        ranked = sorted(((PAIR.get(k + j, 0) + PAIR.get(j + k, 0), j)
                         for j in known if j not in (" ", k) and (j.isalpha() or j in ",.;/")),
                        reverse=True)
        for _, j in ranked[:3]:
            out.append(k + j if PAIR.get(k + j, 0) >= PAIR.get(j + k, 0) else j + k)
    return out


def pick(pool, n):
    """n different words, drawn from the commonest third of the pool (at least 30)."""
    head = pool[: max(len(pool) // 3, 30)]
    return rng.sample(head, min(n, len(head)))


def ladder(wp, known_before, known):
    new = set(wp.get("new", ""))
    parts = []
    if known_before - {" "}:
        opener = pick(spellable(known_before), 2) or pseudo(known_before, known_before - {" "}, 2)
        parts.append(("known", " ".join(opener)))
    if wp["kind"] != "review":
        parts.append(("drill", wp["drill"]))
        parts.append(("pairs", " ".join(pairs(new, known))))
    words_new = spellable(known, new - {" "} if wp["kind"] != "review" else None)
    if len(words_new) >= 8:
        parts.append(("words", " ".join(pick(words_new, 7 if wp["kind"] != "review" else 10))))
    else:
        fill = words_new + pseudo(known, (new - {" "}) or (known - {" "}), 7 - len(words_new))
        parts.append(("words", " ".join(fill)))
    mixed = spellable(known)
    line = pick(mixed, 5) if len(mixed) >= 12 else mixed[:3] + pseudo(known, known - {" "}, 5 - min(3, len(mixed)))
    parts.append(("mixed", " ".join(line)))
    return parts


def check(sample, known, new, kind):
    bad = sorted(set(sample) - known - {" "})
    # A Shift Waypoint needs some of its capitals, not all; the rest need every new key.
    missing = [] if kind == "shift" and set(new) & set(sample) else sorted(set(new) - set(sample) - {" "})
    return {"ok": not bad and not missing, "badKeys": bad, "missingNew": missing, "length": len(sample)}


known = set()
order = 0
runs = 0
for sector in SECTORS:
    sector_keys = set()
    for wp in sector["waypoints"]:
        order += 1
        wp["n"] = order
        before = set(known)
        new = set(wp.get("new", ""))
        if wp["kind"] == "shift" and wp["name"] == "? and :":
            new = {"?", ":"}
        known |= new
        sector_keys |= new
        wp["known"] = "".join(sorted(k for k in known if k != " "))
        if wp["kind"] in ("keys", "review") and "sample" not in wp and sector["id"] in ("s1", "s2", "s3"):
            if wp["kind"] == "review":
                wp["drill"] = None
            parts = ladder(wp, before, known)
            wp["ladder"] = [{"part": p, "text": t} for p, t in parts]
            wp["sample"] = " ".join(t for _, t in parts)
            wp["generated"] = True
        if "sample" in wp:
            wp["check"] = check(wp["sample"], known, new, wp["kind"])
        letters = {k for k in known if k.isalpha() and k.islower()}
        wp["words"] = len([w for w in WORDS if set(w) <= letters and WORDS[w] <= 20])
        runs += 4 if wp["kind"] == "review" else 5
        wp["runsBy"] = runs
        wp["dayBy"] = round(runs / 10, 1)

json.dump({"sectors": SECTORS, "waypointCount": order}, sys.stdout, ensure_ascii=False, indent=1)
