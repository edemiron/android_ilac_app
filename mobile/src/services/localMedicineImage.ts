/**
 * Local medicine image URI helper.
 *
 * Medicine image'ları ya remote URL (https://...) ya da local file URI
 * (file://...) olabilir. Bu helper, bir URI'nin local olup olmadığını
 * belirler — local ise upload edilmesi gerekir.
 */

const LOCAL_URI_PREFIXES = ['file://', 'content://', 'ph://'] as const;

export function isLocalMedicineImageUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return LOCAL_URI_PREFIXES.some(prefix => uri.startsWith(prefix));
}

export function isRemoteMedicineImageUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return uri.startsWith('http://') || uri.startsWith('https://');
}
