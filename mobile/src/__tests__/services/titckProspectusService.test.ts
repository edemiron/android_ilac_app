/**
 * titckProspectusService Unit Tests
 */

import {
  extractCleanSearchKeyword,
  fetchTitckOfficialPdfUrl,
  openInAppProspectusUrl,
} from '../../services/titckProspectusService';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
import { Linking } from 'react-native';

// Mock InAppBrowser
jest.mock('react-native-inappbrowser-reborn', () => ({
  InAppBrowser: {
    isAvailable: jest.fn(),
    open: jest.fn(),
  },
}));

// Mock Linking
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

describe('titckProspectusService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractCleanSearchKeyword', () => {
    it('extracts primary drug brand name from complex full name', () => {
      expect(extractCleanSearchKeyword('AVELOX 400 MG 7 FILM TABLET')).toBe('AVELOX');
      expect(extractCleanSearchKeyword('Parol 500 mg')).toBe('Parol');
      expect(extractCleanSearchKeyword('CIPRO 500 MG')).toBe('CIPRO');
    });

    it('returns empty string for empty input', () => {
      expect(extractCleanSearchKeyword('')).toBe('');
    });
  });

  describe('fetchTitckOfficialPdfUrl', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('returns fallback URL when name is too short', async () => {
      const result = await fetchTitckOfficialPdfUrl('A');
      expect(result.success).toBe(false);
      expect(result.fallbackUrl).toContain('titck.gov.tr/kubkt');
    });

    it('fetches CSRF token and queries DataTable API to extract direct PDF link', async () => {
      // 1. Mock GET /kubkt HTML
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html>
            <script>
              _token: "mock-csrf-token-12345"
            </script>
          </html>
        `,
        headers: {
          getSetCookie: () => ['XSRF-TOKEN=test-token', 'kurumwebsitesi_session=test-session'],
        },
      });

      // 2. Mock POST /getkubktviewdatatable JSON
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          draw: 1,
          recordsTotal: 1,
          recordsFiltered: 1,
          data: [
            {
              name: 'AVELOX 400 MG FILM KAPLI TABLET',
              element: 'MOKSIFLOKSASIN',
              firmName: 'BAYER TURK KIMYA',
              confirmationDateKt: '26/08/2026',
              documentPathKt:
                '<div class="cell text-center"><a href="https://titck.gov.tr/storage/Archive/2026/kubKtAttachments/AVELOX400mgfilmkapltabletkt_26_08_2026.pdf" class="badge">PDF</a></div>',
              documentPathKub:
                '<div class="cell text-center"><a href="https://titck.gov.tr/storage/Archive/2026/kubKtAttachments/AVELOX400mgfilmkapltabletkub_26_08_2026.pdf" class="badge">PDF</a></div>',
            },
          ],
        }),
      });

      const result = await fetchTitckOfficialPdfUrl('AVELOX 400 MG 7 FILM TABLET');
      expect(result.success).toBe(true);
      expect(result.ktPdfUrl).toBe(
        'https://titck.gov.tr/storage/Archive/2026/kubKtAttachments/AVELOX400mgfilmkapltabletkt_26_08_2026.pdf'
      );
      expect(result.officialName).toBe('AVELOX 400 MG FILM KAPLI TABLET');
    });

    it('handles network errors gracefully and returns fallback URL', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      const result = await fetchTitckOfficialPdfUrl('Parol');
      expect(result.success).toBe(false);
      expect(result.fallbackUrl).toContain('titck.gov.tr/kubkt');
    });
  });

  describe('openInAppProspectusUrl', () => {
    it('opens PDF URL wrapped with Google Docs Viewer in InAppBrowser', async () => {
      (InAppBrowser.isAvailable as jest.Mock).mockResolvedValueOnce(true);
      (InAppBrowser.open as jest.Mock).mockResolvedValueOnce({ type: 'dismiss' });

      await openInAppProspectusUrl('https://titck.gov.tr/sample.pdf', '#0D9488');
      expect(InAppBrowser.open).toHaveBeenCalledWith(
        'https://docs.google.com/gview?embedded=true&url=https%3A%2F%2Ftitck.gov.tr%2Fsample.pdf',
        expect.objectContaining({
          toolbarColor: '#0D9488',
          showTitle: true,
        })
      );
    });

    it('opens non-PDF web URL directly in InAppBrowser', async () => {
      (InAppBrowser.isAvailable as jest.Mock).mockResolvedValueOnce(true);
      (InAppBrowser.open as jest.Mock).mockResolvedValueOnce({ type: 'dismiss' });

      await openInAppProspectusUrl('https://www.titck.gov.tr/kubkt', '#0D9488');
      expect(InAppBrowser.open).toHaveBeenCalledWith(
        'https://www.titck.gov.tr/kubkt',
        expect.objectContaining({
          toolbarColor: '#0D9488',
          showTitle: true,
        })
      );
    });

    it('falls back to Linking.openURL if InAppBrowser is unavailable', async () => {
      (InAppBrowser.isAvailable as jest.Mock).mockResolvedValueOnce(false);

      await openInAppProspectusUrl('https://titck.gov.tr/sample.pdf');
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://docs.google.com/gview?embedded=true&url=https%3A%2F%2Ftitck.gov.tr%2Fsample.pdf'
      );
    });
  });
});
