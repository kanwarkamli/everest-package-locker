import { LockerStation } from '../application/locker-station.js';
import { SmallestFitStrategy } from '../application/allocation-strategy.js';
import { TieredPricingPolicy } from '../application/pricing-policy.js';
import { SystemClock } from '../application/clock.js';
import { CryptoCodeGenerator } from '../application/code-generator.js';
import { InMemoryLockerRepository } from '../infrastructure/in-memory-locker-repository.js';
import { runRepl } from './repl.js';

const station = new LockerStation({
  repository: new InMemoryLockerRepository(),
  strategy: new SmallestFitStrategy(),
  clock: new SystemClock(),
  codeGenerator: new CryptoCodeGenerator(),
  pricing: new TieredPricingPolicy(1),
});

await runRepl(station, process.stdin, process.stdout);
