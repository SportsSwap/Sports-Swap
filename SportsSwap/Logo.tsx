import React from 'react';
import {View, Text} from 'react-native';

// The SportsSwap wordmark — gold swap arrows + "sports" (theme text) + "swap" (gold).
// Adapts to light/dark automatically (black text in light, white in dark = reversed lockup).
export default function Logo({colors, size = 19}: any) {
  const GOLD = (colors && colors.GOLD) || '#C8961E';
  const TEXT = (colors && colors.TEXT) || '#1a1a18';
  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Text style={{fontSize: size + 5, color: GOLD, fontWeight: '900', marginRight: 6}}>⇄</Text>
      <Text style={{fontSize: size, fontWeight: '800', fontStyle: 'italic', letterSpacing: -0.5, color: TEXT}}>
        sports<Text style={{color: GOLD}}>swap</Text>
      </Text>
    </View>
  );
}
