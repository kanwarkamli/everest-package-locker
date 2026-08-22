import { compareBySize } from '../domain/locker-size.js';
import { Locker } from '../domain/locker.js';
import { Package } from '../domain/package.js';

export interface AllocationStrategy {
  select(lockers: Locker[], pkg: Package): Locker | undefined;
}

export class SmallestFitStrategy implements AllocationStrategy {
  select(lockers: Locker[], pkg: Package): Locker | undefined {
    return lockers
      .filter((locker) => locker.canAccommodate(pkg))
      .sort((a, b) => compareBySize(a.size, b.size))[0];
  }
}
