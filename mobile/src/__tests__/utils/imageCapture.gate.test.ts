/**
 * KAPI (regression gate): AI gorsel akisi bellek guvenli kalmali (v1.9.1).
 *
 * Neyi koruyor: kullanici ilac kutusunu fotograflayip onayladiktan sonra
 * uygulama ana ekrana dusuyordu. Sebep bir "cokme" degildi — Android, kamera
 * on plandayken uygulamayi bellek icin OLDURUYORDU. Kodun katkisi, picker'a
 * `base64: true` verilmesiydi: tam cozunurluklu fotograf hem JPEG hem de
 * ~3-5 MB'lik bir dize olarak, tam da uygulamanin geri donduğu ve bellek
 * baskisinin zirve yaptigi anda bellekte tutuluyordu.
 *
 * Bu kapi, o secenegin geri gelmesini ve yakalama mantiginin yeniden
 * kopyalanmasini engeller. Tek dogru yer: `src/utils/imageCapture.ts`.
 */

/* global __dirname */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_ROOT = join(__dirname, '..', '..');

/** Yakalama mantigini barindirmasina IZIN VERILEN tek dosya. */
const CAPTURE_HELPER = 'utils/imageCapture.ts';

/**
 * Yalnizca URI alan (base64 hic istemeyen) profil fotografi secici.
 * AI akisi degil, bellek profili farkli — kapinin kapsami disinda.
 */
const URI_ONLY_PICKERS = ['components/addMedicine/ImagePickerSection.tsx'];

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      collectSourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const sourceFiles = collectSourceFiles(SRC_ROOT).map(full => ({
  path: relative(SRC_ROOT, full).split('\\').join('/'),
  code: readFileSync(full, 'utf8'),
}));

/** Yorum satirlarini duser — gerekce metinleri kapiyi tetiklemesin. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('KAPI: AI gorsel yakalama', () => {
  it('kaynak dosyalar taranabildi', () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
    expect(sourceFiles.map(f => f.path)).toContain(CAPTURE_HELPER);
  });

  it("HICBIR dosya picker'a base64: true gecmez", () => {
    const offenders = sourceFiles
      .filter(f => /base64\s*:\s*true/.test(stripComments(f.code)))
      .map(f => f.path);

    expect(offenders).toEqual([]);
  });

  it('picker yalnizca yardimci dosyadan (ve URI-only seciciden) cagrilir', () => {
    const allowed = new Set([CAPTURE_HELPER, ...URI_ONLY_PICKERS]);

    const offenders = sourceFiles
      .filter(f => !allowed.has(f.path))
      .filter(f => /launch(Camera|ImageLibrary)Async/.test(stripComments(f.code)))
      .map(f => f.path);

    expect(offenders).toEqual([]);
  });

  it('AI cagri noktalari yardimciyi kullanir', () => {
    const callSites = ['components/common/BatchMedicineImportModal.tsx', 'hooks/useAddMedicine.ts'];

    for (const path of callSites) {
      const file = sourceFiles.find(f => f.path === path);
      expect(file).toBeDefined();
      expect(file!.code).toContain('captureImageForAI');
    }
  });

  it('yardimci, sunucunun 8 MB sinirinin altinda bir tavan koyar', () => {
    const helper = sourceFiles.find(f => f.path === CAPTURE_HELPER)!;
    const match = helper.code.match(/MAX_UPLOAD_BASE64_CHARS\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);

    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeLessThan(8);
  });
});
