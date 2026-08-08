import React, {useState, useMemo} from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert, Linking,
  TextInput, ActivityIndicator,
} from 'react-native';
import {
  sendPasswordResetEmail, signOut, deleteUser,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from 'firebase/auth';
import {doc, deleteDoc, setDoc, getDocs, collection, query, where} from 'firebase/firestore';
import {auth, db} from './firebase';
import Btn from './Btn';
import Icon from './Icon';

// How long you must wait between username changes
const USERNAME_COOLDOWN_DAYS = 30;

// Password field with a show/hide eye. Defined at module level so it keeps
// keyboard focus — a component declared inside the screen would remount on
// every keystroke.
function PwField({value, onChangeText, placeholder, shown, onToggle, styles, colors}: any) {
  return (
    <View style={styles.pwWrap}>
      <TextInput
        style={styles.pwInput}
        placeholder={placeholder}
        placeholderTextColor={colors.TEXT3}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={onToggle} style={{padding: 6}} accessibilityLabel={shown ? 'Hide password' : 'Show password'}>
        <Icon name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.TEXT2} />
      </TouchableOpacity>
    </View>
  );
}

const SUPPORT_EMAIL = 'SportsMACKAY@gmail.com';

const GUIDELINES = `SportsSwap is a place for sports lovers to buy, sell and connect. To keep it safe and welcoming for everyone:

• Be respectful. No harassment, bullying, hate speech or threats.
• Keep it clean. No nudity, violence or graphic content.
• Be honest. Don't post misleading listings, scams or spam.
• Stay legal. No selling prohibited, stolen or counterfeit items.
• Protect privacy. Don't share other people's personal information.

You can report any post, listing or user from inside the app, and block anyone you don't want to see or hear from. Reports are reviewed and content that breaks these rules is removed. Accounts that repeatedly break the rules will be banned.

There is zero tolerance for objectionable content or abusive behaviour.`;

const TERMS = `By using SportsSwap you agree to the following:

1. You are responsible for the content you post. You must not post anything unlawful, abusive, misleading or that infringes someone else's rights.

2. There is zero tolerance for objectionable content or abusive users. Content that breaks our Community Guidelines may be removed and accounts may be suspended or banned without notice.

3. SportsSwap is a venue. Sales are arranged directly between buyers and sellers — we are not a party to any transaction and don't guarantee items, payments or meetups. Always take sensible precautions when meeting or paying someone.

4. You may delete your account at any time from Settings, which permanently removes your profile.

5. We may update these terms as the app evolves. Continued use means you accept the latest version.

Questions? Contact us at ${SUPPORT_EMAIL}.`;

const PRIVACY = `What we collect
• Account details: your email and username.
• Content you create: listings, posts, comments, messages and photos you choose to upload.
• Preferences: things like your saved items and dark mode setting.

How it's used
Your data is used only to run SportsSwap — showing your listings and posts to other users, delivering your messages, and keeping your preferences. We do not sell your data to anyone.

Where it's stored
Data is stored securely in Google Firebase (Firestore and Firebase Authentication).

Your choices
• You can delete your own posts, comments and listings at any time.
• You can delete your entire account from Settings, which removes your profile.
• You can contact us at ${SUPPORT_EMAIL} with any privacy question or request.`;

