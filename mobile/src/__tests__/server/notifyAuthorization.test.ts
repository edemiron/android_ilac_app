/* global __dirname */
/**
 * Sunucu tarafı bildirim YETKİ denetimi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Bu test niye mobil test paketinde?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `server/functions` altında çalışan bir test altyapısı YOK
 * (`package.json`de `firebase-functions-test` var ama hiç kullanılmamış ve
 * tek bir test dosyası bile bulunmuyor). Bu sürümde kapatılan kusur bir
 * VERİ SIZINTISI ve korumasız kalmasını kabul edilebilir bulmadım;
 * `notify.js` saf JavaScript ve Firestore'u parametre olarak aldığı için
 * mobil jest paketinden doğrudan require edilebiliyor.
 *
 * Bu bir taviz ve öyle olduğunu biliyorum: doğru yer `server/functions`
 * içinde kendi jest yapılandırması. Faz 4 madde 28'in kapsamına yazıldı.
 * O gün gelene kadar korumasız bırakmaktan iyidir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Neyi koruyor
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * v1.8.5'e kadar dört tetikleyici de bildirimleri FCM TOPIC'ine yayınlıyordu
 * (`patient_{uid}`, `user_{uid}`). Topic aboneliği istemci tarafındadır ve
 * kimlik doğrulaması gerektirmez: uid'i bilen herkes
 * `subscribeToTopic('patient_<uid>')` çağırıp o hastanın ilaç
 * bildirimlerini alabiliyordu — SOS olayında `patientPhone` ve `mapsUrl`
 * (konum) dahil. Sunucuda "bu kişi gerçekten bakıcı mı" diye soran hiçbir
 * yer yoktu.
 */

import fs from 'fs';
import path from 'path';

const SERVER_FUNCTIONS = path.join(__dirname, '..', '..', '..', '..', 'server', 'functions');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notify: any = require(path.join(SERVER_FUNCTIONS, 'notify.js'));

interface Relationship {
  id: string;
  patientId: string;
  status: string;
  canReceiveAlerts?: boolean;
  caregiverFcmToken?: string;
}

/**
 * Firestore'un `collection().where().where().get()` zincirini taklit eden
 * asgari bir sahte: `where` çağrıları BİRİKİR, `get` hepsini uygular.
 */
function makeFakeDb(relationships: Relationship[]) {
  const applied: Array<[string, string, unknown]> = [];

  const query = {
    where(field: string, op: string, value: unknown) {
      applied.push([field, op, value]);
      return query;
    },
    async get() {
      const matching = relationships.filter(rel =>
        applied.every(
          ([field, , value]) => (rel as unknown as Record<string, unknown>)[field] === value
        )
      );
      return {
        empty: matching.length === 0,
        docs: matching.map(rel => ({ id: rel.id, data: () => rel })),
      };
    },
  };

  return {
    appliedFilters: applied,
    collection: (name: string) => {
      if (name !== 'caregiverRelationships') {
        throw new Error(`Beklenmeyen koleksiyon: ${name}`);
      }
      return query;
    },
  };
}

const BASE: Relationship = {
  id: 'p1__c1',
  patientId: 'p1',
  status: 'active',
  canReceiveAlerts: true,
  caregiverFcmToken: 'token-c1',
};

