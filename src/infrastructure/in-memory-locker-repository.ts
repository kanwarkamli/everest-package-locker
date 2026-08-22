import { Locker } from '../domain/locker.js';
import { LockerRepository } from '../application/locker-repository.js';

/**
 * In-memory identity map. Methods yield to the event loop so callers
 * experience the same interleaving a real async store would produce — this
 * keeps the station's concurrency handling honest (see the Level 4 tests).
 */
export class InMemoryLockerRepository implements LockerRepository {
  private readonly lockers = new Map<string, Locker>();

  async add(locker: Locker): Promise<void> {
    await Promise.resolve();
    if (this.lockers.has(locker.id)) {
      throw new Error(`Locker ${locker.id} already exists.`);
    }
    this.lockers.set(locker.id, locker);
  }

  async findById(id: string): Promise<Locker | undefined> {
    await Promise.resolve();
    return this.lockers.get(id);
  }

  async findAll(): Promise<Locker[]> {
    await Promise.resolve();
    return [...this.lockers.values()];
  }
}
