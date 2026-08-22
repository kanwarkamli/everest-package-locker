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
