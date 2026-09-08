/**
 * firestore.rules — DAVRANIŞSAL test (Firestore Emülatörü)
 *
 * ── Neden bu dosya var ─────────────────────────────────────────────────────
 * `firestoreRules.contract.test.ts` kuralların yalnızca ŞEKLİNİ kilitler
 * (regex ile metin okur). K1/K2/K3 sertleştirmesi için hiçbir assertion
 * içermediği doğrulanmıştı: `isNotAnonymous`, `inviteNotExpired`,
 * `caregiver_action` veya bakıcı create-only kuralı silinse 10 testin hepsi
 * yine geçerdi.
 *
 * Bu dosya o boşluğu kapatır — kuralları GERÇEK Firestore emülatöründe
 * çalıştırıp izin verilmeli/verilmemeli ayrımını davranışsal olarak kanıtlar.
 *
 * ── Nasıl çalıştırılır ─────────────────────────────────────────────────────
 * Emülatör gerektirir. Firebase CLI `JAVA_HOME`'u kullanır; bu makinede
 * PATH'teki `java` 1.8 ama `JAVA_HOME` JDK 17'ye işaret ediyor (emülatör
 * Java 11+ ister), dolayısıyla aşağıdaki komut doğrudan çalışır:
 *
 *   firebase emulators:exec --only firestore ^
 *     "npx jest src/__tests__/security/firestoreRules.behavioral.test.ts"
 *
 * `FIRESTORE_EMULATOR_HOST` tanımlı DEĞİLSE tüm suite skip edilir — böylece
 * düz `npx jest` veya CI (emülatörsüz) kırılmaz. Skip durumu sessiz değildir:
 * aşağıdaki `beforeAll` neden atlandığını loglar.
 */

/* global __dirname */
import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
  type TokenOptions,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const RULES_PATH = path.join(__dirname, '..', '..', '..', '..', 'firestore.rules');
const PROJECT_ID = 'demo-ilac-rules-behaviour';

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const describeFn = EMULATOR_HOST ? describe : describe.skip;

const PATIENT = 'patient1';
const CAREGIVER = 'caregiver1'; // aktif ilişkisi olan bakıcı
const ANON = 'anon1';

/**
 * Gerçek Firebase Auth token'ları her zaman `firebase.sign_in_provider` taşır.
 * `TokenOptions` ile açıkça tiplendiriliyor; aksi halde literal `string`'e
 * genişliyor ve `FirebaseSignInProvider` union'ına atanamıyor (TS2345).
 */
const passwordClaims: TokenOptions = { firebase: { sign_in_provider: 'password' } };
const anonymousClaims: TokenOptions = { firebase: { sign_in_provider: 'anonymous' } };

const DAY_MS = 86_400_000;
const futureMs = () => Date.now() + 7 * DAY_MS;
const pastMs = () => Date.now() - DAY_MS;

/** Hasta tarafından oluşturulmuş, farklı durumlardaki davetler. */
const INVITE = {
  valid: 'CODE_VALID', // pending + expiresAtMs gelecekte
  expired: 'CODE_EXPIRED', // pending + expiresAtMs GEÇMİŞTE  → K2
  legacy: 'CODE_LEGACY', // pending + expiresAtMs YOK        → sentinel
  accepted: 'CODE_ACCEPTED', // accepted                      → tekrar oynatma
};

let testEnv: RulesTestEnvironment;

