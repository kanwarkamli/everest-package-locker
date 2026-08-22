import { Locker } from '../domain/locker.js';

export interface LockerRepository {
  add(locker: Locker): Promise<void>;
  /** Persist state changes of an existing locker. */
  save(locker: Locker): Promise<void>;
  findById(id: string): Promise<Locker | undefined>;
  findAll(): Promise<Locker[]>;
}
