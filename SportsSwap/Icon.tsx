import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Single place we use the icon font, so swapping libraries later is one edit.
export default function Icon({name, size = 20, color = '#000', style}: any) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