describe('getAuthorizedCaregiverTokens', () => {
  it('yetkili aktif bakicinin token ini dondurur', async () => {
    const { tokens } = await notify.getAuthorizedCaregiverTokens(makeFakeDb([BASE]), 'p1');

    expect(tokens).toEqual(['token-c1']);
  });

  it('sorguyu patientId VE status=active ile daraltiyor', async () => {
    // Yetkinin SORGU seviyesinde uygulandigini sabitliyor; filtrelerden biri
    // dusurulurse buradan gorulur.
    const db = makeFakeDb([BASE]);

    await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(db.appliedFilters).toEqual([
      ['patientId', '==', 'p1'],
      ['status', '==', 'active'],
    ]);
  });

  it('BASKA bir hastanin bakicisina gondermez', async () => {
    // Topic yayininin izin verdigi tam senaryo: uid'i bilen yabanci.
    const db = makeFakeDb([
      { ...BASE, id: 'p2__cx', patientId: 'p2', caregiverFcmToken: 'yabanci' },
    ]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(tokens).toEqual([]);
  });

  it('yetkisi KALDIRILMIS bakiciya gondermez', async () => {
    const db = makeFakeDb([
      { ...BASE, id: 'p1__c2', status: 'revoked', caregiverFcmToken: 'token-c2' },
    ]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(tokens).toEqual([]);
  });

  it('bekleyen (pending) daveti kabul etmez', async () => {
    const db = makeFakeDb([
      { ...BASE, id: 'p1__c3', status: 'pending', caregiverFcmToken: 'token-c3' },
    ]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(tokens).toEqual([]);
  });

  it('canReceiveAlerts kapali olani ATLAR', async () => {
    const db = makeFakeDb([
      { ...BASE, id: 'p1__c4', canReceiveAlerts: false, caregiverFcmToken: 'token-c4' },
      BASE,
    ]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(tokens).toEqual(['token-c1']);
  });

  it('canReceiveAlerts alani HIC YOKSA da atlar (varsayilan kapali)', async () => {
    // `!== true` kontrolu bilincli: eksik bir alan "izin var" saymamali.
    const db = makeFakeDb([
      { id: 'p1__c5', patientId: 'p1', status: 'active', caregiverFcmToken: 'token-c5' },
    ]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(tokens).toEqual([]);
  });

  it('token u olmayan iliskiyi atlar', async () => {
    const db = makeFakeDb([{ ...BASE, id: 'p1__c6', caregiverFcmToken: undefined }]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(tokens).toEqual([]);
  });

  it('bos dize token u atlar', async () => {
    const db = makeFakeDb([{ ...BASE, id: 'p1__c7', caregiverFcmToken: '' }]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(tokens).toEqual([]);
  });

  it('mukerrer token u TEKILLESTIRIR', async () => {
    // Mukerrer token = kullaniciya mukerrer bildirim.
    const db = makeFakeDb([
      BASE,
      { ...BASE, id: 'p1__c8', caregiverFcmToken: 'token-c1' },
      { ...BASE, id: 'p1__c9', caregiverFcmToken: 'token-c9' },
    ]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect([...tokens].sort()).toEqual(['token-c1', 'token-c9']);
  });

  it('olu token temizligi icin token -> iliski eslemesi doner', async () => {
    const db = makeFakeDb([BASE, { ...BASE, id: 'p1__c8', caregiverFcmToken: 'token-c1' }]);

    const { relationshipRefs } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(relationshipRefs.get('token-c1')).toEqual(['p1__c1', 'p1__c8']);
  });

  it('SOS icin bile izin bayragi zorunlu', async () => {
    // "Acil durum" gerekcesiyle izni yok saymak, kullanicinin kapattigi bir
    // bildirimi sunucunun geri acmasi ve izni kapali bir bakiciya hastanin
    // TELEFONU ile KONUMUNU gondermesi demek olurdu.
    const db = makeFakeDb([{ ...BASE, canReceiveAlerts: false }]);

    const { tokens } = await notify.getAuthorizedCaregiverTokens(db, 'p1');

    expect(tokens).toEqual([]);
  });
});

describe('olu token hata kodlari', () => {
  it('FCM nin token gecersiz kodlarini taniyor', () => {
    // Temizlenmezse her bildirimde ayni olu token lara gonderim denenir ve
    // hata sayaci gercek hatalari golgeler.
    expect(notify.DEAD_TOKEN_ERRORS.has('messaging/registration-token-not-registered')).toBe(true);
    expect(notify.DEAD_TOKEN_ERRORS.has('messaging/invalid-registration-token')).toBe(true);
    // GECICI hatalar token silme sebebi OLMAMALI.
    expect(notify.DEAD_TOKEN_ERRORS.has('messaging/server-unavailable')).toBe(false);
    expect(notify.DEAD_TOKEN_ERRORS.has('messaging/internal-error')).toBe(false);
  });

  it('multicast toplu is boyutu FCM sinirini asmiyor', () => {
    expect(notify.MULTICAST_BATCH).toBeLessThanOrEqual(500);
    expect(notify.MULTICAST_BATCH).toBeGreaterThan(0);
  });
});

describe('topic yayini geri gelmedi', () => {
  it('index.js icinde kod seviyesinde topic gonderimi YOK', () => {
    const source = fs.readFileSync(path.join(SERVER_FUNCTIONS, 'index.js'), 'utf8');

    // Yorum satirlari gerekceyi anlatirken "topic" kelimesini kullaniyor;
    // aradigimiz sey KOD: bir nesne alaninda `topic:`.
    const codeOnly = source
      .split(/\r?\n/)
      .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');

    expect(codeOnly).not.toMatch(/\btopic\s*:/);
    expect(codeOnly).not.toMatch(/subscribeToTopic/);
  });

  it('istemcide subscribeToTopic kalmadi', () => {
    const clientRoot = path.join(__dirname, '..', '..');
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
          lines.forEach((line, index) => {
            // Yorumlar gerekceyi anlatiyor; yalnizca KOD sayiliyor.
            if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
            if (/messaging\(\)\s*\.\s*subscribeToTopic/.test(line)) {
              offenders.push(`${path.relative(clientRoot, full)}:${index + 1}`);
            }
          });
        }
      }
    };

    walk(clientRoot);

    expect(offenders).toEqual([]);
  });
});
