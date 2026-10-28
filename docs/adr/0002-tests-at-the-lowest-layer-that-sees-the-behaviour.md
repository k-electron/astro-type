# Tests sit at the lowest layer that can see the behaviour

A test lives in the cheapest layer that can see what it checks, and each layer has one job. Game rules and the machine's promises are headless unit tests on the `Game`, with the Run clock stepped by hand. What the player reads and clicks on the React screens is a DOM test over a real headless game. The CI browser suite is a few journeys for what only a real browser proves: the Action Deck and its accessibility layer, native keyboard and focus, the real frame loop, the Save across a reload, and one smoke journey. Tests that need a real browser but are too heavy for CI's runner (effect pixels, the real-time loop, one full Stage played for real) form a local-only suite. The look is frozen in a few screenshot frames. We chose this because the first CI run of 162 browser tests, each on a software-GL deck on a 2-vCPU runner, blew the 20-minute cap: most of them checked rules and React screens that need no browser at all.

## Consequences

- CI is a strict subset of `pnpm verify`. The local suite is absent under `CI`, so it can rot; every gameplay or Action Deck change runs it before landing.
- DOM tests see what a player sees and nothing else: no store, no machine. happy-dom has no CSS, layout, scrolling, canvas or native key activation, so those facts stay in a browser.
- How to write each kind of test, and the overlap rule that keeps a higher layer from repeating a lower one, are in `docs/agents/testing.md`.
