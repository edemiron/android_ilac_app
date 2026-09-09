import {
  processPrescriptionScan,
  SMART_SCAN_SYSTEM_PROMPT,
} from '../../services/smartPrescriptionScanner';
import { resetScanQuota } from '../../services/aiScanRateLimiter';

describe('smartPrescriptionScanner', () => {
  beforeEach(async () => {
    await resetScanQuota();
  });

  it('includes strict JSON schema rules in SMART_SCAN_SYSTEM_PROMPT', () => {
    expect(SMART_SCAN_SYSTEM_PROMPT).toContain('"drugs"');
    expect(SMART_SCAN_SYSTEM_PROMPT).toContain('after_meal');
    expect(SMART_SCAN_SYSTEM_PROMPT).toContain('before_meal');
    expect(SMART_SCAN_SYSTEM_PROMPT).toContain('confidenceScore');
  });

  it('processes Turkish E-Reçete SMS in Layer 1 (0 TL / 0ms) with PII masking & TİTCK snapping', async () => {
    const smsInput = `Sn. ENES DEMIR, 28.08.2026 tarihli 9AB87C nolu e-receteniz:
1. PAROL 500 MG TABLET (3x1 Tok)
2. AUGMENTIN 1000 MG BID (2x1 Tok)
3. EUTHYROX 50 MCG (1x1 Aç)
Gecmis olsun.`;

    const result = await processPrescriptionScan(smsInput, false);
    expect(result.success).toBe(true);
    expect(result.layer).toBe('LAYER_1_RULE_BASED');
    expect(result.medicines.length).toBe(3);

    // Verify Parol
    expect(result.medicines[0].name).toContain('PAROL');
    expect(result.medicines[0].frequency).toBe(3);
    expect(result.medicines[0].instructions).toBe('after_meal');

    // Verify Augmentin
    expect(result.medicines[1].name).toContain('AUGMENTIN');
    expect(result.medicines[1].frequency).toBe(2);

    // Verify Euthyrox
    expect(result.medicines[2].name).toContain('EUTHYROX');
    expect(result.medicines[2].instructions).toBe('empty_stomach');
    expect(result.medicines[2].foodInteractions).toContain('empty_stomach_strict');
  });

  it('corrects OCR brand typos to official TİTCK catalog names', async () => {
    const ocrInput = `Kullanilacak ilaclar:
- Augmentan 1000mg BID
- Arveles 25mg`;

    const result = await processPrescriptionScan(ocrInput, false);
    expect(result.success).toBe(true);
    expect(result.medicines.length).toBeGreaterThanOrEqual(1);

    const augmentin = result.medicines.find(m => m.name.includes('AUGMENTIN'));
    expect(augmentin).toBeDefined();
    expect(augmentin?.isTitckVerified).toBe(true);
  });

  it('returns friendly error when daily quota is depleted', async () => {
    // Consume all 5 quota items
    for (let i = 0; i < 5; i++) {
      await processPrescriptionScan('PAROL 500 MG (1x1)', false);
    }

    // 6th scan must fail with quota message
    const blockedResult = await processPrescriptionScan('PAROL 500 MG', false);
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.errorMessage).toContain('Günlük ücretsiz AI tarama limitinize ulaştınız');
  });
});
