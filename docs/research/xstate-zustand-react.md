# XState v5, Zustand and React: how the sources say they fit together

Research for [#48](https://github.com/k-electron/astro-type/issues/48), under the map [#47](https://github.com/k-electron/astro-type/issues/47). Written 2026-10-26.

**Versions read:** `xstate` 5.33.3, `@xstate/react` 6.1.0, `@xstate/store` 4.3.0, and `zustand` 5.0.16, taken from the `main` branches of the [statelyai/xstate](https://github.com/statelyai/xstate), [statelyai/docs](https://github.com/statelyai/docs) and [pmndrs/zustand](https://github.com/pmndrs/zustand) repos on the date above. astro-type pins `xstate ^5.33.2` and `zustand ^5.0.15`, and doesn't install `@xstate/react`.

**How much to trust each source:** Stately's docs and blog, the xstate source and examples, and Zustand's docs, README and source are primary sources. Anything else is marked where it's used. *TkDodo* (Dominik Dorfmeister) has contributed to Zustand but isn't a maintainer. Third-party packages listed on Zustand's docs are listed there, not endorsed.

This file reports facts and the patterns the sources recommend. It does not choose astro-type's target architecture; that is a later grilling ticket.

---

## Bottom line

1. **No primary source documents using an XState machine and a Zustand store together.** Neither library's docs, examples or maintainers describe this pairing, or say how the two should call each other. Stately's own answer to "a machine plus a store" is a different library, `@xstate/store`, whose stores can run as actors inside an XState system (`fromStore`). Zustand's docs list two third-party middlewares that go the other way and put XState inside a Zustand store. Whatever astro-type does at the seam is its own design, not something it can copy from the docs.
2. **Each library separately recommends the same React shape for a store built outside React:** put the instance in React context and read slices with a selector hook. For Zustand that's `createStore` plus `useStore(store, selector)` behind a custom hook. For XState it's `createContext(actor)` plus `useSelector(actor, selector)`. `@xstate/react`'s `createActorContext` *builds its own actor* inside the Provider, so it can't take an actor built elsewhere, such as one from `createGame`.
3. **XState's documented way to swap a machine's effects and dependencies is `machine.provide({ actions, guards, actors })`,** with named actions declared in `setup`. Closing over dependencies in a factory function is what the docs call "the old way", though they say it about context data (`input`).
4. **Outside React, both libraries expose plain subscriptions.** A Zustand vanilla store has `subscribe((state, prev) => …)` (plus `subscribeWithSelector`), and its README recommends this pattern for "transient updates" that should cause no React render. An XState actor has `actor.subscribe(…)` and `actor.on(emittedType, …)`. Neither library needs a singleton: you can pass either object around like any other value.
5. **For effects such as sound, XState documents three mechanisms:** named custom actions, `emit` plus `actor.on`, and callback actors that `receive` events. Zustand's own docs put effects in store actions, in "functions wrapping the state functions", or in subscriptions. None of the sources ranks these mechanisms, or mentions audio or game effects at all.
6. **Zustand's `persist` middleware writes the whole partialized state on every `set`.** It supports a custom storage, `partialize`, `version`/`migrate`, `merge` and hydration hooks, but it has no schema validation and nothing like "move an unreadable Save aside". None of the sources mentions a hand-written `update(patch)` helper, either for or against.

---

## 1. Reaching a machine actor and a store from React

### XState (`@xstate/react`)

- **The hooks:**
  - `useActor` / `useMachine` create an actor that "runs for the lifetime of the component".
  - `useActorRef` returns "a static reference … which will not rerender when its state changes".
  - `useSelector(actorRef, selector, compare?)` "will only cause a rerender if the selected value changes". The default compare is `===`, and `shallowEqual` is exported for selectors that return objects or arrays.

  Source: [stately.ai/docs/xstate-react](https://stately.ai/docs/xstate-react).
- **`createActorContext(logic, options?)`** returns `{ Provider, useSelector, useActorRef }` ([docs](https://stately.ai/docs/xstate-react#createactorcontextlogic)). In the source, the Provider calls `useActorRef(providedLogic, options)`, so it *creates* the actor. Its props are `logic` and `options`, and there is no prop for passing an existing actor ([createActorContext.ts](https://github.com/statelyai/xstate/blob/main/packages/xstate-react/src/createActorContext.ts)). Stately's trivia game example uses this (`createActorContext(triviaMachine)`), and each component calls `TriviaMachineContext.useSelector(…)` ([AppContext.tsx](https://github.com/statelyai/xstate/blob/main/examples/trivia-game-example/src/context/AppContext.tsx)).
- **An actor built outside React:** Stately's blog post "Global state with XState and React" (David Khourshid, 2024-02-12) recommends two ways:
  - Export a started actor from a module and use `useSelector(actor, …)` and `actor.send(…)` in any component, "either by passing it as a prop or referencing it directly from module scope".
  - Pass it through a plain React context: `createContext(someActor)`, then `useContext` plus `useSelector`.

  The post says "Think of an actor as a 'store'" ([blog](https://stately.ai/blog/2024-02-12-xstate-react-global-state)).
- **What `useSelector` accepts:** it is built on `useSyncExternalStoreWithSelector` and takes anything with `subscribe` and `getSnapshot`, where `subscribe` returns `{ unsubscribe }` ([useSelector.ts](https://github.com/statelyai/xstate/blob/main/packages/xstate-react/src/useSelector.ts)). A Zustand store's `subscribe` returns a bare function, so it doesn't fit as is.
- **React 19:** `@xstate/react`'s peer range includes `^19.0.0` (its `package.json`). The docs give no React 19-specific guidance.

### Zustand

- **Context:** Zustand's README says "The store created with `create` doesn't require context providers. In some cases, you may want to use contexts for dependency injection or if you want to initialize your store with props … The recommended method available since v4 is to use the vanilla store" ([README, React context](https://github.com/pmndrs/zustand/blob/main/README.md#react-context)). The guide gives the full recipe: `createStore` in a factory, `createContext<Store | null>(null)`, a Provider that creates the store once with `useState(() => createStore())`, and a custom hook that throws without a Provider and returns `useStore(store, selector)` ([Initialize state with props](https://zustand.docs.pmnd.rs/learn/guides/initialize-state-with-props)). `useStore` is documented for both global and scoped vanilla stores ([useStore](https://zustand.docs.pmnd.rs/reference/hooks/use-store)).
- **Selectors:** v5 needs React 18 or later ([Migrating to v5](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)) and uses `React.useSyncExternalStore` directly (`src/react.ts`). A selector that returns a new object needs `useShallow` ([Initialize state with props](https://zustand.docs.pmnd.rs/learn/guides/initialize-state-with-props), [Migrating to v5](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)).
- **Actions:**
  - "The recommended usage is to colocate actions and states within the store."
  - The documented alternative is module-level functions that call `setState`. These "don't require a hook to call an action", and the docs say the pattern "doesn't offer any downsides" ([Practice with no store actions](https://zustand.docs.pmnd.rs/learn/guides/practice-with-no-store-actions)).
  - The Flux page recommends a single store, updating through `set`/`setState`, and colocating actions ([Flux inspired practice](https://zustand.docs.pmnd.rs/learn/guides/flux-inspired-practice)).
- **Practitioner guidance (TkDodo):**
  - Export only custom hooks.
  - Prefer atomic selectors.
  - Put actions in one stable `actions` object behind one hook, since "actions never change".
  - "Model actions as events, not setters."
  - Keep stores small.

  For stores in context, he notes that the store reference is stable, so context causes no re-renders, and that a store per test tree needs no reset ([Working with Zustand](https://tkdodo.eu/blog/working-with-zustand), [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context)).

### One context or two, and prop-drilling

- **One context or two:** the sources are silent. Each library documents its own context, and none discusses one context carrying an object that holds both.
- **Prop-drilling actions:** no source discusses it by name. In every documented pattern, the component that needs an action reaches the store or actor itself (through the context hook, `getState()`, a module import or the actor ref) and calls the action or `send`. No pattern passes actions down as props.

## 2. How a machine should change store data

### What XState documents

- **Data belongs in the machine:** "In XState, `context` is how you store data in a state machine actor." Context is immutable and changes only through `assign` ([Context](https://stately.ai/docs/context)). In the actor model, "An actor has its own internal, encapsulated state that can only be updated by the actor itself", and state is shared only "by sending events to other actors" or "emitting snapshots" ([Actors](https://stately.ai/docs/actors#actor-model)). XState's own game example (Snake) keeps all game data in `context` ([snakeMachine.ts](https://github.com/statelyai/xstate/blob/main/examples/snake-react/src/snakeMachine.ts)).
- **Effects go in named actions:** "Actions are fire-and-forget effects." Implementations are declared in `setup({ actions })` and referenced by name. Inline action functions are "useful for prototyping and simple cases but we generally recommended using action objects" ([Actions](https://stately.ai/docs/actions)). Calling an outside object, such as a store, from a named custom action is the documented shape for any side effect. The docs never mention a store specifically.
- **Swapping implementations:** "You can override default implementations by providing implementations via `machine.provide(...)`". This covers actions, actors, guards and delays ([Machines, providing implementations](https://stately.ai/docs/machines#providing-implementations)). The `input` docs describe a factory function that closes over values as "the old way", but they say this about context data, not implementations ([Input, use-cases](https://stately.ai/docs/input#use-cases)).
- **Guards:** "Guards should be pure, synchronous functions" ([Guards](https://stately.ai/docs/guards)).
- **Built-in actions:** `assign`, `sendTo` and `raise` "are not imperative" and must not be called inside custom action functions. `enqueueActions(({ enqueue, check }) => …)` is the documented way to choose actions conditionally inside one action ([Actions, built-in actions and enqueue actions](https://stately.ai/docs/actions#enqueue-actions)).
- **Talking to other actors:** `sendTo`, and `system.get(systemId)` for actors registered with the system ([Systems](https://stately.ai/docs/system)).
- **Testing without effects:** `transition(machine, snapshot, event)` returns `[nextState, actions]` without running them ([Pure transition functions](https://stately.ai/docs/pure-transitions)).

### When actions run (from the source; the docs don't say)

In `Actor._process`, `logic.transition(…)` runs first. While the actor is running, custom actions and `emit` handlers execute synchronously *inside* that transition. Only after it returns does `update()` set the actor's snapshot and notify subscribers ([createActor.ts](https://github.com/statelyai/xstate/blob/main/packages/core/src/createActor.ts), `_process`, `actionExecutor`, `update`). If an action throws during the transition, the actor's snapshot becomes `status: 'error'`.

So when a machine action calls a Zustand action that runs `set()`, Zustand notifies its subscribers synchronously (`src/vanilla.ts`) while `actor.getSnapshot()` still returns the *previous* screen and phase. Nothing in either library makes the two updates one transaction.

### Stately's own "machine plus store": `@xstate/store`

- `@xstate/store` is "comparable to libraries like Zustand, Redux, and Pinia. For more complex state management, you should use XState instead, or you can use XState Store with XState" ([@xstate/store](https://stately.ai/docs/xstate-store)). `fromStore(…)` turns store logic into XState actor logic, so the store runs as an actor ([Using with XState](https://stately.ai/docs/xstate-store#using-with-xstate)).
- Stately's comparison page puts the difference this way:
  - "Zustand actions can do whatever the action function does."
  - XState Store's updates are named events, with `store.can.*(…)` and effects enqueued from transitions.
  - Choose Zustand "when … direct actions and setters are the natural model for your state".

  Source: [Compare to Zustand](https://stately.ai/docs/xstate-store/compare-zustand).

### Zustand-side middlewares (third-party, listed on Zustand's docs)

Both are listed on [Third-party libraries](https://zustand.docs.pmnd.rs/reference/integrations/third-party-libraries):

- [`zustand-middleware-xstate`](https://github.com/biowaffeln/zustand-middleware-xstate) puts a machine *inside* a Zustand store, exposed as `{ state, send, actor }`. Its last push was 2024-07.
- [`zustand-xs`](https://github.com/zustandjs/zustand-xs) is in the `zustandjs` org and gives Zustand evented updates in the `@xstate/store` style. Its README gives the motivation as "Just for fun."

### Where the sources are silent

- Whether machine actions should call Zustand store methods.
- Passing the store to the machine as `input`.
- Which library should own derived values.

The only community thread found, [statelyai/xstate#4790](https://github.com/statelyai/xstate/discussions/4790), asks about using Zustand or Jotai beside machines and has no maintainer answer.

## 3. A non-React consumer (a PixiJS scene on its own frame loop)

- **Zustand:**
  - A vanilla store exposes `getState`, `setState`, `subscribe` and `getInitialState` "without the React dependency".
  - `subscribe(listener)` "fires synchronously on every change", and the listener receives `(state, prevState)` (`src/vanilla.ts`).
  - The README's "Transient updates" recipe binds "to a state-portion without forcing re-render on changes … when you are allowed to mutate the view directly".
  - `subscribeWithSelector` adds `subscribe(selector, listener, { equalityFn, fireImmediately })`.

  Sources: [README, outside components / without React / transient updates](https://github.com/pmndrs/zustand/blob/main/README.md#readingwriting-state-and-reacting-to-changes-outside-of-components), [subscribeWithSelector](https://zustand.docs.pmnd.rs/reference/middlewares/subscribe-with-selector).
- **XState:** `actor.subscribe(observer)` returns `{ unsubscribe }` ([Actors, subscriptions](https://stately.ai/docs/actors#subscriptions)), and `actor.on(type | '*', handler)` listens for emitted events ([Event emitter](https://stately.ai/docs/event-emitter)).
- **Without a singleton:** both libraries' objects are ordinary values that can be passed in a constructor or a function argument. The Zustand docs present dependency injection only through React context. The Stately blog shows both a module import and a prop. For a non-React consumer, the sources show either importing a module or holding a reference, and say nothing about canvas or frame-loop code specifically.
- **Clocks and ticks in XState's own game example:** Snake drives its ticks with a `fromCallback` actor (`setInterval` → `sendBack({ type: 'TICK' })`) invoked in the `Moving` state, so the interval runs only while that state is active ([snakeMachine.ts](https://github.com/statelyai/xstate/blob/main/examples/snake-react/src/snakeMachine.ts), [Callback actors](https://stately.ai/docs/callback-actors)). The example has nothing about rendering on its own frame loop.

## 4. Wiring a side-effect port (sound)

- **XState mechanisms (none ranked for this use):**
  - Named custom actions, swappable with `provide` ([Actions](https://stately.ai/docs/actions)). In tests, provide no-ops.
  - `emit(event)` plus `actor.on(…)`. Available "since XState version 5.9.0", it "allows external event handlers to be notified of specific events", and `types.emitted` gives it typed payloads ([Event emitter](https://stately.ai/docs/event-emitter)).
  - A callback actor that can "`receive(...)` events from other actors" and is reached with `sendTo` ([Callback actors](https://stately.ai/docs/callback-actors)).
- **Zustand:**
  - The Flux page: "functions wrapping the state functions … could also handle side-effects of actions" ([Flux inspired practice](https://zustand.docs.pmnd.rs/learn/guides/flux-inspired-practice)).
  - Stately's comparison page describes Zustand effects as living "in actions, middleware, subscriptions, or surrounding application code" ([Compare to Zustand](https://stately.ai/docs/xstate-store/compare-zustand)).
  - `subscribeWithSelector` with `fireImmediately` is the documented way to react to a field outside React. Applied to settings, the subscription runs once at start and then on each change ([subscribeWithSelector](https://zustand.docs.pmnd.rs/reference/middlewares/subscribe-with-selector)).
- **`@xstate/store`:** effects go through `enqueue.effect` / `enqueue.emit`, called synchronously inside a transition, "to ensure determinism: all state changes, effects, and emitted events must be the direct result of an event" ([@xstate/store, effects](https://stately.ai/docs/xstate-store#effects)).
- **Silent:** none of the sources covers audio, a game's effects port, or when to prefer emitted events over injected actions.

## 5. Keeping store update code non-repetitive; `persist` vs a hand-written Save

- **`set` merges shallowly** at the top level, so nested objects need a spread or Immer ([Updating state](https://zustand.docs.pmnd.rs/learn/guides/updating-state)). The docs show a Redux-style `dispatch(reducer)` as an option, but no generic `update(patch)` helper ([Flux inspired practice](https://zustand.docs.pmnd.rs/learn/guides/flux-inspired-practice)). The docs are silent on a private helper that sets a field and saves; it's plain composition and neither recommended nor discouraged.
- **`persist`:**
  - It wraps both `set` and `api.setState`, so *every* update writes `partialize(state)` to storage (`setItem` in [persist.ts](https://github.com/pmndrs/zustand/blob/main/src/middleware/persist.ts)).
  - Its options are `name`, `storage` (a custom `PersistStorage` with `getItem`/`setItem`/`removeItem`), `partialize`, `version` with `migrate`, `merge` (a shallow merge by default, which "will erase" nested fields that weren't persisted), `onRehydrateStorage`, `skipHydration`, and the methods `rehydrate`/`hasHydrated`.
  - Synchronous storage such as `localStorage` hydrates at creation.

  Source: [Persisting store data](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data).

  The docs show no schema validation, Zod or otherwise, and nothing like quarantining an unreadable value. Validation would have to sit in a custom storage, `merge` or `migrate`; the docs are silent on how.
- **Splitting a store:** the slices pattern ([Slices pattern](https://zustand.docs.pmnd.rs/learn/guides/slices-pattern)).
- **XState persistence:** machine snapshots persist with `getPersistedSnapshot`. The caveats are that restored state may not fit changed logic, actions aren't replayed, and the snapshot must be JSON-serializable ([Persistence](https://stately.ai/docs/persistence)). `@xstate/store`'s `persist` extension saves "on each event" ([XState Store persist](https://stately.ai/docs/xstate-store/persist)).

---

## Where the sources are silent or disagree

| Question | What the sources say |
| --- | --- |
| A machine and a Zustand store in one app | Silent. Stately's answer is `@xstate/store` with `fromStore`; Zustand lists third-party middlewares. |
| Where data lives | Not a conflict, but they lean different ways. XState: data in `context`, shared only by events or snapshots. Zustand: "a single store" for global state. TkDodo (not a maintainer): "keep the scope of your store small". |
| Whether actions live with the state | Zustand prefers colocating, and says module-level actions have no downsides. XState expects named, provided actions. Nothing conflicts. |
| One React context or two | Silent. |
| `createActorContext` with an actor built outside React | Unsupported by its API, which creates its own actor. The Stately blog shows a plain context instead. |
| A side-effect port (sound) | Several mechanisms are documented, and none is ranked. |
| The order in which machine and store notify | Undocumented. The source shows machine actions run before the machine's snapshot updates. |
| `persist` and validation or quarantine | Silent. `persist` has the hooks, but no recipe. |
| React 19 | Only peer ranges: `@xstate/react` covers `^19`, and Zustand needs React 18 or later. No specific guidance. |

## How this maps onto astro-type today

These are observations, not recommendations.

- **Wiring:** `src/game/createGame.ts` builds the vanilla store and the actor and joins them with closures.
  - The machine gets a `RunActions` object through `createGameMachine(run)`. That is a factory closure; the docs' mechanism for swapping implementations is `machine.provide`.
  - The store gets `getPhase` and `reportRunCleared`.
  - The guard `hasNextStage` reads the store through `run.currentStage()`. That is a read with no side effect, so the docs' "guards should be pure, synchronous" rule holds, but the guard depends on data outside the machine.
- **React access:** one `GameContext` carries the whole `Game` (`src/store/gameContext.tsx`).
  - `useGameStore` is `useStore(game.store, selector)`, which is exactly Zustand's context recipe.
  - `useScreen`, `useRunPhase` and `useOpener` call `useSyncExternalStore(game.subscribe, game.getX)`. That does what `@xstate/react`'s `useSelector` does, minus the selector and compare layer.
  - So astro-type already uses "one context, two subscriptions". The sources are silent on whether that's preferred.
- **Prop-drilling:** `src/App.tsx` pulls 16 store actions off `game.store.getState()`. Two feed its own keyboard handler, and it passes most of the others to the header and menus as props. Every documented pattern has each component reach the store or actor itself.
- **The deck:** `src/components/pixi-deck/deckSession.ts` imports the `game` singleton from `appGame` and calls `game.store.subscribe((state, previous) => …)`, comparing fields by hand. That is Zustand's transient-update pattern. Both libraries' objects could be passed in rather than imported, and `subscribeWithSelector` is the documented way to compare fields per subscription.
- **Sound:** there are three routes.
  - Store actions call `effects.*`.
  - `createGame` plays one sound per Judgement through `soundFor`.
  - `App` pushes seven settings straight into `soundEngine` in a `useEffect`.

  The sources offer named actions, `emit`/`on`, or a store subscription (with `fireImmediately` for settings). Each one is documented on its own; none of them is offered as "the" route.
- **Saving:** `gameStore.ts` has 18 `set({ profile … })` sites and 19 `saveProfile(…)` calls. `persist` would write on every `set`, so the high-frequency Run fields would be written to storage unless `partialize` drops them or the Profile moves to its own store. The Save's own rules (the Zod schema, moving an unreadable Save aside, the load notice, Backup import) have no counterpart in `persist` and would need a custom `PersistStorage`. A store subscription on `profile` that saves when it changes is a documented capability, but no source presents it as a way to persist.
- **Order of notifications:** the machine's Run actions, such as `beginRun` and `abandonRun`, call `set()` from inside XState actions. Per the xstate source, Zustand subscribers (React, the deck) are therefore notified before `getScreen()`/`getPhase()` show the move. ADR-0001 doesn't mention this. It matters only to a subscriber that reads the machine while handling a store change.

## Sources

**Stately (primary):**
- [@xstate/react](https://stately.ai/docs/xstate-react)
- [Global state with XState and React (blog)](https://stately.ai/blog/2024-02-12-xstate-react-global-state)
- [Actions](https://stately.ai/docs/actions)
- [Context](https://stately.ai/docs/context)
- [Actors](https://stately.ai/docs/actors)
- [Machines](https://stately.ai/docs/machines)
- [Input](https://stately.ai/docs/input)
- [Guards](https://stately.ai/docs/guards)
- [Systems](https://stately.ai/docs/system)
- [Event emitter](https://stately.ai/docs/event-emitter)
- [Callback actors](https://stately.ai/docs/callback-actors)
- [Pure transitions](https://stately.ai/docs/pure-transitions)
- [Persistence](https://stately.ai/docs/persistence)
- [@xstate/store](https://stately.ai/docs/xstate-store)
- [Compare to Zustand](https://stately.ai/docs/xstate-store/compare-zustand)
- [XState Store persist](https://stately.ai/docs/xstate-store/persist)
- Source and examples: [createActorContext.ts](https://github.com/statelyai/xstate/blob/main/packages/xstate-react/src/createActorContext.ts), [useSelector.ts](https://github.com/statelyai/xstate/blob/main/packages/xstate-react/src/useSelector.ts), [createActor.ts](https://github.com/statelyai/xstate/blob/main/packages/core/src/createActor.ts), [snakeMachine.ts](https://github.com/statelyai/xstate/blob/main/examples/snake-react/src/snakeMachine.ts), [trivia AppContext.tsx](https://github.com/statelyai/xstate/blob/main/examples/trivia-game-example/src/context/AppContext.tsx), [xstate README](https://github.com/statelyai/xstate/blob/main/README.md)

**Zustand (primary):**
- [README](https://github.com/pmndrs/zustand/blob/main/README.md)
- [Initialize state with props](https://zustand.docs.pmnd.rs/learn/guides/initialize-state-with-props)
- [useStore](https://zustand.docs.pmnd.rs/reference/hooks/use-store)
- [Flux inspired practice](https://zustand.docs.pmnd.rs/learn/guides/flux-inspired-practice)
- [Practice with no store actions](https://zustand.docs.pmnd.rs/learn/guides/practice-with-no-store-actions)
- [Updating state](https://zustand.docs.pmnd.rs/learn/guides/updating-state)
- [Slices pattern](https://zustand.docs.pmnd.rs/learn/guides/slices-pattern)
- [subscribeWithSelector](https://zustand.docs.pmnd.rs/reference/middlewares/subscribe-with-selector)
- [Persisting store data](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data)
- [persist.ts](https://github.com/pmndrs/zustand/blob/main/src/middleware/persist.ts)
- [Migrating to v5](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)
- [Third-party libraries](https://zustand.docs.pmnd.rs/reference/integrations/third-party-libraries)

**Secondary (marked where used):**
- [TkDodo, Working with Zustand](https://tkdodo.eu/blog/working-with-zustand)
- [TkDodo, Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context)
- [zustand-xs](https://github.com/zustandjs/zustand-xs)
- [zustand-middleware-xstate](https://github.com/biowaffeln/zustand-middleware-xstate)
- [statelyai/xstate#4790](https://github.com/statelyai/xstate/discussions/4790)
