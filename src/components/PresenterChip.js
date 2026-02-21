import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { decodeHtml } from '../utils/text';

export default function PresenterChip({ presenter, onPress, subtitle }) {
  if (!presenter) return null;
  const name = decodeHtml(presenter?.title?.rendered || `${presenter?.acf?.first_name || ''} ${presenter?.acf?.last_name || ''}`.trim());
  const photo = presenter?.acf?.presenterphoto || presenter?.acf?.presenter_photo_upload || '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: 'white',
        marginBottom: 10,
      })}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f2f2f2', marginRight: 12 }}
        />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f2f2f2', marginRight: 12 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700' }} numberOfLines={1}>
          {name}
        </Text>
        {!!subtitle && (
          <Text style={{ opacity: 0.75 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
