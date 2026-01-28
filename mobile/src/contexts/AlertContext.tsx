import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import CustomAlert, { AlertType, AlertButton, AlertItem } from '../components/CustomAlert';

interface AlertOptions {
  type?: AlertType;
  title: string;
  message?: string;
  items?: AlertItem[];
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    }
  ) => void;
  showError: (title: string, message?: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string, onOk?: () => void) => void;
  showInfo: (title: string, message?: string) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({
    type: 'info',
    title: '',
  });

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertOptions(options);
    setVisible(true);
  }, []);

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: {
        confirmText?: string;
        cancelText?: string;
        destructive?: boolean;
      }
    ) => {
      setAlertOptions({
        type: 'confirm',
        title,
        message,
        buttons: [
          {
            text: options?.cancelText || 'İptal',
            style: 'cancel',
            onPress: hideAlert,
          },
          {
            text: options?.confirmText || 'Tamam',
            style: options?.destructive ? 'destructive' : 'default',
            onPress: () => {
              onConfirm();
              hideAlert();
            },
          },
        ],
      });
      setVisible(true);
    },
    [hideAlert]
  );

  const showError = useCallback((title: string, message?: string) => {
    setAlertOptions({
      type: 'error',
      title,
      message,
      buttons: [{ text: 'Tamam', onPress: () => setVisible(false) }],
    });
    setVisible(true);
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    setAlertOptions({
      type: 'success',
      title,
      message,
      buttons: [{ text: 'Tamam', onPress: () => setVisible(false) }],
    });
    setVisible(true);
  }, []);

  const showWarning = useCallback((title: string, message?: string, onOk?: () => void) => {
    setAlertOptions({
      type: 'warning',
      title,
      message,
      buttons: [
        {
          text: 'Tamam',
          onPress: () => {
            onOk?.();
            setVisible(false);
          },
        },
      ],
    });
    setVisible(true);
  }, []);

  const showInfo = useCallback((title: string, message?: string) => {
    setAlertOptions({
      type: 'info',
      title,
      message,
      buttons: [{ text: 'Tamam', onPress: () => setVisible(false) }],
    });
    setVisible(true);
  }, []);

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showConfirm,
        showError,
        showSuccess,
        showWarning,
        showInfo,
        hideAlert,
      }}
    >
      {children}
      <CustomAlert
        visible={visible}
        type={alertOptions.type}
        title={alertOptions.title}
        message={alertOptions.message}
        items={alertOptions.items}
        buttons={alertOptions.buttons}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
