# Package Locker Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A TypeScript CLI implementing the Everest "Smart Package Locker" challenge, Levels 1–4, TDD throughout.

**Architecture:** Layered OOP — pure domain (entities/value objects), application layer with ports (Strategy for allocation & pricing, Clock, CodeGenerator, async Repository), in-memory infrastructure, thin readline REPL. Dependency rule points inward.

**Tech Stack:** Node 22 (via `.nvmrc`), TypeScript strict (`"type": "module"`, NodeNext, `.js` extensions in relative imports), Vitest, tsx, ESLint + Prettier, npm.

**Spec:** `docs/superpowers/specs/2026-08-22-package-locker-design.md`

## Global Constraints

- All commands must run with Node 22: prefix `export PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH"` (system node is v12).
- Relative imports always end in `.js` (NodeNext resolution).
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Commit history must tell the level-by-level story; keep commits small and scoped as written.
- Error messages (exact copy, from spec):
  - No locker: `No suitable locker is available. The package cannot be stored.`
  - Unknown locker: `Locker <id> does not exist.`
  - Empty locker: `Locker <id> has no package to retrieve.`
  - Bad code: `Invalid pickup code for locker <id>.`
- Charging: a "day" is any *started* 24h period from `storedAt` (retrieval at 0h–24h = 1 day, 30h = 2 days). Tiers: days 1–5 at X, 6–10 at 2X, beyond at 3X. Default X = 1.

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: npm scripts `test`, `typecheck`, `lint`, `format`, `start` used by all later tasks

- [ ] **Step 1: Init package and install dev deps**

```bash
export PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH"
npm init -y
npm install -D typescript vitest tsx eslint @eslint/js typescript-eslint prettier
```

- [ ] **Step 2: Write config files**

`package.json` — set (keep npm-generated fields, adjust these):

```json
{
  "name": "package-locker",
  "version": "1.0.0",
  "description": "Smart Package Locker Management System (Everest Engineering coding challenge)",
  "type": "module",
  "scripts": {
    "start": "tsx src/cli/main.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src tests",
    "format": "prettier --write ."
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "tests"]
}
```

Also: `npm install -D @types/node`

`eslint.config.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist/', 'coverage/'] }
);
```

`.prettierrc.json`:

```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 3: Write smoke test** — `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Verify** — Run: `npm test && npm run typecheck && npm run lint`. Expected: smoke test PASS, no type/lint errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold TypeScript project with Vitest, ESLint, Prettier"
```

---

### Task 2: LockerSize value object

**Files:**
- Create: `src/domain/locker-size.ts`
- Test: `tests/domain/locker-size.test.ts`

**Interfaces:**
- Produces: `enum LockerSize { SMALL, MEDIUM, LARGE }` (string-valued), `canFit(locker: LockerSize, pkg: LockerSize): boolean`, `compareBySize(a: LockerSize, b: LockerSize): number`, `parseLockerSize(input: string): LockerSize | undefined`

- [ ] **Step 1: Write failing tests** — `tests/domain/locker-size.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LockerSize, canFit, compareBySize, parseLockerSize } from '../../src/domain/locker-size.js';

describe('canFit', () => {
  it('lets a package fit an equal-sized locker', () => {
    expect(canFit(LockerSize.MEDIUM, LockerSize.MEDIUM)).toBe(true);
  });
  it('lets a package fit a larger locker', () => {
    expect(canFit(LockerSize.LARGE, LockerSize.SMALL)).toBe(true);
  });
  it('rejects a package bigger than the locker', () => {
    expect(canFit(LockerSize.SMALL, LockerSize.LARGE)).toBe(false);
    expect(canFit(LockerSize.MEDIUM, LockerSize.LARGE)).toBe(false);
  });
});

describe('compareBySize', () => {
  it('orders SMALL < MEDIUM < LARGE', () => {
    expect(compareBySize(LockerSize.SMALL, LockerSize.LARGE)).toBeLessThan(0);
    expect(compareBySize(LockerSize.LARGE, LockerSize.MEDIUM)).toBeGreaterThan(0);
    expect(compareBySize(LockerSize.MEDIUM, LockerSize.MEDIUM)).toBe(0);
  });
});

