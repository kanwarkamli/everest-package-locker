import { describe, it, expect } from 'vitest';
import { PassThrough } from 'node:stream';
import { executeCommand, runRepl } from '../../src/cli/repl.js';
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

describe('runRepl', () => {
  const collector = (stream: PassThrough) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    return () => Buffer.concat(chunks).toString();
  };

  it('processes piped commands and says goodbye', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const read = collector(output);
    const { station } = makeStation();
    const done = runRepl(station, input, output);
    input.write('create-locker small\nexit\n');
    input.end();
    await done;
    expect(read()).toContain('Created SMALL locker L1.');
    expect(read()).toContain('Goodbye.');
  });

  it('shuts down gracefully when the input stream errors', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const read = collector(output);
    const { station } = makeStation();
    const done = runRepl(station, input, output);
    input.destroy(new Error('EIO'));
    await expect(done).resolves.toBeUndefined();
    expect(read()).toContain('Goodbye.');
  });
});
