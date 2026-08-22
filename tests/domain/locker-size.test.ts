import { describe, it, expect } from 'vitest';
import {
  LockerSize,
  canFit,
  compareBySize,
  parseLockerSize,
} from '../../src/domain/locker-size.js';

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