describe('parseLockerSize', () => {
  it('parses case-insensitively', () => {
    expect(parseLockerSize('small')).toBe(LockerSize.SMALL);
    expect(parseLockerSize('MEDIUM')).toBe(LockerSize.MEDIUM);
    expect(parseLockerSize('Large')).toBe(LockerSize.LARGE);
  });
  it('returns undefined for unknown input', () => {
    expect(parseLockerSize('huge')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/domain/locker-size.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `src/domain/locker-size.ts`:

```ts
/** Single size scale shared by lockers and packages. */
export enum LockerSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

const ORDER: Record<LockerSize, number> = {
  [LockerSize.SMALL]: 0,
  [LockerSize.MEDIUM]: 1,
  [LockerSize.LARGE]: 2,
};

export function canFit(locker: LockerSize, pkg: LockerSize): boolean {
  return ORDER[locker] >= ORDER[pkg];
}

export function compareBySize(a: LockerSize, b: LockerSize): number {
  return ORDER[a] - ORDER[b];
}

export function parseLockerSize(input: string): LockerSize | undefined {
  const normalized = input.trim().toUpperCase();
  return Object.values(LockerSize).find((s) => s === normalized);
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- tests/domain/locker-size.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(domain): add LockerSize with fit and ordering rules"`

---

### Task 3: Package and PickupCode

**Files:**
- Create: `src/domain/package.ts`, `src/domain/pickup-code.ts`
- Test: `tests/domain/pickup-code.test.ts`

**Interfaces:**
- Produces: `class Package { constructor(readonly size: LockerSize, readonly description?: string) }`; `class PickupCode { static of(value: string): PickupCode; readonly value: string; equals(other): boolean }` — `of` throws `Error('Pickup code must be exactly 6 digits')` on bad format.

- [ ] **Step 1: Write failing tests** — `tests/domain/pickup-code.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PickupCode } from '../../src/domain/pickup-code.js';

describe('PickupCode', () => {
  it('accepts exactly six digits', () => {
    expect(PickupCode.of('012345').value).toBe('012345');
  });
  it.each(['', '12345', '1234567', 'abc123', '12 456'])('rejects %j', (bad) => {
    expect(() => PickupCode.of(bad)).toThrow('Pickup code must be exactly 6 digits');
  });
  it('compares by value', () => {
    expect(PickupCode.of('111111').equals(PickupCode.of('111111'))).toBe(true);
    expect(PickupCode.of('111111').equals(PickupCode.of('222222'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/domain/pickup-code.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**

`src/domain/pickup-code.ts`:

```ts
export class PickupCode {
  private constructor(readonly value: string) {}

  static of(value: string): PickupCode {
    if (!/^\d{6}$/.test(value)) {
      throw new Error('Pickup code must be exactly 6 digits');
    }
    return new PickupCode(value);
  }

  equals(other: PickupCode): boolean {
    return this.value === other.value;
  }
}
```

`src/domain/package.ts`:

```ts
import { LockerSize } from './locker-size.js';

export class Package {
  constructor(
    readonly size: LockerSize,
    readonly description?: string,
  ) {}
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- tests/domain/pickup-code.test.ts` then `npm run typecheck`. Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(domain): add Package and PickupCode value object"`

---

### Task 4: Domain errors and Locker entity

**Files:**
- Create: `src/domain/errors.ts`, `src/domain/locker.ts`
- Test: `tests/domain/locker.test.ts`

**Interfaces:**
- Produces:
  - Errors (all extend `DomainError extends Error`): `NoLockerAvailableError()`, `LockerNotFoundError(lockerId)`, `LockerEmptyError(lockerId)`, `InvalidPickupCodeError(lockerId)`, `LockerOccupiedError(lockerId)`, `PackageTooLargeError(lockerId)`.
  - `class Locker { constructor(readonly id: string, readonly size: LockerSize); get isAvailable(): boolean; get activePickupCode(): PickupCode | undefined; canAccommodate(pkg: Package): boolean; store(pkg: Package, code: PickupCode, at: Date): void; retrieve(code: PickupCode): { package: Package; storedAt: Date } }`

- [ ] **Step 1: Write failing tests** — `tests/domain/locker.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Locker } from '../../src/domain/locker.js';
import { LockerSize } from '../../src/domain/locker-size.js';
import { Package } from '../../src/domain/package.js';
import { PickupCode } from '../../src/domain/pickup-code.js';
import {
  InvalidPickupCodeError,
  LockerEmptyError,
  LockerOccupiedError,
  PackageTooLargeError,
} from '../../src/domain/errors.js';

const code = PickupCode.of('123456');
const at = new Date('2026-08-22T10:00:00Z');

describe('Locker', () => {
  it('starts available with no active code', () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    expect(locker.isAvailable).toBe(true);
    expect(locker.activePickupCode).toBeUndefined();
  });

  it('accommodates only fitting packages while available', () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    expect(locker.canAccommodate(new Package(LockerSize.SMALL))).toBe(true);
    expect(locker.canAccommodate(new Package(LockerSize.LARGE))).toBe(false);
    locker.store(new Package(LockerSize.SMALL), code, at);
    expect(locker.canAccommodate(new Package(LockerSize.SMALL))).toBe(false);
  });

  it('stores a package and becomes occupied', () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    locker.store(new Package(LockerSize.SMALL), code, at);
    expect(locker.isAvailable).toBe(false);
    expect(locker.activePickupCode?.equals(code)).toBe(true);
  });

  it('rejects storing into an occupied locker', () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    locker.store(new Package(LockerSize.SMALL), code, at);
    expect(() => locker.store(new Package(LockerSize.SMALL), code, at)).toThrow(
      LockerOccupiedError,
    );
  });

  it('rejects a package too large for it', () => {
    const locker = new Locker('L1', LockerSize.SMALL);
    expect(() => locker.store(new Package(LockerSize.LARGE), code, at)).toThrow(
      PackageTooLargeError,
    );
  });

  it('retrieves with the right code and frees the locker', () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    const pkg = new Package(LockerSize.SMALL, 'book');
    locker.store(pkg, code, at);
    const result = locker.retrieve(code);
    expect(result.package).toBe(pkg);
    expect(result.storedAt).toEqual(at);
    expect(locker.isAvailable).toBe(true);
  });

  it('rejects retrieval with a wrong code and stays occupied', () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    locker.store(new Package(LockerSize.SMALL), code, at);
    expect(() => locker.retrieve(PickupCode.of('999999'))).toThrow(InvalidPickupCodeError);
    expect(locker.isAvailable).toBe(false);
  });

  it('rejects retrieval from an empty locker', () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    expect(() => locker.retrieve(code)).toThrow(LockerEmptyError);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/domain/locker.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**

`src/domain/errors.ts`:

```ts
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NoLockerAvailableError extends DomainError {
  constructor() {
    super('No suitable locker is available. The package cannot be stored.');
  }
}

export class LockerNotFoundError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Locker ${lockerId} does not exist.`);
  }
}

export class LockerEmptyError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Locker ${lockerId} has no package to retrieve.`);
  }
}

export class InvalidPickupCodeError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Invalid pickup code for locker ${lockerId}.`);
  }
}

export class LockerOccupiedError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Locker ${lockerId} is already occupied.`);
  }
}

export class PackageTooLargeError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Package does not fit locker ${lockerId}.`);
  }
}
```

`src/domain/locker.ts`:

```ts
import { canFit, LockerSize } from './locker-size.js';
import { Package } from './package.js';
import { PickupCode } from './pickup-code.js';
import {
  InvalidPickupCodeError,
  LockerEmptyError,
  LockerOccupiedError,
  PackageTooLargeError,
} from './errors.js';

interface Occupancy {
  readonly package: Package;
  readonly pickupCode: PickupCode;
  readonly storedAt: Date;
}

export class Locker {
  private occupancy: Occupancy | undefined;

  constructor(
    readonly id: string,
    readonly size: LockerSize,
  ) {}

  get isAvailable(): boolean {
    return this.occupancy === undefined;
  }

  get activePickupCode(): PickupCode | undefined {
    return this.occupancy?.pickupCode;
  }

  canAccommodate(pkg: Package): boolean {
    return this.isAvailable && canFit(this.size, pkg.size);
  }

  store(pkg: Package, pickupCode: PickupCode, at: Date): void {
    if (this.occupancy) throw new LockerOccupiedError(this.id);
    if (!canFit(this.size, pkg.size)) throw new PackageTooLargeError(this.id);
    this.occupancy = { package: pkg, pickupCode, storedAt: at };
  }

  retrieve(pickupCode: PickupCode): { package: Package; storedAt: Date } {
    if (!this.occupancy) throw new LockerEmptyError(this.id);
    if (!this.occupancy.pickupCode.equals(pickupCode)) {
      throw new InvalidPickupCodeError(this.id);
    }
    const { package: pkg, storedAt } = this.occupancy;
    this.occupancy = undefined;
    return { package: pkg, storedAt };
  }
}
```

- [ ] **Step 4: Run to verify pass** — `npm test`. Expected: all PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(domain): add Locker entity with invariants and typed errors"`

---

### Task 5: Ports — Clock, CodeGenerator, LockerRepository (+ in-memory impl)

