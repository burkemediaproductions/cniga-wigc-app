import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../utils/theme';

export function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.item, active ? styles.itemActive : null]}
          >
            <Text style={[styles.text, active ? styles.textActive : null]} numberOfLines={2}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: COLORS.panelStrong,
    borderRadius: RADIUS.lg,
    padding: 4,
    gap: 6,
  },
  item: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: COLORS.brand,
  },
  text: {
    color: COLORS.mutedText,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  textActive: {
    color: COLORS.text,
  },
});
