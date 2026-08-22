import { Locker } from '../domain/locker.js';

/**
 * Port for locker persistence. Contract: implementations act as an identity
 * map — lookups return live Locker instances, so entity mutation performed
 * inside the station's critical section IS the persistence, and `add` must
 * reject duplicate ids. An adapter backed by an external store would extend
 * this port with explicit write-back, rehydration and an atomic reserve.
 */
export interface LockerRepository {
  add(locker: Locker): Promise<void>;
  findById(id: string): Promise<Locker | undefined>;
  findAll(): Promise<Locker[]>;
}
