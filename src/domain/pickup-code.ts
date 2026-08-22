export class PickupCode {
  private constructor(readonly value: string) {}

  static of(value: string): PickupCode {
    if (!/^\d{6}$/.test(value)) {
      throw new Error('Pickup code must be exactly 6 digits');
    }
    return new PickupCode(value);
  }

  equals(other: PickupCode): boolean {
    return this.value === other.value;
  }
}
