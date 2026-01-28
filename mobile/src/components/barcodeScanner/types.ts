import { GlobalMedicine } from '../../types';
import { SearchSource } from '../../services/medicineSearchOrchestrator';

export type SearchStatus = 'idle' | 'searching' | 'found' | 'not_found' | 'error';

export interface BarcodeScannerState {
  scanned: boolean;
  searchStatus: SearchStatus;
  statusMessage: string;
  currentSearchStep: number;
  totalSearchSteps: number;
  foundMedicine: Partial<GlobalMedicine> | null;
  scannedBarcode: string;
  showResultModal: boolean;
  searchSource: SearchSource;
  confidence: number;
}

export interface BarcodeScannerActions {
  handleBarCodeScanned: (result: { data: string }) => Promise<void>;
  handleConfirmMedicine: () => Promise<void>;
  handleEditMedicine: () => void;
  resetScanner: () => void;
  closeResultModal: () => void;
}

export interface UseBarcodeScanner extends BarcodeScannerState, BarcodeScannerActions {}

export interface ScanOverlayProps {
  searchStatus: SearchStatus;
  statusMessage: string;
  currentSearchStep: number;
  totalSearchSteps: number;
  instructionText: string;
}

export interface SearchProgressProps {
  statusMessage: string;
  currentSearchStep: number;
  totalSearchSteps: number;
  searchStatus: SearchStatus;
}

export interface MedicineResultModalProps {
  visible: boolean;
  foundMedicine: Partial<GlobalMedicine> | null;
  scannedBarcode: string;
  searchSource: SearchSource;
  confidence: number;
  onConfirm: () => void;
  onEdit: () => void;
  onRescan: () => void;
  onClose: () => void;
}

export interface PermissionRequestProps {
  onRequestPermission: () => void;
  permissionText: string;
}

export interface ScannerBottomButtonsProps {
  scanned: boolean;
  onRescan: () => void;
  onGoHome: () => void;
}