**Files:**
- Create: `src/application/clock.ts`, `src/application/code-generator.ts`, `src/application/locker-repository.ts`, `src/infrastructure/in-memory-locker-repository.ts`
- Test: `tests/application/code-generator.test.ts`, `tests/infrastructure/in-memory-locker-repository.test.ts`

**Interfaces:**
- Produces:
  - `interface Clock { now(): Date }`, `class SystemClock implements Clock`
  - `interface CodeGenerator { generate(): PickupCode }`, `class CryptoCodeGenerator`
  - `interface LockerRepository { add(l: Locker): Promise<void>; save(l: Locker): Promise<void>; findById(id: string): Promise<Locker | undefined>; findAll(): Promise<Locker[]> }`
  - `class InMemoryLockerRepository implements LockerRepository` — every method yields to the event loop (`await Promise.resolve()`) to behave like real async I/O.

- [ ] **Step 1: Write failing tests**

`tests/application/code-generator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CryptoCodeGenerator } from '../../src/application/code-generator.js';

describe('CryptoCodeGenerator', () => {
  it('generates valid six-digit codes', () => {
    const gen = new CryptoCodeGenerator();
    for (let i = 0; i < 50; i++) {
      expect(gen.generate().value).toMatch(/^\d{6}$/);
    }
  });
});
```

`tests/infrastructure/in-memory-locker-repository.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { InMemoryLockerRepository } from '../../src/infrastructure/in-memory-locker-repository.js';
import { Locker } from '../../src/domain/locker.js';
import { LockerSize } from '../../src/domain/locker-size.js';

describe('InMemoryLockerRepository', () => {
  it('adds and finds lockers by id', async () => {
    const repo = new InMemoryLockerRepository();
    await repo.add(new Locker('L1', LockerSize.SMALL));
    expect((await repo.findById('L1'))?.id).toBe('L1');
    expect(await repo.findById('missing')).toBeUndefined();
  });

  it('lists all lockers in insertion order', async () => {
    const repo = new InMemoryLockerRepository();
    await repo.add(new Locker('L1', LockerSize.SMALL));
    await repo.add(new Locker('L2', LockerSize.LARGE));
    expect((await repo.findAll()).map((l) => l.id)).toEqual(['L1', 'L2']);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/application tests/infrastructure`. Expected: FAIL.

- [ ] **Step 3: Implement**

`src/application/clock.ts`:

```ts
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
```

`src/application/code-generator.ts`:

```ts
import { randomInt } from 'node:crypto';
import { PickupCode } from '../domain/pickup-code.js';

export interface CodeGenerator {
  generate(): PickupCode;
}

export class CryptoCodeGenerator implements CodeGenerator {
  generate(): PickupCode {
    return PickupCode.of(String(randomInt(0, 1_000_000)).padStart(6, '0'));
  }
}
```

`src/application/locker-repository.ts`:

```ts
import { Locker } from '../domain/locker.js';

export interface LockerRepository {
  add(locker: Locker): Promise<void>;
  /** Persist state changes of an existing locker. */
  save(locker: Locker): Promise<void>;
  findById(id: string): Promise<Locker | undefined>;
  findAll(): Promise<Locker[]>;
}
```

`src/infrastructure/in-memory-locker-repository.ts`:

```ts
import { Locker } from '../domain/locker.js';
import { LockerRepository } from '../application/locker-repository.js';

/**
 * In-memory store. Methods yield to the event loop so callers experience
 * the same interleaving a real async store would produce — this keeps the
 * station's concurrency handling honest (see Level 4 tests).
 */
export class InMemoryLockerRepository implements LockerRepository {
  private readonly lockers = new Map<string, Locker>();

  async add(locker: Locker): Promise<void> {
    await Promise.resolve();
    this.lockers.set(locker.id, locker);
  }

  async save(_locker: Locker): Promise<void> {
    await Promise.resolve(); // live references: mutation is the persistence
  }

  async findById(id: string): Promise<Locker | undefined> {
    await Promise.resolve();
    return this.lockers.get(id);
  }

  async findAll(): Promise<Locker[]> {
    await Promise.resolve();
    return [...this.lockers.values()];
  }
}
```

- [ ] **Step 4: Run to verify pass** — `npm test`. Expected: all PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(app): add Clock, CodeGenerator and LockerRepository ports with in-memory store"`

---

### Task 6: SmallestFitStrategy

**Files:**
- Create: `src/application/allocation-strategy.ts`
- Test: `tests/application/allocation-strategy.test.ts`

**Interfaces:**
- Produces: `interface AllocationStrategy { select(lockers: Locker[], pkg: Package): Locker | undefined }`, `class SmallestFitStrategy implements AllocationStrategy`

- [ ] **Step 1: Write failing tests** — `tests/application/allocation-strategy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SmallestFitStrategy } from '../../src/application/allocation-strategy.js';
import { Locker } from '../../src/domain/locker.js';
import { LockerSize } from '../../src/domain/locker-size.js';
import { Package } from '../../src/domain/package.js';
import { PickupCode } from '../../src/domain/pickup-code.js';

const strategy = new SmallestFitStrategy();

describe('SmallestFitStrategy', () => {
  it('picks the smallest locker that fits', () => {
    const lockers = [
      new Locker('L1', LockerSize.LARGE),
      new Locker('L2', LockerSize.SMALL),
      new Locker('L3', LockerSize.MEDIUM),
    ];
    expect(strategy.select(lockers, new Package(LockerSize.SMALL))?.id).toBe('L2');
    expect(strategy.select(lockers, new Package(LockerSize.MEDIUM))?.id).toBe('L3');
  });

  it('skips occupied lockers', () => {
    const small = new Locker('L1', LockerSize.SMALL);
    small.store(new Package(LockerSize.SMALL), PickupCode.of('123456'), new Date());
    const lockers = [small, new Locker('L2', LockerSize.LARGE)];
    expect(strategy.select(lockers, new Package(LockerSize.SMALL))?.id).toBe('L2');
  });

  it('returns undefined when nothing fits', () => {
    const lockers = [new Locker('L1', LockerSize.SMALL)];
    expect(strategy.select(lockers, new Package(LockerSize.LARGE))).toBeUndefined();
    expect(strategy.select([], new Package(LockerSize.SMALL))).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/application/allocation-strategy.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** — `src/application/allocation-strategy.ts`:

```ts
import { compareBySize } from '../domain/locker-size.js';
import { Locker } from '../domain/locker.js';
import { Package } from '../domain/package.js';

export interface AllocationStrategy {
  select(lockers: Locker[], pkg: Package): Locker | undefined;
}

export class SmallestFitStrategy implements AllocationStrategy {
  select(lockers: Locker[], pkg: Package): Locker | undefined {
    return lockers
      .filter((locker) => locker.canAccommodate(pkg))
      .sort((a, b) => compareBySize(a.size, b.size))[0];
  }
}
```

- [ ] **Step 4: Run to verify pass** — `npm test`. Expected: all PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(app): add smallest-fit allocation strategy"`

