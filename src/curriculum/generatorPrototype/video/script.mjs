// PROTOTYPE: what each walkthrough video plays and says (#189).
import { makeRun } from './videos.mjs';

const K = (...keys) => ({ type: 'keys', keys });
const E = { wp: 6, target: K('e'), phase: 'p6' };
const L4 = { wp: 4, target: K('l'), phase: 'p4' };
const PAREN = { wp: 40, target: K('(', ')'), phase: 'p40' };
const SENT = { wp: 24, target: K('e'), phase: 'p24' };
const MIX = { wp: 8, target: { type: 'mixup', expected: 'e', typed: 'd' }, phase: 'p8', weak: ['e'], mixup: { expected: 'e', typed: 'd' } };

const R = (spec, say) => ({ ...makeRun(spec), say, option: spec.optionLabel });

export const VIDEOS = [
  {
    id: 'v01', part: 1, title: 'F and J: before any word exists', spoken: 'F',
    intro: 'Part one shows the proposal, one point on the path at a time. Each video plays the first two Runs of a Detour, typed by a model of a learner at that point. This one is day one, at F and J. The player types about six words a minute, and the F key keeps slipping.',
    runs: [
      R({ wp: 1, target: K('f'), run: 1, phase: 'p1' }, {
        card: 'Run one is a drill. Only F, J and the space bar exist, so the generator has two shapes to use: repeats, like F F F, and alternation with J.',
        during: 'This is real time. Watch the lit keycap and the hands on the Action Deck. That is where a new key is looked at, never the real keyboard.',
      }),
      R({ wp: 1, target: K('f'), run: 2, phase: 'p1' }, {
        card: 'Run two would normally move on to words, but no word can be spelled from F and J. So it stays a drill, in a different order. This is where a Detour is most repetitive.',
        during: 'At six words a minute, sixty characters take nearly two minutes, so the rest is fast forwarded.',
        after: 'F was right first time {r} times out of {o}. Whether to offer a Detour this early at all is the orchestrator\'s call. This is what one would look like.',
      }),
    ],
  },
  {
    id: 'v02', part: 1, title: 'A and ;: where real words run out', spoken: 'L',
    intro: 'Day two, at A and semicolon. The player has all eight home keys now, and L is the weak one. Only twelve common words use these keys and hold an L.',
    runs: [
      R({ ...L4, run: 1 }, {
        card: 'Run one drills L with its neighbours, K and the semicolon, and with S, its mirror key on the other hand.',
        during: 'The model types about eight words a minute and misses more on L than anywhere else.',
      }),
      R({ ...L4, run: 2 }, {
        card: 'Run two is words. With fewer than fifteen real words, the generator tops them up with made-up words, built and checked ahead of time from common letter pairs. Look at them closely. This is the weakest looking text in the proposal, and part two shows two other ways to handle it.',
        during: 'Every word, real or made-up, holds at least one L.',
      }),
    ],
  },
  {
    id: 'v03', part: 1, title: 'E and I: from drill to words', spoken: 'E',
    intro: 'Day three. E and I have just arrived, the first reach off the home row, and this player\'s E is weak. From here on, real words are plentiful: about eighty common ones hold an E.',
    runs: [
      R({ ...E, run: 1 }, {
        card: 'Run one is a drill: E with its anchor D, with its mirror key I, and on its own.',
        during: 'Nine words a minute. Notice the pauses. Finding the next key, and now and then a look at the deck, is part of being a beginner.',
      }),
      R({ ...E, run: 2 }, {
        card: 'Run two is a plain list of common words, every one holding an E. Words with two Es, like feel and feeds, come up more often. Never sentences.',
        during: 'Words are harder than drills. The finger has to find E between other keys, which is what the Waypoint\'s own Stages ask for.',
        after: '{r} of {o} Es right first time. In the proposal, a Detour\'s test reads a words Run, never a drill, because a drill makes any key look easy.',
      }),
    ],
  },
  {
    id: 'v04', part: 1, title: 'A Mix-up: E typed as D', spoken: 'E',
    intro: 'Day four, at the home row review. This player keeps typing D when they mean E: the same finger, one row apart. That is a Mix-up, and a Detour can aim at it.',
    runs: [
      R({ ...MIX, run: 1 }, {
        card: 'The drill puts the two keys side by side: E D E, D E D. The point is to feel the difference between the reach and the home key.',
        during: 'Watch for a D where an E should be. When this model misses an E, it nearly always types D.',
      }),
      R({ ...MIX, run: 2 }, {
        card: 'The words lean towards ones holding both E and D, like added, ladies and aside, so the finger has to choose between them inside a word.',
      }),
    ],
  },
  {
    id: 'v05', part: 1, title: 'Q and P: a rare key', spoken: 'Q',
    intro: 'Day six, at Q and P. Q is rare in English, so a player meets it seldom and it stays weak. It belongs to the left little finger, the weakest finger.',
    runs: [
      R({ wp: 12, target: K('q'), run: 1, phase: 'p12' }, {
        card: 'The drill pairs Q with its mirror key P, its neighbour W, and its home key A.',
      }),
      R({ wp: 12, target: K('q'), run: 2, phase: 'p12' }, {
        card: 'About a hundred common words hold a Q, so even a rare key gets a full list: quest, liquid, quality. Nearly every Q comes with a U, which is real English, and good practice.',
        after: 'Q is still hard here: {r} of {o} right first time. A Detour that ends without passing its test simply returns, and is not offered again that day.',
      }),
    ],
  },
  {
    id: 'v06', part: 1, title: 'A finger: the left little finger', spoken: 'A and Q',
    intro: 'Day seven, at the top row review. Here the target is a finger rather than a key: everything the left little finger types, which so far is A and Q.',
    runs: [
      R({ wp: 13, target: { type: 'finger', finger: 'LP' }, run: 1, phase: 'p13' }, {
        card: 'The drill mixes A and Q, the home key and the reach above it.',
      }),
      R({ wp: 13, target: { type: 'finger', finger: 'LP' }, run: 2, phase: 'p13' }, {
        card: 'The words hold A or Q, and words with more of them come up more often. A finger Detour ends up mostly about A, because A is far more common than Q.',
      }),
    ],
  },
  {
    id: 'v07', part: 1, title: 'Left Shift: Opposite-hand Shift', spoken: 'capitals',
    intro: 'Day eleven, at Left Shift. Only capitals typed by the right hand exist yet: H, J, K, L, U, I, O, P, Y, N and M. The habit is holding Left Shift with the left little finger.',
    runs: [
      R({ wp: 21, target: { type: 'shift' }, run: 1, phase: 'p21' }, {
        card: 'The drill uses the fourth shape, Shift pairs: capital J, small j. Each pair is the Shift habit in miniature.',
        during: 'The model uses the Shift on the other side three times out of four. A capital costs a beginner about twice the time of a letter.',
      }),
      R({ wp: 21, target: { type: 'shift' }, run: 2, phase: 'p21' }, {
        card: 'Run two is words, most of them starting with a capital learned so far. Words that start with a left-hand letter stay small, because those capitals come at the next Waypoint.',
      }),
    ],
  },
  {
    id: 'v08', part: 1, title: '4 and 7: numbers from the digits learned', spoken: 'four and seven',
    intro: 'Day fifteen, at 4 and 7, the first number keys. A Detour\'s numbers can only use the digits learned so far, so for now they are all fours and sevens.',
    runs: [
      R({ wp: 29, target: K('4', '7'), run: 1, phase: 'p29' }, {
        card: 'The drill reaches from F up to 4, and from J up to 7, two rows up, and back home.',
      }),
      R({ wp: 29, target: K('4', '7'), run: 2, phase: 'p29' }, {
        card: 'Run two mixes words and numbers. With only two digits the numbers look odd. They get richer at each later Waypoint. The comma groups thousands, because it is already known.',
      }),
    ],
  },
  {
    id: 'v09', part: 1, title: 'Brackets: symbols in the shape people use them', spoken: 'brackets',
    intro: 'Day twenty-one, at the everyday symbols review. This player\'s brackets are weak. Brackets are Shift with 9 and 0, on the right ring and little fingers.',
    runs: [
      R({ ...PAREN, run: 1 }, {
        card: 'The drill anchors each bracket on its finger\'s home key: L, bracket, L.',
      }),
      R({ ...PAREN, run: 2 }, {
        card: 'In the words Run, symbols appear the way people use them. A bracket wraps a word. A dollar sign would sit on a number, a hyphen would join two words. It is still a word list, not prose.',
      }),
    ],
  },
  {
    id: 'v10', part: 1, title: 'Cruise 40: a slow K at speed', spoken: 'K',
    intro: 'Day twenty-eight, in the speed Sector at Cruise 40. This player types about thirty-six words a minute and is stuck below the two-Star bar. Their K is slow.',
    runs: [
      R({ wp: 49, target: K('k'), run: 1, phase: 'p49' }, {
        card: 'Even here, Run one is a short drill on K and its neighbours. At this speed it takes about twenty seconds.',
      }),
      R({ wp: 49, target: K('k'), run: 2, phase: 'p49' }, {
        card: 'Run two is the full length, over three hundred characters of common words holding K. It is never prose: the generator does not write sentences. Prose stays in the Library.',
      }),
    ],
  },
  {
    id: 'v11', part: 2, title: 'Call A: how a Detour\'s Runs step', spoken: 'E',
    intro: 'Part two shows the open calls. First, how a Detour\'s Runs step. The proposal makes Run one a drill and every later Run words, as you saw at E and I. Here are the two alternatives, for the same player and the same weak E.',
    runs: [
      R({ ...E, run: 1, options: { steps: 'mini-ladder' }, optionLabel: 'Alternative 1 · a mini ladder in every Run' }, {
        card: 'Alternative one: every Run is a mini ladder. A few seconds of drill, then words, every time. It is closer to the Waypoint\'s own Stages, but the Detour\'s test would then read a Run that includes drill.',
      }),
      R({ ...E, run: 1, options: { steps: 'words-first' }, optionLabel: 'Alternative 2 · words from Run 1' }, {
        card: 'Alternative two: no drill at all, words from Run one. It gets to real typing fastest, but a weak key never gets a moment on its own.',
        after: 'So: drill then words, a mini ladder every time, or words from the start?',
      }),
    ],
  },
  {
    id: 'v12', part: 2, title: 'Call B: plain lists or dressed like the Waypoint', spoken: 'E',
    intro: 'Second call: how a words Run looks. The proposal shows plain lowercase lists, unless the Target is capitals or a symbol. The alternative dresses the list like the Waypoint\'s own text, with the capitals and punctuation the player has learned. Same player both times, at Sentences, with a weak E.',
    runs: [
      R({ ...SENT, run: 2, optionLabel: 'Proposal · a plain list' }, {
        card: 'The proposal: a plain list of words. Clearly practice, with nothing to misread.',
      }),
      R({ ...SENT, run: 2, options: { look: 'dressed' }, optionLabel: 'Alternative · dressed like the Waypoint' }, {
        card: 'Dressed: a capital to start, commas and full stops sprinkled in, and a capital after each full stop. It is closer to what the Waypoint will test, but it starts to read like sentences that make no sense.',
        after: 'So: plain lists, or dressed like the Waypoint\'s text?',
      }),
    ],
  },
  {
    id: 'v13', part: 2, title: 'Call C: when real words run out', spoken: 'L',
    intro: 'Third call: what happens when fewer than fifteen real words fit. You saw the proposal at A and semicolon, real words topped up with made-up ones. Here are the two alternatives, for the same weak L.',
    runs: [
      R({ ...L4, run: 2, options: { scarce: 'repeat' }, optionLabel: 'Alternative 1 · real words only, repeated' }, {
        card: 'Alternative one: real words only, repeated. Every word is real, but the list is short and keeps coming back.',
      }),
      R({ ...L4, run: 2, options: { scarce: 'drill' }, optionLabel: 'Alternative 2 · drill until words are plentiful' }, {
        card: 'Alternative two: no words at all until there are enough. The Detour stays a drill, as it does at F and J.',
        after: 'So: made-up words, repeated real words, or drill only?',
      }),
    ],
  },
  {
    id: 'v14', part: 2, title: 'Call D: symbols on words, or as drill', spoken: 'brackets',
    intro: 'Last call: how symbols appear in a words Run. The proposal wraps words in the symbol\'s real shape, like a word in brackets, as you saw at the everyday symbols review. The alternative puts drill groups for the symbol between plain words.',
    runs: [
      R({ ...PAREN, run: 2, options: { symbols: 'drill' }, optionLabel: 'Alternative · drill groups between words' }, {
        card: 'Drill groups: L, bracket, L, between words. Every bracket sits on its anchor key, but it looks nothing like brackets in real text.',
        after: 'So: real shapes, or drill groups between words?',
      }),
    ],
  },
];
