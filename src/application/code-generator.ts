import { randomInt } from 'node:crypto';
import { PickupCode } from '../domain/pickup-code.js';

export interface CodeGenerator {
  generate(): PickupCode;
}

export class CryptoCodeGenerator implements CodeGenerator {
  generate(): PickupCode {
    return PickupCode.of(String(randomInt(0, 1_000_000)).padStart(6, '0'));
  }
}

/** Predictable ascending codes — for demos and recordings ONLY, never production. */
export class SequentialCodeGenerator implements CodeGenerator {
  private count = 0;

  generate(): PickupCode {
    this.count += 1;
    return PickupCode.of(String(this.count % 1_000_000).padStart(6, '0'));
  }
}
