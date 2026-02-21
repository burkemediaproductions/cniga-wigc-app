import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

// Replace with your real background image if desired.
const DEFAULT_BG = {
  uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=60',
};

export function Background({ children, image = DEFAULT_BG }) {
  return (
    <ImageBackground source={image} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
