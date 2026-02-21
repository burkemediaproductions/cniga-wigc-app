import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADII, SHADOW, SPACING } from '../constants/theme';
import { getPresenterPhotoUrl, initialForName } from '../utils/images';

export default function PersonRow({ person, subtitleTop, subtitleBottom, onPress }) {
  const photo = getPresenterPhotoUrl(person);
  const name = person?.title?.rendered || person?.acf?.first_name || '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{initialForName(name)}</Text>
        </View>
      )}

      <View style={styles.textCol}>
        <Text numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        {!!subtitleTop && <Text numberOfLines={1} style={styles.sub}>{subtitleTop}</Text>}
        {!!subtitleBottom && <Text numberOfLines={1} style={styles.sub2}>{subtitleBottom}</Text>}
      </View>
    </Pressable>
  );
}

const AVATAR = 46;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pressed: { opacity: 0.8 },
  avatarImg: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarFallback: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  avatarInitial: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 18,
  },
  textCol: { flex: 1 },
  name: {
    color: COLORS.brand,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  sub: { color: COLORS.text, marginTop: 2, fontWeight: '600' },
  sub2: { color: COLORS.textMuted, marginTop: 1 },
});
