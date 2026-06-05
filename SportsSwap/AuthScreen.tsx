import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const GOLD = '#C8961E';
const GOLD_DARK = '#9A6E12';
const GOLD_LIGHT = '#FBF1D6';
const GOLD_TEXT = '#8A6410';
const BG = '#ffffff';
const BG2 = '#f5f5f4';
const BG3 = '#eeece8';
const TEXT = '#1a1a18';
const TEXT2 = '#6b6b68';
const TEXT3 = '#9b9b97';
const BORDER = 'rgba(0,0,0,0.22)';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignUp() {
    if (!email || !password || !username) {
      setError('Please fill in all fields.'); return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.'); return;
    }
    setLoading(true); setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Save username to Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        username,
        email,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(friendlyError(e.code));
    }
    setLoading(false);
  }

  async function handleSignIn() {
    if (!email || !password) {
      setError('Please enter your email and password.'); return;
    }
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(friendlyError(e.code));
    }
    setLoading(false);
  }

  function friendlyError(code: string) {
    if (code === 'auth/email-already-in-use') return 'That email is already registered.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (code === 'auth/user-not-found') return 'No account found with that email.';
    if (code === 'auth/wrong-password') return 'Incorrect password. Try again.';
    if (code === 'auth/invalid-credential') return 'Incorrect email or password.';
    return 'Something went wrong. Please try again.';
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🏆</Text>
            <Text style={styles.logoText}>SportsSwap</Text>
            <Text style={styles.logoSub}>Buy & sell sports gear near you</Text>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => {setMode('signin'); setError('');}}>
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => {setMode('signup'); setError('');}}>
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create account</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. sportsfan99"
                  placeholderTextColor={TEXT3}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={TEXT3}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              placeholderTextColor={TEXT3}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.btn}
              onPress={mode === 'signup' ? handleSignUp : handleSignIn}
              disabled={loading}>
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.btnText}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {setMode(mode === 'signin' ? 'signup' : 'signin'); setError('');}}>
              <Text style={styles.switchText}>
                {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG3},
  container: {flexGrow: 1, justifyContent: 'center', padding: 24},
  logoWrap: {alignItems: 'center', marginBottom: 36},
  logoEmoji: {fontSize: 52, marginBottom: 8},
  logoText: {fontSize: 28, fontWeight: '700', color: GOLD, letterSpacing: -0.5},
  logoSub: {fontSize: 14, color: TEXT2, marginTop: 4},
  tabs: {flexDirection: 'row', backgroundColor: BG2, borderRadius: 10, padding: 4, marginBottom: 24},
  tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8},
  tabActive: {backgroundColor: BG, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: {width: 0, height: 1}},
  tabText: {fontSize: 14, color: TEXT2, fontWeight: '500'},
  tabTextActive: {color: TEXT, fontWeight: '600'},
  form: {backgroundColor: BG, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)'},
  label: {fontSize: 12, color: TEXT2, marginBottom: 6, marginTop: 14},
  input: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, padding: 12, fontSize: 14, color: TEXT, backgroundColor: BG},
  error: {fontSize: 13, color: '#D4537E', marginTop: 12, textAlign: 'center'},
  btn: {backgroundColor: GOLD, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20},
  btnText: {color: 'white', fontSize: 15, fontWeight: '600'},
  switchText: {fontSize: 13, color: TEXT2, textAlign: 'center', marginTop: 16},
});