---

### Task 7: LockerStation — Level 1 (create, list, store)

**Files:**
- Create: `src/application/locker-station.ts`, `tests/helpers.ts`
- Test: `tests/application/locker-station.store.test.ts`

**Interfaces:**
- Produces:
  - `interface StoreReceipt { lockerId: string; pickupCode: string }`
  - `interface LockerStatus { id: string; size: LockerSize; available: boolean }`
  - `class LockerStation { constructor(deps: { repository: LockerRepository; strategy: AllocationStrategy; clock: Clock; codeGenerator: CodeGenerator }); createLocker(size: LockerSize): Promise<string>; listLockers(): Promise<LockerStatus[]>; storePackage(pkg: Package): Promise<StoreReceipt> }`
  - Test helpers: `FixedClock implements Clock { constructor(private date: Date); now(); advanceHours(h: number) }`, `SequenceCodeGenerator implements CodeGenerator { constructor(codes: string[]) }` (cycles through given codes), `makeStation(overrides?)` factory returning `{ station, repository, clock }` with defaults (FixedClock at `2026-08-22T00:00:00Z`, SequenceCodeGenerator with distinct codes, SmallestFitStrategy, InMemoryLockerRepository). Retrieval/pricing deps are added in Tasks 8–9.

- [ ] **Step 1: Write test helpers** — `tests/helpers.ts`:

```ts
import { Clock } from '../src/application/clock.js';
import { CodeGenerator } from '../src/application/code-generator.js';
import { PickupCode } from '../src/domain/pickup-code.js';
import { SmallestFitStrategy } from '../src/application/allocation-strategy.js';
import { InMemoryLockerRepository } from '../src/infrastructure/in-memory-locker-repository.js';
import { LockerStation } from '../src/application/locker-station.js';

export class FixedClock implements Clock {
  constructor(private date: Date) {}
  now(): Date {
    return new Date(this.date);
  }
  advanceHours(hours: number): void {
    this.date = new Date(this.date.getTime() + hours * 3_600_000);
  }
}

export class SequenceCodeGenerator implements CodeGenerator {
  private index = 0;
  constructor(private readonly codes: string[]) {}
  generate(): PickupCode {
    const code = this.codes[this.index % this.codes.length]!;
    this.index += 1;
    return PickupCode.of(code);
  }
}

export function makeStation(overrides: Partial<ConstructorParameters<typeof LockerStation>[0]> = {}) {
  const repository = new InMemoryLockerRepository();
  const clock = new FixedClock(new Date('2026-08-22T00:00:00Z'));
  const station = new LockerStation({
    repository,
    strategy: new SmallestFitStrategy(),
    clock,
    codeGenerator: new SequenceCodeGenerator(['111111', '222222', '333333', '444444']),
    ...overrides,
  });
  return { station, repository, clock };
}
```

- [ ] **Step 2: Write failing tests** — `tests/application/locker-station.store.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeStation, SequenceCodeGenerator } from '../helpers.js';
import { LockerSize } from '../../src/domain/locker-size.js';
import { Package } from '../../src/domain/package.js';
import { NoLockerAvailableError } from '../../src/domain/errors.js';

describe('LockerStation — level 1', () => {
  it('creates lockers with sequential ids and lists their status', async () => {
    const { station } = makeStation();
    expect(await station.createLocker(LockerSize.SMALL)).toBe('L1');
    expect(await station.createLocker(LockerSize.LARGE)).toBe('L2');
    expect(await station.listLockers()).toEqual([
      { id: 'L1', size: LockerSize.SMALL, available: true },
      { id: 'L2', size: LockerSize.LARGE, available: true },
    ]);
  });

  it('stores a package in the smallest fitting locker and returns a receipt', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.LARGE);
    await station.createLocker(LockerSize.SMALL);
    const receipt = await station.storePackage(new Package(LockerSize.SMALL));
    expect(receipt).toEqual({ lockerId: 'L2', pickupCode: '111111' });
    const statuses = await station.listLockers();
    expect(statuses.find((s) => s.id === 'L2')?.available).toBe(false);
  });

  it('rejects when no locker fits', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    await expect(station.storePackage(new Package(LockerSize.LARGE))).rejects.toThrow(
      NoLockerAvailableError,
    );
  });

  it('rejects when all fitting lockers are occupied', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.MEDIUM);
    await station.storePackage(new Package(LockerSize.MEDIUM));
    await expect(station.storePackage(new Package(LockerSize.MEDIUM))).rejects.toThrow(
      NoLockerAvailableError,
    );
  });

  it('regenerates on pickup-code collision so active codes stay unique', async () => {
    const { station } = makeStation({
      codeGenerator: new SequenceCodeGenerator(['111111', '111111', '222222']),
    });
    await station.createLocker(LockerSize.SMALL);
    await station.createLocker(LockerSize.SMALL);
    const first = await station.storePackage(new Package(LockerSize.SMALL));
    const second = await station.storePackage(new Package(LockerSize.SMALL));
    expect(first.pickupCode).toBe('111111');
    expect(second.pickupCode).toBe('222222');
  });
});
```

- [ ] **Step 3: Run to verify failure** — `npm test -- tests/application/locker-station.store.test.ts`. Expected: FAIL.

- [ ] **Step 4: Implement** — `src/application/locker-station.ts`:

```ts
import { Locker } from '../domain/locker.js';
import { LockerSize } from '../domain/locker-size.js';
import { Package } from '../domain/package.js';
import { PickupCode } from '../domain/pickup-code.js';
import { NoLockerAvailableError } from '../domain/errors.js';
import { AllocationStrategy } from './allocation-strategy.js';
import { Clock } from './clock.js';
import { CodeGenerator } from './code-generator.js';
import { LockerRepository } from './locker-repository.js';

export interface StoreReceipt {
  lockerId: string;
  pickupCode: string;
}

export interface LockerStatus {
  id: string;
  size: LockerSize;
  available: boolean;
}

interface Dependencies {
  repository: LockerRepository;
  strategy: AllocationStrategy;
  clock: Clock;
  codeGenerator: CodeGenerator;
}

const MAX_CODE_ATTEMPTS = 100;

export class LockerStation {
  private lockerCount = 0;

  constructor(private readonly deps: Dependencies) {}

  async createLocker(size: LockerSize): Promise<string> {
    this.lockerCount += 1;
    const locker = new Locker(`L${this.lockerCount}`, size);
    await this.deps.repository.add(locker);
    return locker.id;
  }

  async listLockers(): Promise<LockerStatus[]> {
    const lockers = await this.deps.repository.findAll();
    return lockers.map((l) => ({ id: l.id, size: l.size, available: l.isAvailable }));
  }

  async storePackage(pkg: Package): Promise<StoreReceipt> {
    const lockers = await this.deps.repository.findAll();
    const locker = this.deps.strategy.select(lockers, pkg);
    if (!locker) throw new NoLockerAvailableError();
    const code = this.uniquePickupCode(lockers);
    locker.store(pkg, code, this.deps.clock.now());
    await this.deps.repository.save(locker);
    return { lockerId: locker.id, pickupCode: code.value };
  }

  private uniquePickupCode(lockers: Locker[]): PickupCode {
    const active = new Set(
      lockers.map((l) => l.activePickupCode?.value).filter((v): v is string => v !== undefined),
    );
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = this.deps.codeGenerator.generate();
      if (!active.has(code.value)) return code;
    }
    throw new Error('Unable to generate a unique pickup code.');
  }
}
```

