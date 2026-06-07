import React, {useRef} from 'react';
import {Animated, Pressable} from 'react-native';

// Interactive button: springs slightly larger on press-in, settles back with a bounce.
// Use it like a View — pass `style` (the button container style) and `onPress`.
export default function Btn({style, onPress, children, disabled, scaleTo = 1.06}: any) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => Animated.spring(scale, {toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 0}).start()}
      onPressOut={() => Animated.spring(scale, {toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14}).start()}
    >
      <Animated.View style={[style, {transform: [{scale}], opacity: disabled ? 0.5 : 1}]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
