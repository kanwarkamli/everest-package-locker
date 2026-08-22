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