- [ ] **Step 5: Run to verify pass** — `npm test && npm run typecheck`. Expected: all PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(app): level 1 — locker creation, listing and package storage"`

---

### Task 8: LockerStation — Level 2 (retrieve)

**Files:**
- Modify: `src/application/locker-station.ts`
- Test: `tests/application/locker-station.retrieve.test.ts`

**Interfaces:**
- Produces: `interface RetrievalReceipt { package: Package }` and `LockerStation.retrievePackage(lockerId: string, code: string): Promise<RetrievalReceipt>`. (Task 9 adds `charge` to the receipt.)

- [ ] **Step 1: Write failing tests** — `tests/application/locker-station.retrieve.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeStation } from '../helpers.js';
import { LockerSize } from '../../src/domain/locker-size.js';
import { Package } from '../../src/domain/package.js';
import {
  InvalidPickupCodeError,
  LockerEmptyError,
  LockerNotFoundError,
} from '../../src/domain/errors.js';

describe('LockerStation — level 2', () => {
  it('retrieves a stored package with the right locker id and code', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.MEDIUM);
    const pkg = new Package(LockerSize.MEDIUM, 'shoes');
    const receipt = await station.storePackage(pkg);
    const result = await station.retrievePackage(receipt.lockerId, receipt.pickupCode);
    expect(result.package).toBe(pkg);
  });

  it('frees the locker for reuse after retrieval', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    const receipt = await station.storePackage(new Package(LockerSize.SMALL));
    await station.retrievePackage(receipt.lockerId, receipt.pickupCode);
    expect((await station.listLockers())[0]?.available).toBe(true);
    await expect(station.storePackage(new Package(LockerSize.SMALL))).resolves.toBeDefined();
  });

  it('rejects an unknown locker id', async () => {
    const { station } = makeStation();
    await expect(station.retrievePackage('L99', '111111')).rejects.toThrow(LockerNotFoundError);
  });

  it('rejects retrieval from an empty locker', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    await expect(station.retrievePackage('L1', '111111')).rejects.toThrow(LockerEmptyError);
  });

  it('rejects a wrong code and keeps the package', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    const receipt = await station.storePackage(new Package(LockerSize.SMALL));
    await expect(station.retrievePackage(receipt.lockerId, '999999')).rejects.toThrow(
      InvalidPickupCodeError,
    );
    expect((await station.listLockers())[0]?.available).toBe(false);
  });

  it('treats a malformed code as an invalid pickup code, not a crash', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    const receipt = await station.storePackage(new Package(LockerSize.SMALL));
    await expect(station.retrievePackage(receipt.lockerId, 'abc')).rejects.toThrow(
      InvalidPickupCodeError,
    );
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/application/locker-station.retrieve.test.ts`. Expected: FAIL (`retrievePackage` missing).

- [ ] **Step 3: Implement** — add to `src/application/locker-station.ts`:

Add to imports: `InvalidPickupCodeError`, `LockerNotFoundError` from `../domain/errors.js`.

```ts
export interface RetrievalReceipt {
  package: Package;
}
```

Add method to `LockerStation`:

```ts
  async retrievePackage(lockerId: string, code: string): Promise<RetrievalReceipt> {
    const locker = await this.deps.repository.findById(lockerId);
    if (!locker) throw new LockerNotFoundError(lockerId);
    let pickupCode: PickupCode;
    try {
      pickupCode = PickupCode.of(code);
    } catch {
      throw new InvalidPickupCodeError(lockerId);
    }
    const { package: pkg } = locker.retrieve(pickupCode);
    await this.deps.repository.save(locker);
    return { package: pkg };
  }
```

- [ ] **Step 4: Run to verify pass** — `npm test`. Expected: all PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(app): level 2 — package retrieval with validation"`

---

### Task 9: Level 3 — TieredPricingPolicy and charges on retrieval

**Files:**
- Create: `src/application/pricing-policy.ts`
- Modify: `src/application/locker-station.ts`, `tests/helpers.ts`
- Test: `tests/application/pricing-policy.test.ts`, extend `tests/application/locker-station.retrieve.test.ts`

**Interfaces:**
- Produces:
  - `interface PricingPolicy { charge(storedAt: Date, retrievedAt: Date): number }`
  - `class TieredPricingPolicy implements PricingPolicy { constructor(ratePerDay?: number, tiers?: ReadonlyArray<{ days: number; multiplier: number }>) }` — defaults: rate 1, tiers `[{days:5, multiplier:1},{days:5, multiplier:2},{days:Infinity, multiplier:3}]`.
  - `RetrievalReceipt` gains `charge: number`; `LockerStation` deps gain `pricing: PricingPolicy`; `makeStation` default uses `new TieredPricingPolicy()`.

- [ ] **Step 1: Write failing pricing tests** — `tests/application/pricing-policy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TieredPricingPolicy } from '../../src/application/pricing-policy.js';

const HOUR = 3_600_000;
const stored = new Date('2026-08-01T00:00:00Z');
const after = (hours: number) => new Date(stored.getTime() + hours * HOUR);
const policy = new TieredPricingPolicy(); // X=1: days 1-5 @1, 6-10 @2, 11+ @3

describe('TieredPricingPolicy', () => {
  it('charges one day for any duration within the first 24h (a started day counts)', () => {
    expect(policy.charge(stored, after(0))).toBe(1);
    expect(policy.charge(stored, after(23))).toBe(1);
  });

  it('starts a new day exactly at each 24h boundary', () => {
    expect(policy.charge(stored, after(24))).toBe(1); // exactly 24h = still 1 full day
    expect(policy.charge(stored, after(25))).toBe(2);
  });

  it('charges tier 1 rate through day 5', () => {
    expect(policy.charge(stored, after(5 * 24))).toBe(5);
  });

  it('charges double rate for days 6-10', () => {
    expect(policy.charge(stored, after(6 * 24))).toBe(5 + 2); // 6 days: 5 + 1×2
    expect(policy.charge(stored, after(10 * 24))).toBe(5 + 5 * 2); // 10 days: 15
  });

  it('charges triple rate beyond day 10', () => {
    expect(policy.charge(stored, after(12 * 24))).toBe(5 + 10 + 2 * 3); // 12 days: 21
  });

  it('scales with the configured base rate', () => {
    const custom = new TieredPricingPolicy(2);
    expect(custom.charge(stored, after(6 * 24))).toBe(14); // (5 + 1×2) × 2
  });

  it('rejects retrieval time before storage time', () => {
    expect(() => policy.charge(stored, after(-1))).toThrow('Retrieval time cannot precede storage time');
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/application/pricing-policy.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** — `src/application/pricing-policy.ts`:

```ts
export interface PricingPolicy {
  /** Total storage charge for a package stored at `storedAt`, retrieved at `retrievedAt`. */
  charge(storedAt: Date, retrievedAt: Date): number;
}

