# Smart Package Locker Management System

Solution to the Everest Engineering "Smart Package Locker Management System" coding
challenge. Delivery agents store packages in size-appropriate lockers; customers retrieve
them with a locker ID and a pickup code. All four challenge levels are implemented:

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
npm test         # test suite (Vitest, 64 tests)
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
    locker-repository.ts    async repository port
  infrastructure/
    in-memory-locker-repository.ts
    mutex.ts                async mutex used by the station
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
  layer experiences realistic interleaving. This keeps the Level 4 guarantee honest and
  means a real database adapter can replace the in-memory one without touching
  domain/application code.
- **Level 4 correctness.** `storePackage` runs find-and-reserve as one critical section
  behind an async `Mutex`; two simultaneous requests can never be handed the same locker,
  and losers get the standard "no suitable locker" error. The concurrency tests fail if
  the mutex is removed. With a real database this guarantee would move to an atomic
  conditional update (e.g. `UPDATE ... WHERE status = 'AVAILABLE'`), which the port shape
  already permits.
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
   substitution point for a real store.

## Trade-offs & with more time

- **Persistence adapter** (SQLite/Postgres) demonstrating the repository swap, with the
  reserve step done as an atomic conditional update.
- **REST facade** beside the CLI to show the core is interface-agnostic.
- **Multiple stations / multi-tenancy** — `LockerStation` is already an aggregate-shaped
  seam for this.
- **Code expiry & audit log** for abandoned packages.
- **Property-based tests** for the pricing tiers and allocation invariants.

## AI Usage Disclosure

- **Tool used:** Claude Code (Anthropic), model Claude Fable 5.
- **How it was used:** a structured workflow — collaborative brainstorming of scope and
  approach → written design spec → detailed implementation plan → strict TDD execution
  (every unit: failing test first, then implementation, then verification), with human
  review and approval at each stage. The intermediate artifacts are committed in
  `docs/superpowers/specs/` (design spec) and `docs/superpowers/plans/` (task-by-task
  implementation plan), and the git history reflects the actual sequence of work.
- **AI-assisted portions:** all production and test code was AI-drafted under the plan
  above, then human-reviewed. Design decisions (stack, interface choice, scope,
  architecture, assumptions such as the charging-day rule) were made collaboratively and
  approved by me before implementation.
- **Workflow notes:** the commit history is genuine TDD history — each feature commit
  contains the test and the code that makes it pass; two mid-course corrections found by
  the tests themselves (a lint rule and a test-fixture gap in the concurrency test) are
  visible in the history.
