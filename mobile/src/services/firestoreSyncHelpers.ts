/**
 * firestoreSync — pure batch + collection helpers.
 *
 * Sprint 8.2: firestoreSync.ts (552 satir) batch logic pure helper'lara
 * bolundu. I/O (writeBatch commit) service dosyasinda kalmaya devam ediyor.
 */

/**
 * Firestore batch islem limiti (Google kurali).
 */
export const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Collection isimleri (Firestore path tutarliligi icin tek kaynak).
 */
export const COLLECTIONS = {
  USERS: 'users',
  MEDICINES: 'medicines',
  REMINDER_TIMES: 'reminderTimes',
  MEDICINE_LOGS: 'medicineLogs',
  SETTINGS: 'settings',
} as const;

/**
 * Batch operation type — writeBatch.set/delete icin.
 */
export type BatchOperationType = 'set' | 'delete';

export interface BatchOperation<TRef = unknown> {
  type: BatchOperationType;
  ref: TRef;
  data?: unknown;
}

/**
 * Array'i sabit boyutta chunk'lara bol.
 * Pure helper — generic, firestore'a bagimli degil.
 */
export function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be > 0');
  }
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Batch operations toplam sayisini doner (debug/log icin).
 */
export function countBatchOperations(operations: BatchOperation[]): {
  set: number;
  delete: number;
  total: number;
} {
  const set = operations.filter(op => op.type === 'set').length;
  const del = operations.filter(op => op.type === 'delete').length;
  return { set, delete: del, total: operations.length };
}

/**
 * Chunk'lar icin toplam batch sayisini hesapla.
 */
export function calculateBatchCount(
  totalOperations: number,
  batchLimit: number = FIRESTORE_BATCH_LIMIT
): number {
  if (totalOperations <= 0) return 0;
  return Math.ceil(totalOperations / batchLimit);
}

/**
 * Sprint 9.1: Firestore path sabitleri (db'siz — pure helper).
 * userId -> path builder'lari tek kaynaktan yonetir.
 */
export const SETTINGS_DOCUMENT_ID = 'userSettings';

export const FIRESTORE_PATHS = {
  USER_DOC: (userId: string) => `${COLLECTIONS.USERS}/${userId}`,
  MEDICINES_COLLECTION: (userId: string) =>
    `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.MEDICINES}`,
  REMINDER_TIMES_COLLECTION: (userId: string) =>
    `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.REMINDER_TIMES}`,
  MEDICINE_LOGS_COLLECTION: (userId: string) =>
    `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.MEDICINE_LOGS}`,
  SETTINGS_DOC: (userId: string) =>
    `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SETTINGS}/${SETTINGS_DOCUMENT_ID}`,
} as const;

/**
 * Collection path -> userId extract.
 * "users/123/medicines" -> "123"
 */
export function extractUserIdFromPath(path: string): string | null {
  const parts = path.split('/');
  if (parts.length < 2) return null;
  return parts[1] || null;
}
