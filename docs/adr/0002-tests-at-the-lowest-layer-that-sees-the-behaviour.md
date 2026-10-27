# Tests sit at the lowest layer that can see the behaviour

A test lives in the cheapest layer that can see what it checks. Game rules and the machine's promises are headless unit tests on `createGame`, with the Run clock stepped by hand. What the player reads and clicks on the React screens is a DOM test: Vitest with happy-dom, through `renderGame()`, which mounts the real App over a headless game with the PixiJS deck replaced at its session seam. The CI browser suite is a few journeys for what only a real browser proves: the Action Deck and its accessibility layer, motion on the real or a stopped clock, native keyboard and focus, the Save across a reload, the screenshots and one `@smoke`. Tests that need a real browser but are too heavy for CI's runner (effect pixels, long Streak and Overdrive climbs, the hit-popup matrix, full Stage Runs) form a local-only suite. We chose this because the first CI run of 162 browser tests, each on a software-GL deck on a 2-vCPU runner, blew the 20-minute cap: most of them checked rules and React screens that need no browser at all.

## Consequences

- CI is a strict subset of `pnpm verify`: typecheck, Biome, unit and DOM tests, the build, the CI journeys and the local suite in one Playwright run, then the screenshots in Docker. The local suite is absent under `CI`, and CI runs the screenshots in a job of their own.
- DOM tests find things by role and visible text only. The harness gives no access to the store or the machine. happy-dom has no CSS, layout, scrolling, canvas or native key activation, so those facts stay in a browser.
- The harness injects the game through the `GameProvider` seam (`src/store/gameContext.tsx`; the `appGame.ts` singleton is a tripwire in tests), replaces the deck session, and stubs what happy-dom lacks or the screens must not run (`ResizeObserver`, `requestAnimationFrame`, confetti). A move the machine refuses still fails the test.
- CI journeys share one launch each, check facts with `expect.soft` inside `test.step`, and may use `page.clock` to keep the deck still while keys are typed. The suite must fit well under the CI job's time budget.
- The local suite never runs in CI, so it can rot. Every gameplay or Action Deck change runs it before landing, and the play-check subagent runs it.
- A rule that only a browser test guarded gets a headless test before that browser test is deleted.
