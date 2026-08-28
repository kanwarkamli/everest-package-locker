# Smart Package Locker Management System

Solution to the Everest Engineering "Smart Package Locker Management System" coding
challenge. Delivery agents store packages in size-appropriate lockers; customers retrieve
them with a locker ID and a pickup code. All four challenge levels are implemented:

![CLI demo](demo.gif)

| Level | Requirement | Where |
|---|---|---|
| 1 | Locker creation, listing, smallest-fit storage, pickup codes | `LockerStation.createLocker/listLockers/storePackage`, `SmallestFitStrategy` |
| 2 | Retrieval by locker ID + code, invalid-scenario handling | `LockerStation.retrievePackage`, `Locker.retrieve`, typed domain errors |
| 3 | Time-based tiered storage charges | `TieredPricingPolicy`, `Clock` port |
| 4 (optional) | Correctness under concurrent storage requests | `Mutex`-guarded find-and-reserve, concurrency tests |

## Requirements & running

- Node.js ≥ 22 (an `.nvmrc` is included — `nvm use`)

```bash
npm install
npm start        # interactive CLI
npm test         # test suite (Vitest, 72 tests)
npm run typecheck
npm run lint
```

### Example session

```
> create-locker small
Created SMALL locker L1.
> create-locker large
Created LARGE locker L2.
> store small a book
Package stored in locker L1.
Pickup code: 682532
> list-lockers
L1  SMALL   OCCUPIED
L2  LARGE   AVAILABLE
> retrieve L1 682532
Locker opened. Package (a book) retrieved.
Storage charge: $1
The locker is available again.
```

The CLI also accepts piped input for scripted demos:

```bash
printf 'create-locker small\nstore small\nlist-lockers\nexit\n' | npm start
```

### Regenerating the demo GIF

The GIF above is scripted with [VHS](https://github.com/charmbracelet/vhs) so it can be
re-recorded reproducibly (`brew install vhs`, then `vhs demo.tape`). The tape runs the CLI
with `LOCKER_DEMO=1`, which swaps the crypto-random pickup-code generator for a
deterministic sequential one (`000001`, `000002`, …) so the script can retrieve packages;
real runs always use crypto-random codes.

## Design

```
src/
  domain/           pure business objects — no I/O, no framework
    locker-size.ts    single size scale (SMALL<MEDIUM<LARGE), fit + ordering rules
    locker.ts         entity owning its invariants (one package, code must match)
    package.ts        package value
    pickup-code.ts    6-digit code value object
    errors.ts         typed domain errors
  application/      use cases + ports (interfaces)
    locker-station.ts       create/list/store/retrieve use cases
    allocation-strategy.ts  Strategy port + SmallestFitStrategy
    pricing-policy.ts       Strategy port + TieredPricingPolicy
    clock.ts                Clock port + SystemClock
    code-generator.ts       CodeGenerator port + CryptoCodeGenerator
    locker-repository.ts    async repository port (identity-map contract)
    mutex.ts                async mutex used by the station
  infrastructure/
    in-memory-locker-repository.ts
  cli/
    presenter.ts      domain results/errors -> user-facing text
    repl.ts           command parsing + readline loop
    main.ts           composition root
```

Key decisions:

- **Two Strategy seams.** The brief says the system "should be designed so it can be
  extended easily". The rules most likely to change are *which locker to pick*
  (`AllocationStrategy`) and *what to charge* (`PricingPolicy`), so both are interfaces
  with the current rules as one implementation each. Swapping in, say, a
  "nearest-to-entrance" allocation or a promotional pricing rule touches no existing code.
- **Clock as a port.** Level 3 depends on elapsed time; injecting `Clock` makes charge
  calculation deterministic under test (`FixedClock` advances by hours in tests).
- **Async repository on purpose.** The store is in-memory, but the port is async and the
  in-memory implementation yields to the event loop on every call, so the application
  layer experiences realistic interleaving. This keeps the Level 4 guarantee honest. The
  port's contract is an identity map (lookups return live entities, duplicate ids are
  rejected); an adapter backed by an external store would extend it with write-back,
  rehydration and an atomic reserve — a deliberate, documented seam rather than a free
  swap.
