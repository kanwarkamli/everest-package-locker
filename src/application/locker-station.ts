import { Locker } from '../domain/locker.js';
import { LockerSize } from '../domain/locker-size.js';
import { Package } from '../domain/package.js';
import { PickupCode } from '../domain/pickup-code.js';
import {
  InvalidPickupCodeError,
  LockerEmptyError,
  LockerNotFoundError,
  NoLockerAvailableError,
} from '../domain/errors.js';
import { AllocationStrategy } from './allocation-strategy.js';
import { Clock } from './clock.js';
import { CodeGenerator } from './code-generator.js';
import { LockerRepository } from './locker-repository.js';
import { PricingPolicy } from './pricing-policy.js';
import { Mutex } from './mutex.js';

export interface StoreReceipt {
  lockerId: string;
  pickupCode: string;
}

export interface RetrievalReceipt {
  package: Package;
  charge: number;
}

export interface LockerStatus {
  id: string;
  size: LockerSize;
  available: boolean;
}

interface Dependencies {
  repository: LockerRepository;
  strategy: AllocationStrategy;
  clock: Clock;
  codeGenerator: CodeGenerator;
  pricing: PricingPolicy;
}

const MAX_CODE_ATTEMPTS = 100;

export class LockerStation {
  private lockerCount = 0;
  /**
   * Serialises find-and-reserve so simultaneous requests can never be handed
   * the same locker (Level 4). The guarantee is scoped to this station
   * instance, which must be the sole owner of its repository; sharing a store
   * between stations would require moving the reserve step behind the
   * repository port as an atomic operation.
   */
  private readonly mutex = new Mutex();

  constructor(private readonly deps: Dependencies) {}

  async createLocker(size: LockerSize): Promise<string> {
    this.lockerCount += 1;
    const locker = new Locker(`L${this.lockerCount}`, size);
    await this.deps.repository.add(locker);
    return locker.id;
  }

  async listLockers(): Promise<LockerStatus[]> {
    const lockers = await this.deps.repository.findAll();
    return lockers.map((l) => ({ id: l.id, size: l.size, available: l.isAvailable }));
  }

  async storePackage(pkg: Package): Promise<StoreReceipt> {
    return this.mutex.runExclusive(async () => {
      const lockers = await this.deps.repository.findAll();
      const locker = this.deps.strategy.select(lockers, pkg);
      if (!locker) throw new NoLockerAvailableError();
      const code = this.uniquePickupCode(lockers);
      locker.store(pkg, code, this.deps.clock.now());
      return { lockerId: locker.id, pickupCode: code.value };
    });
  }

  async retrievePackage(lockerId: string, code: string): Promise<RetrievalReceipt> {
    return this.mutex.runExclusive(async () => {
      const locker = await this.deps.repository.findById(lockerId);
      if (!locker) throw new LockerNotFoundError(lockerId);
      const storedAt = locker.storedAt;
      if (storedAt === undefined) throw new LockerEmptyError(lockerId);
      let pickupCode: PickupCode;
      try {
        pickupCode = PickupCode.of(code);
      } catch {
        throw new InvalidPickupCodeError(lockerId);
      }
      // The charge is computed before the locker is mutated so a pricing
      // failure can never lose the package.
      const charge = this.deps.pricing.charge(storedAt, this.deps.clock.now());
      const { package: pkg } = locker.retrieve(pickupCode);
      return { package: pkg, charge };
    });
  }

  private uniquePickupCode(lockers: Locker[]): PickupCode {
    const active = new Set(
      lockers.map((l) => l.activePickupCode?.value).filter((v): v is string => v !== undefined),
    );
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = this.deps.codeGenerator.generate();
      if (!active.has(code.value)) return code;
    }
    throw new Error('Unable to generate a unique pickup code.');
  }
}
