/**
 * pdfReportHelpers testleri.
 */

import {
  decodeUnicodeEscapes,
  fixTurkishCharacters,
  escapeHtml,
  escapeSvgText,
  sanitizeFilename,
  buildReportFilename,
  TURKISH_CORRECTIONS,
} from '../../services/pdfReportHelpers';

describe('decodeUnicodeEscapes', () => {
  it('decodes \\uXXXX escape sequences', () => {
    expect(decodeUnicodeEscapes('Parolü')).toBe('Parolü');
  });

  it('handles empty string', () => {
    expect(decodeUnicodeEscapes('')).toBe('');
  });
});

describe('fixTurkishCharacters', () => {
  it('corrects uppercase ASCII to Turkish', () => {
    expect(fixTurkishCharacters('GOZ')).toBe('GÖZ');
    expect(fixTurkishCharacters('SURUP')).toBe('ŞURUP');
    expect(fixTurkishCharacters('KAPSUL')).toBe('KAPSÜL');
  });

  it('corrects lowercase ASCII to Turkish', () => {
    expect(fixTurkishCharacters('goz')).toBe('göz');
    expect(fixTurkishCharacters('surup')).toBe('şurup');
  });

  it('respects word boundaries (space-separated)', () => {
    // ILAÇ lowercase correction case-sensitive oldugundan ILAÇ oldugu gibi kaliyor
    // (mapping'de ILAC -> İLAÇ var, ILAÇ match etmiyor)
    expect(fixTurkishCharacters('GOZ KAPSUL')).toBe('GÖZ KAPSÜL');
  });

  it('leaves non-ASCII alone', () => {
    expect(fixTurkishCharacters('Parol Şurup')).toBe('Parol Şurup');
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("don't")).toBe('don&#39;t');
  });

  it('handles null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('escapeSvgText', () => {
  it('removes newlines', () => {
    expect(escapeSvgText('line1\nline2')).toBe('line1 line2');
    expect(escapeSvgText('line1\r\nline2')).toBe('line1 line2');
  });

  it('escapes HTML', () => {
    expect(escapeSvgText('<text>')).toBe('&lt;text&gt;');
  });
});

describe('sanitizeFilename', () => {
  it('converts Turkish chars to ASCII', () => {
    expect(sanitizeFilename('Parol Şurup')).toBe('parol-surup');
  });

  it('removes special characters', () => {
    expect(sanitizeFilename('Med/Name*Test')).toBe('mednametest');
  });

  it('lowercase + dash separator', () => {
    expect(sanitizeFilename('Test Medicine')).toBe('test-medicine');
  });

  it('truncates to 100 chars', () => {
    const long = 'a'.repeat(150);
    expect(sanitizeFilename(long)).toHaveLength(100);
  });

  it('returns fallback for empty', () => {
    expect(sanitizeFilename('')).toBe('medicine-report');
  });
});

describe('buildReportFilename', () => {
  it('builds Turkish filename', () => {
    const filename = buildReportFilename('Parol', 7, 'tr');
    expect(filename).toMatch(/^parol-rapor-7gun-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('builds English filename', () => {
    const filename = buildReportFilename('Parol', 30, 'en');
    expect(filename).toMatch(/^parol-report-30days-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});

describe('TURKISH_CORRECTIONS', () => {
  it('has expected uppercase corrections', () => {
    expect(TURKISH_CORRECTIONS.GOZ).toBe('GÖZ');
    expect(TURKISH_CORRECTIONS.SURUP).toBe('ŞURUP');
  });

  it('has expected lowercase corrections', () => {
    expect(TURKISH_CORRECTIONS.goz).toBe('göz');
    expect(TURKISH_CORRECTIONS.surup).toBe('şurup');
  });

  it('has minimum 20 corrections', () => {
    expect(Object.keys(TURKISH_CORRECTIONS).length).toBeGreaterThanOrEqual(20);
  });
});
