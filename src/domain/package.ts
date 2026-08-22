import { LockerSize } from './locker-size.js';

export class Package {
  constructor(
    readonly size: LockerSize,
    readonly description?: string,
  ) {}
}
