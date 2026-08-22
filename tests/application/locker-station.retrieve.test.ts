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

  it('reports an empty locker even when the code is malformed', async () => {
    const { station } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    await expect(station.retrievePackage('L1', 'abc')).rejects.toThrow(LockerEmptyError);
  });
});

describe('LockerStation — level 3 charges', () => {
  it('returns the storage charge with the pickup confirmation', async () => {
    const { station, clock } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    const receipt = await station.storePackage(new Package(LockerSize.SMALL));
    clock.advanceHours(6 * 24); // 6 days -> 5×1 + 1×2 = 7
    const result = await station.retrievePackage(receipt.lockerId, receipt.pickupCode);
    expect(result.charge).toBe(7);
  });

  it('keeps the package stored when charge calculation fails', async () => {
    const { station, clock } = makeStation();
    await station.createLocker(LockerSize.SMALL);
    const receipt = await station.storePackage(new Package(LockerSize.SMALL));
    clock.advanceHours(-1); // system clock stepped backwards (e.g. NTP correction)
    await expect(station.retrievePackage(receipt.lockerId, receipt.pickupCode)).rejects.toThrow(
      'Retrieval time cannot precede storage time',
    );
    clock.advanceHours(2); // clock recovers — the package must still be retrievable
    await expect(
      station.retrievePackage(receipt.lockerId, receipt.pickupCode),
    ).resolves.toMatchObject({ charge: 1 });
  });
});
