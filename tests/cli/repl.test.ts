import { describe, it, expect } from 'vitest';
import { executeCommand } from '../../src/cli/repl.js';
import { makeStation } from '../helpers.js';

describe('executeCommand', () => {
  it('creates lockers', async () => {
    const { station } = makeStation();
    const out = await executeCommand(station, 'create-locker small');
    expect(out).toContain('L1');
  });

  it('rejects an invalid size with usage help', async () => {
    const { station } = makeStation();
    const out = await executeCommand(station, 'create-locker giant');
    expect(out).toContain('Unknown size');
  });

  it('lists lockers', async () => {
    const { station } = makeStation();
    await executeCommand(station, 'create-locker medium');
    const out = await executeCommand(station, 'list-lockers');
    expect(out).toContain('L1');
    expect(out).toContain('AVAILABLE');
  });

  it('stores and retrieves end to end', async () => {
    const { station } = makeStation();
    await executeCommand(station, 'create-locker medium');
    const stored = await executeCommand(station, 'store small a book');
    expect(stored).toContain('L1');
    const out = await executeCommand(station, 'retrieve L1 111111');
    expect(out).toContain('$1');
  });

  it('surfaces friendly errors instead of crashing', async () => {
    const { station } = makeStation();
    const out = await executeCommand(station, 'retrieve L9 000000');
    expect(out).toBe('Locker L9 does not exist.');
  });

  it('handles unknown commands and missing arguments', async () => {
    const { station } = makeStation();
    expect(await executeCommand(station, 'frobnicate')).toContain('Unknown command');
    expect(await executeCommand(station, 'retrieve L1')).toContain('Usage');
    expect(await executeCommand(station, '')).toBe('');
  });

  it('prints help', async () => {
    const { station } = makeStation();
    expect(await executeCommand(station, 'help')).toContain('create-locker');
  });
});
