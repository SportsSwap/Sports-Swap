import React, {useEffect, useRef} from 'react';
import {View, Text, Modal, TouchableOpacity, StyleSheet, Animated, SafeAreaView} from 'react-native';

// In-app toast — slides up from the bottom, auto-hides. No native Apple alert.
export function Toast({message, onHide, colors}: any) {
  const c = colors;
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!message) return;
    Animated.timing(slide, {toValue: 1, duration: 220, useNativeDriver: true}).start();
    const t = setTimeout(() => {
      Animated.timing(slide, {toValue: 0, duration: 220, useNativeDriver: true}).start(() => onHide && onHide());
    }, 2200);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  const translateY = slide.interpolate({inputRange: [0, 1], outputRange: [80, 0]});
  return (
    <Animated.View pointerEvents="none" style={[s.toastWrap, {opacity: slide, transform: [{translateY}]}]}>
      <View style={[s.toast, {backgroundColor: c.TEXT}]}>
        <Text style={[s.toastText, {color: c.BG}]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

// In-app confirm dialog — replaces native Alert for destructive actions.
export function ConfirmModal({data, onClose, colors}: any) {
  const c = colors;
  if (!data) return null;
  const {title, message, confirmText, cancelText, destructive, onConfirm} = data;
  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <View style={[s.card, {backgroundColor: c.BG}]}>
          <Text style={[s.title, {color: c.TEXT}]}>{title}</Text>
          {message ? <Text style={[s.msg, {color: c.TEXT2}]}>{message}</Text> : null}
          <View style={s.row}>
            <TouchableOpacity style={[s.btn, {backgroundColor: c.BG2}]} onPress={onClose}>
              <Text style={[s.btnText, {color: c.TEXT}]}>{cancelText || 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, destructive ? {backgroundColor: '#E24B4A'} : {backgroundColor: c.GOLD}]}
              onPress={() => { onClose && onClose(); onConfirm && onConfirm(); }}>
              <Text style={[s.btnText, {color: '#fff'}]}>{confirmText || 'Confirm'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  toastWrap: {position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center', zIndex: 999},
  toast: {paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22, maxWidth: '86%'},
  toastText: {fontSize: 14, fontWeight: '600', textAlign: 'center'},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 28},
  card: {width: '100%', maxWidth: 360, borderRadius: 18, padding: 22},
  title: {fontSize: 18, fontWeight: '700', marginBottom: 8},
  msg: {fontSize: 14, lineHeight: 20, marginBottom: 20},
  row: {flexDirection: 'row', gap: 10},
  btn: {flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center'},
  btnText: {fontSize: 15, fontWeight: '600'},
});
