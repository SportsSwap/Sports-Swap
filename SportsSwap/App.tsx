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
  Alert,
  Image,
  Linking,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, doc, getDoc, deleteDoc, where, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthScreen from './AuthScreen';
import CommunityApp from './CommunityApp';

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
  {id: 'afl', label: 'AFL', emoji: '🏉', bg: '#FAEEDA'},
  {id: 'rugby', label: 'Rugby', emoji: '🏉', bg: '#FAECE7'},
  {id: 'basketball', label: 'Basketball', emoji: '🏀', bg: '#FAEEDA'},
  {id: 'netball', label: 'Netball', emoji: '🏐', bg: '#FCEBEB'},
  {id: 'cricket', label: 'Cricket', emoji: '🏏', bg: '#EAF3DE'},
  {id: 'tennis', label: 'Tennis', emoji: '🎾', bg: '#EAF3DE'},
  {id: 'golf', label: 'Golf', emoji: '⛳', bg: '#EAF3DE'},
  {id: 'swimming', label: 'Swimming', emoji: '🏊', bg: '#E6F1FB'},
  {id: 'surf', label: 'Surfing', emoji: '🏄', bg: '#E6F1FB'},
  {id: 'surflifesaving', label: 'Surf life saving', emoji: '🛟', bg: '#E6F1FB'},
  {id: 'cycling', label: 'Cycling', emoji: '🚴', bg: '#E6F1FB'},
  {id: 'running', label: 'Cross country', emoji: '🏃', bg: '#FAECE7'},
  {id: 'athletics', label: 'Athletics', emoji: '🏅', bg: '#FAECE7'},
  {id: 'fieldhockey', label: 'Field hockey', emoji: '🏑', bg: '#EAF3DE'},
  {id: 'icehockey', label: 'Ice hockey', emoji: '🏒', bg: '#E6F1FB'},
  {id: 'baseball', label: 'Baseball', emoji: '⚾', bg: '#FAEEDA'},
  {id: 'volleyball', label: 'Volleyball', emoji: '🏐', bg: '#FCEBEB'},
  {id: 'skiing', label: 'Snow sports', emoji: '🎿', bg: '#E6F1FB'},
  {id: 'gym', label: 'Gym', emoji: '🏋️', bg: '#EEEDFE'},
  {id: 'fitness', label: 'Fitness gear', emoji: '🏃', bg: '#FCEBEB'},
  {id: 'martial', label: 'Martial arts', emoji: '🥋', bg: '#FCEBEB'},
];

// Listings now come from Firebase in real time — no dummy data

const QUICK_MSGS = ['Is this still available?', "What's your best price?", 'Can I pick up locally?', 'Any more photos?'];

// Google Form where companies apply to advertise
const AD_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeWaKXksc7LeElZjiEdcw9WYRahrYvIUYcHqYgguC7XtE5T-Q/viewform';

const AVATAR_EMOJIS = ['🏆', '⚽', '🏀', '🎾', '🏈', '🏐', '🏉', '⛳', '🏏', '🥊', '🏄', '🚴', '🏊', '⛷️', '🏋️', '😎', '🔥', '⭐', '👟', '🧢'];
const AVATAR_COLORS = ['#EAF3DE', '#FAEEDA', '#E6F1FB', '#FAECE7', '#EEEDFE', '#FCEBEB', '#FBF1D6', '#E0F2F1'];

