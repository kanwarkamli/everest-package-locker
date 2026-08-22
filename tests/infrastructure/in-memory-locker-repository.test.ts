import { describe, it, expect } from 'vitest';
import { InMemoryLockerRepository } from '../../src/infrastructure/in-memory-locker-repository.js';
import { Locker } from '../../src/domain/locker.js';
import { LockerSize } from '../../src/domain/locker-size.js';

describe('InMemoryLockerRepository', () => {
  it('adds and finds lockers by id', async () => {
    const repo = new InMemoryLockerRepository();
    await repo.add(new Locker('L1', LockerSize.SMALL));
    expect((await repo.findById('L1'))?.id).toBe('L1');
    expect(await repo.findById('missing')).toBeUndefined();
  });

  it('lists all lockers in insertion order', async () => {
    const repo = new InMemoryLockerRepository();
    await repo.add(new Locker('L1', LockerSize.SMALL));
    await repo.add(new Locker('L2', LockerSize.LARGE));
    expect((await repo.findAll()).map((l) => l.id)).toEqual(['L1', 'L2']);
  });
});
