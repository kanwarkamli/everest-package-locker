/** Serialises async critical sections: tasks run one at a time, FIFO. */
export class Mutex {
  private tail: Promise<unknown> = Promise.resolve();

  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn); // start after the predecessor settles either way
    this.tail = run.catch(() => undefined); // a rejection must not poison the queue
    return run;
  }
}
