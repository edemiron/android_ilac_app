import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { progressStyles, SCANNER_COLORS } from './styles';
import { SearchProgressProps } from './types';

export function SearchProgress({
  statusMessage,
  currentSearchStep,
  totalSearchSteps,
  searchStatus,
}: SearchProgressProps) {
  if (searchStatus === 'idle') {
    return null;
  }

  return (
    <View style={progressStyles.container}>
      {searchStatus === 'searching' && (
        <>
          <ActivityIndicator size="large" color={SCANNER_COLORS.primary} />
          <Text style={progressStyles.statusText}>{statusMessage}</Text>

          <View style={progressStyles.progressContainer}>
            <View style={progressStyles.progressBar}>
              <View
                style={[
                  progressStyles.progressFill,
                  { width: `${(currentSearchStep / totalSearchSteps) * 100}%` },
                ]}
              />
            </View>
            <Text style={progressStyles.progressText}>
              {currentSearchStep}/{totalSearchSteps}
            </Text>
          </View>
        </>
      )}

      {searchStatus === 'error' && (
        <Text style={[progressStyles.statusText, { color: SCANNER_COLORS.error }]}>
          {statusMessage}
        </Text>
      )}
    </View>
  );
}
