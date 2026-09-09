/**
 * useOemShieldStatus — OEM izin & alarm kalkanı durumu için TEK paylaşımlı okuyucu.
 *
 * Neden: aynı gerçeği (tam ekran bildirim izni, pil muafiyeti, kesin alarm izni,
 * üretici) okuyan 4 ayrı yol vardı. `AlarmDiagnosticCard` kendi lokal
 * `useState`'inde tutup yalnızca mount'ta okuyordu; kullanıcı izni sistem
 * ayarlarından verip geri döndüğünde rozet bayat (stale) kalıyordu.
 * `NotificationsSection` ise hiç okumuyor, izin yokken bile "koruma var" diyordu.
 *
 * Bu modül `detectOEMShieldStatus()` etrafında modül seviyesinde tek bir state
 * tutar:
 *   - Kaç ekran mount olursa olsun aynı anda TEK native okuma yapılır (in-flight
 *     dedup + throttle). İki ekran birlikte açıkken ikisi de aynı state'i görür.
 *   - `AppState` 'active' olduğunda otomatik yenilenir; Android bu olayı arka
 *     arkaya atabildiği için yenileme `OEM_SHIELD_REFRESH_THROTTLE_MS` ile
 *     kısılır.
 *   - İzin ekranı açıldığında `notifySettingsOpened()` çağrılır; dönüşteki ilk
 *     'active' olayında throttle atlanır ve OS'in izni yazması için kısa bir
 *     bekleme uygulanır.
 *   - Durum `unknown` → `loading` → `resolved` olarak ayrışır. UI uyarılarını
 *     YALNIZCA `resolved` durumunda göstermeli; böylece ilk render'da
 *     "izin yok" uyarısı flash etmez.
 */

import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { detectOEMShieldStatus, type OEMShieldStatus } from '../utils/oemShieldEngine';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('OemShieldStatus');

export type OemShieldPhase = 'unknown' | 'loading' | 'resolved';

export interface OemShieldState {
  /** unknown: hiç okunmadı · loading: ilk okuma sürüyor · resolved: veri var */
  phase: OemShieldPhase;
  status: OEMShieldStatus | null;
  /** Arka planda yenileme sürüyor (elde eski veri varken phase 'resolved' kalır) */
  isRefreshing: boolean;
  lastCheckedAt: number | null;
  hasError: boolean;
}

/** Android 'active' olayını arka arkaya atabildiği için yenileme kısıtlaması. */
export const OEM_SHIELD_REFRESH_THROTTLE_MS = 1500;

/** İzin ekranından dönüşte OS'in izni yazmasını beklemek için kısa gecikme. */
const SETTINGS_RETURN_SETTLE_MS = 700;

const INITIAL_STATE: OemShieldState = {
  phase: 'unknown',
  status: null,
  isRefreshing: false,
  lastCheckedAt: null,
  hasError: false,
};

// ── Modül seviyesi paylaşımlı state ───────────────────────────────────────────
let sharedState: OemShieldState = INITIAL_STATE;
const listeners = new Set<(next: OemShieldState) => void>();
let inFlight: Promise<OemShieldState> | null = null;
let forceNextForegroundRefresh = false;
let appStateSubscription: { remove: () => void } | null = null;
let subscriberCount = 0;

function emit(patch: Partial<OemShieldState>): void {
  sharedState = { ...sharedState, ...patch };
  for (const listener of Array.from(listeners)) {
    try {
      listener(sharedState);
    } catch (error) {
      log.debug('listener hatasi', { error });
    }
  }
}

export function getOemShieldState(): OemShieldState {
  return sharedState;
}

/**
 * Durumu yenile.
 *
 * `force` verilmezse throttle uygulanır. Devam eden bir okuma varsa yenisi
 * başlatılmaz; çağıran mevcut okumanın sonucunu bekler (tek native çağrı).
 */
