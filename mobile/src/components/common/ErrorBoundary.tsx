/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 * Prevents entire app from crashing due to component errors
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// Note: useTheme kaldırıldı - ErrorBoundary ThemeProvider dışında da çalışmalı
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error(`Error in ${this.props.componentName || 'component'}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // TODO: Send to crash reporting service (Crashlytics, Sentry, etc.)
    // Example: crashlytics().recordError(error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
  componentName?: string;
}

// Sabit tema renkleri (ThemeProvider olmadan da çalışır)
const ERROR_COLORS = {
  background: '#1A1A2E',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textSecondary: 'rgba(255,255,255,0.5)',
  primary: '#4ECDC4',
  error: '#FF6B6B',
};

function ErrorFallback({ error, onReset, componentName }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  // ThemeProvider olmayabilir, sabit renkleri kullan
  const colors = ERROR_COLORS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Bir Hata Oluştu</Text>

        <Text style={[styles.message, { color: colors.textMuted }]}>
          {componentName
            ? `"${componentName}" bileşeninde bir sorun oluştu.`
            : 'Uygulamada beklenmeyen bir hata oluştu.'}
        </Text>

        <Text style={[styles.subMessage, { color: colors.textSecondary }]}>
          Lütfen tekrar deneyin veya uygulamayı yeniden başlatın.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onReset}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Tekrar Dene</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailsButton} onPress={() => setShowDetails(!showDetails)}>
          <Text style={[styles.detailsButtonText, { color: colors.primary }]}>
            {showDetails ? 'Detayları Gizle' : 'Hata Detayları'}
          </Text>
        </TouchableOpacity>

        {showDetails && error && (
          <ScrollView
            style={[styles.errorDetails, { backgroundColor: '#1a1a1a' }]}
            contentContainerStyle={styles.errorDetailsContent}
          >
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error.name}: {error.message}
            </Text>
            {error.stack && (
              <Text style={[styles.stackTrace, { color: colors.textMuted }]}>{error.stack}</Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsButton: {
    paddingVertical: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorDetails: {
    width: '100%',
    maxHeight: 200,
    borderRadius: 8,
    marginTop: 16,
  },
  errorDetailsContent: {
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  stackTrace: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});

export default ErrorBoundary;
