import { LockerStatus, RetrievalReceipt, StoreReceipt } from '../application/locker-station.js';
import { DomainError } from '../domain/errors.js';

export const HELP_TEXT = [
  'Commands:',
  '  create-locker <small|medium|large>   Create a locker of the given size',
  '  list-lockers                         Show all lockers and availability',
  '  store <small|medium|large> [desc]    Store a package (returns locker + pickup code)',
  '  retrieve <lockerId> <pickupCode>     Retrieve a package',
  '  help                                 Show this help',
  '  exit                                 Quit',
].join('\n');

export function formatLockerList(statuses: LockerStatus[]): string {
  if (statuses.length === 0) return 'No lockers have been created yet.';
  return statuses
    .map((s) => `${s.id}  ${s.size.padEnd(6)}  ${s.available ? 'AVAILABLE' : 'OCCUPIED'}`)
    .join('\n');
}

export function formatStoreReceipt(receipt: StoreReceipt): string {
  return [
    `Package stored in locker ${receipt.lockerId}.`,
    `Pickup code: ${receipt.pickupCode}`,
    '(The pickup code is assumed to be sent to the customer via SMS/email.)',
  ].join('\n');
}

export function formatRetrievalReceipt(receipt: RetrievalReceipt): string {
  const description = receipt.package.description ? ` (${receipt.package.description})` : '';
  return [
    `Locker opened. Package${description} retrieved.`,
    `Storage charge: $${receipt.charge}`,
    'The locker is available again.',
  ].join('\n');
}

export function formatError(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  if (error instanceof Error) return `Error: ${error.message}`;
  return 'Error: something went wrong.';
}
