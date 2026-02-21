import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../utils/theme';
import { decodeWpTitle, getPresenterImageUrl, stripHtml } from '../api/wp';

export function PresenterRow({ presenter, onPress }) {
  const name = useMemo(() => decodeWpTitle(presenter?.title), [presenter]);
  const role = presenter?.acf?.title || presenter?.acf?.position || '';
  const org = presenter?.acf?.organization || presenter?.acf?.company || '';
  const subtitle = [role, org].filter(Boolean).join(' • ');
  const img = getPresenterImageUrl(presenter);

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.avatarWrap}>
        {img ? <Image source={{ uri: img }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarFallbackText}>{name?.[0] || '?'}</Text></View>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.panelStrong,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatar: { width: 54, height: 54, resizeMode: 'cover' },
  avatarFallback: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatarFallbackText: { color: COLORS.text, fontWeight: '900', fontSize: 22 },
  name: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 18,
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 17,
  },
});
