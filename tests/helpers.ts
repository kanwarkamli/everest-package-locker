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

/** Deterministic generator that cycles through the given codes. */
export class SequenceCodeGenerator implements CodeGenerator {
  private index = 0;

  constructor(private readonly codes: string[]) {}

  generate(): PickupCode {
    const code = this.codes[this.index % this.codes.length]!;
    this.index += 1;
    return PickupCode.of(code);
  }
}

type StationDeps = ConstructorParameters<typeof LockerStation>[0];

export function makeStation(overrides: Partial<StationDeps> = {}) {
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
