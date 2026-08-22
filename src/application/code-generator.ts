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
