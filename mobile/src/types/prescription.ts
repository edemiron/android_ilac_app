/**
 * Prescription Type Definitions (Reçete Veri Modeli)
 */

export interface Prescription {
  id: string;
  title: string; // örn: "Kardiyoloji Rutin Tedavi Reçetesi"
  prescriptionCode?: string; // E-Reçete No (örn: "E-REC-89231")
  doctorName?: string; // Doktor Adı & Ünvanı (örn: "Prof. Dr. Mehmet Öz")
  hospitalName?: string; // Sağlık Kuruluşu (örn: "Şehir Hastanesi")
  prescribedDate: string; // Reçete Veriliş Tarihi (YYYY-MM-DD)
  expiryDate: string; // Reçete Bitiş / Yenileme Tarihi (YYYY-MM-DD)
  medicineIds: string[]; // Bu reçeteye bağlı ilaçların ID listesi
  notes?: string; // Doktor notu veya kullanım açıklaması
  reminderDaysBefore?: number[]; // Kaç gün önce hatırlatılacak (örn: [3, 1])
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PrescriptionInput = Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>;
