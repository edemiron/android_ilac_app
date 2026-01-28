import { StyleSheet } from 'react-native';

export const SCANNER_COLORS = {
  primary: '#4ECDC4',
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  error: '#FF6B6B',
  warning: '#FFF3E0',
  warningText: '#E65100',
  homeButton: '#607D8B',
  progressBackground: 'rgba(255, 255, 255, 0.3)',
  borderLight: 'rgba(128, 128, 128, 0.2)',
  confidenceText: 'rgba(255, 255, 255, 0.8)',
  grayText: '#AAAAAA',
};

export const scannerStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: SCANNER_COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleSection: {
    flexDirection: 'row',
    height: 250,
  },
  scanArea: {
    width: 280,
    height: 250,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: SCANNER_COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  headerText: {
    color: SCANNER_COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtext: {
    color: SCANNER_COLORS.grayText,
    fontSize: 12,
  },
  instructionText: {
    color: SCANNER_COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SCANNER_COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: SCANNER_COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export const bottomButtonStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    backgroundColor: SCANNER_COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 180,
    alignItems: 'center',
  },
  homeButton: {
    backgroundColor: SCANNER_COLORS.homeButton,
  },
  buttonText: {
    color: SCANNER_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export const permissionStyles = StyleSheet.create({
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 40,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: SCANNER_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export const progressStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    color: SCANNER_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
    paddingHorizontal: 20,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: SCANNER_COLORS.progressBackground,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: SCANNER_COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    color: SCANNER_COLORS.white,
    fontSize: 12,
    marginLeft: 10,
  },
});