export default function Settings({colors, username, email, dark, toggleDark, blockedUsers, onUnblock, onClose, usernameChangedAt, onUsernameChanged, isGuest, onSignIn}: any) {
  const c = colors;
  const {GOLD, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER} = c;
  const styles = useMemo(() => makeStyles(c), [c]);
  const [page, setPage] = useState<string | null>(null); // guidelines | terms | privacy | blocked | username | password

  // ----- Change password (in-app) -----
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState('');

  // ----- Change username (rate limited) -----
  const [newName, setNewName] = useState(username || '');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameErr, setNameErr] = useState('');
  const [nameOk, setNameOk] = useState('');

  // Days left before the username can be changed again
  const daysLeft = (() => {
    if (!usernameChangedAt) return 0;
    const changed = usernameChangedAt.seconds ? usernameChangedAt.seconds * 1000 : new Date(usernameChangedAt).getTime();
    if (!changed || isNaN(changed)) return 0;
    const elapsedDays = (Date.now() - changed) / 86400000;
    return Math.max(0, Math.ceil(USERNAME_COOLDOWN_DAYS - elapsedDays));
  })();

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function savePassword() {
    setPwErr(''); setPwOk('');
    if (!curPw || !newPw || !confirmPw) { setPwErr('Please fill in all three fields.'); return; }
    if (newPw.length < 6) { setPwErr('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPwErr("New passwords don't match."); return; }
    if (newPw === curPw) { setPwErr('Your new password must be different.'); return; }
    const u = auth.currentUser;
    if (!u || !u.email) { setPwErr('Please sign out and back in, then try again.'); return; }
    setPwBusy(true);
    try {
      // Firebase requires a recent login before changing a password
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, curPw));
      await updatePassword(u, newPw);
      setCurPw(''); setNewPw(''); setConfirmPw('');
      setPwOk('Password updated.');
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setPwErr('Your current password is incorrect.');
      else if (code === 'auth/weak-password') setPwErr('That password is too weak — use at least 6 characters.');
      else if (code === 'auth/too-many-requests') setPwErr('Too many attempts. Please wait a few minutes.');
      else setPwErr('Something went wrong. Please try again.');
    }
    setPwBusy(false);
  }

  async function saveUsername() {
    setNameErr(''); setNameOk('');
    const name = newName.trim();
    if (!name) { setNameErr('Please enter a username.'); return; }
    if (name === username) { setNameErr("That's already your username."); return; }
    if (name.length < 3) { setNameErr('Username must be at least 3 characters.'); return; }
    if (name.length > 20) { setNameErr('Username must be 20 characters or fewer.'); return; }
    if (!/^[A-Za-z0-9_.]+$/.test(name)) { setNameErr('Use letters, numbers, underscores and dots only.'); return; }
    if (daysLeft > 0) { setNameErr(`You can change your username again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`); return; }
    const u = auth.currentUser;
    if (!u) { setNameErr('Please sign out and back in, then try again.'); return; }
    setNameBusy(true);
    try {
      // Make sure nobody else has taken it
      const taken = await getDocs(query(collection(db, 'users'), where('username', '==', name)));
      if (taken.docs.some(d => d.id !== u.uid)) {
        setNameErr('That username is already taken.');
        setNameBusy(false);
        return;
      }
      await setDoc(doc(db, 'users', u.uid), {username: name, usernameChangedAt: new Date().toISOString()}, {merge: true});
      onUsernameChanged && onUsernameChanged(name);
      setNameOk('Username updated.');
    } catch (e) {
      setNameErr('Something went wrong. Please try again.');
    }
    setNameBusy(false);
  }

  function resetPasswordEmail() {
    Alert.alert('Forgot your password?', `We'll email a reset link to ${email}.`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Send link', onPress: async () => {
        try {
          await sendPasswordResetEmail(auth, email);
          Alert.alert('Email sent', 'Check your inbox for the reset link.');
        } catch (e) {
          Alert.alert('Something went wrong', 'Please try again later.');
        }
      }},
    ]);
  }

  function contactUs() {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=SportsSwap support`).catch(() =>
      Alert.alert('Contact us', `Email us at ${SUPPORT_EMAIL}`));
  }

  function deleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and profile. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete forever', style: 'destructive', onPress: async () => {
          const u = auth.currentUser;
          if (!u) return;
          try {
            await deleteDoc(doc(db, 'users', u.uid));
            await deleteUser(u);
          } catch (e: any) {
            if (e.code === 'auth/requires-recent-login') {
              Alert.alert('Please sign in again', 'For security, log out and sign back in, then delete your account.');
            } else {
              Alert.alert('Something went wrong', 'Please try again later.');
            }
          }
        }},
      ],
    );
  }

  const pageTitle = page === 'guidelines' ? 'Community Guidelines'
    : page === 'terms' ? 'Terms of Use'
    : page === 'privacy' ? 'Privacy Policy'
    : page === 'username' ? 'Change username'
    : page === 'password' ? 'Change password'
    : 'Blocked users';
  const pageBody = page === 'guidelines' ? GUIDELINES : page === 'terms' ? TERMS : PRIVACY;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{flex: 1, backgroundColor: BG3}}>
        <View style={styles.topbar}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.topTitle}>Settings</Text>
          <View style={{width: 70}} />
        </View>
        <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 50}}>

          {isGuest ? (
            <>
              <Text style={styles.sectionLabel}>Account</Text>
              <View style={styles.card}>
                <View style={[styles.row, {borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start'}]}>
                  <Text style={styles.rowLabel}>You're browsing as a guest</Text>
                  <Text style={[styles.formHint, {marginTop: 4}]}>Create a free account to post, message, save and follow.</Text>
                  <Btn style={[styles.saveBtn, {alignSelf: 'stretch', marginTop: 14}]} onPress={onSignIn}>
                    <Text style={styles.saveBtnText}>Sign in or create account</Text>
                  </Btn>
                </View>
              </View>
            </>
          ) : (
          <>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => { setNewName(username || ''); setNameErr(''); setNameOk(''); setPage('username'); }}>
              <Text style={styles.rowLabel}>Username</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Text style={styles.rowValue} numberOfLines={1}>{username}</Text>
                <Text style={styles.chev}>›</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{email}</Text>
            </View>
            <TouchableOpacity style={[styles.row, {borderBottomWidth: 0}]} onPress={() => { setCurPw(''); setNewPw(''); setConfirmPw(''); setPwErr(''); setPwOk(''); setPage('password'); }}>
              <Text style={styles.rowLabel}>Change password</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
          </View>
          </>
          )}

          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, {borderBottomWidth: 0}]} onPress={toggleDark}>
              <Text style={styles.rowLabel}>Dark mode</Text>
              <View style={[styles.toggle, dark && styles.toggleOn]}><View style={[styles.toggleKnob, dark && styles.toggleKnobOn]} /></View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Privacy & safety</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, {borderBottomWidth: 0}]} onPress={() => setPage('blocked')}>
              <Text style={styles.rowLabel}>Blocked users</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                {blockedUsers.length > 0 && <Text style={styles.rowValue}>{blockedUsers.length}</Text>}
                <Text style={styles.chev}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, {borderBottomWidth: 0}]} onPress={contactUs}>
              <Text style={styles.rowLabel}>Contact us</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Legal</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setPage('guidelines')}>
              <Text style={styles.rowLabel}>Community Guidelines</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setPage('terms')}>
              <Text style={styles.rowLabel}>Terms of Use</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, {borderBottomWidth: 0}]} onPress={() => setPage('privacy')}>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
          </View>

          {!isGuest && (
            <View style={[styles.card, {marginTop: 22}]}>
              <TouchableOpacity style={styles.row} onPress={() => { onClose(); signOut(auth); }}>
                <Text style={[styles.rowLabel, {color: TEXT2}]}>Log out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.row, {borderBottomWidth: 0}]} onPress={deleteAccount}>
                <Text style={[styles.rowLabel, {color: '#C0506E'}]}>Delete account</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.version}>SportsSwap · version 1.1</Text>
        </ScrollView>

        {/* Sub-page: legal text or blocked users */}
        {page && (
          <Modal visible animationType="slide" onRequestClose={() => setPage(null)}>
            <View style={{flex: 1, backgroundColor: BG3}}>
              <View style={styles.topbar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setPage(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
                <Text style={styles.topTitle} numberOfLines={1}>{pageTitle}</Text>
                <View style={{width: 70}} />
              </View>
              <ScrollView contentContainerStyle={{padding: 18, paddingBottom: 50}}>
                {page === 'username' ? (
                  <View style={styles.card}>
                    <Text style={styles.formLabel}>New username</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. sportsfan99"
                      placeholderTextColor={TEXT3}
                      value={newName}
                      onChangeText={t => { setNewName(t); setNameErr(''); setNameOk(''); }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={20}
                    />
                    <Text style={styles.formHint}>
                      {daysLeft > 0
                        ? `You changed your username recently. You can change it again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
                        : `You can change your username once every ${USERNAME_COOLDOWN_DAYS} days, so choose carefully.`}
                    </Text>
                    {!!nameErr && <Text style={styles.formErr}>{nameErr}</Text>}
                    {!!nameOk && <Text style={styles.formOk}>{nameOk}</Text>}
                    <Btn style={[styles.saveBtn, (nameBusy || daysLeft > 0) && {opacity: 0.5}]} onPress={saveUsername} disabled={nameBusy || daysLeft > 0}>
                      {nameBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save username</Text>}
                    </Btn>
                  </View>
                ) : page === 'password' ? (
                  <View style={styles.card}>
                    <Text style={styles.formLabel}>Current password</Text>
                    <PwField value={curPw} onChangeText={(t: string) => { setCurPw(t); setPwErr(''); setPwOk(''); }} placeholder="Your current password" shown={showCur} onToggle={() => setShowCur(s => !s)} styles={styles} colors={c} />
                    <Text style={styles.formLabel}>New password</Text>
                    <PwField value={newPw} onChangeText={(t: string) => { setNewPw(t); setPwErr(''); setPwOk(''); }} placeholder="At least 6 characters" shown={showNew} onToggle={() => setShowNew(s => !s)} styles={styles} colors={c} />
                    <Text style={styles.formLabel}>Confirm new password</Text>
                    <PwField value={confirmPw} onChangeText={(t: string) => { setConfirmPw(t); setPwErr(''); setPwOk(''); }} placeholder="Type it again" shown={showConfirm} onToggle={() => setShowConfirm(s => !s)} styles={styles} colors={c} />
                    {!!pwErr && <Text style={styles.formErr}>{pwErr}</Text>}
                    {!!pwOk && <Text style={styles.formOk}>{pwOk}</Text>}
                    <Btn style={[styles.saveBtn, pwBusy && {opacity: 0.5}]} onPress={savePassword} disabled={pwBusy}>
                      {pwBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update password</Text>}
                    </Btn>
                    <TouchableOpacity onPress={resetPasswordEmail} style={{alignItems: 'center', paddingVertical: 14}}>
                      <Text style={{fontSize: 13, color: GOLD_TEXT, fontWeight: '600'}}>Forgot your current password?</Text>
                    </TouchableOpacity>
                  </View>
                ) : page === 'blocked' ? (
                  blockedUsers.length ? blockedUsers.map((b: any) => (
                    <View key={b.id} style={styles.blockRow}>
                      <Text style={styles.rowLabel}>{b.name}</Text>
                      <Btn style={styles.unblockBtn} onPress={() => onUnblock(b.id)}>
                        <Text style={styles.unblockText}>Unblock</Text>
                      </Btn>
                    </View>
                  )) : <Text style={{color: TEXT2, textAlign: 'center', marginTop: 30}}>You haven't blocked anyone.</Text>
                ) : (
                  <View style={styles.card}>
                    <Text style={styles.legalText}>{pageBody}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

function makeStyles(c: any) {
  const {GOLD, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER} = c;
  return StyleSheet.create({
    topbar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, paddingTop: 50},
    topTitle: {fontSize: 16, fontWeight: '700', color: TEXT},
    backBtn: {backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, width: 70, alignItems: 'center'},
    backText: {fontSize: 13, fontWeight: '600', color: TEXT},
    sectionLabel: {fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: TEXT3, marginBottom: 8, marginTop: 18},
    card: {backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 18, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: {width: 0, height: 3}, elevation: 2},
    row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: BORDER},
    rowLabel: {fontSize: 14, fontWeight: '500', color: TEXT},
    rowValue: {fontSize: 14, color: TEXT2, maxWidth: '60%'},
    chev: {fontSize: 18, color: TEXT3},
    toggle: {width: 42, height: 24, borderRadius: 12, backgroundColor: BG3, justifyContent: 'center', padding: 2},
    toggleOn: {backgroundColor: GOLD},
    toggleKnob: {width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff'},
    toggleKnobOn: {alignSelf: 'flex-end'},
    version: {textAlign: 'center', color: TEXT3, fontSize: 12, marginTop: 24},
    legalText: {fontSize: 14, color: TEXT, lineHeight: 22, paddingVertical: 16},
    blockRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 14, padding: 14, marginBottom: 10},
    unblockBtn: {backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7},
    unblockText: {fontSize: 13, fontWeight: '600', color: TEXT},
    formLabel: {fontSize: 12, color: TEXT2, marginTop: 16, marginBottom: 6},
    formInput: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: TEXT, backgroundColor: BG},
    formHint: {fontSize: 12, color: TEXT3, lineHeight: 17, marginTop: 10},
    formErr: {fontSize: 13, color: '#D4537E', marginTop: 12},
    formOk: {fontSize: 13, color: '#1D9E75', marginTop: 12},
    pwWrap: {flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, backgroundColor: BG},
    pwInput: {flex: 1, paddingVertical: 12, fontSize: 15, color: TEXT},
    saveBtn: {backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 4},
    saveBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},
  });
}
