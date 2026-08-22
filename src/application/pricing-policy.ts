export interface PricingPolicy {
  /** Total storage charge for a package stored at `storedAt`, retrieved at `retrievedAt`. */
  charge(storedAt: Date, retrievedAt: Date): number;
}

export interface PricingTier {
  /** How many days this tier covers (Infinity for the final tier). */
  readonly days: number;
  readonly multiplier: number;
}

const DAY_MS = 24 * 3_600_000;

const DEFAULT_TIERS: ReadonlyArray<PricingTier> = [
  { days: 5, multiplier: 1 },
  { days: 5, multiplier: 2 },
  { days: Infinity, multiplier: 3 },
];

export class TieredPricingPolicy implements PricingPolicy {
  constructor(
    private readonly ratePerDay = 1,
    private readonly tiers: ReadonlyArray<PricingTier> = DEFAULT_TIERS,
  ) {
    const last = tiers[tiers.length - 1];
    if (!last || last.days !== Infinity) {
      throw new Error('Pricing tiers must end with an unbounded tier (days: Infinity)');
    }
  }

  charge(storedAt: Date, retrievedAt: Date): number {
    const elapsedMs = retrievedAt.getTime() - storedAt.getTime();
    if (elapsedMs < 0) throw new Error('Retrieval time cannot precede storage time');
    // Every started 24h period counts as one chargeable day; storing starts day 1.
    let remainingDays = Math.max(1, Math.ceil(elapsedMs / DAY_MS));
    let total = 0;
    for (const tier of this.tiers) {
      const daysInTier = Math.min(remainingDays, tier.days);
      total += daysInTier * tier.multiplier * this.ratePerDay;
      remainingDays -= daysInTier;
      if (remainingDays <= 0) break;
    }
    return total;
  }
}
