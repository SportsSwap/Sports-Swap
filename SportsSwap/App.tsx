import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthScreen from './AuthScreen';

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const GOLD = '#C8961E';
const GOLD_LIGHT = '#FBF1D6';
const GOLD_TEXT = '#8A6410';
const BG = '#ffffff';
const BG2 = '#f5f5f4';
const BG3 = '#eeece8';
const TEXT = '#1a1a18';
const TEXT2 = '#6b6b68';
const TEXT3 = '#9b9b97';
const BORDER = 'rgba(0,0,0,0.12)';

const SPORTS = [
  {id: 'all', label: 'All', emoji: '🏆'},
  {id: 'football', label: 'Football', emoji: '⚽', bg: '#EAF3DE'},
  {id: 'basketball', label: 'Basketball', emoji: '🏀', bg: '#FAEEDA'},
  {id: 'tennis', label: 'Tennis', emoji: '🎾', bg: '#EAF3DE'},
  {id: 'cycling', label: 'Cycling', emoji: '🚴', bg: '#E6F1FB'},
  {id: 'swimming', label: 'Swimming', emoji: '🏊', bg: '#E6F1FB'},
  {id: 'running', label: 'Running', emoji: '👟', bg: '#FAECE7'},
  {id: 'gym', label: 'Gym', emoji: '🏋️', bg: '#EEEDFE'},
  {id: 'fitness', label: 'Fitness gear', emoji: '🏃', bg: '#FCEBEB'},
  {id: 'cricket', label: 'Cricket', emoji: '🏏', bg: '#EAF3DE'},
  {id: 'golf', label: 'Golf', emoji: '⛳', bg: '#EAF3DE'},
  {id: 'skiing', label: 'Skiing', emoji: '⛷️', bg: '#E6F1FB'},
  {id: 'surf', label: 'Surfing', emoji: '🏄', bg: '#E6F1FB'},
  {id: 'martial', label: 'Martial arts', emoji: '🥋', bg: '#FCEBEB'},
];

// Listings now come from Firebase in real time — no dummy data

const QUICK_MSGS = ['Is this still available?', "What's your best price?", 'Can I pick up locally?', 'Any more photos?'];

