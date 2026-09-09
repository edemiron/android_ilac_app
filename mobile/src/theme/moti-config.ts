/**
 * moti-config.ts — Sprint 97.1 Moti transition preset'leri.
 *
 * Moti `transition` prop'unda kullanılacak ortak timing/spring tanımları.
 *
 * ÖNEMLİ: Bu dosya SADECE animasyon timing'i içerir. Renk/stil
 * token'ları buraya KONMAZ — useTheme() / useAccent() üzerinden
 * component içinde çekilir (dark mode + accent override bozulmasın).
 *
 * Kullanım:
 *   import { motiTransitions } from '../../theme/moti-config';
 *   <MotiView transition={motiTransitions.standard} animate={{...}} />
 */

import type { MotiTransition } from 'moti';

export const motiTransitions: Record<string, MotiTransition> = {
  /**
   * press — buton basılma hissi (MotiPressable default).
   * 150ms linear-ish, scale 1→0.97 için yeterince hızlı.
   */
  press: {
    type: 'timing',
    duration: 150,
  },

  /**
   * quick — kısa geçişler (modal fade, mount enter).
   */
  quick: {
    type: 'timing',
    duration: 180,
  },

  /**
   * standard — orta geçişler (slide, list item reorder).
   */
  standard: {
    type: 'timing',
    duration: 260,
  },

  /**
   * expressive — spring-based, pop/bounce hissi.
   * Onboarding emoji, success checkmark, modal scale-in için.
   */
  expressive: {
    type: 'spring',
    damping: 16,
    stiffness: 180,
    mass: 0.8,
  },

  /**
   * successSnappy — "İlacı aldım" checkmark gibi hızlı spring.
   */
  successSnappy: {
    type: 'spring',
    damping: 14,
    stiffness: 220,
    mass: 0.6,
  },

  /**
   * loop — sonsuz shimmer/pulse için (Skeleton, AlarmScreen pulse).
   */
  loop: {
    type: 'timing',
    duration: 800,
    loop: true,
    repeatReverse: true,
  },
};