export interface PricingTier {
  /** How many days this tier covers (Infinity for the final tier). */
  readonly days: number;
  readonly multiplier: number;
}

const DAY_MS = 24 * 3_600_000;

const DEFAULT_TIERS: ReadonlyArray<PricingTier> = [
  { days: 5, multiplier: 1 },
  { days: 5, multiplier: 2 },
  { days: Infinity, multiplier: 3 },
];

export class TieredPricingPolicy implements PricingPolicy {
  constructor(
    private readonly ratePerDay = 1,
    private readonly tiers: ReadonlyArray<PricingTier> = DEFAULT_TIERS,
  ) {}

  charge(storedAt: Date, retrievedAt: Date): number {
    const elapsedMs = retrievedAt.getTime() - storedAt.getTime();
    if (elapsedMs < 0) throw new Error('Retrieval time cannot precede storage time');
    // Every started 24h period counts as one chargeable day; storing starts day 1.
    let remainingDays = Math.max(1, Math.ceil(elapsedMs / DAY_MS));
    let total = 0;
    for (const tier of this.tiers) {
      const daysInTier = Math.min(remainingDays, tier.days);
      total += daysInTier * tier.multiplier * this.ratePerDay;
      remainingDays -= daysInTier;
      if (remainingDays <= 0) break;
    }
    return total;
  }
}
```

- [ ] **Step 4: Wire into station (failing test first)** — append to `tests/application/locker-station.retrieve.test.ts`:

```ts
describe('LockerStation — level 3 charges', () => {
  it('returns the storage charge with the pickup confirmation', async () => {
    const { station, clock } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    const receipt = await station.storePackage(new Package(LockerSize.SMALL));
    clock.advanceHours(6 * 24); // 6 days -> 5×1 + 1×2 = 7
    const result = await station.retrievePackage(receipt.lockerId, receipt.pickupCode);
    expect(result.charge).toBe(7);
  });
});
```

Changes:
- `tests/helpers.ts`: import `TieredPricingPolicy` from `../src/application/pricing-policy.js`; add `pricing: new TieredPricingPolicy(),` to the `LockerStation` construction (before `...overrides`).
- `locker-station.ts`: add `pricing: PricingPolicy` to `Dependencies` (import from `./pricing-policy.js`); add `charge: number` to `RetrievalReceipt`; in `retrievePackage`, destructure `storedAt` from `locker.retrieve(...)` and return `{ package: pkg, charge: this.deps.pricing.charge(storedAt, this.deps.clock.now()) }`.

- [ ] **Step 5: Run to verify pass** — `npm test && npm run typecheck`. Expected: all PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(app): level 3 — tiered storage charges on retrieval"`

---

### Task 10: Level 4 — concurrency-safe allocation

**Files:**
- Create: `src/infrastructure/mutex.ts`
- Modify: `src/application/locker-station.ts`
- Test: `tests/infrastructure/mutex.test.ts`, `tests/application/locker-station.concurrency.test.ts`

**Interfaces:**
- Produces: `class Mutex { runExclusive<T>(fn: () => Promise<T>): Promise<T> }`. `LockerStation.storePackage` and `retrievePackage` bodies run inside `this.mutex.runExclusive(...)`.

- [ ] **Step 1: Write failing mutex tests** — `tests/infrastructure/mutex.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Mutex } from '../../src/infrastructure/mutex.js';

describe('Mutex', () => {
  it('runs tasks one at a time in submission order', async () => {
    const mutex = new Mutex();
    const events: string[] = [];
    const task = (name: string) =>
      mutex.runExclusive(async () => {
        events.push(`${name}:start`);
        await Promise.resolve();
        events.push(`${name}:end`);
      });
    await Promise.all([task('a'), task('b')]);
    expect(events).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });

  it('returns the task result and keeps working after a rejection', async () => {
    const mutex = new Mutex();
    await expect(mutex.runExclusive(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(mutex.runExclusive(async () => 42)).resolves.toBe(42);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/infrastructure/mutex.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement mutex** — `src/infrastructure/mutex.ts`:

```ts
/** Serialises async critical sections: tasks run one at a time, FIFO. */
export class Mutex {
  private tail: Promise<unknown> = Promise.resolve();

  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn); // start after predecessor settles either way
    this.tail = run.catch(() => undefined); // a rejection must not poison the queue
    return run;
  }
}
```

Run: `npm test -- tests/infrastructure/mutex.test.ts`. Expected: PASS.

- [ ] **Step 4: Write failing concurrency test** — `tests/application/locker-station.concurrency.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeStation } from '../helpers.js';
import { LockerSize } from '../../src/domain/locker-size.js';
import { Package } from '../../src/domain/package.js';
import { NoLockerAvailableError } from '../../src/domain/errors.js';

describe('LockerStation — level 4 concurrency', () => {
  it('never assigns one locker to two simultaneous requests', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    await station.createLocker(LockerSize.SMALL);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => station.storePackage(new Package(LockerSize.SMALL))),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(3);

    const lockerIds = fulfilled.map((r) => r.value.lockerId);
    expect(new Set(lockerIds).size).toBe(2); // distinct lockers
    const codes = fulfilled.map((r) => r.value.pickupCode);
    expect(new Set(codes).size).toBe(2); // distinct codes

    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(NoLockerAvailableError);
    }

    const statuses = await station.listLockers();
    expect(statuses.every((s) => !s.available)).toBe(true);
  });

  it('stays correct across many mixed concurrent requests', async () => {
    const { station } = makeStation();
    for (let i = 0; i < 10; i++) await station.createLocker(LockerSize.MEDIUM);

    const results = await Promise.allSettled(
      Array.from({ length: 25 }, () => station.storePackage(new Package(LockerSize.MEDIUM))),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    expect((await station.listLockers()).filter((s) => s.available)).toHaveLength(0);
  });
});
```

Run: `npm test -- tests/application/locker-station.concurrency.test.ts`. Expected: **FAIL** — without the mutex, the async repository (`findAll` yields) lets requests interleave: several pick the same locker; the second `store` throws `LockerOccupiedError` (wrong behaviour) instead of falling back or rejecting cleanly.

- [ ] **Step 5: Wire the mutex** — in `src/application/locker-station.ts`: import `Mutex` from `../infrastructure/mutex.js`; add field `private readonly mutex = new Mutex();`; wrap the existing bodies:

```ts
  async storePackage(pkg: Package): Promise<StoreReceipt> {
    return this.mutex.runExclusive(async () => {
      // (existing body unchanged)
    });
  }

  async retrievePackage(lockerId: string, code: string): Promise<RetrievalReceipt> {
    return this.mutex.runExclusive(async () => {
      // (existing body unchanged)
    });
  }
