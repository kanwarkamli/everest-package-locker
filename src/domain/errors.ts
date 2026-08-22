export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NoLockerAvailableError extends DomainError {
  constructor() {
    super('No suitable locker is available. The package cannot be stored.');
  }
}

export class LockerNotFoundError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Locker ${lockerId} does not exist.`);
  }
}

export class LockerEmptyError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Locker ${lockerId} has no package to retrieve.`);
  }
}

export class InvalidPickupCodeError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Invalid pickup code for locker ${lockerId}.`);
  }
}

export class LockerOccupiedError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Locker ${lockerId} is already occupied.`);
  }
}

export class PackageTooLargeError extends DomainError {
  constructor(readonly lockerId: string) {
    super(`Package does not fit locker ${lockerId}.`);
  }
}
