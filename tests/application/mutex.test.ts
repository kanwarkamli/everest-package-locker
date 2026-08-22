import { describe, it, expect } from 'vitest';
import { Mutex } from '../../src/application/mutex.js';

describe('Mutex', () => {
  it('runs tasks one at a time in submission order', async () => {
    const mutex = new Mutex();
    const events: string[] = [];
    const task = (name: string) =>
      mutex.runExclusive(async () => {
        events.push(`${name}:start`);
        await Promise.resolve();
        events.push(`${name}:end`);
      });
    await Promise.all([task('a'), task('b')]);
    expect(events).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });

  it('returns the task result and keeps working after a rejection', async () => {
    const mutex = new Mutex();
    await expect(mutex.runExclusive(async () => Promise.reject(new Error('boom')))).rejects.toThrow(
      'boom',
    );
    await expect(mutex.runExclusive(async () => 42)).resolves.toBe(42);
  });
});
