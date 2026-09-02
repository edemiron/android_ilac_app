import { parseDosageInstruction, parseEReceteInput } from '../../utils/ereceteParser';

describe('ereceteParser', () => {
  describe('parseDosageInstruction', () => {
    it('parses "3x1 Tok" correctly', () => {
      const result = parseDosageInstruction('3x1 Tok');
      expect(result.frequency).toBe(3);
      expect(result.instructions).toBe('after_meal');
      expect(result.dosageText).toContain('3x1 Tok');
    });

    it('parses "1x1 Aç Karnına" correctly', () => {
      const result = parseDosageInstruction('1x1 Aç Karnına');
      expect(result.frequency).toBe(1);
      expect(result.instructions).toBe('empty_stomach');
      expect(result.dosageText).toContain('1x1 Aç');
    });

    it('parses "Günde 2 kez yatmadan önce" correctly', () => {
      const result = parseDosageInstruction('Günde 2 kez yatmadan önce');
      expect(result.frequency).toBe(2);
      expect(result.instructions).toBe('before_sleep');
    });

    it('parses "Gunde 1x1.0" correctly', () => {
      const result = parseDosageInstruction('Gunde 1x1.0');
      expect(result.frequency).toBe(1);
      expect(result.instructions).toBe('after_meal');
    });
  });

  describe('parseEReceteInput', () => {
    it('parses single recipe code', () => {
      const result = parseEReceteInput('9AB87C');
      expect(result).not.toBeNull();
      expect(result?.recipeNo).toBe('9AB87C');
      expect(result?.medicines.length).toBe(0);
    });

    it('parses structured Turkish Ministry of Health / SGK SMS text', () => {
      const smsText = `Sn. ENES DEMIR, 28.08.2026 tarihli 9AB87C nolu e-receteniz:
1. PAROL 500 MG TABLET (3x1 Tok)
2. AUGMENTIN 1000 MG BID (2x1 Tok)
3. EUTHYROX 50 MCG (1x1 Aç)
Gecmis olsun.`;

      const result = parseEReceteInput(smsText);
      expect(result).not.toBeNull();
      expect(result?.recipeNo).toBe('9AB87C');
      expect(result?.medicines.length).toBe(3);
      expect(result?.medicines[0].name).toContain('PAROL');
      expect(result?.medicines[0].frequency).toBe(3);
      expect(result?.medicines[2].name).toContain('EUTHYROX');
      expect(result?.medicines[2].instructions).toBe('empty_stomach');
    });

    it('parses single-line dashed SMS from user report correctly', () => {
      const smsText =
        'NUMARANIZ: 20W0T04 - ILACLARINIZ: 2 ADET BETMIGA 50 MG UZATILMIS SALIMLI 30 FILM TABLET (Gunde 1x1.0) - ACIL SIFALAR DILERIZ B002';

      const result = parseEReceteInput(smsText);
      expect(result).not.toBeNull();
      expect(result?.recipeNo).toBe('20W0T04');
      expect(result?.medicines.length).toBe(1);
      expect(result?.medicines[0].name).toContain('BETMIGA 50 MG');
      expect(result?.medicines[0].frequency).toBe(1);
    });
  });
});
