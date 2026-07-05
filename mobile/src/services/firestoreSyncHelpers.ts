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

// =============================================================================
// Sprint 10.1: Firestore referans builder'lari (db bagimli).
// Bu fonksiyonlar Firestore API'sini kullanir (collection, doc) — pure degil.
// Sprint 11'de generic abstraction ile test edilebilir hale getirilebilir.
// =============================================================================
import { collection as firestoreCollection, doc as firestoreDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../config/firebase';

/**
 * Kullanici document reference (Sprint 10.1).
 */
export function getUserDocRef(userId: string) {
  return firestoreDoc(firestoreDb, COLLECTIONS.USERS, userId);
}

/**
 * Medicines collection reference (Sprint 10.1).
 */
export function getMedicinesRef(userId: string) {
  return firestoreCollection(firestoreDb, COLLECTIONS.USERS, userId, COLLECTIONS.MEDICINES);
}

/**
 * Reminder times collection reference (Sprint 10.1).
 */
export function getReminderTimesRef(userId: string) {
  return firestoreCollection(firestoreDb, COLLECTIONS.USERS, userId, COLLECTIONS.REMINDER_TIMES);
}

/**
 * Medicine logs collection reference (Sprint 10.1).
 */
export function getMedicineLogsRef(userId: string) {
  return firestoreCollection(firestoreDb, COLLECTIONS.USERS, userId, COLLECTIONS.MEDICINE_LOGS);
}

/**
 * Settings document reference (Sprint 10.1).
 */
export function getSettingsDocRef(userId: string) {
  return firestoreDoc(
    firestoreDb,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.SETTINGS,
    SETTINGS_DOCUMENT_ID
  );
}

// =============================================================================
// Sprint 12.3: Generic Firestore ref abstraction (test edilebilir).
// Bu fonksiyonlar db instance'a bagimli degil — collection/doc mock'lanabilir.
// Sprint 11.1'de test'te Firebase mock ile auth init hatasi vardi; bu generic
// wrapper'lar mock-friendly API saglar.
// =============================================================================

/**
 * Generic collection reference builder (db instance olmadan test edilebilir).
 * dbIstance: firestore db instance (mock-friendly).
 */
export interface FirestoreRefBuilder {
  collection: typeof firestoreCollection;
  doc: typeof firestoreDoc;
}

import type { Firestore } from 'firebase/firestore';

/**
 * Collection reference (Sprint 12.3 generic abstraction).
 * dbInstance: Firestore db (mock-friendly).
 */
export function buildMedicinesCollectionRef(dbInstance: Firestore, userId: string) {
  return firestoreCollection(dbInstance, COLLECTIONS.USERS, userId, COLLECTIONS.MEDICINES);
}

/**
 * Reminder times collection reference (Sprint 12.3).
 */
export function buildReminderTimesCollectionRef(dbInstance: Firestore, userId: string) {
  return firestoreCollection(dbInstance, COLLECTIONS.USERS, userId, COLLECTIONS.REMINDER_TIMES);
}

/**
 * Medicine logs collection reference (Sprint 12.3).
 */
export function buildMedicineLogsCollectionRef(dbInstance: Firestore, userId: string) {
  return firestoreCollection(dbInstance, COLLECTIONS.USERS, userId, COLLECTIONS.MEDICINE_LOGS);
}

/**
 * Settings document reference (Sprint 12.3).
 */
export function buildSettingsDocRef(dbInstance: Firestore, userId: string) {
  return firestoreDoc(
    dbInstance,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.SETTINGS,
    SETTINGS_DOCUMENT_ID
  );
}
