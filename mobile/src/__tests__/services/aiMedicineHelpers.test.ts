/**
 * aiMedicineHelpers testleri.
 */

import {
  createBarcodeSearchPrompt,
  createNameSearchPrompt,
  createMedicineInfoPrompt,
  extractJsonBlock,
  safeParseAiJson,
  parseBarcodeSearchResponse,
  parseNameSearchResponse,
  trimMedicineFields,
  // Sprint 8.1: Backward compat alias'lar
  createSearchPrompt,
  createInfoPrompt,
  parseProspectusResponse,
  parseAIResponse,
} from '../../services/aiMedicineHelpers';

describe('createBarcodeSearchPrompt', () => {
  it('includes the barcode in the prompt', () => {
    const prompt = createBarcodeSearchPrompt('8691234567890');
    expect(prompt).toContain('8691234567890');
  });

  it('requests JSON format', () => {
    const prompt = createBarcodeSearchPrompt('12345');
    expect(prompt).toMatch(/JSON/);
  });
});

describe('createNameSearchPrompt', () => {
  it('includes the medicine name', () => {
    const prompt = createNameSearchPrompt('Aspirin');
    expect(prompt).toContain('Aspirin');
  });

  it('mentions Turkey prioritization', () => {
    const prompt = createNameSearchPrompt('Parol');
    expect(prompt).toMatch(/T[uü]rkiye/);
  });
});

describe('createMedicineInfoPrompt', () => {
  it('includes medicine name only', () => {
    const prompt = createMedicineInfoPrompt('Aspirin');
    expect(prompt).toContain('Aspirin');
  });

  it('includes dosage when provided', () => {
    const prompt = createMedicineInfoPrompt('Parol', '500mg');
    expect(prompt).toContain('Parol');
    expect(prompt).toContain('500mg');
  });
});

describe('extractJsonBlock', () => {
  it('returns the JSON portion from response with prefix text', () => {
    const text = 'Here is the response: {"found": true, "medicine": "Aspirin"}';
    expect(extractJsonBlock(text)).toBe('{"found": true, "medicine": "Aspirin"}');
  });

  it('returns null when no JSON block', () => {
    expect(extractJsonBlock('plain text without JSON')).toBeNull();
  });

  it('handles multiline JSON', () => {
    const text = 'prefix\n{\n  "a": 1,\n  "b": 2\n} suffix';
    const result = extractJsonBlock(text);
    expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });
});

describe('safeParseAiJson', () => {
  it('parses valid JSON', () => {
    const result = safeParseAiJson<{ a: number }>('{"a": 1}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.a).toBe(1);
  });

  it('returns error for invalid JSON', () => {
    const result = safeParseAiJson('not json');
    expect(result.ok).toBe(false);
  });

  it('returns error when no JSON block', () => {
    const result = safeParseAiJson('text without json');
    expect(result.ok).toBe(false);
  });
});

describe('parseBarcodeSearchResponse', () => {
  it('parses successful response', () => {
    const response =
      '{"found": true, "confidence": 90, "medicine": {"name": "Aspirin", "form": "tablet"}}';
    const result = parseBarcodeSearchResponse(response, '8691234567890', 'gemini');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.medicine?.name).toBe('Aspirin');
      expect(result.confidence).toBe(90);
      expect(result.source).toBe('gemini');
    }
  });

  it('returns failure when found=false', () => {
    const response = '{"found": false, "confidence": 0, "medicine": null}';
    const result = parseBarcodeSearchResponse(response, '123', 'openai');
    expect(result.success).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('handles invalid JSON', () => {
    const result = parseBarcodeSearchResponse('not json', '123', 'gemini');
    expect(result.success).toBe(false);
  });
});

describe('parseNameSearchResponse', () => {
  it('parses successful response', () => {
    const response =
      '{"found": true, "confidence": 80, "medicine": {"name": "Parol", "dosage": "500mg", "form": "tablet", "manufacturer": "Atabay"}}';
    const result = parseNameSearchResponse(response, 'gemini');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.medicine?.name).toBe('Parol');
      expect(result.confidence).toBe(80);
    }
  });

  it('returns failure for invalid JSON', () => {
    const result = parseNameSearchResponse('not json', 'gemini');
    expect(result.success).toBe(false);
  });
});

describe('trimMedicineFields', () => {
  it('trims string fields', () => {
    const input = { name: '  Aspirin  ', dosage: '500mg  ', manufacturer: '  Bayer' };
    const result = trimMedicineFields(input);
    expect(result.name).toBe('Aspirin');
    expect(result.dosage).toBe('500mg');
    expect(result.manufacturer).toBe('Bayer');
  });

  it('preserves non-trimmed fields like id/barcode', () => {
    // trimMedicineFields only handles name/genericName/manufacturer/dosage;
    // id ve barcode gibi ID alanlari oldugu gibi korunuyor.
    const input: any = { id: 'med-1', barcode: '  12345  ' };
    const result = trimMedicineFields(input);
    expect(result.id).toBe('med-1');
    expect(result.barcode).toBe('  12345  ');
  });

  it('handles empty input', () => {
    const result = trimMedicineFields({});
    expect(result).toEqual({});
  });
});

describe('Sprint 8.1: Backward compat aliases', () => {
  it('createSearchPrompt is alias for createBarcodeSearchPrompt', () => {
    const prompt = createSearchPrompt('12345');
    expect(prompt).toContain('12345');
    expect(prompt).toBe(
      require('../../services/aiMedicineHelpers').createBarcodeSearchPrompt('12345')
    );
  });

  it('createInfoPrompt is alias for createMedicineInfoPrompt', () => {
    const prompt = createInfoPrompt('Aspirin');
    expect(prompt).toContain('Aspirin');
  });

  it('parseProspectusResponse is alias for parseNameSearchResponse', () => {
    const result = parseProspectusResponse('{"found": false}', 'test');
    expect(result.success).toBe(false);
  });

  it('parseAIResponse is alias for parseBarcodeSearchResponse', () => {
    const result = parseAIResponse('{"found": false}', '12345', 'test');
    expect(result.success).toBe(false);
  });
});

describe('Sprint 16.4: parseNameSearchResponse alias', () => {
  it('parseProspectusResponse = parseNameSearchResponse (referans equality)', () => {
    // Sprint 8.1 backward-compat alias
    const { parseProspectusResponse, parseNameSearchResponse } = require('../../services/aiMedicineHelpers');
    expect(parseProspectusResponse).toBe(parseNameSearchResponse);
  });
});
