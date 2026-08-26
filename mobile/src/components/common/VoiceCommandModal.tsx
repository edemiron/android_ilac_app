import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../../contexts/LanguageContext';
import { parseVoiceCommand, VoiceCommandIntent } from '../../utils/voiceRecognition';

interface VoiceCommandModalProps {
  visible: boolean;
  onCommandRecognized: (intent: VoiceCommandIntent) => void;
  onClose: () => void;
}

export function VoiceCommandModal({
  visible,
  onCommandRecognized,
  onClose,
}: VoiceCommandModalProps) {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [statusText, setStatusText] = useState<string>(
    isTr
      ? 'Dinleniyor... "Aldım", "Ertele" veya "Atla" deyin'
      : 'Listening... Say "Taken", "Snooze" or "Skip"'
  );

  useEffect(() => {
    if (visible) {
      setStatusText(
        isTr
          ? 'Dinleniyor... "Aldım", "Ertele" veya "Atla" deyin'
          : 'Listening... Say "Taken", "Snooze" or "Skip"'
      );
    }
  }, [visible, isTr]);

  const handleSimulateSpeech = (spokenPhrase: string) => {
    const result = parseVoiceCommand(spokenPhrase);
    if (result.intent !== 'UNKNOWN') {
      setStatusText(isTr ? `Algılandı: "${spokenPhrase}"` : `Recognized: "${spokenPhrase}"`);
      setTimeout(() => {
        onCommandRecognized(result.intent);
        onClose();
      }, 600);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={42} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>{isTr ? 'Sesli Komut' : 'Voice Command'}</Text>

          <Text style={styles.statusText}>{statusText}</Text>

          <ActivityIndicator color="#4ECDC4" size="small" style={styles.loader} />

          {/* Quick Voice Simulation Buttons (For testing and immediate access) */}
          <View style={styles.quickCommandsRow}>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleSimulateSpeech('Aldım')}
            >
              <Text style={styles.quickButtonText}>"Aldım"</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => handleSimulateSpeech('Ertele')}
            >
              <Text style={styles.quickButtonText}>"Ertele"</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleSimulateSpeech('Atla')}
            >
              <Text style={styles.quickButtonText}>"Atla"</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{isTr ? 'Kapat' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  loader: {
    marginBottom: 16,
  },
  quickCommandsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  quickButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
