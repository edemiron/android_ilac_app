/**
 * Sync Queue Utility
 *
 * Implements a mutex/queue pattern to prevent race conditions
 * during async operations like cloud sync.
 *
 * This ensures operations are executed sequentially, preventing
 * data inconsistency from concurrent modifications.
 */

type QueuedOperation<T> = {
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

/**
 * SyncQueue provides sequential execution of async operations.
 *
 * Use this to prevent race conditions when multiple operations
 * could modify shared state concurrently (e.g., cloud sync).
 */
export class SyncQueue {
  private queue: QueuedOperation<unknown>[] = [];
  private processing = false;
  private disposed = false;

  /**
   * Enqueues an async operation to be executed sequentially.
   *
   * @param operation - The async function to execute
   * @returns Promise that resolves with the operation result
   */
  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    if (this.disposed) {
      return Promise.reject(new Error('SyncQueue has been disposed'));
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        operation: operation as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.processNext();
    });
  }

  /**
   * Processes the next operation in the queue.
   * Only one operation runs at a time.
   */
  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const item = this.queue.shift();

    if (!item) {
      this.processing = false;
      return;
    }

    try {
      const result = await item.operation();
      item.resolve(result);
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.processing = false;
      // Process next item in queue
      this.processNext();
    }
  }

  /**
   * Returns whether the queue is currently processing an operation.
   */
  get isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Returns the number of pending operations in the queue.
   */
  get queueLength(): number {
    return this.queue.length;
  }

  /**
   * Disposes the queue, rejecting any pending operations.
   */
  dispose(): void {
    this.disposed = true;
    const error = new Error('SyncQueue disposed');

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item?.reject(error);
    }
  }
}

// Global sync queue instance for the medicine store
let globalSyncQueue: SyncQueue | null = null;

/**
 * Gets or creates the global sync queue instance.
 */
export function getSyncQueue(): SyncQueue {
  if (!globalSyncQueue) {
    globalSyncQueue = new SyncQueue();
  }
  return globalSyncQueue;
}

/**
 * Resets the global sync queue (useful for testing).
 */
export function resetSyncQueue(): void {
  if (globalSyncQueue) {
    globalSyncQueue.dispose();
    globalSyncQueue = null;
  }
}
