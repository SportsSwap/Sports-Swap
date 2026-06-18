import React, {useState, useMemo} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { lightColors } from './theme';
import Logo from './Logo';

export default function AuthScreen({colors}: any) {
  const c = colors || lightColors;
  const {GOLD, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER2} = c;
  const BORDER = c.BORDER2;
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [agreed, setAgreed] = useState(false);
  const EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
  const PRIVACY_URL = 'https://github.com/SportsSwap/Sports-Swap/blob/main/PRIVACY.md';

  async function handleReset() {
    if (!email) { setError('Enter your email above first, then tap "Forgot password".'); return; }
    setError(''); setNotice('');
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice('Password reset email sent. Check your inbox (and spam).');
    } catch (e: any) {
      setError(friendlyError(e.code));
    }
  }

  async function handleSignUp() {
    if (!email || !password || !username) {
      setError('Please fill in all fields.'); return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Use (EULA) and Privacy Policy first.'); return;
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
    if (!agreed) {
      setError('Please agree to the Terms of Use (EULA) and Privacy Policy first.'); return;
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
            <Logo colors={c} size={34} />
            <Text style={[styles.logoSub, {marginTop: 12}]}>Buy & sell sports gear · Connect with your community</Text>
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
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            {mode === 'signin' && (
              <TouchableOpacity onPress={handleReset} style={{alignSelf: 'flex-end', marginTop: 10}}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Agreement gate — required before sign in or sign up (App Store Guideline 1.2) */}
            <TouchableOpacity
              style={styles.agreeRow}
              activeOpacity={0.7}
              onPress={() => { setAgreed(!agreed); setError(''); }}>
              <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                {agreed && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.agreeText}>
                I agree to the{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(EULA_URL)}>Terms of Use (EULA)</Text>
                {' '}and{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
                There is zero tolerance for objectionable content or abusive behaviour.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, !agreed && styles.btnDisabled]}
              onPress={mode === 'signup' ? handleSignUp : handleSignIn}
              disabled={loading || !agreed}>
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

function makeStyles(c: any) {
  const {GOLD, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3} = c;
  const BORDER = c.BORDER2;
  return StyleSheet.create({
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
  notice: {fontSize: 13, color: '#1D9E75', marginTop: 12, textAlign: 'center'},
  forgot: {fontSize: 13, color: GOLD_TEXT, fontWeight: '600'},
  termsText: {fontSize: 11, color: TEXT3, lineHeight: 16, marginTop: 14, textAlign: 'center'},
  agreeRow: {flexDirection: 'row', alignItems: 'flex-start', marginTop: 18, gap: 10},
  checkbox: {width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginTop: 1},
  checkboxOn: {backgroundColor: GOLD, borderColor: GOLD},
  checkboxTick: {color: 'white', fontSize: 14, fontWeight: '800'},
  agreeText: {flex: 1, fontSize: 12, color: TEXT2, lineHeight: 17},
  link: {color: GOLD_TEXT, fontWeight: '600'},
  btnDisabled: {opacity: 0.45},
  btn: {backgroundColor: GOLD, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20},
  btnText: {color: 'white', fontSize: 15, fontWeight: '600'},
  switchText: {fontSize: 13, color: TEXT2, textAlign: 'center', marginTop: 16},
  });
}