export function refreshOemShieldStatus(options: { force?: boolean } = {}): Promise<OemShieldState> {
  const { force = false } = options;

  if (inFlight) {
    return inFlight;
  }

  const isStale =
    sharedState.lastCheckedAt === null ||
    Date.now() - sharedState.lastCheckedAt >= OEM_SHIELD_REFRESH_THROTTLE_MS;

  if (!force && !isStale) {
    return Promise.resolve(sharedState);
  }

  const isFirstRead = sharedState.status === null;
  emit({ phase: isFirstRead ? 'loading' : sharedState.phase, isRefreshing: true });

  inFlight = (async () => {
    try {
      const status = await detectOEMShieldStatus();
      emit({
        phase: 'resolved',
        status,
        isRefreshing: false,
        lastCheckedAt: Date.now(),
        hasError: false,
      });
    } catch (error) {
      log.debug('detectOEMShieldStatus basarisiz', { error });
      // Elde eski veri varsa korunur; yoksa phase 'unknown'da kalır, böylece UI
      // yanlışlıkla "izin yok" uyarısı göstermez.
      emit({
        phase: sharedState.status ? 'resolved' : 'unknown',
        isRefreshing: false,
        lastCheckedAt: Date.now(),
        hasError: true,
      });
    } finally {
      inFlight = null;
    }

    return sharedState;
  })();

  return inFlight;
}

/**
 * Bir sistem izin ekranı açılmak üzere — uygulamaya dönüşteki ilk 'active'
 * olayında throttle atlanarak zorunlu yenileme yapılsın.
 */
export function notifySettingsOpened(): void {
  forceNextForegroundRefresh = true;
}

function handleAppStateChange(next: AppStateStatus): void {
  if (next !== 'active') return;

  if (forceNextForegroundRefresh) {
    forceNextForegroundRefresh = false;
    setTimeout(() => {
      void refreshOemShieldStatus({ force: true });
    }, SETTINGS_RETURN_SETTLE_MS);
    return;
  }

  void refreshOemShieldStatus();
}

function acquireAppStateListener(): void {
  subscriberCount += 1;
  if (appStateSubscription) return;
  // Savunmacı: bu bir teşhis hook'u — AppState erişilemezse (kısıtlı ortam,
  // eksik mock) sessizce otomatik yenilemeden vazgeçilir, ekran ÇÖKMEZ.
  try {
    appStateSubscription = AppState?.addEventListener?.('change', handleAppStateChange) ?? null;
  } catch (error) {
    log.debug('AppState listener eklenemedi', { error });
    appStateSubscription = null;
  }
}

function releaseAppStateListener(): void {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount > 0 || !appStateSubscription) return;
  try {
    appStateSubscription.remove();
  } catch (error) {
    log.debug('AppState listener kaldirilamadi', { error });
  }
  appStateSubscription = null;
}

export interface UseOemShieldStatusResult extends OemShieldState {
  /** Veri hazır ve güvenilir — UI uyarıları yalnızca bu true iken gösterilmeli. */
  isResolved: boolean;
  /** Kullanıcı tetiklemeli yenileme (throttle atlanır). */
  refresh: () => Promise<OemShieldState>;
  /** Sistem izin ekranı açılmadan hemen önce çağrılmalı. */
  notifySettingsOpened: () => void;
}

export function useOemShieldStatus(): UseOemShieldStatusResult {
  const [local, setLocal] = useState<OemShieldState>(sharedState);

  useEffect(() => {
    const listener = (next: OemShieldState) => setLocal(next);
    listeners.add(listener);
    acquireAppStateListener();

    try {
      // Modül state'i başka bir ekran tarafından güncellenmiş olabilir.
      setLocal(sharedState);

      // Throttle + in-flight dedup sayesinde iki ekran aynı anda mount olsa bile
      // tek native okuma yapılır.
      void refreshOemShieldStatus();
    } catch (error) {
      log.debug('ilk okuma baslatilamadi', { error });
    }

    return () => {
      listeners.delete(listener);
      releaseAppStateListener();
    };
  }, []);

  return {
    ...local,
    isResolved: local.phase === 'resolved' && local.status !== null,
    refresh: () => refreshOemShieldStatus({ force: true }),
    notifySettingsOpened,
  };
}

/** Yalnızca testler için: paylaşımlı state'i sıfırla. */
export function __resetOemShieldStatusForTests(): void {
  sharedState = INITIAL_STATE;
  listeners.clear();
  inFlight = null;
  forceNextForegroundRefresh = false;
  subscriberCount = 0;
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}
