/**
 * `src/domain/deletions.ts` sozlesme testleri.
 *
 * Kilitlenen uretim hatasi (v1.7.8): merge BIRLESIM oldugu ve silme icin
 * hicbir temsil olmadigi icin bir cihazda silinen ilac diger cihazda hayatta
 * kaliyor, buluta geri yaziliyor ve ILK cihaza ALARMLARIYLA geri geliyordu.
 */

import {
  EMPTY_DELETIONS,
  DELETION_RETENTION_DAYS,
  normalizeDeletions,
  recordDeletion,
  recordDeletions,
  isDeleted,
  mergeDeletionRegistries,
  pruneDeletions,
  partitionByDeletions,
} from '../../domain/deletions';

describe('recordDeletion', () => {
  it('yeni kayit ekler', () => {
    const r = recordDeletion({}, 'med-1', '2026-09-03T10:00:00.000Z');
    expect(r['med-1']).toBe('2026-09-03T10:00:00.000Z');
  });

  it('DAHA YENI silme kazanir', () => {
    let r = recordDeletion({}, 'med-1', '2026-09-01T10:00:00.000Z');
    r = recordDeletion(r, 'med-1', '2026-09-03T10:00:00.000Z');
    expect(r['med-1']).toBe('2026-09-03T10:00:00.000Z');
  });

  it('DAHA ESKI silme mevcut kaydi ezmez', () => {
    let r = recordDeletion({}, 'med-1', '2026-09-03T10:00:00.000Z');
    r = recordDeletion(r, 'med-1', '2026-09-01T10:00:00.000Z');
    expect(r['med-1']).toBe('2026-09-03T10:00:00.000Z');
  });

  it('bozuk girdiyi yoksayar', () => {
    expect(recordDeletion({}, '', '2026-09-03T10:00:00.000Z')).toEqual({});
    expect(recordDeletion({}, 'med-1', 'gecersiz')).toEqual({});
  });

  it('recordDeletions birden fazla id yazar', () => {
    const r = recordDeletions({}, ['rt-1', 'rt-2'], '2026-09-03T10:00:00.000Z');
    expect(Object.keys(r).sort()).toEqual(['rt-1', 'rt-2']);
  });
});

describe('isDeleted — SON YAZAN KAZANIR', () => {
  const registry = { 'med-1': '2026-09-03T10:00:00.000Z' };

  it('kaydi olmayan id silinmis degildir', () => {
    expect(isDeleted(registry, 'med-2')).toBe(false);
  });

  it('updatedAt verilmezse silinmis sayilir', () => {
    expect(isDeleted(registry, 'med-1')).toBe(true);
  });

  it('SILME daha yeniyse silinmis sayilir', () => {
    expect(isDeleted(registry, 'med-1', '2026-09-02T10:00:00.000Z')).toBe(true);
  });

  it('DUZENLEME daha yeniyse kayit DIRILIR (kullanici bilincli geri ekledi)', () => {
    expect(isDeleted(registry, 'med-1', '2026-09-04T10:00:00.000Z')).toBe(false);
  });

  it('esitlikte silme kazanir', () => {
    expect(isDeleted(registry, 'med-1', '2026-09-03T10:00:00.000Z')).toBe(true);
  });
});

describe('mergeDeletionRegistries', () => {
  it('iki cihazin kayitlarini birlestirir', () => {
    const merged = mergeDeletionRegistries(
      { a: '2026-09-01T00:00:00.000Z' },
      { b: '2026-09-02T00:00:00.000Z' }
    );
    expect(Object.keys(merged).sort()).toEqual(['a', 'b']);
  });

  it('ayni id icin EN YENI silme kalir', () => {
    const merged = mergeDeletionRegistries(
      { a: '2026-09-01T00:00:00.000Z' },
      { a: '2026-09-05T00:00:00.000Z' }
    );
    expect(merged.a).toBe('2026-09-05T00:00:00.000Z');
  });

  it('undefined girdilerle patlamaz', () => {
    expect(mergeDeletionRegistries(undefined, undefined)).toEqual({});
  });
});

describe('pruneDeletions', () => {
  const now = new Date('2026-09-03T00:00:00.000Z');

  it('saklama suresi icindeki kaydi TUTAR', () => {
    const r = pruneDeletions({ a: '2026-08-20T00:00:00.000Z' }, now);
    expect(r.a).toBeDefined();
  });

  it('suresi gecmis kaydi ATAR', () => {
    const eski = new Date(now.getTime() - (DELETION_RETENTION_DAYS + 5) * 86400000).toISOString();
    expect(pruneDeletions({ a: eski }, now)).toEqual({});
  });
});

describe('partitionByDeletions — ASIL REGRESYON', () => {
  it('buluttan gelen SILINMIS ilac birlestirmeye GIRMEZ', () => {
    const registry = { 'med-1': '2026-09-03T10:00:00.000Z' };
    const cloud = [
      { id: 'med-1', updatedAt: '2026-09-02T10:00:00.000Z' },
      { id: 'med-2', updatedAt: '2026-09-02T10:00:00.000Z' },
    ];

    const { kept, removedIds } = partitionByDeletions(cloud, registry);

    expect(kept.map(m => m.id)).toEqual(['med-2']);
    // med-1 YERELDE duruyorsa kaldirilmali ve alarmlari iptal edilmeli.
    expect(removedIds).toEqual(['med-1']);
  });

  it('silme kaydi yoksa hicbir sey ayiklanmaz', () => {
    const cloud = [{ id: 'med-1', updatedAt: '2026-09-02T10:00:00.000Z' }];
    const { kept, removedIds } = partitionByDeletions(cloud, {});
    expect(kept).toHaveLength(1);
    expect(removedIds).toHaveLength(0);
  });

  it('silmeden SONRA duzenlenen kayit korunur', () => {
    const registry = { 'med-1': '2026-09-03T10:00:00.000Z' };
    const cloud = [{ id: 'med-1', updatedAt: '2026-09-04T10:00:00.000Z' }];
    const { kept, removedIds } = partitionByDeletions(cloud, registry);
    expect(kept).toHaveLength(1);
    expect(removedIds).toHaveLength(0);
  });

  it('bos/null listede patlamaz', () => {
    expect(partitionByDeletions([], {})).toEqual({ kept: [], removedIds: [] });
    expect(partitionByDeletions(null as unknown as { id: string }[], {})).toEqual({
      kept: [],
      removedIds: [],
    });
  });
});

describe('normalizeDeletions', () => {
  it('bozuk yapiyi guvenli hale getirir', () => {
    expect(normalizeDeletions(null)).toEqual(EMPTY_DELETIONS);
    expect(normalizeDeletions({ medicines: 'x', reminderTimes: 5 })).toEqual(EMPTY_DELETIONS);
  });

  it('gecersiz zaman damgalarini atar', () => {
    const r = normalizeDeletions({
      medicines: { a: '2026-09-03T00:00:00.000Z', b: 'gecersiz', '': '2026-09-03T00:00:00.000Z' },
      reminderTimes: {},
    });
    expect(Object.keys(r.medicines)).toEqual(['a']);
  });
});