```

- [ ] **Step 6: Run to verify pass** — `npm test`. Expected: all PASS.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(app): level 4 — serialise allocation so concurrent requests never share a locker"`

---

### Task 11: CLI — presenter, REPL, composition root

**Files:**
- Create: `src/cli/presenter.ts`, `src/cli/repl.ts`, `src/cli/main.ts`
- Test: `tests/cli/presenter.test.ts`, `tests/cli/repl.test.ts`

**Interfaces:**
- Produces:
  - `presenter.ts`: `formatLockerList(statuses: LockerStatus[]): string`, `formatStoreReceipt(r: StoreReceipt): string`, `formatRetrievalReceipt(r: RetrievalReceipt): string`, `formatError(e: unknown): string` (DomainError → its message; other → `Error: ${message}`), `HELP_TEXT: string`.
  - `repl.ts`: `executeCommand(station: LockerStation, line: string): Promise<string>` (pure-ish command dispatch, easily testable) and `runRepl(station: LockerStation, input: NodeJS.ReadableStream, output: NodeJS.WritableStream): Promise<void>`.
  - `main.ts`: composition root wiring SystemClock, CryptoCodeGenerator, InMemoryLockerRepository, SmallestFitStrategy, TieredPricingPolicy, LockerStation, then `runRepl(station, process.stdin, process.stdout)`.

- [ ] **Step 1: Write failing tests**

`tests/cli/presenter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  formatError,
  formatLockerList,
  formatRetrievalReceipt,
  formatStoreReceipt,
} from '../../src/cli/presenter.js';
import { LockerSize } from '../../src/domain/locker-size.js';
import { Package } from '../../src/domain/package.js';
import { NoLockerAvailableError } from '../../src/domain/errors.js';

describe('presenter', () => {
  it('formats the locker list with availability', () => {
    const text = formatLockerList([
      { id: 'L1', size: LockerSize.SMALL, available: true },
      { id: 'L2', size: LockerSize.LARGE, available: false },
    ]);
    expect(text).toContain('L1');
    expect(text).toContain('SMALL');
    expect(text).toContain('AVAILABLE');
    expect(text).toContain('OCCUPIED');
  });

  it('reports an empty station', () => {
    expect(formatLockerList([])).toBe('No lockers have been created yet.');
  });

  it('formats a store receipt with locker id and pickup code', () => {
    const text = formatStoreReceipt({ lockerId: 'L2', pickupCode: '123456' });
    expect(text).toContain('L2');
    expect(text).toContain('123456');
  });

  it('formats a retrieval receipt with the charge', () => {
    const text = formatRetrievalReceipt({ package: new Package(LockerSize.SMALL), charge: 7 });
    expect(text).toContain('$7');
  });

  it('maps domain errors to their message', () => {
    expect(formatError(new NoLockerAvailableError())).toBe(
      'No suitable locker is available. The package cannot be stored.',
    );
  });

  it('wraps unexpected errors', () => {
    expect(formatError(new Error('boom'))).toBe('Error: boom');
  });
});
```

`tests/cli/repl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { executeCommand } from '../../src/cli/repl.js';
import { makeStation } from '../helpers.js';

describe('executeCommand', () => {
  it('creates lockers', async () => {
    const { station } = makeStation();
    const out = await executeCommand(station, 'create-locker small');
    expect(out).toContain('L1');
  });

  it('rejects an invalid size with usage help', async () => {
    const { station } = makeStation();
    const out = await executeCommand(station, 'create-locker giant');
    expect(out).toContain('Unknown size');
  });

  it('lists lockers', async () => {
    const { station } = makeStation();
    await executeCommand(station, 'create-locker medium');
    const out = await executeCommand(station, 'list-lockers');
    expect(out).toContain('L1');
    expect(out).toContain('AVAILABLE');
  });

  it('stores and retrieves end to end', async () => {
    const { station } = makeStation();
    await executeCommand(station, 'create-locker medium');
    const stored = await executeCommand(station, 'store small a book');
    expect(stored).toContain('L1');
    const out = await executeCommand(station, 'retrieve L1 111111');
    expect(out).toContain('$1');
  });

  it('surfaces friendly errors instead of crashing', async () => {
    const { station } = makeStation();
    const out = await executeCommand(station, 'retrieve L9 000000');
    expect(out).toBe('Locker L9 does not exist.');
  });

  it('handles unknown commands and missing arguments', async () => {
    const { station } = makeStation();
    expect(await executeCommand(station, 'frobnicate')).toContain('Unknown command');
    expect(await executeCommand(station, 'retrieve L1')).toContain('Usage');
    expect(await executeCommand(station, '')).toBe('');
  });

  it('prints help', async () => {
    const { station } = makeStation();
    expect(await executeCommand(station, 'help')).toContain('create-locker');
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- tests/cli`. Expected: FAIL.

- [ ] **Step 3: Implement**

`src/cli/presenter.ts`:

```ts
import { LockerStatus, RetrievalReceipt, StoreReceipt } from '../application/locker-station.js';
import { DomainError } from '../domain/errors.js';

export const HELP_TEXT = [
  'Commands:',
  '  create-locker <small|medium|large>   Create a locker of the given size',
  '  list-lockers                         Show all lockers and availability',
  '  store <small|medium|large> [desc]    Store a package (returns locker + pickup code)',
  '  retrieve <lockerId> <pickupCode>     Retrieve a package',
  '  help                                 Show this help',
  '  exit                                 Quit',
].join('\n');

export function formatLockerList(statuses: LockerStatus[]): string {
  if (statuses.length === 0) return 'No lockers have been created yet.';
  return statuses
    .map((s) => `${s.id}  ${s.size.padEnd(6)}  ${s.available ? 'AVAILABLE' : 'OCCUPIED'}`)
    .join('\n');
}

export function formatStoreReceipt(receipt: StoreReceipt): string {
  return [
    `Package stored in locker ${receipt.lockerId}.`,
    `Pickup code: ${receipt.pickupCode}`,
    '(The pickup code is assumed to be sent to the customer via SMS/email.)',
  ].join('\n');
}

export function formatRetrievalReceipt(receipt: RetrievalReceipt): string {
  const description = receipt.package.description ? ` (${receipt.package.description})` : '';
  return [
    `Locker opened. Package${description} retrieved.`,
    `Storage charge: $${receipt.charge}`,
    'The locker is available again.',
  ].join('\n');
}

export function formatError(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  if (error instanceof Error) return `Error: ${error.message}`;
  return 'Error: something went wrong.';
}
```

