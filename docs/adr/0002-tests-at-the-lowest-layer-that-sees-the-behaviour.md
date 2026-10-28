# Tests sit at the lowest layer that can see the behaviour

A test lives in the cheapest layer that can see what it checks, and each layer has one job. Game rules and the machine's promises are headless unit tests on `createGame`, with the Run clock stepped by hand. What the player reads and clicks on the React screens is a DOM test: Vitest with happy-dom, through `renderGame()`, which mounts the real App over a headless game with the PixiJS deck replaced at its session seam. The CI browser suite is a few journeys for what only a real browser proves: the Action Deck and its accessibility layer, native keyboard and focus, the real frame loop, the Save across a reload, and one `@smoke`. Tests that need a real browser but are too heavy for CI's runner (effect pixels, the real-time loop, one full Stage played for real) form a local-only suite. The look is frozen in a few screenshot frames. We chose this because the first CI run of 162 browser tests, each on a software-GL deck on a 2-vCPU runner, blew the 20-minute cap: most of them checked rules and React screens that need no browser at all.

## One job per layer

- **Unit:** game rules and the machine's promises, through the `Game` only (`send`, `pressKey`, `step`, the Profile commands, what it reports), set up with the one test-helpers module and the one Save builder.
- **DOM:** what the player reads and clicks on the React screens, and the wiring from screens to the `Game`. It also holds the seeded random walk, which clicks whatever is visible and presses Esc while the harness fails the test on any refused move (`expectNoRefusedMove` names the step).
- **CI browser:** only what a real browser proves: the deck and its accessibility layer, native keys and focus, the real frame loop, real storage across a reload, and `@smoke`.
- **Local:** real-browser checks too heavy for the runner: effect pixels, the real-time loop, and one full Stage played for real.
- **Screenshots:** the look, frozen at a few key frames.

## The overlap rule

A higher-layer test stays only if it proves something the lower layer can't see. A rule that only a browser test guards gets a headless test before the browser test is deleted. Before a test is deleted or merged, say what it guarded and which test guards it now.

## Consequences

- CI is a strict subset of `pnpm verify`: typecheck, Biome, unit and DOM tests, the build, the CI journeys and the local suite in one Playwright run, then the screenshots in Docker. The local suite is absent under `CI`, and CI runs the screenshots in a job of their own.
- DOM tests find things by role and visible text only. The harness gives no access to the store or the machine. happy-dom has no CSS, layout, scrolling, canvas or native key activation, so those facts stay in a browser.
- The harness injects the game through the `GameProvider` seam (`src/screens/useGame.tsx`; the `appGame.ts` singleton is a tripwire in tests), replaces the deck session, and stubs what happy-dom lacks or the screens must not run (`ResizeObserver`, `requestAnimationFrame`, confetti). A move the machine refuses still fails the test.
- CI journeys share one launch each, check facts with `expect.soft` inside `test.step`, and may use `page.clock` to keep the deck still while keys are typed. The suite must fit well under the CI job's time budget.
- The local suite never runs in CI, so it can rot. Every gameplay or Action Deck change runs it before landing, and the play-check subagent runs it.
- A test restates rule numbers (prices, Multiplier steps, Judgement windows, Star thresholds), because it is their oracle, and imports everything incidental (Stage text, copy, the Save key, defaults, headings, types). `docs/agents/testing.md` is the only how-to.
