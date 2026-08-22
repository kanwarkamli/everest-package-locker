/** Single size scale shared by lockers and packages. */
export enum LockerSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

const ORDER: Record<LockerSize, number> = {
  [LockerSize.SMALL]: 0,
  [LockerSize.MEDIUM]: 1,
  [LockerSize.LARGE]: 2,
};

export function canFit(locker: LockerSize, pkg: LockerSize): boolean {
  return ORDER[locker] >= ORDER[pkg];
}

export function compareBySize(a: LockerSize, b: LockerSize): number {
  return ORDER[a] - ORDER[b];
}

export function parseLockerSize(input: string): LockerSize | undefined {
  const normalized = input.trim().toUpperCase();
  return Object.values(LockerSize).find((size) => size === normalized);
}
