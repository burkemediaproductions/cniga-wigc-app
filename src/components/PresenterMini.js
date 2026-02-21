import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../utils/theme';
import { decodeWpTitle, getPresenterImageUrl } from '../api/wp';

export function PresenterMini({ presenter, onPress }) {
  const name = useMemo(() => decodeWpTitle(presenter?.title), [presenter]);
  const role = presenter?.acf?.title || presenter?.acf?.position || '';
  const img = getPresenterImageUrl(presenter);

  return (
    <Pressable onPress={onPress} style={styles.row}>
      {img ? <Image source={{ uri: img }} style={styles.img} /> : <View style={styles.fallback}><Text style={styles.fallbackText}>{name?.[0] || '?'}</Text></View>}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {role ? <Text style={styles.role} numberOfLines={1}>{role}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  img: { width: 46, height: 46, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  fallback: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  fallbackText: { color: COLORS.text, fontWeight: '900', fontSize: 18 },
  name: { color: COLORS.brand, fontWeight: '900', fontSize: 16 },
  role: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});
