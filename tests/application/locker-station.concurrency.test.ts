import { describe, it, expect } from 'vitest';
import { makeStation, SequenceCodeGenerator } from '../helpers.js';
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
    const codes = Array.from({ length: 25 }, (_, i) => String(i + 1).padStart(6, '0'));
    const { station } = makeStation({ codeGenerator: new SequenceCodeGenerator(codes) });
    for (let i = 0; i < 10; i++) await station.createLocker(LockerSize.MEDIUM);

    const results = await Promise.allSettled(
      Array.from({ length: 25 }, () => station.storePackage(new Package(LockerSize.MEDIUM))),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    expect((await station.listLockers()).filter((s) => s.available)).toHaveLength(0);
  });
});
