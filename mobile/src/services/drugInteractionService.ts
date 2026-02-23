import { Medicine } from '../types';

export type InteractionSeverity = 'high' | 'moderate' | 'low';

export interface DrugInteraction {
    severity: InteractionSeverity;
    description: string;
    sourceMedicineName: string;
    targetMedicineName: string;
    action: string;
}

// Basit İlaç Etkileşim Veritabanı
// İsim veya kategoriler baz alınarak oluşturulmuş örnek liste.
const KNOWN_INTERACTIONS = [
    {
        keywords: ['aspirin', 'coraspin', 'ecopirin', 'plavix'],
        interactsWith: ['ibuprofen', 'arveles', 'majezik', 'dikloron', 'naproksen', 'apranax'],
        severity: 'high' as InteractionSeverity,
        description: 'Kanama riskini artırabilir. Birlikte kullanılmaları kanama kontrolünü zorlaştırabilir.',
        action: 'Doktorunuza danışmadan bu iki ilacı birlikte kullanmayınız.',
    },
    {
        keywords: ['parasetamol', 'minoset', 'panadol', 'calpol', 'vermidon'],
        interactsWith: ['alkol'],
        severity: 'high' as InteractionSeverity,
        description: 'Karaciğer hasarı riskini ciddi şekilde artırır.',
        action: 'Bu ilacı kullanırken alkol tüketmekten kaçının.',
    },
    {
        keywords: ['tansiyon', 'delix', 'beloc', 'vasoxen', 'coversyl', 'karvezide'],
        interactsWith: ['ibuprofen', 'arveles', 'majezik', 'dikloron', 'apranax', 'ağrı kesici'],
        severity: 'moderate' as InteractionSeverity,
        description: 'Ağrı kesiciler bazı tansiyon ilaçlarının etkisini azaltabilir ve tansiyonun yükselmesine neden olabilir.',
        action: 'Tansiyonunuzu düzenli ölçün. Sürekli ağrı kesici kullanmanız gerekiyorsa doktorunuza danışın.',
    },
    {
        keywords: ['antibiyotik', 'amoklavin', 'klindan', 'augmentin', 'cefaks', 'azitro'],
        interactsWith: ['doğum kontrol hapı', 'yazz', 'yasmin', 'diane35'],
        severity: 'moderate' as InteractionSeverity,
        description: 'Bazı antibiyotikler doğum kontrol haplarının etkinliğini azaltabilir.',
        action: 'Antibiyotik tedavisi süresince ek bir korunma yöntemi kullanmayı düşünebilirsiniz.',
    },
    // İstendiği takdirde bu listeye yeni çapraz eşleşmeler eklenebilir.
];

function normalizeName(name: string): string {
    if (!name) return '';
    // Küçük harfe çevirip Türkçe karakterleri ve gereksiz boşlukları ayıkla
    return name
        .toLowerCase()
        .trim()
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u');
}

/**
 * Mevcut ilaçlar (activeMedicines) ile yeni/düzenlenen ilaç (newMedicineName) arasında
 * olası etkileşimleri kontrol eder.
 */
export function checkInteractions(
    newMedicineName: string,
    existingMedicines: Medicine[]
): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];

    if (!newMedicineName || existingMedicines.length === 0) return interactions;

    const normalizedNewMed = normalizeName(newMedicineName);

    existingMedicines.forEach((med) => {
        if (!med.isActive) return;

        const normalizedExistingMed = normalizeName(med.name);

        // Aynı isimse kendi kendini etkileşim görmesini atla
        if (normalizedExistingMed === normalizedNewMed) return;

        for (const rule of KNOWN_INTERACTIONS) {
            const newMedMatchesKeywords = rule.keywords.some(k => normalizedNewMed.includes(normalizeName(k)));
            const existingMatchesInteractsWith = rule.interactsWith.some(i => normalizedExistingMed.includes(normalizeName(i)));

            const newMedMatchesInteractsWith = rule.interactsWith.some(i => normalizedNewMed.includes(normalizeName(i)));
            const existingMatchesKeywords = rule.keywords.some(k => normalizedExistingMed.includes(normalizeName(k)));

            // Gidiş-Dönüş (Yönlü olmayan) eşleşme kontrolü
            if ((newMedMatchesKeywords && existingMatchesInteractsWith) || (newMedMatchesInteractsWith && existingMatchesKeywords)) {

                // Daha önceden aynı eşleşme eklendiyse (farklı kural çakışması) atla
                const alreadyAdded = interactions.some(
                    i => (i.sourceMedicineName === newMedicineName && i.targetMedicineName === med.name) ||
                        (i.sourceMedicineName === med.name && i.targetMedicineName === newMedicineName)
                );

                if (!alreadyAdded) {
                    interactions.push({
                        severity: rule.severity,
                        description: rule.description,
                        action: rule.action,
                        sourceMedicineName: newMedicineName,
                        targetMedicineName: med.name,
                    });
                }
            }
        }
    });

    return interactions;
}
