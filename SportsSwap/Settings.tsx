import React, {useState, useMemo} from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert, Linking,
} from 'react-native';
import {sendPasswordResetEmail, signOut, deleteUser} from 'firebase/auth';
import {doc, deleteDoc} from 'firebase/firestore';
import {auth, db} from './firebase';
import Btn from './Btn';

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

export default function Settings({colors, username, email, dark, toggleDark, blockedUsers, onUnblock, onClose}: any) {
  const c = colors;
  const {GOLD, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER} = c;
  const styles = useMemo(() => makeStyles(c), [c]);
  const [page, setPage] = useState<string | null>(null); // guidelines | terms | privacy | blocked

  function changePassword() {
    Alert.alert('Change password', `We'll email a password reset link to ${email}.`, [
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

  const pageTitle = page === 'guidelines' ? 'Community Guidelines' : page === 'terms' ? 'Terms of Use' : page === 'privacy' ? 'Privacy Policy' : 'Blocked users';
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

          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Username</Text>
              <Text style={styles.rowValue}>{username}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{email}</Text>
            </View>
            <TouchableOpacity style={[styles.row, {borderBottomWidth: 0}]} onPress={changePassword}>
              <Text style={styles.rowLabel}>Change password</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
          </View>

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

          <View style={[styles.card, {marginTop: 22}]}>
            <TouchableOpacity style={styles.row} onPress={() => { onClose(); signOut(auth); }}>
              <Text style={[styles.rowLabel, {color: TEXT2}]}>Log out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, {borderBottomWidth: 0}]} onPress={deleteAccount}>
              <Text style={[styles.rowLabel, {color: '#C0506E'}]}>Delete account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>SportsSwap · version 1.0</Text>
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
                {page === 'blocked' ? (
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
  });
}
