/**
 * @react-native-community/netinfo — jest mock.
 *
 * Neden gerekli: paketin kendi `jest/` mock klasörü kurulan sürümde YOK ve
 * native modül (`RNCNetInfo`) test ortamında bulunmadığı için import anında
 * `TypeError: Cannot read properties of undefined (reading 'RNCNetInfo')`
 * fırlatıyordu. Bu, `medicineStore`'u import eden TÜM suite'leri
 * çalışamaz hale getirdi (K5 outbox flusher'ı NetInfo'ya bağımlı).
 *
 * `jest.config.js` → `moduleNameMapper` üzerinden açıkça eşleniyor.
 *
 * Mock, gerçek NetInfo'nun iki davranışını taklit ediyor:
 *  1. `addEventListener` abone olur olmaz mevcut durumu YAYAR (gerçek
 *     paket de subscribe anında bir değer gönderir). Flush koordinatörü bu
 *     ilk yayına güveniyor.
 *  2. Dinleyici seti tutuluyor; `__setState` ile testler bağlantı
 *     kopması/geri gelmesi senaryolarını sürebilir.
 */

const defaultState = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: { isConnectionExpensive: false },
};

const listeners = new Set();

const NetInfoMock = {
  addEventListener: jest.fn(callback => {
    listeners.add(callback);
    callback(defaultState);
    return () => {
      listeners.delete(callback);
    };
  }),
  fetch: jest.fn(async () => defaultState),
  configure: jest.fn(),
  useNetInfo: jest.fn(() => defaultState),

  // ── Test yardımcıları (gerçek API'de yok) ────────────────────────────────
  __listeners: listeners,
  __setState(patch) {
    const next = { ...defaultState, ...patch };
    listeners.forEach(cb => cb(next));
  },
  __reset() {
    listeners.clear();
    this.addEventListener.mockClear();
    this.fetch.mockClear();
  },
};

module.exports = NetInfoMock;
module.exports.default = NetInfoMock;
