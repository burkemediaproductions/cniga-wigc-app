import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function LoadingView({ label = 'Loading…' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12 }}>{label}</Text>
    </View>
  );
}