- **Level 4 correctness.** `storePackage` runs find-and-reserve as one critical section
  behind an async `Mutex`; two simultaneous requests can never be handed the same locker,
  and losers get the standard "no suitable locker" error. The concurrency tests fail if
  the mutex is removed. The guarantee is scoped to a single `LockerStation` instance
  owning its repository; multiple stations over one shared store would need the reserve
  step moved behind the repository port as an atomic operation.
- **Failure-safe retrieval.** The storage charge is computed *before* the locker is
  mutated, so a pricing failure (e.g. the system clock stepping backwards) can never lose
  a stored package — there is a regression test for exactly this.
- **Defence in depth.** `Locker` enforces its own invariants (occupied lockers reject
  stores, wrong codes reject retrieval) independent of what the service layer does.
- **Errors are types, messages live at the edge.** The domain throws typed errors; only
  the CLI presenter turns them into user-facing text, so a REST adapter could map the
  same errors to HTTP statuses.

## Assumptions

1. **Size fit:** a package fits any locker of equal or larger size; the smallest
   available fitting locker wins (per the brief).
2. **Charging day:** every *started* 24-hour period from storage time counts as one
   chargeable day — retrieval at 30h = 2 days; charging starts from day 1. Default
   tiers: $1/day for days 1–5, $2/day for days 6–10, $3/day beyond (both the base rate
   and tiers are constructor-configurable).
3. **Pickup code uniqueness:** codes are 6-digit crypto-random values, unique among
   currently stored packages (regenerated on collision).
4. **No customer/agent identity:** the challenge flows only require the locker ID +
   pickup code pair, so people are not modelled (YAGNI).
5. **Persistence:** in-memory for the challenge; the async repository port is the
   substitution point for a real store (which would extend the port — see Design).
6. **Single station:** one `LockerStation` instance exclusively owns its repository;
   the concurrency guarantee is scoped accordingly.

## Trade-offs & with more time

- **Persistence adapter** (SQLite/Postgres): extend the repository port with write-back,
  rehydration and an atomic reserve (`UPDATE ... WHERE status = 'AVAILABLE'`), moving the
  concurrency guarantee from the in-process mutex to the store.
- **REST facade** beside the CLI to show the core is interface-agnostic.
- **Multiple stations / multi-tenancy** — `LockerStation` is already an aggregate-shaped
  seam for this.
- **Code expiry & audit log** for abandoned packages.
- **Property-based tests** for the pricing tiers and allocation invariants.

## AI Usage Disclosure

You asked for transparency about AI usage, so here is exactly how this was built.

**Which AI tool(s) did I use?** Claude Code (Anthropic's coding agent, model Claude
Fable 5), run from the terminal against this repository.

**How did I use it?** As a pair programmer driven through explicit checkpoints, not as a
one-shot code generator:

1. I gave it both challenge PDFs and had it compare them; after discussing the trade-offs
   I picked this challenge.
2. It proposed three architectures with trade-offs; I made the calls on stack
   (TypeScript), interface (an interactive CLI, since state is in-memory), scope (all
   four levels, including the optional concurrency level), and approved the layered-OOP
   approach with the two Strategy seams.
3. It wrote a design spec (`docs/superpowers/specs/`), which I reviewed and approved —
   including the documented assumptions, like the "started day" charging rule.
4. It wrote a task-by-task implementation plan (`docs/superpowers/plans/`), then executed
   it in strict TDD: every unit started from a failing test that was run and seen to fail
   before the implementation was written.
5. After completion, I had it run an adversarial review pass over the whole codebase and
   applied the findings that survived verification.

**What portions were AI-assisted?** All production and test code was AI-drafted under the
plan above. The design decisions, scope choices, and assumptions are mine, made in the
checkpoint discussions before any code was written, and I reviewed the result at each
gate.

**Workflow notes.** The git history is the actual work log, not a retroactive cleanup:
each feature commit contains a test together with the code that makes it pass, and the
two mid-course corrections the process caught — an ESLint configuration fix and a fixture
gap the concurrency test exposed (the deterministic test code generator only cycled four
codes) — are visible where they happened. The committed spec and plan double as a record
of the prompts and reasoning that produced the code.
