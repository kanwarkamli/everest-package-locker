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
