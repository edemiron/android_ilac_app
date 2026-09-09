/**
 * ProspectusSectionCard — İlaç prospektüsü bölümü kartı (İkon, başlık, liste/metin)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface ProspectusSectionCardProps {
  title: string;
  content: string | string[] | undefined;
  icon: string;
  colors: ThemeColors;
}

export function ProspectusSectionCard({
  title,
  content,
  icon,
  colors,
}: ProspectusSectionCardProps) {
  if (!content || (Array.isArray(content) && content.length === 0)) {
    return null;
  }

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>

      {Array.isArray(content) ? (
        <View style={styles.listContainer}>
          {content.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.listItemText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{content}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  listContainer: {
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 20,
  },
  listItemText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