function condLabel(c: string) {
  if (c === 'new') return {label: 'New', color: '#27500A', bg: '#EAF3DE'};
  if (c === 'like') return {label: 'Like new', color: '#0C447C', bg: '#E6F1FB'};
  return {label: 'Used', color: '#633806', bg: '#FAEEDA'};
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState('community'); // community | market | profile
  const [activeSport, setActiveSport] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxChats, setInboxChats] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [avatarColor, setAvatarColor] = useState(GOLD_LIGHT);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSport, setNewSport] = useState('football');
  const [newLoc, setNewLoc] = useState('');
  const [newCond, setNewCond] = useState('used');
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [myListingsOpen, setMyListingsOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        setEmail(u.email || '');
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUsername(data.username || 'User');
          if (data.avatarEmoji) setAvatarEmoji(data.avatarEmoji);
          if (data.avatarColor) setAvatarColor(data.avatarColor);
          if (Array.isArray(data.savedIds)) setSaved(new Set(data.savedIds));
        }
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

  // Load my conversations for the inbox (real time)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsub = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(d => ({id: d.id, ...d.data()} as any));
      items.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setInboxChats(items);
    });
    return () => unsub();
  }, [user]);

  // Load messages for the currently open chat (real time)
  useEffect(() => {
    if (!activeChat) { setChatMessages([]); return; }
    const q = query(collection(db, 'chats', activeChat.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snapshot => {
      setChatMessages(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [activeChat]);

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
      photo: newPhoto || null,
      createdAt: serverTimestamp(),
    });
    setNewTitle(''); setNewPrice(''); setNewLoc(''); setNewPhoto(null); setPostOpen(false);
  }

  function markAsSold(listing: any) {
    Alert.alert(
      'Mark as sold?',
      `This will remove "${listing.title}" from the marketplace for everyone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Mark as sold',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(doc(db, 'listings', listing.id));
            setSelectedListing(null);
          },
        },
      ],
    );
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

  // Start (or reopen) a real conversation with the seller of a listing
  async function openChat(listing: any) {
    const chatId = `${listing.id}_${user.uid}`;
    await setDoc(doc(db, 'chats', chatId), {
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      listingEmoji: listing.emoji,
      listingBg: listing.bg,
      sellerId: listing.sellerId,
      sellerName: listing.seller,
      buyerId: user.uid,
      buyerName: username,
      participants: [listing.sellerId, user.uid],
      updatedAt: serverTimestamp(),
    }, {merge: true});
    setActiveChat({
      id: chatId,
      title: listing.title,
      price: listing.price,
      otherName: listing.seller,
    });
    setChatOpen(true);
    setSelectedListing(null);
  }

  // Open a conversation from the inbox
  function openChatFromInbox(chat: any) {
    const otherName = chat.sellerId === user.uid ? chat.buyerName : chat.sellerName;
    setActiveChat({id: chat.id, title: chat.listingTitle, price: chat.listingPrice, otherName});
    setChatOpen(true);
    setInboxOpen(false);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !activeChat) return;
    setInputText('');
    await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
      senderId: user.uid,
      senderName: username,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'chats', activeChat.id), {
      lastMessage: text.trim(),
      lastSenderId: user.uid,
      updatedAt: serverTimestamp(),
    });
  }

  // Save the chosen avatar to the user's profile
  async function saveAvatar(emoji: string, color: string) {
    setAvatarEmoji(emoji);
    setAvatarColor(color);
    await setDoc(doc(db, 'users', user.uid), {avatarEmoji: emoji, avatarColor: color}, {merge: true});
  }

  function toggleSave(id: string) {
    setSaved(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      // Persist favourites to the user's account
      setDoc(doc(db, 'users', user.uid), {savedIds: Array.from(next)}, {merge: true});
      return next;
    });
  }

  // Let the user pick a photo for a new listing (from library or camera)
  function pickListingPhoto() {
    Alert.alert('Add a photo', 'Choose where to get your photo from', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Take photo', onPress: () => grabPhoto('camera')},
      {text: 'Choose from library', onPress: () => grabPhoto('library')},
    ]);
  }
  function grabPhoto(mode: 'camera' | 'library') {
    const opts = {mediaType: 'photo' as const, maxWidth: 1000, maxHeight: 1000, quality: 0.6 as const, includeBase64: true};
    const cb = (res: any) => {
      if (res.didCancel || res.errorCode) return;
      const asset = res.assets?.[0];
      if (asset?.base64) setNewPhoto(`data:${asset.type || 'image/jpeg'};base64,${asset.base64}`);
    };
    mode === 'camera' ? launchCamera(opts, cb) : launchImageLibrary(opts, cb);
  }

  // Shared card used by the main grid, My Listings and Saved
  function renderCard(item: any) {
    const cond = condLabel(item.cond);
    const mine = item.sellerId === user.uid;
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedListing(item)}>
        <View style={[styles.cardImg, {backgroundColor: item.bg}]}>
          {item.photo
            ? <Image source={{uri: item.photo}} style={styles.cardImgPhoto} />
            : <Text style={styles.cardEmoji}>{item.emoji}</Text>}
          <View style={[styles.condBadge, {backgroundColor: cond.bg}]}>
            <Text style={[styles.condText, {color: cond.color}]}>{cond.label}</Text>
          </View>
          {!mine && (
            <TouchableOpacity style={styles.heartBtn} onPress={() => toggleSave(item.id)}>
              <Text style={{fontSize: 14}}>{saved.has(item.id) ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardPrice}>${item.price}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardSeller}>{item.seller}</Text>
            <Text style={styles.cardLoc}>📍 {item.loc}</Text>
          </View>
          {mine ? (
            <TouchableOpacity style={styles.msgBtn} onPress={() => setSelectedListing(item)}>
              <Text style={styles.msgBtnText}>Manage listing</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.msgBtn} onPress={() => openChat(item)}>
              <Text style={styles.msgBtnText}>Message seller</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  const myListings = listings.filter(l => l.sellerId === user.uid);
  const savedListings = listings.filter(l => saved.has(l.id));

  return (
    <View style={{flex: 1, backgroundColor: BG3}}>
      {(tab === 'community' || tab === 'profile') ? (
        <CommunityApp
          tab={tab}
          username={username}
          uid={user.uid}
          onInbox={() => setTab('inbox')}
          onMenu={() => setTab('profile')}
        />
      ) : tab === 'inbox' ? (
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}><Text style={styles.logo}>💬 Inbox</Text></View>
          {inboxChats.length === 0 ? (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{fontSize: 34, marginBottom: 10}}>💬</Text>
              <Text style={{fontWeight: '500', color: TEXT, marginBottom: 4}}>No messages yet</Text>
              <Text style={{fontSize: 13, color: TEXT2}}>Message a seller to start chatting</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 90}}>
              {inboxChats.map(chat => {
                const otherName = chat.sellerId === user.uid ? chat.buyerName : chat.sellerName;
                return (
                  <TouchableOpacity key={chat.id} style={styles.convoRow} onPress={() => openChatFromInbox(chat)}>
                    <View style={[styles.convoAvatar, {backgroundColor: chat.listingBg || BG2}]}>
                      <Text style={{fontSize: 20}}>{chat.listingEmoji || '🏆'}</Text>
                    </View>
                    <View style={{flex: 1, minWidth: 0}}>
                      <Text style={styles.convoName} numberOfLines={1}>{otherName}</Text>
                      <Text style={styles.convoItem} numberOfLines={1}>{chat.listingTitle}</Text>
                      <Text style={styles.convoLast} numberOfLines={1}>{chat.lastMessage || 'No messages yet'}</Text>
                    </View>
                    {chat.listingPrice ? <Text style={styles.convoPrice}>${chat.listingPrice}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      ) : (
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
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={[styles.avatarBtn, {backgroundColor: avatarColor}]}>
          <Text style={styles.avatarText}>{avatarEmoji || username.charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Ad Banner — tap to open the advertiser sign-up form */}
      <TouchableOpacity activeOpacity={0.7} style={styles.adBanner} onPress={() => Linking.openURL(AD_FORM_URL)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.adItem}>
              <Text style={styles.adLabel}>AD</Text>
              <Text style={styles.adText}>Your ad here</Text>
            </View>
          ))}
          <View style={styles.adCta}>
            <Text style={styles.adCtaText}>📣 Want to advertise? Tap here to apply →</Text>
          </View>
        </ScrollView>
      </TouchableOpacity>

      {/* Sport tabs */}
      <View style={styles.sportNavWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportNav}>
          {sortedSports.map(s => {
            const count = s.id === 'all' ? listings.length : listings.filter(l => l.sport === s.id).length;
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
        renderItem={({item}) => renderCard(item)}
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
              <Text style={styles.postLabel}>Photo</Text>
              <TouchableOpacity style={styles.photoDrop} onPress={pickListingPhoto}>
                {newPhoto ? (
                  <>
                    <Image source={{uri: newPhoto}} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => setNewPhoto(null)}>
                      <Text style={{color: 'white', fontSize: 14}}>✕</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{alignItems: 'center'}}>
                    <Text style={{fontSize: 28}}>📷</Text>
                    <Text style={{color: TEXT2, fontSize: 13, marginTop: 4}}>Add a photo of your gear</Text>
                  </View>
                )}
              </TouchableOpacity>
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
                {selectedListing?.photo
                  ? <Image source={{uri: selectedListing.photo}} style={styles.detImgPhoto} />
                  : <Text style={styles.detEmoji}>{selectedListing?.emoji}</Text>}
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
              {selectedListing?.sellerId === user.uid ? (
                <TouchableOpacity style={styles.soldBtn} onPress={() => markAsSold(selectedListing)}>
                  <Text style={styles.soldBtnText}>✓ Mark as sold</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.cbtn} onPress={() => openChat(selectedListing)}>
                  <Text style={styles.cbtnText}>💬 Message seller</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Chat modal lives at root level now (renders on every tab) */}

      {/* Dropdown Menu */}
      <Modal visible={menuOpen} animationType="fade" transparent>
        <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <View style={[styles.menuAvatar, {backgroundColor: avatarColor}]}>
                <Text style={styles.menuAvatarText}>{avatarEmoji || username.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.menuName}>{username}</Text>
                <Text style={styles.menuEmail} numberOfLines={1}>{email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setProfileOpen(true);}}>
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setTab('inbox');}}>
              <Text style={styles.menuItemIcon}>💬</Text>
              <Text style={styles.menuItemText}>Inbox</Text>
              {inboxChats.length > 0 && (
                <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{inboxChats.length}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setMyListingsOpen(true);}}>
              <Text style={styles.menuItemIcon}>🏷️</Text>
              <Text style={styles.menuItemText}>My Listings</Text>
              {myListings.length > 0 && (
                <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{myListings.length}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setSavedOpen(true);}}>
              <Text style={styles.menuItemIcon}>❤️</Text>
              <Text style={styles.menuItemText}>Saved</Text>
              {savedListings.length > 0 && (
                <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{savedListings.length}</Text></View>
              )}
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); signOut(auth);}}>
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuItemText, {color: '#D4537E'}]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Page */}
      <Modal visible={profileOpen} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.detModal}>
            <View style={styles.detHeader}>
              <Text style={{fontSize: 17, fontWeight: '600', color: TEXT}}>My Profile</Text>
              <TouchableOpacity onPress={() => setProfileOpen(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={{alignItems: 'center', marginVertical: 16}}>
                <View style={[styles.profileAvatar, {backgroundColor: avatarColor}]}>
                  <Text style={styles.profileAvatarText}>{avatarEmoji || username.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.profileName}>{username}</Text>
                <Text style={styles.profileEmail}>{email}</Text>
              </View>

              <Text style={styles.postLabel}>Choose your profile picture</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 12}}>
                {AVATAR_EMOJIS.map(em => (
                  <TouchableOpacity key={em} onPress={() => saveAvatar(em, avatarColor)}
                    style={[styles.emojiPick, avatarEmoji === em && styles.emojiPickActive]}>
                    <Text style={{fontSize: 22}}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.postLabel}>Background colour</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16}}>
                {AVATAR_COLORS.map(c => (
                  <TouchableOpacity key={c} onPress={() => saveAvatar(avatarEmoji || '🏆', c)}
                    style={[styles.colorPick, {backgroundColor: c}, avatarColor === c && styles.colorPickActive]} />
                ))}
              </View>

              <View style={styles.profileInfoBox}>
                <Text style={styles.profileInfoLabel}>Username</Text>
                <Text style={styles.profileInfoValue}>{username}</Text>
              </View>
              <View style={styles.profileInfoBox}>
                <Text style={styles.profileInfoLabel}>Email</Text>
                <Text style={styles.profileInfoValue}>{email}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Inbox */}
      <Modal visible={inboxOpen} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.detModal, {maxHeight: '85%'}]}>
            <View style={styles.detHeader}>
              <Text style={{fontSize: 17, fontWeight: '600', color: TEXT}}>Inbox</Text>
              <TouchableOpacity onPress={() => setInboxOpen(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            {inboxChats.length === 0 ? (
              <View style={{alignItems: 'center', paddingVertical: 50}}>
                <Text style={{fontSize: 34, marginBottom: 10}}>💬</Text>
                <Text style={{fontWeight: '500', color: TEXT, marginBottom: 4}}>No messages yet</Text>
                <Text style={{fontSize: 13, color: TEXT2}}>Message a seller to start chatting</Text>
              </View>
            ) : (
              <ScrollView>
                {inboxChats.map(chat => {
                  const otherName = chat.sellerId === user.uid ? chat.buyerName : chat.sellerName;
                  return (
                    <TouchableOpacity key={chat.id} style={styles.convoRow} onPress={() => openChatFromInbox(chat)}>
                      <View style={[styles.convoAvatar, {backgroundColor: chat.listingBg || BG2}]}>
                        <Text style={{fontSize: 20}}>{chat.listingEmoji || '🏆'}</Text>
                      </View>
                      <View style={{flex: 1, minWidth: 0}}>
                        <Text style={styles.convoName} numberOfLines={1}>{otherName}</Text>
                        <Text style={styles.convoItem} numberOfLines={1}>{chat.listingTitle}</Text>
                        <Text style={styles.convoLast} numberOfLines={1}>{chat.lastMessage || 'No messages yet'}</Text>
                      </View>
                      {chat.listingPrice ? <Text style={styles.convoPrice}>${chat.listingPrice}</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* My Listings */}
      <Modal visible={myListingsOpen} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.detModal, {maxHeight: '85%'}]}>
            <View style={styles.detHeader}>
              <Text style={{fontSize: 17, fontWeight: '600', color: TEXT}}>My Listings</Text>
              <TouchableOpacity onPress={() => setMyListingsOpen(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            {myListings.length === 0 ? (
              <View style={{alignItems: 'center', paddingVertical: 50}}>
                <Text style={{fontSize: 34, marginBottom: 10}}>🏷️</Text>
                <Text style={{fontWeight: '500', color: TEXT, marginBottom: 4}}>No listings yet</Text>
                <Text style={{fontSize: 13, color: TEXT2}}>Tap + Sell to list your first item</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                {myListings.map(item => (
                  <View key={item.id} style={{width: '48%', marginBottom: 12}}>{renderCard(item)}</View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Saved / Favourites */}
      <Modal visible={savedOpen} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.detModal, {maxHeight: '85%'}]}>
            <View style={styles.detHeader}>
              <Text style={{fontSize: 17, fontWeight: '600', color: TEXT}}>Saved Items</Text>
              <TouchableOpacity onPress={() => setSavedOpen(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            {savedListings.length === 0 ? (
              <View style={{alignItems: 'center', paddingVertical: 50}}>
                <Text style={{fontSize: 34, marginBottom: 10}}>❤️</Text>
                <Text style={{fontWeight: '500', color: TEXT, marginBottom: 4}}>No saved items yet</Text>
                <Text style={{fontSize: 13, color: TEXT2}}>Tap the heart on any listing to save it</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                {savedListings.map(item => (
                  <View key={item.id} style={{width: '48%', marginBottom: 12}}>{renderCard(item)}</View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
      )}

      {/* Chat modal — root level so it opens from any tab */}
      <Modal visible={chatOpen} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.chatModal}>
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => {setChatOpen(false); setActiveChat(null);}}>
                <Text style={styles.backBtn}>←</Text>
              </TouchableOpacity>
              <View style={{flex: 1}}>
                <Text style={styles.chatItemName} numberOfLines={1}>{activeChat?.title}</Text>
                <Text style={styles.chatSeller}>{activeChat?.otherName}</Text>
              </View>
              <Text style={styles.chatPrice}>${activeChat?.price}</Text>
            </View>
            <ScrollView style={styles.chatMessages} contentContainerStyle={{padding: 14}}>
              {chatMessages.length === 0 && (
                <Text style={{textAlign: 'center', color: TEXT3, fontSize: 13, marginTop: 20}}>
                  Say hello 👋 — start the conversation!
                </Text>
              )}
              {chatMessages.map(m => {
                const mine = m.senderId === user.uid;
                return (
                  <View key={m.id} style={[styles.msgRow, mine && styles.msgRowMine]}>
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Text style={mine ? styles.bubbleMineText : styles.bubbleTheirsText}>{m.text}</Text>
                    </View>
                  </View>
                );
              })}
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

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        {[{id: 'community', label: 'Community'}, {id: 'market', label: 'SportsSwap'}, {id: 'inbox', label: 'Inbox'}, {id: 'profile', label: 'Profile'}].map(t => (
          <TouchableOpacity key={t.id} style={styles.bnavBtn} onPress={() => setTab(t.id)}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={[styles.bnavText, tab === t.id && styles.bnavActive]}>{t.label}</Text>
              {t.id === 'inbox' && inboxChats.length > 0 && <View style={styles.navDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG3},
  bottomNav: {flexDirection: 'row', backgroundColor: BG, borderTopWidth: 0.5, borderTopColor: BORDER, paddingBottom: 28, paddingTop: 10},
  bnavBtn: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2},
  bnavText: {fontSize: 13, color: TEXT2, fontWeight: '500'},
  bnavActive: {color: GOLD, fontWeight: '700'},
  navDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: GOLD, marginLeft: 5},
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
  adCta: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 34, backgroundColor: GOLD_LIGHT},
  adCtaText: {fontSize: 12, color: GOLD_TEXT, fontWeight: '600'},
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
  soldBtn: {backgroundColor: '#27500A', borderRadius: 10, paddingVertical: 13, alignItems: 'center'},
  soldBtnText: {color: 'white', fontSize: 15, fontWeight: '600'},
  // Dropdown menu
  menuBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.3)'},
  menuCard: {position: 'absolute', top: 56, right: 12, backgroundColor: BG, borderRadius: 12, paddingVertical: 6, width: 240, borderWidth: 0.5, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: {width: 0, height: 4}, elevation: 6},
  menuHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 0.5, borderBottomColor: BORDER, marginBottom: 4},
  menuAvatar: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: GOLD},
  menuAvatarText: {fontSize: 18, fontWeight: '700', color: GOLD_TEXT},
  menuName: {fontSize: 14, fontWeight: '600', color: TEXT},
  menuEmail: {fontSize: 12, color: TEXT2},
  menuItem: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14},
  menuItemIcon: {fontSize: 17},
  menuItemText: {fontSize: 14, color: TEXT, fontWeight: '500', flex: 1},
  menuBadge: {backgroundColor: GOLD, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, alignItems: 'center'},
  menuBadgeText: {color: 'white', fontSize: 11, fontWeight: '700'},
  menuDivider: {height: 0.5, backgroundColor: BORDER, marginVertical: 4},
  // Profile
  profileAvatar: {width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: GOLD, marginBottom: 12},
  profileAvatarText: {fontSize: 38, fontWeight: '700', color: GOLD_TEXT},
  profileName: {fontSize: 20, fontWeight: '600', color: TEXT},
  profileEmail: {fontSize: 13, color: TEXT2, marginTop: 2},
  emojiPick: {width: 46, height: 46, borderRadius: 23, backgroundColor: BG2, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: 'transparent'},
  emojiPickActive: {borderColor: GOLD, backgroundColor: GOLD_LIGHT},
  colorPick: {width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent'},
  colorPickActive: {borderColor: GOLD},
  profileInfoBox: {backgroundColor: BG2, borderRadius: 10, padding: 12, marginBottom: 10},
  profileInfoLabel: {fontSize: 11, color: TEXT2, marginBottom: 2},
  profileInfoValue: {fontSize: 15, color: TEXT, fontWeight: '500'},
  // Inbox
  convoRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: BORDER},
  convoAvatar: {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
  convoName: {fontSize: 14, fontWeight: '600', color: TEXT},
  convoItem: {fontSize: 12, color: GOLD, marginTop: 1},
  convoLast: {fontSize: 12, color: TEXT2, marginTop: 1},
  convoPrice: {fontSize: 15, fontWeight: '700', color: GOLD},
  // Photos
  cardImgPhoto: {width: '100%', height: '100%', resizeMode: 'cover'},
  detImgPhoto: {width: '100%', height: '100%', borderRadius: 10, resizeMode: 'cover'},
  photoDrop: {height: 150, borderRadius: 10, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', backgroundColor: BG2, alignItems: 'center', justifyContent: 'center', marginBottom: 4, overflow: 'hidden'},
  photoPreview: {width: '100%', height: '100%', resizeMode: 'cover'},
  photoRemove: {position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center'},
});
