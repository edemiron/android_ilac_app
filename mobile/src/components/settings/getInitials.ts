/**
 * getInitials — Sprint 93.
 *
 * Pure helper, CaregiverSection.tsx'ten refactor edildi. Avatar için
 * isim baş harflerini hesaplar. Tek/çok kelime isimleri, Türkçe
 * karakterler, boşluklar ve email-as-name durumlarini dogru ele alir.
 *
 * Davranis:
 * - empty/whitespace → "?"
 * - single word (>=2 char) → ilk 2 karakter uppercase
 * - 2+ word → ilk kelimenin ilk harfi + son kelimenin ilk harfi
 * - email (splits on @) → email'in yerel kisminin ilk + domain'in ilk harfi
 *
 * Sprint 93 ile helper izole test edilebilirlik icin ayri dosyaya tasindi.
 */

export function getInitials(name: string): string {
  const parts = name.split(/[\s@]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
