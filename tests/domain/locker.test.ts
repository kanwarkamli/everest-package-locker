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
