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
    expect(policy.charge(stored, after(6 * 24))).toBe(5 + 2); // 6 days: 5×1 + 1×2
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
    expect(() => policy.charge(stored, after(-1))).toThrow(
      'Retrieval time cannot precede storage time',
    );
  });
});
