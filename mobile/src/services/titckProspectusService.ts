/**
 * titckProspectusService — T.C. Sağlık Bakanlığı TİTCK Resmi KÜB/KT PDF Çözümleyici Servisi
 *
 * TİTCK resmi veri tabanından (getkubktviewdatatable) seçilen ilaca ait en güncel
 * onaylı Kullanma Talimatı (KT) ve Kısa Ürün Bilgisi (KÜB) PDF bağlantısını dinamik
 * olarak çözümler ve doğrudan PDF dosyasını açar.
 */

import { Linking } from 'react-native';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('TitckProspectusService');

export interface TitckPdfResult {
  success: boolean;
  ktPdfUrl?: string; // Kullanma Talimatı PDF URL
  kubPdfUrl?: string; // Kısa Ürün Bilgisi PDF URL
  officialName?: string;
  element?: string;
  confirmationDate?: string;
  fallbackUrl: string;
  error?: string;
}

/**
 * PDF veya web bağlantısını uygulama içi tarayıcı (InAppBrowser / Custom Tabs) ile açar.
 * Samsung ve tüm Android/iOS cihazlarda PDF'in doğrudan açılabilmesi için Google Docs Viewer ile sarmalanır.
 */
export async function openInAppProspectusUrl(
  url: string,
  primaryColor: string = '#0D9488'
): Promise<void> {
  if (!url) return;

  // PDF bağlantısı ise Samsung Internet ve tüm Custom Tabs motorlarında doğrudan render edilebilmesi için Google Docs Viewer kullan
  const isPdf = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf');
  const targetUrl = isPdf
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`
    : url;

  try {
    const isAvailable = await InAppBrowser.isAvailable();
    if (isAvailable) {
      await InAppBrowser.open(targetUrl, {
        // iOS Properties
        dismissButtonStyle: 'close',
        preferredBarTintColor: '#0F172A',
        preferredControlTintColor: '#FFFFFF',
        readerMode: false,
        animated: true,
        modalPresentationStyle: 'fullScreen',
        modalTransitionStyle: 'coverVertical',
        modalEnabled: true,
        enableBarCollapsing: false,
        // Android Properties (Custom Tabs)
        showTitle: true,
        toolbarColor: primaryColor,
        secondaryToolbarColor: '#0F172A',
        navigationBarColor: '#0F172A',
        navigationBarDividerColor: '#334155',
        enableUrlBarHiding: true,
        enableDefaultShare: true,
        forceCloseOnRedirection: false,
        showInRecents: false,
      });
      return;
    }
  } catch (error) {
    log.warn('InAppBrowser açılamadı, standart tarayıcıya yönlendiriliyor', error);
  }

  // Fallback to standard Linking
  try {
    await Linking.openURL(targetUrl);
  } catch (linkError) {
    log.error('Linking.openURL hatası', linkError);
  }
}

// İlaç adından arama için en temiz anahtar kelimeyi çıkarır
export function extractCleanSearchKeyword(rawName: string): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  // İlk kelimeyi veya marka adını al (örn: "AVELOX 400 MG 7 FILM TABLET" -> "AVELOX")
  const parts = trimmed.split(/\s+/);
  if (parts.length > 0) {
    return parts[0];
  }
  return trimmed;
}

/**
 * TİTCK Resmi Sunucusundan İlaca Ait Doğrudan PDF Bağlantısını Getirir
 */
export async function fetchTitckOfficialPdfUrl(rawName: string): Promise<TitckPdfResult> {
  const fallbackUrl = `https://www.titck.gov.tr/kubkt?search=${encodeURIComponent(rawName.trim())}`;

  try {
    const keyword = extractCleanSearchKeyword(rawName);
    if (!keyword || keyword.length < 2) {
      return {
        success: false,
        fallbackUrl: 'https://www.titck.gov.tr/kubkt',
        error: 'Geçersiz ilaç adı',
      };
    }

    log.debug('TİTCK sayfası ve CSRF token alınıyor...', { keyword });

    // 1. TİTCK KÜB/KT Sayfasından güncel CSRF Token ve Session Cookie al (5s timeout)
    const pageController = new AbortController();
    const pageTimeout = setTimeout(() => pageController.abort(), 5000);
    let pageRes: Response;
    try {
      pageRes = await fetch('https://www.titck.gov.tr/kubkt', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: pageController.signal,
      });
    } finally {
      clearTimeout(pageTimeout);
    }

    if (!pageRes.ok) {
      log.warn('TİTCK ana sayfasına ulaşılamadı', { status: pageRes.status });
      return { success: false, fallbackUrl, error: `HTTP ${pageRes.status}` };
    }

    const html = await pageRes.text();
    const tokenMatch = html.match(/_token:\s*["']([^"']+)["']/);
    const token = tokenMatch ? tokenMatch[1] : '';

    let cookies: string[] = [];
    if ((pageRes.headers as any).getSetCookie) {
      cookies = (pageRes.headers as any).getSetCookie();
    } else {
      const rawCookie = pageRes.headers.get('set-cookie');
      if (rawCookie) cookies = [rawCookie];
    }
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    // 2. DataTables API parametrelerini hazırla
    const params = new URLSearchParams();
    params.append('_token', token);
    params.append('draw', '1');

    const cols = [
      'name',
      'element',
      'firmName',
      'confirmationDateKub',
      'confirmationDateKt',
      'documentPathKub',
      'documentPathKt',
    ];
    cols.forEach((col, idx) => {
      params.append(`columns[${idx}][data]`, col);
      params.append(`columns[${idx}][name]`, '');
      params.append(`columns[${idx}][searchable]`, 'true');
      params.append(`columns[${idx}][orderable]`, idx < 5 ? 'true' : 'false');
      params.append(`columns[${idx}][search][value]`, '');
      params.append(`columns[${idx}][search][regex]`, 'false');
    });

    params.append('order[0][column]', '4'); // En son KT onay tarihine göre sırala
    params.append('order[0][dir]', 'desc');
    params.append('start', '0');
    params.append('length', '10');
    params.append('search[value]', keyword);
    params.append('search[regex]', 'false');

    // 3. TİTCK DataTable API'sine POST isteği gönder (5s timeout)
    const apiController = new AbortController();
    const apiTimeout = setTimeout(() => apiController.abort(), 5000);
    let apiRes: Response;
    try {
      apiRes = await fetch('https://www.titck.gov.tr/getkubktviewdatatable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://www.titck.gov.tr/kubkt',
          Origin: 'https://www.titck.gov.tr',
          Cookie: cookieHeader,
        },
        body: params.toString(),
        signal: apiController.signal,
      });
    } finally {
      clearTimeout(apiTimeout);
    }

    if (!apiRes.ok) {
      log.warn('TİTCK API yanıt vermedi', { status: apiRes.status });
      return { success: false, fallbackUrl, error: `API HTTP ${apiRes.status}` };
    }

    const data = await apiRes.json();
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      log.info('TİTCK sonuç bulunamadı', { keyword });
      return { success: false, fallbackUrl };
    }

    // 4. En uygun kaydı seç (İsim benzerliğine göre)
    const upperRaw = rawName.toUpperCase();
    let bestItem = data.data[0];

    for (const item of data.data) {
      const itemName = (item.name || '').toUpperCase();
      if (upperRaw.includes('TABLET') && itemName.includes('TABLET')) {
        bestItem = item;
        break;
      }
      if (upperRaw.includes('SOLÜSYON') && itemName.includes('SOLÜSYON')) {
        bestItem = item;
        break;
      }
      if (upperRaw.includes('DAMLA') && itemName.includes('DAMLA')) {
        bestItem = item;
        break;
      }
    }

    // 5. HTML içindeki PDF linklerini regex ile çek
    const extractPdfUrl = (htmlSnippet: string): string | undefined => {
      if (!htmlSnippet) return undefined;
      const match = htmlSnippet.match(/href=["'](https?:\/\/[^"']+\.pdf[^"']*)["']/i);
      return match ? match[1].replace(/\\/g, '') : undefined;
    };

    const ktPdfUrl = extractPdfUrl(bestItem.documentPathKt);
    const kubPdfUrl = extractPdfUrl(bestItem.documentPathKub);

    log.info('TİTCK PDF linki başarıyla çözümlendi', {
      rawName,
      officialName: bestItem.name,
      ktPdfUrl,
    });

    return {
      success: !!(ktPdfUrl || kubPdfUrl),
      ktPdfUrl: ktPdfUrl || kubPdfUrl,
      kubPdfUrl,
      officialName: bestItem.name,
      element: bestItem.element,
      confirmationDate: bestItem.confirmationDateKt || bestItem.confirmationDateKub,
      fallbackUrl: ktPdfUrl || fallbackUrl,
    };
  } catch (error: unknown) {
    log.error('TİTCK PDF sorgulama hatası', error);
    return {
      success: false,
      fallbackUrl,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
}
