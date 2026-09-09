/**
 * AlarmActionButtons — Alarm ekranı eylem butonları (Aldım, Ertele, Sesli Yanıtla, Atla)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { TranslationKey } from '../../../contexts/LanguageContext';

interface AlarmActionButtonsProps {
  canSnooze: boolean;
  remainingSnoozes: number;
  snoozeDuration: number;
  language: string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  onTake: () => void;
  onSnooze: () => void;
  onSkip: () => void;
}

export function AlarmActionButtons({
  canSnooze,
  remainingSnoozes,
  snoozeDuration,
  language,
  t,
  onTake,
  onSnooze,
  onSkip,
}: AlarmActionButtonsProps) {
  const durationLabel =
    snoozeDuration < 1
      ? `${Math.round(snoozeDuration * 60)} ${language === 'tr' ? 'sn' : 'sec'}`
      : `${snoozeDuration} ${language === 'tr' ? 'dk' : 'min'}`;

  // ⚠️ v1.7.7 — ETIKET ARTIK GERCEGI SOYLUYOR.
  // Son hakta "Ertele — Son hak! (Ilac atlanir)" yaziyordu ve gercekten de
  // dozu atliyordu; yani ilan edilen 3 hakkin ucuncusu hic kullanilamiyordu.
  // Erteleme artik son hakta da NORMAL calisir; hak bitince buton gercekten
  // devre disi kalir ve kullaniciyi iki gercek eyleme yonlendirir.
  // v1.8.7: bastaki saat emojisi (U+23F0) KALDIRILDI. Metin zaten kendini
  // anlatiyor ("5 dk ertele — 3 hak"); emoji bilgi TASIMIYORDU ama TalkBack
  // onu da okuyordu ve bazi OEM'lerde bos kutuya donuyordu. Yerine ikon
  // EKLENMEDI: butonun tamami tek bir metin ve ikon icin satir duzeni
  // kurmak, hicbir sey kazandirmadan karmasiklik eklerdi.
  const snoozeButtonLabel = (() => {
    if (!canSnooze) {
      return language === 'tr'
        ? 'Erteleme hakkın bitti — "Aldım" ya da "İlacı Atla" seç'
        : 'No snoozes left — choose "Take" or "Skip"';
    }
    if (remainingSnoozes === 1) {
      return `${durationLabel} ${language === 'tr' ? 'ertele — son hak' : 'snooze — last one'}`;
    }
    return `${durationLabel} ${language === 'tr' ? 'ertele' : 'snooze'} — ${language === 'tr' ? `${remainingSnoozes} hak` : `${remainingSnoozes} left`}`;
  })();

  return (
    <View style={styles.actionSection}>
      {/* Ana buton - Aldım */}
      <TouchableOpacity
        style={styles.takeButton}
        onPress={onTake}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('alarm_take_now')}
      >
        {/*
          v1.8.7: onay isareti bir metin karakteri (U+2713) idi. TalkBack
          bunu basligin parcasi olarak okuyordu ve isaretin genisligi yazi
          tipine gore degisiyordu. Artik ikon fontu glifi ve ekran
          okuyucudan gizli — erisilebilir ad butonun kendisinde.
        */}
        <Ionicons
          name="checkmark-circle"
          size={26}
          color="#4ECDC4"
          style={styles.takeButtonIcon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.takeButtonText}>{t('alarm_take_now')}</Text>
      </TouchableOpacity>

      {/* Erteleme butonu */}
      <TouchableOpacity
        style={[styles.snoozeButton, !canSnooze && styles.snoozeButtonDisabled]}
        onPress={onSnooze}
        // v1.7.7: "disabled" GORUNEN ama basilabilen buton kaldirildi.
        // Eskiden bu butona dokunmak dozu atlandi olarak kaydediyordu.
        disabled={!canSnooze}
        accessibilityState={{ disabled: !canSnooze }}
        activeOpacity={0.8}
      >
        <Text style={[styles.snoozeButtonText, !canSnooze && styles.snoozeButtonTextDisabled]}>
          {snoozeButtonLabel}
        </Text>
      </TouchableOpacity>

      {/*
        v1.7.4 (Faz 0.6): "Sesle Yanıtla" butonu KALDIRILDI.
        Uygulamada konuşma tanıma kütüphanesi YOKTU; modal sabit bir
        "Dinleniyor..." metni gösteriyor, altında "Aldım/Ertele/Atla"
        simülasyon butonları bulunuyordu. Yaşlı kullanıcı telefona konuşuyor,
        hiçbir şey olmuyor, alarm çalmaya devam ediyordu; kırmızı "Atla"
        butonu ise tek dokunuşla dozu atlatıyordu.
        Gerçek STT eklenirse: izin akışı + gerçek transkript + "Atla" için onay.
      */}

      {/* Atla butonu */}
      <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.8}>
        <Text style={styles.skipButtonText}>{language === 'tr' ? 'İlacı Atla' : 'Skip Dose'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionSection: {
    paddingHorizontal: 30,
  },
  takeButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  takeButtonIcon: {
    marginRight: 10,
  },
  takeButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  snoozeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  snoozeButtonDisabled: {
    backgroundColor: 'rgba(100,100,100,0.3)',
  },
  snoozeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  snoozeButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  skipButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(78, 205, 196, 0.25)',
    borderWidth: 1,
    borderColor: '#4ECDC4',
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 4,
  },
  voiceButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
