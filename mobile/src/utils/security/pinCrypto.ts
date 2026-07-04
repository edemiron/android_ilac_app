/**
 * Security utils — PIN crypto modülü.
 *
 * Sprint 4.4: src/utils/security.ts (657 satir) modularizasyonu.
 * Pure crypto helper'lar (generateSalt, hashPinWithSalt, constantTimeEqual,
 * isValidPin) pure function'lara ayrildi — native module bagimliligi
 * (expo-crypto) test ortaminda mock'lanabilir.
 */

import * as Crypto from 'expo-crypto';

const PIN_HASH_ROUNDS = 10_000;
const PIN_HASH_ALGO = Crypto.CryptoDigestAlgorithm.SHA256;
const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 6;

/**
 * 32 byte rastgele salt uret (hex encode).
 */
export async function generateSalt(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * PIN + salt'i SHA-256 zinciri ile hash'le (PIN_HASH_ROUNDS kadar).
 * Not: PBKDF2 native module gerektirir; burada ardışık SHA-256 ile
 * benzer key stretching saglanır.
 */
export async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  try {
    let hash = `${pin}|${salt}`;
    for (let i = 0; i < PIN_HASH_ROUNDS; i++) {
      hash = await Crypto.digestStringAsync(PIN_HASH_ALGO, hash, {
        encoding: Crypto.CryptoEncoding.HEX,
      });
    }
    return hash;
  } catch (error) {
    throw new Error('PIN hash failed: ' + (error instanceof Error ? error.message : 'unknown'));
  }
}

/**
 * Constant-time string karsilastirma (timing attack korumasi).
 * Hex hash'ler icin.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * PIN form validasyonu.
 * Sadece rakam, 4-6 hane uzunlugunda.
 */
export function isValidPin(pin: string): boolean {
  if (typeof pin !== 'string') return false;
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) return false;
  return /^[0-9]+$/.test(pin);
}

/**
 * Salt + hash donusu (hashPin wrapper). Test/mock icin disaridan
 * inject edilebilir.
 */
export async function generatePinHash(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = await generateSalt();
  const hash = await hashPinWithSalt(pin, salt);
  return { hash, salt };
}
