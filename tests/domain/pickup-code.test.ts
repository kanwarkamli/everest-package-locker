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
