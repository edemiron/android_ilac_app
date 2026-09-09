/**
 * Silme kayitlari (tombstone) — TEK KAYNAK.
 *
 * ⚠️ v1.7.8 — "SILINEN ILAC GERI GELIYOR" HATASI
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `mergeMedicinesByUpdatedAt` ve `mergeReminderTimesById` bir BIRLESIM
 * (union): bulutta olmayan ama yerelde olan kayit korunur. Silme icin
 * hicbir temsil yoktu — ne `deletedAt`, ne tombstone. Zincir:
 *
 *   1. Telefonda ilac X silinir. Yerelden kalkar; `deleteMedicineFromCloud`
 *      bulut dokumanini da SILER.
 *   2. Tablette X hala YERELDE. `syncFromCloud` calisir:
 *          bulut (X yok)  ∪  yerel (X var)  =  X HAYATTA KALIR
 *   3. Tablet buluta yazar → X bulutta YENIDEN DOGAR.
 *   4. Telefon senkronize olur → X telefona GERI GELIR, alarmlariyla.
 *
 * Yani doktorun biraktirdigi ilaci silen hasta, o ilaci alarmlariyla geri
 * aliyordu. `reminderTimes` icin de ayni: tek bir doz saatini silmek onu
 * diriltiyordu.
 *
 * ── TASARIM: NEDEN AYRI BIR KAYIT, `deletedAt` ALANI DEGIL ───────────────
 * Kayitlara `deletedAt` eklemek, `state.medicines`i okuyan ONLARCA
 * selector/ekranin her birinde filtre gerektirir; birini atlamak "silinmis
 * ilac listede duruyor" ya da tersi "ilac ekrandan kayboldu" regresyonu
 * uretir. Bu yuzden:
 *
 *   - `state.medicines` / `state.reminderTimes` tombstone TASIMAZ (bugunku
 *     gibi: silinen kayit listeden cikar). Mevcut hicbir selector degismez.
 *   - Silme kayitlari AYRI bir eslemede yasar: `{ [id]: silmeZamani }`.
 *   - Bu kayda YALNIZCA birlestirme (merge) bakar.
 *
 * ── SEMANTIK: SON YAZAN KAZANIR ──────────────────────────────────────────
 * Bir kayit, silme zamani kaydin `updatedAt`inden YENIYSE silinmis sayilir.
 * Boylece "sildim, sonra baska cihazda duzenledim" senaryosunda duzenleme
 * kazanir (kullanici kaydi bilincli olarak diriltmis olur) ve "duzenledim,
 * sonra baska cihazda sildim" senaryosunda silme kazanir.
 */

/** id → silme zamani (ISO). */
export type DeletionRegistry = Record<string, string>;

export interface DeletionRegistries {
  medicines: DeletionRegistry;
  reminderTimes: DeletionRegistry;
}

export const EMPTY_DELETIONS: DeletionRegistries = {
  medicines: {},
  reminderTimes: {},
};

/**
 * Tombstone'lar sonsuza kadar tutulmaz.
 *
 * 90 gun, en tembel cihazin bile en az bir kez senkronize olmasi icin fazlasiyla
 * yeterli. Daha kisa tutmak, uzun sure kapali kalan bir tablette silinmis
 * ilacin dirilmesine kapi acar.
 */
export const DELETION_RETENTION_DAYS = 90;

function isValidIso(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

/** Bozuk/eksik kayitlari temizleyerek normalize et. */
export function normalizeDeletions(input: unknown): DeletionRegistries {
  const source = (input || {}) as Partial<DeletionRegistries>;
  const pick = (registry: unknown): DeletionRegistry => {
    const out: DeletionRegistry = {};
    if (!registry || typeof registry !== 'object') return out;
    for (const [id, at] of Object.entries(registry as Record<string, unknown>)) {
      if (id && isValidIso(at)) out[id] = at;
    }
    return out;
  };
  return {
    medicines: pick(source.medicines),
    reminderTimes: pick(source.reminderTimes),
  };
}

/** Silme kaydi ekle (varsa daha YENI olani korunur). */
export function recordDeletion(
  registry: DeletionRegistry,
  id: string,
  deletedAt: string
): DeletionRegistry {
  if (!id || !isValidIso(deletedAt)) return registry;
  const existing = registry[id];
  if (existing && existing >= deletedAt) return registry;
  return { ...registry, [id]: deletedAt };
}

/** Birden fazla id icin silme kaydi ekle. */
export function recordDeletions(
  registry: DeletionRegistry,
  ids: ReadonlyArray<string>,
  deletedAt: string
): DeletionRegistry {
  let next = registry;
  for (const id of ids) next = recordDeletion(next, id, deletedAt);
  return next;
}

/**
 * Bu kayit silinmis mi?
 *
 * `updatedAt` verilirse SON YAZAN KAZANIR: silme zamani `updatedAt`ten yeni
 * degilse kayit dirilmis kabul edilir.
 */
export function isDeleted(registry: DeletionRegistry, id: string, updatedAt?: string): boolean {
  const deletedAt = registry?.[id];
  if (!deletedAt) return false;
  if (!isValidIso(updatedAt)) return true;
  return deletedAt >= updatedAt;
}

/** Iki cihazin silme kayitlarini birlestir (her id icin EN YENI silme). */
export function mergeDeletionRegistries(
  local: DeletionRegistry | undefined,
  remote: DeletionRegistry | undefined
): DeletionRegistry {
  const merged: DeletionRegistry = { ...(local || {}) };
  for (const [id, at] of Object.entries(remote || {})) {
    if (!isValidIso(at)) continue;
    if (!merged[id] || merged[id] < at) merged[id] = at;
  }
  return merged;
}

/** Saklama suresini gecmis tombstone'lari at. */
export function pruneDeletions(
  registry: DeletionRegistry,
  now: Date = new Date(),
  retentionDays: number = DELETION_RETENTION_DAYS
): DeletionRegistry {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const out: DeletionRegistry = {};
  for (const [id, at] of Object.entries(registry || {})) {
    if (Date.parse(at) >= cutoff) out[id] = at;
  }
  return out;
}

/**
 * Buluttan gelen kayitlardan silinmis olanlari AYIKLA.
 *
 * Donen `kept` birlestirmeye girer; `removedIds` ise YEREL'de duruyorsa
 * kaldirilmasi ve alarmlarinin iptal edilmesi gereken kayitlardir.
 */
export function partitionByDeletions<T extends { id: string; updatedAt?: string }>(
  records: ReadonlyArray<T>,
  registry: DeletionRegistry
): { kept: T[]; removedIds: string[] } {
  const kept: T[] = [];
  const removedIds: string[] = [];
  for (const record of records || []) {
    if (isDeleted(registry, record.id, record.updatedAt)) removedIds.push(record.id);
    else kept.push(record);
  }
  return { kept, removedIds };
}
