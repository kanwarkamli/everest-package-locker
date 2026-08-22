# Smart Package Locker Management System — Design Spec

Date: 2026-08-22
Status: Approved (design reviewed in chat)

## Purpose

Solution to the Everest Engineering "Smart Package Locker Management System"
coding challenge. Delivery agents store packages in lockers; customers retrieve
them with a locker ID + pickup code. Levels 1–4 of the challenge are in scope,
including the optional concurrency level.

Evaluation criteria this design optimises for: SOLID, TDD, clean/maintainable
code, appropriate OOP, meaningful patterns, edge cases, error handling, commit
history, production readiness.

## Decisions (made with the user)

- **Stack:** TypeScript on Node 22 LTS (`.nvmrc` pinned), strict mode.
- **Interface:** interactive CLI (REPL) — state is in-memory, so a session
  must persist across operations; also accepts piped input for scripted demos.
- **Scope:** all 4 levels, including optional Level 4 (concurrency).
- **Testing:** Vitest, TDD throughout.
- **Tooling:** ESLint + Prettier, npm.

## Requirements (from the challenge PDF)

### Level 1 — Basic locker and package storage
- Create lockers of sizes Small / Medium / Large.
- View list of lockers with availability status.
- Store a package: find an available locker that fits, **preferring the
  smallest locker that can accommodate the package size**.
- If no suitable locker: return a clear "cannot be stored" message.
- On success: generate a pickup code and return it with the locker ID.
- Notification delivery (SMS/email) is out of scope.

### Level 2 — Package retrieval
- Retrieve by locker ID + pickup code.
- Valid request: locker opens, package removed, locker available again.
- Invalid scenarios handled properly (wrong code, wrong/unknown locker,
  empty locker).

### Level 3 — Extended storage charges
- Record time when a package is stored.
- Charge based on duration in locker, tiered pricing:
  X/day for days 1–5, 2X/day for days 6–10, 3X/day beyond.
- A "day" is a 24-hour period from the time the package was stored.
- Return the total charge with the pickup confirmation; locker becomes
  available afterwards.

### Level 4 — Concurrent requests (optional; in scope)
- Multiple simultaneous storage requests must never receive the same locker.
- Locker availability always stays correct.
- Excess requests receive the "no suitable locker" message.

### Basic rules
- One package per locker at a time.
- Each stored package has a unique pickup code, tied to a specific package
  and locker.
- Design must be easy to extend.

## Assumptions (documented for reviewers)

1. **Size fit:** a package fits any locker of equal or larger size
   (S ≤ M ≤ L); "smallest available locker that fits" wins.
2. **Charging day:** every *started* 24h period counts as one chargeable day —
   retrieval at 30h = 2 days. Charging starts from day 1 (no free window),
   matching the tiered example in the brief; both X and the tier boundaries
   are configurable via `TieredPricingPolicy` construction.
3. **Pickup code uniqueness:** unique among *active* (currently stored)
   packages; codes are 6-digit crypto-random, regenerated on collision.
4. **Identity:** customers/agents are not modelled as entities — the brief's
   flows only require the locker ID + pickup code pair.
5. **Persistence:** in-memory, behind an async repository interface so a real
   store can replace it without touching domain/application code.

## Architecture

Layered, dependency rule pointing inward (CLI → application → domain):

```
src/
  domain/            # pure business objects, no I/O
    locker-size.ts   # value object: SMALL<MEDIUM<LARGE, canFit()
    locker.ts        # entity: id, size, AVAILABLE|OCCUPIED, invariants
    package.ts       # size (+ optional description)
    pickup-code.ts   # value object
    errors.ts        # typed domain errors
  application/       # use cases + ports (interfaces)
    locker-station.ts        # createLocker, listLockers, storePackage, retrievePackage
    allocation-strategy.ts   # port + SmallestFitStrategy
    pricing-policy.ts        # port + TieredPricingPolicy
    clock.ts                 # port + SystemClock (FixedClock in tests)
    code-generator.ts        # port + CryptoCodeGenerator
    locker-repository.ts     # port (async)
  infrastructure/
    in-memory-locker-repository.ts
    mutex.ts                 # lightweight async mutex for atomic allocation
  cli/
    repl.ts          # readline loop, command parsing
    presenter.ts     # domain results/errors -> user-facing text
    main.ts          # composition root (wires everything)
```

### Key design points

- **Strategy pattern** at the two rule-bearing seams the brief hints will
  change: `AllocationStrategy` (smallest-fit today) and `PricingPolicy`
  (tiered today). Open/closed for new rules.
- **Clock port** injected into `LockerStation` so Level 3 charge calculation
  is deterministic under test (`FixedClock`).
- **Typed domain errors**, mapped to friendly messages only in the CLI
  presenter — domain stays interface-agnostic.
- **Level 4 correctness:** `storePackage` performs find-and-reserve as one
  critical section guarded by an async mutex. In-process this makes the
  interleaving-safe guarantee explicit rather than accidental (the repository
  API is async, like a real DB driver); swapping in a real store would move
  the guarantee to a DB-level atomic reserve (e.g. conditional update), which
  the port shape already permits.
- **Locker entity owns its invariants:** storing into an occupied locker or
  retrieving from an empty one throws domain errors regardless of what the
  service does — defence in depth.

## Data flow

- **Store:** CLI `store <size>` → `LockerStation.storePackage` → (mutex)
  strategy picks smallest available fit from repository → locker.store(pkg,
  code, now) → repository save → `{lockerId, pickupCode}` → presenter.
- **Retrieve:** CLI `retrieve <lockerId> <code>` →
  `LockerStation.retrievePackage` → validate locker exists, is occupied, code
  matches → charge = pricingPolicy.charge(storedAt, now) → locker.release() →
  `{package, charge}` → presenter.

## Error handling

| Scenario | Error | CLI message |
|---|---|---|
| No locker fits / all occupied | `NoLockerAvailableError` | "No suitable locker is available. The package cannot be stored." |
| Unknown locker ID | `LockerNotFoundError` | "Locker <id> does not exist." |
| Locker empty | `LockerEmptyError` | "Locker <id> has no package to retrieve." |
| Wrong pickup code | `InvalidPickupCodeError` | "Invalid pickup code for locker <id>." |
| Bad CLI input (size, args) | parse-level | usage hint |

## Testing strategy (TDD)

- **Domain unit tests:** LockerSize ordering/fit; Locker invariants;
  pickup-code equality.
- **Application unit tests:** SmallestFitStrategy (prefers smallest, skips
  occupied, none available); TieredPricingPolicy (boundaries: 1 day, 5/6 day
  edge, 10/11 day edge, exact-24h edges); LockerStation store/retrieve flows
  with FixedClock and stub generator.
- **Level 4 test:** fire N concurrent `storePackage` calls (`Promise.all`)
  against fewer lockers; assert no locker double-assigned, availability
  consistent, losers get `NoLockerAvailableError`.
- **CLI tests:** presenter mapping; command parsing.

## Deliverables

- Source + tests, `.nvmrc`, npm scripts (`test`, `lint`, `build`, `start`).
- `README.md`: approach, design decisions, assumptions, trade-offs, run/test
  instructions, areas for improvement, and the required **AI usage
  disclosure** (tools, how used, which portions, workflow).
- Git history shaped level-by-level with small, meaningful commits.