`src/cli/repl.ts`:

```ts
import { createInterface } from 'node:readline';
import { LockerStation } from '../application/locker-station.js';
import { parseLockerSize } from '../domain/locker-size.js';
import { Package } from '../domain/package.js';
import {
  formatError,
  formatLockerList,
  formatRetrievalReceipt,
  formatStoreReceipt,
  HELP_TEXT,
} from './presenter.js';

export async function executeCommand(station: LockerStation, line: string): Promise<string> {
  const [command, ...args] = line.trim().split(/\s+/);
  try {
    switch (command) {
      case undefined:
      case '':
        return '';
      case 'help':
        return HELP_TEXT;
      case 'create-locker': {
        const size = args[0] !== undefined ? parseLockerSize(args[0]) : undefined;
        if (!size) return `Unknown size ${args[0] ?? ''}. Usage: create-locker <small|medium|large>`;
        const id = await station.createLocker(size);
        return `Created ${size} locker ${id}.`;
      }
      case 'list-lockers':
        return formatLockerList(await station.listLockers());
      case 'store': {
        const size = args[0] !== undefined ? parseLockerSize(args[0]) : undefined;
        if (!size) return `Unknown size ${args[0] ?? ''}. Usage: store <small|medium|large> [description]`;
        const description = args.slice(1).join(' ') || undefined;
        return formatStoreReceipt(await station.storePackage(new Package(size, description)));
      }
      case 'retrieve': {
        const [lockerId, code] = args;
        if (!lockerId || !code) return 'Usage: retrieve <lockerId> <pickupCode>';
        return formatRetrievalReceipt(await station.retrievePackage(lockerId, code));
      }
      default:
        return `Unknown command: ${command}. Type "help" for available commands.`;
    }
  } catch (error) {
    return formatError(error);
  }
}

export async function runRepl(
  station: LockerStation,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
): Promise<void> {
  output.write('Smart Package Locker Management System\n');
  output.write(`${HELP_TEXT}\n\n`);
  const rl = createInterface({ input, output, prompt: '> ' });
  rl.prompt();
  for await (const line of rl) {
    if (line.trim() === 'exit') break;
    const result = await executeCommand(station, line);
    if (result) output.write(`${result}\n`);
    rl.prompt();
  }
  rl.close();
  output.write('Goodbye.\n');
}
```

`src/cli/main.ts`:

```ts
import { LockerStation } from '../application/locker-station.js';
import { SmallestFitStrategy } from '../application/allocation-strategy.js';
import { TieredPricingPolicy } from '../application/pricing-policy.js';
import { SystemClock } from '../application/clock.js';
import { CryptoCodeGenerator } from '../application/code-generator.js';
import { InMemoryLockerRepository } from '../infrastructure/in-memory-locker-repository.js';
import { runRepl } from './repl.js';

const station = new LockerStation({
  repository: new InMemoryLockerRepository(),
  strategy: new SmallestFitStrategy(),
  clock: new SystemClock(),
  codeGenerator: new CryptoCodeGenerator(),
  pricing: new TieredPricingPolicy(1),
});

await runRepl(station, process.stdin, process.stdout);
```

- [ ] **Step 4: Run to verify pass** — `npm test && npm run typecheck && npm run lint`. Expected: all PASS.

- [ ] **Step 5: Manual smoke run** —

```bash
printf 'create-locker small\ncreate-locker large\nlist-lockers\nstore small a book\nlist-lockers\nexit\n' | npm start
```

Expected: banner, created lockers, list shows AVAILABLE/OCCUPIED transitions, store prints locker id + 6-digit code.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(cli): interactive REPL over the locker station"`

---

### Task 12: README, AI disclosure, final polish

**Files:**
- Create: `README.md`
- Modify: whatever `npm run lint`/`format` flags

**Interfaces:**
- Consumes: everything above. Produces the submission-ready repo.

- [ ] **Step 1: Write `README.md`** covering, in this order:
  1. What it is (one paragraph) + challenge levels covered (1–4).
  2. Requirements (Node 22 / `.nvmrc`), how to run (`npm install`, `npm start`), example session transcript, how to test (`npm test`, `npm run typecheck`, `npm run lint`).
  3. Design overview: layered architecture diagram (text), the two Strategy seams (allocation, pricing), Clock/CodeGenerator/Repository ports, why the repository is async, how Level 4 correctness works (mutex serialising find-and-reserve; note that swapping in a real DB would move the guarantee to an atomic conditional update, which the port shape allows).
  4. Assumptions (copy from spec §Assumptions: size fit, started-day charging, code uniqueness scope, no customer identity, in-memory persistence).
  5. Trade-offs & what I'd do with more time (persistence adapter, REST facade, locker station multi-tenancy, code expiry, property-based tests).
  6. **AI Usage Disclosure** (required by the brief): tools used (Claude Code / Claude Fable 5), how (brainstorm → spec → plan → TDD implementation with human review at each gate), which portions were AI-assisted (all code AI-drafted under TDD, human-reviewed; design decisions made collaboratively), and the workflow summary with pointers to `docs/superpowers/specs/` and `docs/superpowers/plans/`.
- [ ] **Step 2: Full verification** — `npm test && npm run typecheck && npm run lint`. Expected: all green. Fix anything flagged.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "docs: add README with design notes, assumptions and AI disclosure"`

---

## Self-Review Notes

- **Spec coverage:** L1 (Tasks 2–7), L2 (Task 8), L3 (Task 9), L4 (Task 10), CLI + exact error copy (Tasks 4, 11), extensibility seams (Tasks 6, 9), README/AI disclosure (Task 12). No gaps found.
- **Type consistency check:** `RetrievalReceipt.charge` added in Task 9 and consumed in Task 11's presenter; `makeStation` gains `pricing` in Task 9 before Task 11 uses it; `Dependencies` field names (`repository`, `strategy`, `clock`, `codeGenerator`, `pricing`) used consistently.
- **Known sequencing detail:** Task 11's repl test `retrieve L1 111111` relies on `SequenceCodeGenerator` default `['111111', ...]` from Task 7's helper — intentional.
