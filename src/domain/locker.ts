import { canFit, LockerSize } from './locker-size.js';
import { Package } from './package.js';
import { PickupCode } from './pickup-code.js';
import {
  InvalidPickupCodeError,
  LockerEmptyError,
  LockerOccupiedError,
  PackageTooLargeError,
} from './errors.js';

interface Occupancy {
  readonly package: Package;
  readonly pickupCode: PickupCode;
  readonly storedAt: Date;
}

export class Locker {
  private occupancy: Occupancy | undefined;

  constructor(
    readonly id: string,
    readonly size: LockerSize,
  ) {}

  get isAvailable(): boolean {
    return this.occupancy === undefined;
  }

  get activePickupCode(): PickupCode | undefined {
    return this.occupancy?.pickupCode;
  }

  get storedAt(): Date | undefined {
    return this.occupancy?.storedAt;
  }

  canAccommodate(pkg: Package): boolean {
    return this.isAvailable && canFit(this.size, pkg.size);
  }

  store(pkg: Package, pickupCode: PickupCode, at: Date): void {
    if (this.occupancy) throw new LockerOccupiedError(this.id);
    if (!canFit(this.size, pkg.size)) throw new PackageTooLargeError(this.id);
    this.occupancy = { package: pkg, pickupCode, storedAt: at };
  }

  retrieve(pickupCode: PickupCode): { package: Package; storedAt: Date } {
    if (!this.occupancy) throw new LockerEmptyError(this.id);
    if (!this.occupancy.pickupCode.equals(pickupCode)) {
      throw new InvalidPickupCodeError(this.id);
    }
    const { package: pkg, storedAt } = this.occupancy;
    this.occupancy = undefined;
    return { package: pkg, storedAt };
  }
}