function condLabel(c: string) {
  if (c === 'new') return {label: 'New', color: '#27500A', bg: '#EAF3DE'};
  if (c === 'like') return {label: 'Like new', color: '#0C447C', bg: '#E6F1FB'};
  return {label: 'Used', color: '#633806', bg: '#FAEEDA'};
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSport, setActiveSport] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatListing, setChatListing] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSport, setNewSport] = useState('football');
  const [newLoc, setNewLoc] = useState('');
  const [newCond, setNewCond] = useState('used');

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) setUsername(snap.data().username || 'User');
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Load listings from Firebase in real time (only once logged in)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      setListings(items);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eeece8'}}>
        <Text style={{fontSize: 40, marginBottom: 12}}>🏆</Text>
        <ActivityIndicator size="large" color="#C8961E" />
      </View>
    );
  }

  // Show auth screen if not logged in
  if (!user) return <AuthScreen />;

  async function postListing() {
    if (!newTitle || !newPrice) return;
    const sport = SPORTS.find(s => s.id === newSport);
    await addDoc(collection(db, 'listings'), {
      title: newTitle,
      price: parseFloat(newPrice),
      sport: newSport,
      cond: newCond,
      loc: newLoc || 'Unknown',
      seller: username,
      sellerId: user.uid,
      bg: sport?.bg || '#EAF3DE',
      emoji: sport?.emoji || '🏆',
      createdAt: serverTimestamp(),
    });
    setNewTitle(''); setNewPrice(''); setNewLoc(''); setPostOpen(false);
  }

  const sortedSports = [
    SPORTS[0],
    ...[...SPORTS.slice(1)].sort((a, b) => {
      const ca = listings.filter(l => l.sport === a.id).length;
      const cb = listings.filter(l => l.sport === b.id).length;
      return cb - ca;
    }),
  ];

  const filtered = listings.filter(l => {
    if (activeSport !== 'all' && l.sport !== activeSport) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function openChat(listing: any) {
    setChatListing(listing);
    setMessages([{from: 'seller', text: `Hi! Thanks for your interest in the ${listing.title}. Feel free to ask any questions!`}]);
    setChatOpen(true);
    setSelectedListing(null);
  }

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const newMsgs = [...messages, {from: 'me', text}];
    setMessages(newMsgs);
    setInputText('');
    setTimeout(() => {
      setMessages(prev => [...prev, {from: 'seller', text: "Thanks for your message! I'll get back to you shortly."}]);
    }, 1200);
  }

  function toggleSave(id: number) {
    setSaved(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🏆 SportsSwap</Text>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search gear..."
            placeholderTextColor={TEXT3}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.sellBtn} onPress={() => setPostOpen(true)}>
          <Text style={styles.sellBtnText}>+ Sell</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => signOut(auth)} style={styles.avatarBtn}>
          <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Ad Banner */}
      <View style={styles.adBanner}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.adItem}>
              <Text style={styles.adLabel}>AD</Text>
              <Text style={styles.adText}>Your ad here — contact us to advertise</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Sport tabs */}
      <View style={styles.sportNavWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportNav}>
          {sortedSports.map(s => {
            const count = s.id === 'all' ? LISTINGS.length : LISTINGS.filter(l => l.sport === s.id).length;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.sportTab, activeSport === s.id && styles.sportTabActive]}
                onPress={() => setActiveSport(s.id)}>
                <Text style={styles.sportTabEmoji}>{s.emoji}</Text>
                <Text style={[styles.sportTabLabel, activeSport === s.id && styles.sportTabLabelActive]}>{s.label}</Text>
                {count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Loading */}
      {loading && (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={{color: TEXT2, marginTop: 10}}>Loading listings...</Text>
        </View>
      )}

      {/* Listings grid */}
      {!loading && <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No listings found</Text>
          </View>
        }
        renderItem={({item}) => {
          const cond = condLabel(item.cond);
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedListing(item)}>
              <View style={[styles.cardImg, {backgroundColor: item.bg}]}>
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <View style={[styles.condBadge, {backgroundColor: cond.bg}]}>
                  <Text style={[styles.condText, {color: cond.color}]}>{cond.label}</Text>
                </View>
                <TouchableOpacity style={styles.heartBtn} onPress={() => toggleSave(item.id)}>
                  <Text style={{fontSize: 14}}>{saved.has(item.id) ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardPrice}>${item.price}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardSeller}>{item.seller}</Text>
                  <Text style={styles.cardLoc}>📍 {item.loc}</Text>
                </View>
                <TouchableOpacity style={styles.msgBtn} onPress={() => openChat(item)}>
                  <Text style={styles.msgBtnText}>Message seller</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      }

      {/* Post Listing Modal */}
      <Modal visible={postOpen} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.detModal}>
            <View style={styles.detHeader}>
              <Text style={{fontSize: 17, fontWeight: '600', color: TEXT}}>List your gear</Text>
              <TouchableOpacity onPress={() => setPostOpen(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.postLabel}>Item name</Text>
              <TextInput style={styles.postInput} placeholder="e.g. Adidas football boots" placeholderTextColor={TEXT3} value={newTitle} onChangeText={setNewTitle} />
              <Text style={styles.postLabel}>Price ($)</Text>
              <TextInput style={styles.postInput} placeholder="0" placeholderTextColor={TEXT3} keyboardType="numeric" value={newPrice} onChangeText={setNewPrice} />
              <Text style={styles.postLabel}>Sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
                {SPORTS.slice(1).map(s => (
                  <TouchableOpacity key={s.id} onPress={() => setNewSport(s.id)}
                    style={[styles.sportPill, newSport === s.id && styles.sportPillActive]}>
                    <Text style={[styles.sportPillText, newSport === s.id && styles.sportPillTextActive]}>{s.emoji} {s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.postLabel}>Condition</Text>
              <View style={{flexDirection: 'row', gap: 8, marginBottom: 10}}>
                {['new', 'like', 'used'].map(c => (
                  <TouchableOpacity key={c} onPress={() => setNewCond(c)}
                    style={[styles.sportPill, newCond === c && styles.sportPillActive]}>
                    <Text style={[styles.sportPillText, newCond === c && styles.sportPillTextActive]}>{c === 'like' ? 'Like new' : c.charAt(0).toUpperCase() + c.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.postLabel}>Location</Text>
              <TextInput style={styles.postInput} placeholder="City" placeholderTextColor={TEXT3} value={newLoc} onChangeText={setNewLoc} />
              <TouchableOpacity style={[styles.cbtn, {marginTop: 16}]} onPress={postListing}>
                <Text style={styles.cbtnText}>Post listing</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedListing} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.detModal}>
            <ScrollView>
              <View style={styles.detHeader}>
                <Text style={styles.detPrice}>${selectedListing?.price}</Text>
                <TouchableOpacity onPress={() => setSelectedListing(null)}>
                  <Text style={styles.closeX}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.detImg, {backgroundColor: selectedListing?.bg}]}>
                <Text style={styles.detEmoji}>{selectedListing?.emoji}</Text>
              </View>
              <Text style={styles.detTitle}>{selectedListing?.title}</Text>
              <View style={styles.detTags}>
                <View style={[styles.tag, {backgroundColor: BG2}]}>
                  <Text style={styles.tagText}>📍 {selectedListing?.loc}</Text>
                </View>
              </View>
              <View style={styles.detSeller}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerAvatarText}>{selectedListing?.seller}</Text>
                </View>
                <View>
                  <Text style={styles.sellerName}>{selectedListing?.seller}</Text>
                  <Text style={styles.sellerRating}>4.8 ★ · Active seller</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.cbtn} onPress={() => openChat(selectedListing)}>
                <Text style={styles.cbtnText}>💬 Message seller</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal visible={chatOpen} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.chatModal}>
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => setChatOpen(false)}>
                <Text style={styles.backBtn}>←</Text>
              </TouchableOpacity>
              <View style={{flex: 1}}>
                <Text style={styles.chatItemName} numberOfLines={1}>{chatListing?.title}</Text>
                <Text style={styles.chatSeller}>Seller: {chatListing?.seller}</Text>
              </View>
              <Text style={styles.chatPrice}>${chatListing?.price}</Text>
            </View>
            <ScrollView style={styles.chatMessages} contentContainerStyle={{padding: 14}}>
              {messages.map((m, i) => (
                <View key={i} style={[styles.msgRow, m.from === 'me' && styles.msgRowMine]}>
                  <View style={[styles.bubble, m.from === 'me' ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={m.from === 'me' ? styles.bubbleMineText : styles.bubbleTheirsText}>{m.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickMsgs}>
              {QUICK_MSGS.map(q => (
                <TouchableOpacity key={q} style={styles.qm} onPress={() => sendMessage(q)}>
                  <Text style={styles.qmText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message…"
                placeholderTextColor={TEXT3}
                value={inputText}
                onChangeText={setInputText}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(inputText)}>
                <Text style={styles.sendBtnText}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG3},
  header: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: BG, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: BORDER},
  logo: {fontSize: 18, fontWeight: '700', color: GOLD},
  searchWrap: {flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, gap: 6, borderWidth: 0.5, borderColor: BORDER},
  searchIcon: {fontSize: 14},
  searchInput: {flex: 1, fontSize: 14, color: TEXT},
  sellBtn: {backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8},
  sellBtnText: {color: 'white', fontSize: 13, fontWeight: '700'},
  adBanner: {backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER, height: 34},
  adItem: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 34, borderRightWidth: 0.5, borderRightColor: BORDER},
  adLabel: {fontSize: 9, fontWeight: '700', color: GOLD, backgroundColor: GOLD_LIGHT, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1},
  adText: {fontSize: 12, color: TEXT2},
  sportNavWrap: {backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER},
  sportNav: {paddingHorizontal: 8},
  sportTab: {paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderBottomWidth: 2, borderBottomColor: 'transparent'},
  sportTabActive: {borderBottomColor: GOLD},
  sportTabEmoji: {fontSize: 14},
  sportTabLabel: {fontSize: 13, color: TEXT2},
  sportTabLabelActive: {color: GOLD, fontWeight: '500'},
  countBadge: {backgroundColor: GOLD_LIGHT, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1},
  countBadgeText: {fontSize: 10, color: GOLD_TEXT},
  grid: {padding: 14},
  row: {gap: 14, marginBottom: 14},
  card: {width: CARD_WIDTH, backgroundColor: BG, borderRadius: 12, borderWidth: 0.5, borderColor: BORDER, overflow: 'hidden'},
  cardImg: {width: '100%', aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center'},
  cardEmoji: {fontSize: 42},
  condBadge: {position: 'absolute', top: 8, left: 8, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2},
  condText: {fontSize: 10, fontWeight: '500'},
  heartBtn: {position: 'absolute', top: 6, right: 6},
  cardBody: {padding: 10},
  cardTitle: {fontSize: 13, fontWeight: '500', color: TEXT, marginBottom: 4},
  cardPrice: {fontSize: 18, fontWeight: '700', color: GOLD, marginBottom: 6},
  cardFooter: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8},
  cardSeller: {fontSize: 11, color: TEXT2},
  cardLoc: {fontSize: 11, color: TEXT2},
  msgBtn: {backgroundColor: GOLD_LIGHT, borderRadius: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 0.5, borderColor: '#E3B948'},
  msgBtnText: {fontSize: 13, color: GOLD_TEXT, fontWeight: '500'},
  empty: {alignItems: 'center', paddingTop: 60},
  emptyText: {color: TEXT2, fontSize: 15},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  detModal: {backgroundColor: BG, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%'},
  detHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14},
  detPrice: {fontSize: 28, fontWeight: '700', color: GOLD},
  closeX: {fontSize: 22, color: TEXT2},
  detImg: {width: '100%', aspectRatio: 3 / 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  detEmoji: {fontSize: 80},
  detTitle: {fontSize: 18, fontWeight: '500', color: TEXT, marginBottom: 10},
  detTags: {flexDirection: 'row', gap: 8, marginBottom: 14},
  tag: {borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4},
  tagText: {fontSize: 12, color: TEXT2},
  detSeller: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: BG2, borderRadius: 10, padding: 12, marginBottom: 14},
  sellerAvatar: {width: 36, height: 36, borderRadius: 18, backgroundColor: '#EAF3DE', alignItems: 'center', justifyContent: 'center'},
  sellerAvatarText: {fontSize: 12, fontWeight: '600', color: '#27500A'},
  sellerName: {fontSize: 14, fontWeight: '500', color: TEXT},
  sellerRating: {fontSize: 12, color: TEXT2},
  cbtn: {backgroundColor: GOLD, borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  cbtnText: {color: 'white', fontSize: 15, fontWeight: '600'},
  chatModal: {backgroundColor: BG, borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '85%', flexDirection: 'column'},
  chatHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 0.5, borderBottomColor: BORDER},
  backBtn: {fontSize: 22, color: TEXT2, marginRight: 4},
  chatItemName: {fontSize: 13, fontWeight: '500', color: TEXT},
  chatSeller: {fontSize: 12, color: TEXT2},
  chatPrice: {fontSize: 15, fontWeight: '700', color: GOLD},
  chatMessages: {flex: 1},
  msgRow: {flexDirection: 'row', marginBottom: 8},
  msgRowMine: {justifyContent: 'flex-end'},
  bubble: {maxWidth: '75%', padding: 10, borderRadius: 12},
  bubbleTheirs: {backgroundColor: BG2, borderBottomLeftRadius: 2},
  bubbleMine: {backgroundColor: GOLD_LIGHT, borderBottomRightRadius: 2},
  bubbleTheirsText: {fontSize: 13, color: TEXT},
  bubbleMineText: {fontSize: 13, color: GOLD_TEXT},
  quickMsgs: {maxHeight: 40, paddingHorizontal: 14, marginBottom: 8},
  qm: {backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 0.5, borderColor: BORDER},
  qmText: {fontSize: 12, color: TEXT2},
  chatInputRow: {flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 0.5, borderTopColor: BORDER, alignItems: 'center'},
  chatInput: {flex: 1, backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: TEXT},
  sendBtn: {width: 36, height: 36, borderRadius: 18, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center'},
  sendBtnText: {color: 'white', fontSize: 16},
  postLabel: {fontSize: 12, color: TEXT2, marginBottom: 4, marginTop: 12},
  postInput: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, padding: 10, fontSize: 14, color: TEXT, backgroundColor: BG},
  sportPill: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: BORDER, backgroundColor: BG2, marginRight: 8},
  sportPillActive: {backgroundColor: GOLD_LIGHT, borderColor: GOLD},
  sportPillText: {fontSize: 12, color: TEXT2},
  sportPillTextActive: {color: GOLD_TEXT, fontWeight: '500'},
  avatarBtn: {width: 32, height: 32, borderRadius: 16, backgroundColor: GOLD_LIGHT, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: GOLD},
  avatarText: {fontSize: 13, fontWeight: '700', color: GOLD_TEXT},
});