describeFn('firestore.rules — davranışsal (emülatör)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync(RULES_PATH, 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  }, 60_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  }, 30_000);

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Kuralları bypass ederek temel veriyi kur (Admin-benzeri bağlam).
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();

      await setDoc(doc(db, 'users', PATIENT), {
        displayName: 'Hasta',
        phone: '+905550000000',
      });

      // Aktif bakıcı ilişkisi — erişim kontrolünün tek kaynağı.
      await setDoc(doc(db, 'caregiverRelationships', `${PATIENT}__${CAREGIVER}`), {
        patientId: PATIENT,
        caregiverId: CAREGIVER,
        status: 'active',
        canReceiveAlerts: true,
      });

      await setDoc(doc(db, 'caregiverInvites', INVITE.valid), {
        patientId: PATIENT,
        status: 'pending',
        expiresAtMs: futureMs(),
      });
      await setDoc(doc(db, 'caregiverInvites', INVITE.expired), {
        patientId: PATIENT,
        status: 'pending',
        expiresAtMs: pastMs(),
      });
      // expiresAtMs YOK — sahada bu biçimde oluşturulmuş eski davetler var.
      await setDoc(doc(db, 'caregiverInvites', INVITE.legacy), {
        patientId: PATIENT,
        status: 'pending',
      });
      await setDoc(doc(db, 'caregiverInvites', INVITE.accepted), {
        patientId: PATIENT,
        status: 'accepted',
        caregiverId: CAREGIVER,
      });

      // Hastanın kaydetmiş olduğu bir doz kaydı.
      await setDoc(doc(db, 'users', PATIENT, 'medicineLogs', 'log-missed'), {
        medicineId: 'med1',
        medicineName: 'Aspirin',
        scheduledTime: '2026-09-09T08:00:00.000Z',
        status: 'missed',
        source: 'patient',
      });
    });
  }, 30_000);

  const patientCtx = () => testEnv.authenticatedContext(PATIENT, passwordClaims);
  const caregiverCtx = (uid = CAREGIVER) => testEnv.authenticatedContext(uid, passwordClaims);
  const anonCtx = () => testEnv.authenticatedContext(ANON, anonymousClaims);

  // ────────────────────────────────────────────────────────────────────────
  // K3 — doz kaydı bakıcı için APPEND-ONLY
  // ────────────────────────────────────────────────────────────────────────

  it('hasta kendi doz kaydını create/update/delete edebilir', async () => {
    const ctx = patientCtx();
    const db = ctx.firestore();
    const ref = doc(db, 'users', PATIENT, 'medicineLogs', 'log-own');

    await assertSucceeds(
      setDoc(ref, {
        medicineId: 'med1',
        status: 'taken',
        scheduledTime: '2026-09-09T09:00:00.000Z',
      })
    );
    await assertSucceeds(updateDoc(ref, { status: 'skipped' }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('aktif bakıcı `source: caregiver_action` ile doz kaydı OLUŞTURABİLİR', async () => {
    const ctx = caregiverCtx();
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'medicineLogs', 'log-by-caregiver');

    await assertSucceeds(
      setDoc(ref, {
        medicineId: 'med1',
        medicineName: 'Aspirin',
        scheduledTime: '2026-09-09T10:00:00.000Z',
        status: 'taken',
        source: 'caregiver_action',
        actorUid: CAREGIVER,
      })
    );
  });

  it('⚠️ bakıcı `source` OLMADAN doz kaydı oluşturamaz', async () => {
    const ctx = caregiverCtx();
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'medicineLogs', 'log-no-source');

    await assertFails(
      setDoc(ref, {
        medicineId: 'med1',
        status: 'taken',
        scheduledTime: '2026-09-09T10:00:00.000Z',
      })
    );
  });

  it('⚠️ bakıcı yanlış `source` değeriyle (patient) doz kaydı oluşturamaz', async () => {
    const ctx = caregiverCtx();
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'medicineLogs', 'log-fake-source');

    // K3'ün özü: bakıcı kendi yazdığı kaydı hastanınki gibi GÖSTEREMEZ.
    await assertFails(
      setDoc(ref, {
        medicineId: 'med1',
        status: 'taken',
        scheduledTime: '2026-09-09T10:00:00.000Z',
        source: 'patient',
      })
    );
  });

  it('⚠️⚠️ K3 ÇEKİRDEĞİ: bakıcı hastanın MEVCUT doz kaydını update EDEMEZ', async () => {
    const ctx = caregiverCtx();
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'medicineLogs', 'log-missed');

    // Eski kural (`allow create, update: if isOwner || isActiveCaregiverOf`)
    // bunu KABUL EDİYORDU: bakıcı hastanın `missed` kaydını `taken`'a
    // çevirip `source`'u aynı yazımda değiştirerek izini örtebiliyordu.
    await assertFails(updateDoc(ref, { status: 'taken', source: 'caregiver_action' }));
  });

  it('⚠️ bakıcı doz kaydını silemez', async () => {
    const ctx = caregiverCtx();
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'medicineLogs', 'log-missed');

    await assertFails(deleteDoc(ref));
  });

  it('bakıcı hastanın doz kaydını OKUYABİLİR (meşru refakatçi takibi)', async () => {
    const ctx = caregiverCtx();
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'medicineLogs', 'log-missed');

    await assertSucceeds(getDoc(ref));
  });

  it('ilişkisi OLMAYAN kimliği doğrulanmış kullanıcı doz kaydı oluşturamaz', async () => {
    const ctx = caregiverCtx('stranger1');
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'medicineLogs', 'log-stranger');

    await assertFails(
      setDoc(ref, { medicineId: 'med1', status: 'taken', source: 'caregiver_action' })
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // K1 — anonim kimlik kapatıldı
  // ────────────────────────────────────────────────────────────────────────

  it('⚠️ ANONİM kimlik davet dokümanını get EDEMEZ', async () => {
    const ctx = anonCtx();
    const ref = doc(ctx.firestore(), 'caregiverInvites', INVITE.valid);

    await assertFails(getDoc(ref));
  });

  it('kimliği doğrulanmış (parola) kullanıcı davet dokümanını get EDEBİLİR', async () => {
    const ctx = caregiverCtx('redeemer1');
    const ref = doc(ctx.firestore(), 'caregiverInvites', INVITE.valid);

    await assertSucceeds(getDoc(ref));
  });

  it('kimlik doğrulaması OLMAYAN istek davet dokümanını get EDEMEZ', async () => {
    const ctx = testEnv.unauthenticatedContext();
    const ref = doc(ctx.firestore(), 'caregiverInvites', INVITE.valid);

    await assertFails(getDoc(ref));
  });

  it('⚠️ ANONİM kimlik davet koduyla ilişki KURAMAZ', async () => {
    const ctx = anonCtx();
    const ref = doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__${ANON}`);

    await assertFails(
      setDoc(ref, {
        patientId: PATIENT,
        caregiverId: ANON,
        inviteCode: INVITE.valid,
        status: 'active',
      })
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // K2 — süre dolumu kuralda bağlayıcı + tekrar oynatma
  // ────────────────────────────────────────────────────────────────────────

  it('geçerli (pending + gelecekte) davetle ilişki KURULABİLİR', async () => {
    const ctx = caregiverCtx('redeemer2');
    const ref = doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__redeemer2`);

    await assertSucceeds(
      setDoc(ref, {
        patientId: PATIENT,
        caregiverId: 'redeemer2',
        inviteCode: INVITE.valid,
        status: 'active',
      })
    );
  });

  it('⚠️ SÜRESİ DOLMUŞ davetle ilişki KURULAMAZ (K2 — kuralda bağlayıcı)', async () => {
    const ctx = caregiverCtx('redeemer3');
    const ref = doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__redeemer3`);

    // İstemcideki süre kontrolü SDK'yı doğrudan kullanan biri için hiçbir şey
    // ifade etmiyordu; artık kural reddediyor.
    await assertFails(
      setDoc(ref, {
        patientId: PATIENT,
        caregiverId: 'redeemer3',
        inviteCode: INVITE.expired,
        status: 'active',
      })
    );
  });

  it('expiresAtMs alanı OLMAYAN eski davetle ilişki kurulabilir (sentinel — kırıcı olmayan geçiş)', async () => {
    const ctx = caregiverCtx('redeemer4');
    const ref = doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__redeemer4`);

    // Sentinel: alanı olmayan eski davetler reddedilmez, yoksa yama sahada
    // hâlihazırda bekleyen davetleri kırardı.
    await assertSucceeds(
      setDoc(ref, {
        patientId: PATIENT,
        caregiverId: 'redeemer4',
        inviteCode: INVITE.legacy,
        status: 'active',
      })
    );
  });

  it('⚠️ KABUL EDİLMİŞ davet tekrar kullanılamaz (tekrar oynatma)', async () => {
    const ctx = caregiverCtx('redeemer5');
    const ref = doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__redeemer5`);

    await assertFails(
      setDoc(ref, {
        patientId: PATIENT,
        caregiverId: 'redeemer5',
        inviteCode: INVITE.accepted,
        status: 'active',
      })
    );
  });

  it('davet kanıtı OLMADAN bakıcı kendini ilişkiye yazamaz', async () => {
    const ctx = caregiverCtx('redeemer6');
    const ref = doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__redeemer6`);

    await assertFails(
      setDoc(ref, { patientId: PATIENT, caregiverId: 'redeemer6', status: 'active' })
    );
  });

  it('bakıcı daveti pending→accepted ve SABİT alan kümesiyle güncelleyebilir', async () => {
    const ctx = caregiverCtx('redeemer7');
    const ref = doc(ctx.firestore(), 'caregiverInvites', INVITE.valid);

    await assertSucceeds(
      updateDoc(ref, {
        status: 'accepted',
        caregiverId: 'redeemer7',
        caregiverName: 'Bakıcı',
        acceptedAt: new Date().toISOString(),
      })
    );
  });

  it('⚠️ bakıcı davete KEYFİ alan ekleyemez (hasOnly kısıtı)', async () => {
    const ctx = caregiverCtx('redeemer8');
    const ref = doc(ctx.firestore(), 'caregiverInvites', INVITE.valid);

    // Eskiden bakıcı dalı alan kümesini kısıtlamıyordu.
    await assertFails(
      updateDoc(ref, {
        status: 'accepted',
        caregiverId: 'redeemer8',
        permissions: { canViewMedicines: true },
      })
    );
  });

  it('⚠️ bakıcı daveti `accepted` dışında bir duruma çekemez', async () => {
    const ctx = caregiverCtx('redeemer9');
    const ref = doc(ctx.firestore(), 'caregiverInvites', INVITE.valid);

    // Bu, istemciden kaldırılan `status:'expired'` yazımının kural karşılığı:
    // bakıcı daveti expired/revoked yapamaz.
    await assertFails(updateDoc(ref, { status: 'expired' }));
  });

  it('⚠️ bakıcı daveti kendi üzerine DEĞİL başka UID üzerine kabul edemez', async () => {
    const ctx = caregiverCtx('redeemer10');
    const ref = doc(ctx.firestore(), 'caregiverInvites', INVITE.valid);

    await assertFails(updateDoc(ref, { status: 'accepted', caregiverId: 'someone-else' }));
  });

  it('hasta kendi davetini serbestçe güncelleyebilir (iptal dahil)', async () => {
    const ctx = patientCtx();
    const ref = doc(ctx.firestore(), 'caregiverInvites', INVITE.valid);

    await assertSucceeds(updateDoc(ref, { status: 'revoked' }));
  });

  it('daveti yalnızca hasta kendi adına oluşturabilir', async () => {
    const patient = patientCtx();
    await assertSucceeds(
      setDoc(doc(patient.firestore(), 'caregiverInvites', 'NEW_CODE'), {
        patientId: PATIENT,
        status: 'pending',
        expiresAtMs: futureMs(),
      })
    );

    const stranger = caregiverCtx('stranger2');
    await assertFails(
      setDoc(doc(stranger.firestore(), 'caregiverInvites', 'NEW_CODE_2'), {
        patientId: PATIENT,
        status: 'pending',
      })
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // Regresyon bekçileri — mevcut kurallar bozulmadı
  // ────────────────────────────────────────────────────────────────────────

  it("istemci kendi abonelik tier'ını YAZAMAZ", async () => {
    const ctx = patientCtx();
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'subscription', 'current');

    await assertFails(setDoc(ref, { tier: 'premium', endDate: futureMs() }));
  });

  it('⚠️ abonelik düzeltmesi aşırı kısıtlamadı: hasta kendi aboneliğini OKUYABİLİR', async () => {
    // Catch-all'dan `subscription` hariç tutuldu; okuma yetkisi
    // `match /subscription/{subscriptionId}` içindeki `allow read: if isOwner`
    // üzerinden gelmeye devam etmeli.
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'users', PATIENT, 'subscription', 'current'), {
        tier: 'free',
      });
    });

    const ctx = patientCtx();
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'users', PATIENT, 'subscription', 'current')));
  });

  it('⚠️ catch-all hâlâ çalışıyor: hasta AÇIKÇA listelenmemiş alt koleksiyona yazabilir', async () => {
    // `allSubcollections[0] != 'subscription'` istisnası yalnızca aboneliği
    // hedeflemeli; diğer alt koleksiyonlar (ör. vitals, symptomLogs) sahibi
    // için yazılabilir kalmalı. Aksi halde düzeltme meşru veriyi kilitlerdi.
    const ctx = patientCtx();
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users', PATIENT, 'vitals', 'v1'), { systolic: 120 })
    );
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users', PATIENT, 'symptomLogs', 's1'), { note: 'baş ağrısı' })
    );
  });

  it('bakıcı hastanın açıkça listelenmemiş alt koleksiyonuna YAZAMAZ', async () => {
    const ctx = caregiverCtx();
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users', PATIENT, 'vitals', 'v2'), { systolic: 999 })
    );
  });

  it('hasta kendi ilacını yazabilir, bakıcı YAZAMAZ', async () => {
    const patient = patientCtx();
    await assertSucceeds(
      setDoc(doc(patient.firestore(), 'users', PATIENT, 'medicines', 'med1'), {
        name: 'Aspirin',
        dosage: '100mg',
      })
    );

    const caregiver = caregiverCtx();
    await assertFails(
      setDoc(doc(caregiver.firestore(), 'users', PATIENT, 'medicines', 'med2'), {
        name: 'X',
      })
    );
  });

  it('yetkisi kaldırılan bakıcı kendini yeniden `active` YAPAMAZ', async () => {
    // İlişkiyi pasife çek, sonra bakıcının kendini geri açmayı denemesini test et.
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await updateDoc(doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__${CAREGIVER}`), {
        status: 'inactive',
      });
    });

    const ctx = caregiverCtx();
    const ref = doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__${CAREGIVER}`);

    await assertFails(updateDoc(ref, { status: 'active' }));
    // Ama kendi iletişim alanlarını güncelleyebilir.
    await assertSucceeds(updateDoc(ref, { caregiverPhone: '+905551112233' }));
  });

  it('bakıcı artık pasifse doz kaydı oluşturamaz', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await updateDoc(doc(ctx.firestore(), 'caregiverRelationships', `${PATIENT}__${CAREGIVER}`), {
        status: 'inactive',
      });
    });

    const ctx = caregiverCtx();
    const ref = doc(ctx.firestore(), 'users', PATIENT, 'medicineLogs', 'log-after-revoke');

    await assertFails(
      setDoc(ref, { medicineId: 'med1', status: 'taken', source: 'caregiver_action' })
    );
  });

  it('config/ koleksiyonu istemciye tamamen kapalı', async () => {
    const ctx = patientCtx();
    await assertFails(getDoc(doc(ctx.firestore(), 'config', 'ai')));
    await assertFails(setDoc(doc(ctx.firestore(), 'config', 'ai'), { geminiApiKey: 'x' }));
  });

  it('ilişki kimliği {patientId}__{caregiverId} biçiminde OLMAK ZORUNDA', async () => {
    const ctx = caregiverCtx('redeemer11');
    // Doğru davet, YANLIŞ doküman kimliği.
    const ref = doc(ctx.firestore(), 'caregiverRelationships', 'rastgele-bir-kimlik');

    await assertFails(
      setDoc(ref, {
        patientId: PATIENT,
        caregiverId: 'redeemer11',
        inviteCode: INVITE.valid,
        status: 'active',
      })
    );
  });
});

// Emülatör yoksa neden atlandığını görünür kıl (sessiz skip olmasın).
if (!EMULATOR_HOST) {
  console.warn(
    '[firestoreRules.behavioral] FIRESTORE_EMULATOR_HOST tanımlı değil — suite ATLANDI.\n' +
      '  Çalıştırmak için: firebase emulators:exec --only firestore ' +
      '"npx jest src/__tests__/security/firestoreRules.behavioral.test.ts"\n' +
      '  (Firebase CLI JAVA_HOME kullanır; emülatör Java 11+ gerektirir.)'
  );
}
