import { Locker } from '../domain/locker.js';
import { LockerSize } from '../domain/locker-size.js';
import { Package } from '../domain/package.js';
import { PickupCode } from '../domain/pickup-code.js';
import { NoLockerAvailableError } from '../domain/errors.js';
import { AllocationStrategy } from './allocation-strategy.js';
import { Clock } from './clock.js';
import { CodeGenerator } from './code-generator.js';
import { LockerRepository } from './locker-repository.js';

export interface StoreReceipt {
  lockerId: string;
  pickupCode: string;
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
}

const MAX_CODE_ATTEMPTS = 100;

export class LockerStation {
  private lockerCount = 0;

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
    const lockers = await this.deps.repository.findAll();
    const locker = this.deps.strategy.select(lockers, pkg);
    if (!locker) throw new NoLockerAvailableError();
    const code = this.uniquePickupCode(lockers);
    locker.store(pkg, code, this.deps.clock.now());
    await this.deps.repository.save(locker);
    return { lockerId: locker.id, pickupCode: code.value };
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
