# CLAUDE.md

Claude Code için proje yönergeleri — her oturum başında yüklenir, kısa tutulur; detaylar referanslarda.

> **Dil:** Kullanıcı Türkçe konuşuyor — bu memory'de canonical kayıtlı. Açıklamalar Türkçe, kod blokları/komutlar/dosya yolları/teknik terimler orijinal hâliyle kalır. Kullanıcı İngilizce sorarsa yanıt dili İngilizce'ye döner.

---

## Proje Kimliği

**İlaç Hatırlatıcı** — Türkçe React Native (Expo SDK 54) Android uygulaması; ilaç hatırlatıcı + bakıcı yönetimi + premium abonelik + AI arama. v1.3.2.

Monorepo: `mobile/` (RN), `server/` (Express + Firebase Functions), `web/` (Next.js). Hedef: Android 7+, paket `com.ilachatirlatici`.

**Mimari, state, notification pipeline, güvenlik, bakıcı akışı, backend, web →** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Hızlı Kurulum

```bash
cd mobile && npm ci
cp mobile/.env.example mobile/.env   # zorunlu: Firebase + Google OAuth key'leri
firebase deploy --only firestore:rules
```

Server/web kurulumu, ABI yapılandırması, seed scriptler, API key rotation runbook → [ARCHITECTURE.md](ARCHITECTURE.md) + [mobile/.env.example](mobile/.env.example).

---

## Önce Okunacak Dosyalar

- [ARCHITECTURE.md](ARCHITECTURE.md) — mimari, state, bildirim pipeline, build config
- [firestore.rules](firestore.rules) — veri modeli + erişim kontrolü
- [mobile/jest.config.js](mobile/jest.config.js) — test ortamı + coverage eşikleri
- [mobile/src/constants.ts](mobile/src/constants.ts) — `STORAGE_KEYS`, `CHANNELS`, app-wide sabitler
- [mobile/index.ts](mobile/index.ts) — alarm background handler giriş noktası
- [mobile/.env.example](mobile/.env.example) — env şablonu + 90 günlük API key rotation runbook'u
- [mobile/app.config.json](mobile/app.config.json) — Expo plugin zinciri, permissions, intent filter'lar
- [mobile/scripts/](mobile/scripts/) — geliştirme helper scriptleri
- [tasks/lessons.md](tasks/lessons.md) — operasyonel dersler (büyük refactor öncesi mutlaka oku)
- [tasks/todo.md](tasks/todo.md) — sprint durumu + bekleyen P1/P2/P3 işler
- [docs/SORUN-COZUMLERI.md](docs/SORUN-COZUMLERI.md) — Metro cache + gradle timeout iş çözümleri

---

## Dikkat Edilecekler (Things That Bite)

1. **`npm test` vs `npx jest`** — global jest farklı versiyon. Her zaman `npm test` (lessons #2).
2. **Metro cache** — Her release build öncesi `gradlew clean` (SORUN-COZUMLERI §1).
3. **Gradle %99 timeout** — APK hazır olabilir; direkt install (SORUN-COZUMLERI §2).
4. **`react-native-svg` in tests** — `__mocks__/react-native-svg.js`'e `moduleNameMapper` şart.
5. **Babel-jest parsing** — `react-native-svg`, `react-native-vision-camera` whitelist'te olmalı.
6. **Hooks after early return** — ESLint yakalar; runtime'da kırar (lessons #4).
7. **Stash drop yıkıcıdır** — `git stash pop` kullan veya `drop` öncesi SHA not al (lessons #1).
8. **Lock screen bildirim görünürlüğü** — `AndroidVisibility.PRIVATE` kasıtlı; `PUBLIC`'e çevirme.
9. **API key rotation** — `.env` ASLA commit edilmez, `app.config.json` placeholder. 90 günde bir rotation (`.env.example` runbook).
10. **`subscription/*` yazma** — Client o koleksiyona yazamaz, backend'den geçmeli.
11. **CI eksik script'leri** — `test:settings/caregiver/critical` CI çağırıyor ama `package.json`'da yok. Restore edilmeli ya da CI'dan kaldırılmalı.

---

## Çalışma Konvansiyonları

- **Stil:** 4-space indent, LF, UTF-8, Prettier + ESLint flat config (`.editorconfig`, `.prettierrc`, `eslint.config.mjs`). `unused-imports/no-unused-imports` ve `react-hooks/rules-of-hooks` = `error`.
- **Hook extraction (lessons #5):** refactor = kod hareketi, sıfır davranış değişimi. Store'a doğrudan mutasyon antipattern — bunun yerine `hooks/` altında hook ekle/genişlet.
- **Atomic commit:** sprint-based, her sprint = 1 commit, format: `Sprint N: ...`. `--no-verify` → `.claude/settings.local.json` allowlist.
- **Coverage disiplini:** eşik = `current - 5%` (sprint başına +5 headroom). Detaylar → jest.config.js.
- **PR workflow:** default `master`, aktif `fix/critical-issues-and-improvements`. Template'ler → `docs/pull-requests/`.

---

## Background Agent İzinleri

`.claude/settings.local.json` allowlist: `npm run *`, `npx jest *`, `git *` (sprint commit pattern'leri ile), `gh pr *`, `gh auth *`, tek cihaza `adb *` (`43cebdf1`), `gradlew assembleRelease`, `git -c core.hooksPath=/dev/null commit` escape hatch, GitHub API JSON için `python3 -c`.

Allowlist'i genişletirken komutları dar tut.