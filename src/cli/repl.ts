import { createInterface } from 'node:readline';
import { LockerStation } from '../application/locker-station.js';
import { parseLockerSize } from '../domain/locker-size.js';
import { Package } from '../domain/package.js';
import {
  formatError,
  formatLockerList,
  formatRetrievalReceipt,
  formatStoreReceipt,
  HELP_TEXT,
} from './presenter.js';

export async function executeCommand(station: LockerStation, line: string): Promise<string> {
  const [command, ...args] = line.trim().split(/\s+/);
  try {
    switch (command) {
      case undefined:
      case '':
        return '';
      case 'help':
        return HELP_TEXT;
      case 'create-locker': {
        const size = args[0] !== undefined ? parseLockerSize(args[0]) : undefined;
        if (!size) {
          return `Unknown size ${args[0] ?? ''}. Usage: create-locker <small|medium|large>`;
        }
        const id = await station.createLocker(size);
        return `Created ${size} locker ${id}.`;
      }
      case 'list-lockers':
        return formatLockerList(await station.listLockers());
      case 'store': {
        const size = args[0] !== undefined ? parseLockerSize(args[0]) : undefined;
        if (!size) {
          return `Unknown size ${args[0] ?? ''}. Usage: store <small|medium|large> [description]`;
        }
        const description = args.slice(1).join(' ') || undefined;
        return formatStoreReceipt(await station.storePackage(new Package(size, description)));
      }
      case 'retrieve': {
        const [lockerId, code] = args;
        if (!lockerId || !code) return 'Usage: retrieve <lockerId> <pickupCode>';
        return formatRetrievalReceipt(await station.retrievePackage(lockerId, code));
      }
      default:
        return `Unknown command: ${command}. Type "help" for available commands.`;
    }
  } catch (error) {
    return formatError(error);
  }
}

export async function runRepl(
  station: LockerStation,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
): Promise<void> {
  output.write('Smart Package Locker Management System\n');
  output.write(`${HELP_TEXT}\n\n`);
  const rl = createInterface({ input, output, prompt: '> ' });
  rl.prompt();
  for await (const line of rl) {
    if (line.trim() === 'exit') break;
    const result = await executeCommand(station, line);
    if (result) output.write(`${result}\n`);
    rl.prompt();
  }
  rl.close();
  output.write('Goodbye.\n');
}
