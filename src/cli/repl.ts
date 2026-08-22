import { createInterface } from 'node:readline';
import { LockerStation } from '../application/locker-station.js';
import { LockerSize, parseLockerSize } from '../domain/locker-size.js';
import { Package } from '../domain/package.js';
import {
  formatError,
  formatLockerList,
  formatRetrievalReceipt,
  formatStoreReceipt,
  HELP_TEXT,
} from './presenter.js';

type SizeArg = { ok: true; size: LockerSize } | { ok: false; message: string };

function parseSizeArg(arg: string | undefined, usage: string): SizeArg {
  const size = arg === undefined ? undefined : parseLockerSize(arg);
  if (!size) return { ok: false, message: `Unknown size ${arg ?? ''}. Usage: ${usage}` };
  return { ok: true, size };
}

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
        const arg = parseSizeArg(args[0], 'create-locker <small|medium|large>');
        if (!arg.ok) return arg.message;
        const id = await station.createLocker(arg.size);
        return `Created ${arg.size} locker ${id}.`;
      }
      case 'list-lockers':
        return formatLockerList(await station.listLockers());
      case 'store': {
        const arg = parseSizeArg(args[0], 'store <small|medium|large> [description]');
        if (!arg.ok) return arg.message;
        const description = args.slice(1).join(' ') || undefined;
        return formatStoreReceipt(await station.storePackage(new Package(arg.size, description)));
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
  try {
    rl.prompt();
    for await (const line of rl) {
      if (line.trim() === 'exit') break;
      const result = await executeCommand(station, line);
      if (result) output.write(`${result}\n`);
      rl.prompt();
    }
  } catch (error) {
    // An input-stream failure (e.g. the terminal disappearing) must still
    // shut the session down cleanly rather than crash the process.
    output.write(`${formatError(error)}\n`);
  } finally {
    rl.close();
    output.write('Goodbye.\n');
  }
}
