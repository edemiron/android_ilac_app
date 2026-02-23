/**
 * Caregiver Mode Hook
 *
 * Bakıcı yönetimi için React hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createScopedLogger } from '../utils/logger';
import type {
  CaregiverRelationship,
  CaregiverInvite,
} from '../types';
import {
  createCaregiverInvite,
  getCaregivers,
  removeCaregiver,
  updateCaregiverRelationship,
  getPendingInvites,
  cancelInvite,
  subscribeToCaregivers,
} from '../services/caregiverService';
import { createQRCodeData } from '../services/qrCodeService';

const log = createScopedLogger('useCaregiver');

export interface UseCaregiverResult {
  // State
  caregivers: CaregiverRelationship[];
  pendingInvites: CaregiverInvite[];
  isLoading: boolean;

  // QR Code
  qrCodeData: string | null;
  showQRModal: boolean;

  // Actions
  createInvite: (email: string, permissions?: {
    canViewSchedule: boolean;
    canViewHistory: boolean;
    canReceiveAlerts: boolean;
  }) => Promise<{ success: boolean; inviteCode?: string; error?: string }>;

  removeCaregiverRel: (relationshipId: string) => Promise<{ success: boolean }>;

  updatePermissions: (relationshipId: string, permissions: {
    canViewSchedule: boolean;
    canViewHistory: boolean;
    canReceiveAlerts: boolean;
  }) => Promise<void>;

  cancelInviteRel: (inviteCode: string) => Promise<{ success: boolean }>;

  showQRCode: (inviteCode: string) => void;
  hideQRCode: () => void;

  refresh: () => Promise<void>;
}

/**
 * Bakıcı modu hook'u
 */
export function useCaregiver(): UseCaregiverResult {
  const { user } = useAuth();
  const [caregivers, setCaregivers] = useState<CaregiverRelationship[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CaregiverInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const userId = user?.uid;

  // Bakıcıları yükle
  const loadCaregivers = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const data = await getCaregivers(userId);
      setCaregivers(data);
    } catch (error) {
      log.error('Bakıcılar yüklenemedi', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Bekleyen davetleri yükle
  const loadPendingInvites = useCallback(async () => {
    if (!userId) return;

    try {
      const data = await getPendingInvites(userId);
      setPendingInvites(data);
    } catch (error) {
      log.error('Davetler yüklenemedi', error);
    }
  }, [userId]);

  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([loadCaregivers(), loadPendingInvites()]);
  }, [loadCaregivers, loadPendingInvites]);

  // İlk yükleme
  useEffect(() => {
    loadCaregivers();
    loadPendingInvites();
  }, [loadCaregivers, loadPendingInvites]);

  // Real-time updates
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToCaregivers(userId, (data) => {
      setCaregivers(data);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Davet oluştur
  const createInvite = useCallback(
    async (
      email: string,
      permissions = {
        canViewSchedule: true,
        canViewHistory: true,
        canReceiveAlerts: true,
      }
    ) => {
      if (!userId) {
        return { success: false, error: 'Oturum açmanız gerekiyor' };
      }

      const result = await createCaregiverInvite(userId, user?.displayName || 'Hasta', email, permissions);

      if (result.success && result.inviteCode) {
        // Davet listesini yenile
        await loadPendingInvites();
      }

      return result;
    },
    [userId, user?.displayName, loadPendingInvites]
  );

  // Bakıcı kaldır
  const removeCaregiverRel = useCallback(async (relationshipId: string) => {
    const result = await removeCaregiver(relationshipId);

    if (result.success) {
      // Listeyi yenile
      await loadCaregivers();
    }

    return result;
  }, [loadCaregivers]);

  // Yetkileri güncelle
  const updatePermissions = useCallback(
    async (relationshipId: string, permissions: {
      canViewSchedule: boolean;
      canViewHistory: boolean;
      canReceiveAlerts: boolean;
    }) => {
      await updateCaregiverRelationship(relationshipId, permissions);
      // Listeyi yenile
      await loadCaregivers();
    },
    [loadCaregivers]
  );

  // Davet iptal
  const cancelInviteRel = useCallback(async (inviteCode: string) => {
    const result = await cancelInvite(inviteCode);

    if (result.success) {
      // Listeyi yenile
      await loadPendingInvites();
    }

    return result;
  }, [loadPendingInvites]);

  // QR kod göster
  const showQRCode = useCallback((inviteCode: string) => {
    const qrData = createQRCodeData(inviteCode);
    setQrCodeData(qrData);
    setShowQRModal(true);
  }, []);

  // QR kod gizle
  const hideQRCode = useCallback(() => {
    setShowQRModal(false);
    setQrCodeData(null);
  }, []);

  return {
    caregivers,
    pendingInvites,
    isLoading,
    qrCodeData,
    showQRModal,
    createInvite,
    removeCaregiverRel,
    updatePermissions,
    cancelInviteRel,
    showQRCode,
    hideQRCode,
    refresh,
  };
}
