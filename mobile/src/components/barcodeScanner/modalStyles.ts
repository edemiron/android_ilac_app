import { StyleSheet } from 'react-native';
import { SCANNER_COLORS } from './styles';

export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: SCANNER_COLORS.modalOverlay,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  sourceBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadgeText: {
    color: SCANNER_COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  confidenceText: {
    color: SCANNER_COLORS.confidenceText,
    fontSize: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SCANNER_COLORS.warning,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningBannerText: {
    flex: 1,
    color: SCANNER_COLORS.warningText,
    fontSize: 12,
  },
  medicineInfo: {
    maxHeight: 250,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SCANNER_COLORS.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  sourceInfoBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  sourceInfoText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: SCANNER_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 14,
  },
});
