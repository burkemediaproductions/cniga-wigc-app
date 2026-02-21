import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function ErrorView({ error, onRetry }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Something went wrong</Text>
      <Text style={{ opacity: 0.8, marginBottom: 12 }}>{String(error?.message || error || '')}</Text>
      {!!onRetry && (
        <Pressable
          onPress={onRetry}
          style={{ backgroundColor: '#111', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
