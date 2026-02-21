import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADII, SHADOW, SPACING } from '../constants/theme';
import { getEventImageUrl } from '../utils/images';
import { wpText } from '../utils/text';

export default function SessionRow({ event, metaLine, onPress, rightIcon }) {
  const img = getEventImageUrl(event);
  const title = wpText(event?.title?.rendered || '');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {img ? (
        <Image source={{ uri: img }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbFallback} />
      )}
      <View style={styles.col}>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
        {!!metaLine && <Text numberOfLines={1} style={styles.meta}>{metaLine}</Text>}
      </View>
      {!!rightIcon && <View style={styles.right}>{rightIcon}</View>}
    </Pressable>
  );
}

const THUMB = 56;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pressed: { opacity: 0.82 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  thumbFallback: {
    width: THUMB,
    height: THUMB,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOW.card,
  },
  col: { flex: 1 },
  title: { color: COLORS.brand, fontWeight: '800', fontSize: 15 },
  meta: { color: COLORS.textMuted, marginTop: 2 },
  right: { marginLeft: 8 },
});
