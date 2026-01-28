/**
 * ID Generator Utility
 *
 * Uses UUID v7 for time-ordered, collision-resistant unique identifiers.
 * UUID v7 is superior to Math.random() based IDs because:
 * - Cryptographically secure random component
 * - Time-ordered (improves database index performance)
 * - Standardized format (RFC 9562)
 * - Near-zero collision probability
 */
import { v7 as uuidv7, validate as uuidValidate } from 'uuid';

/**
 * Generates a new UUID v7.
 * UUID v7 is time-ordered, which means IDs generated later
 * will be lexicographically greater than earlier IDs.
 *
 * @returns A new UUID v7 string
 */
export function generateId(): string {
  return uuidv7();
}

/**
 * Validates whether a string is a valid UUID (any version).
 *
 * @param id - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return uuidValidate(id);
}
