import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {lightColors, darkColors} from './theme';
import Logo from './Logo';
import Btn from './Btn';
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
  RefreshControl,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, doc, getDoc, deleteDoc, where, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthScreen from './AuthScreen';
import CommunityApp from './CommunityApp';
import {Toast, ConfirmModal} from './Feedback';
import Settings from './Settings';

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Colours now come from the theme (light/dark) inside the component.

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
  {id: 'badminton', label: 'Badminton', emoji: '🏸', bg: '#EAF3DE'},
  {id: 'boxing', label: 'Boxing', emoji: '🥊', bg: '#FAECE7'},
  {id: 'climbing', label: 'Rock climbing', emoji: '🧗', bg: '#FAEEDA'},
  {id: 'dance', label: 'Dance', emoji: '🩰', bg: '#FCEBEB'},
  {id: 'diving', label: 'Diving', emoji: '🤿', bg: '#E6F1FB'},
  {id: 'equestrian', label: 'Horse riding', emoji: '🏇', bg: '#FAEEDA'},
  {id: 'lacrosse', label: 'Lacrosse', emoji: '🥍', bg: '#EAF3DE'},
  {id: 'rowing', label: 'Rowing', emoji: '🚣', bg: '#E6F1FB'},
  {id: 'sailing', label: 'Sailing', emoji: '⛵', bg: '#E6F1FB'},
  {id: 'skateboarding', label: 'Skateboarding', emoji: '🛹', bg: '#FAECE7'},
  {id: 'softball', label: 'Softball', emoji: '🥎', bg: '#FAEEDA'},
  {id: 'squash', label: 'Squash', emoji: '🎾', bg: '#EAF3DE'},
  {id: 'tabletennis', label: 'Table tennis', emoji: '🏓', bg: '#EAF3DE'},
  {id: 'triathlon', label: 'Triathlon', emoji: '🏊', bg: '#FAECE7'},
  {id: 'waterpolo', label: 'Water polo', emoji: '🤽', bg: '#E6F1FB'},
  {id: 'wrestling', label: 'Wrestling', emoji: '🤼', bg: '#FCEBEB'},
];
// Alphabetical by label (excludes 'All') — used for the listing sport dropdown
const SPORTS_ABC = SPORTS.slice(1).sort((a, b) => a.label.localeCompare(b.label));

// Listings now come from Firebase in real time — no dummy data

const QUICK_MSGS = ['Is this still available?', "What's your best price?", 'Can I pick up locally?', 'Any more photos?'];

// Google Form where companies apply to advertise
const AD_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeWaKXksc7LeElZjiEdcw9WYRahrYvIUYcHqYgguC7XtE5T-Q/viewform';

const AVATAR_EMOJIS = ['🏆', '⚽', '🏀', '🎾', '🏈', '🏐', '🏉', '⛳', '🏏', '🥊', '🏄', '🚴', '🏊', '⛷️', '🏋️', '😎', '🔥', '⭐', '👟', '🧢'];
const AVATAR_COLORS = ['#EAF3DE', '#FAEEDA', '#E6F1FB', '#FAECE7', '#EEEDFE', '#FCEBEB', '#FBF1D6', '#E0F2F1'];

function notifAgo(ts: any) {
  if (!ts || !ts.seconds) return 'just now';
  const secs = Math.floor(Date.now() / 1000) - ts.seconds;
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days <= 7) return days + 'd ago';
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}

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
  const [dark, setDark] = useState(false);
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
  const [avatarColor, setAvatarColor] = useState('#FBF1D6');
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSport, setNewSport] = useState('football');
  const [newLoc, setNewLoc] = useState('');
  const [newCond, setNewCond] = useState('used');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [inboxView, setInboxView] = useState<'messages' | 'activity'>('messages');
  const [photoPage, setPhotoPage] = useState(0);
  const [myListingsOpen, setMyListingsOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any>({}); // {uid: name}
  const [ratings, setRatings] = useState<any[]>([]);
  const [rateTarget, setRateTarget] = useState<any>(null); // {id, name} of seller being rated
  const [rateStars, setRateStars] = useState(0);
  const [rateText, setRateText] = useState('');
  const [usersMap, setUsersMap] = useState<any>({}); // {uid: {avatarEmoji, avatarColor, username}}
  const [sportDropOpen, setSportDropOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<any>(null);

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
          setDark(!!data.darkMode);
          if (data.blockedUsers) setBlockedUsers(data.blockedUsers);
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

  // Load my activity notifications (real time)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifs'), where('toId', '==', user.uid));
    const unsub = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(d => ({id: d.id, ...d.data()} as any));
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifs(items);
    });
    return () => unsub();
  }, [user]);

  // Load seller ratings (real time)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'ratings'), snapshot => {
      setRatings(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [user]);

  // Load all users (for profile pics in the inbox)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users'), snapshot => {
      const m: any = {};
      snapshot.docs.forEach(d => { m[d.id] = d.data(); });
      setUsersMap(m);
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

  // Theme (light/dark)
  const colors = dark ? darkColors : lightColors;
  const {GOLD, GOLD_LIGHT, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER} = colors;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  function toggleDark() {
    const nv = !dark; setDark(nv);
    if (user) setDoc(doc(db, 'users', user.uid), {darkMode: nv}, {merge: true});
  }

  // Block / unblock — blocked people's posts, listings and chats are hidden for you
  function blockUser(id: string, name: string) {
    if (!user || id === user.uid) return;
    const next = {...blockedUsers, [id]: name};
    setBlockedUsers(next);
    setDoc(doc(db, 'users', user.uid), {blockedUsers: next}, {merge: true});
  }
  function unblockUser(id: string) {
    const next = {...blockedUsers};
    delete next[id];
    setBlockedUsers(next);
    if (user) setDoc(doc(db, 'users', user.uid), {blockedUsers: next}, {merge: true});
  }
  const isBlocked = (id: string) => !!blockedUsers[id];

  // Seller ratings — real average from the 'ratings' collection
  function sellerStats(sellerId: string) {
    const rs = ratings.filter(r => r.sellerId === sellerId);
    if (!rs.length) return null;
    const avg = rs.reduce((sum, r) => sum + (r.stars || 0), 0) / rs.length;
    return {avg: Math.round(avg * 10) / 10, count: rs.length};
  }
  const myRatingOf = (sellerId: string) => ratings.find(r => r.sellerId === sellerId && r.raterId === user?.uid);

  function openRate(sellerId: string, sellerName: string) {
    const existing = myRatingOf(sellerId);
    setRateStars(existing?.stars || 0);
    setRateText(existing?.text || '');
    setRateTarget({id: sellerId, name: sellerName});
  }
  async function submitRating() {
    if (!rateTarget || rateStars < 1) {
      Alert.alert('Pick a rating', 'Tap a star to choose your rating.');
      return;
    }
    await setDoc(doc(db, 'ratings', `${rateTarget.id}_${user.uid}`), {
      sellerId: rateTarget.id, sellerName: rateTarget.name,
      raterId: user.uid, raterName: username,
      stars: rateStars, text: rateText.trim(),
      createdAt: serverTimestamp(),
    });
    // Let the seller know
    await addDoc(collection(db, 'notifs'), {
      toId: rateTarget.id, kind: 'rating', read: false,
      text: `${username} rated you ${rateStars} star${rateStars === 1 ? '' : 's'}${rateText.trim() ? `: "${rateText.trim().slice(0, 60)}"` : ''}`,
      createdAt: serverTimestamp(),
    });
    setRateTarget(null);
    Alert.alert('Thanks!', 'Your rating helps other buyers.');
  }

  // Report content — saved to a 'reports' collection for review
  function reportContent(info: any) {
    Alert.alert('Report', 'Why are you reporting this?', [
      {text: 'Cancel', style: 'cancel'},
      ...['Spam or scam', 'Harassment or bullying', 'Inappropriate content', 'Other'].map(reason => ({
        text: reason,
        onPress: async () => {
          await addDoc(collection(db, 'reports'), {
            ...info, reason, reporterId: user.uid, reporterName: username, createdAt: serverTimestamp(),
          });
          Alert.alert('Report sent', "Thanks — we'll review this within 24 hours.");
        },
      })),
    ]);
  }

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.BG3}}>
        <Text style={{fontSize: 40, marginBottom: 12}}>🏆</Text>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  // Show auth screen if not logged in
  if (!user) return <AuthScreen colors={colors} />;

  async function postListing() {
    if (!newTitle || !newPrice) return;
    const sport = SPORTS.find(s => s.id === newSport);
    const data = {
      title: newTitle,
      price: parseFloat(newPrice),
      sport: newSport,
      cond: newCond,
      loc: newLoc || 'Unknown',
      seller: username,
      sellerId: user.uid,
      bg: sport?.bg || '#EAF3DE',
      emoji: sport?.emoji || '🏆',
      photo: newPhotos[0] || null,
      photos: newPhotos,
    };
    if (editingId) {
      await updateDoc(doc(db, 'listings', editingId), data);
    } else {
      await addDoc(collection(db, 'listings'), {...data, createdAt: serverTimestamp()});
    }
    const wasEdit = !!editingId;
    setNewTitle(''); setNewPrice(''); setNewLoc(''); setNewPhotos([]); setEditingId(null); setPostOpen(false); setSportDropOpen(false);
    setToast(wasEdit ? 'Changes saved' : 'Listing posted');
  }

  // Open the post form pre-filled to edit an existing listing
  function startEdit(item: any) {
    setNewTitle(item.title);
    setNewPrice(String(item.price));
    setNewSport(item.sport);
    setNewCond(item.cond);
    setNewLoc(item.loc === 'Unknown' ? '' : item.loc);
    setNewPhotos(item.photos || (item.photo ? [item.photo] : []));
    setEditingId(item.id);
    setSelectedListing(null);
    setPostOpen(true);
  }

  function markAsSold(listing: any) {
    setConfirm({
      title: 'Mark as sold?',
      message: `This will remove "${listing.title}" from the marketplace for everyone.`,
      confirmText: 'Mark as sold',
      destructive: true,
      onConfirm: async () => {
        await deleteDoc(doc(db, 'listings', listing.id));
        setSelectedListing(null);
        setToast('Listing removed');
      },
    });
  }

  const sortedSports = [
    SPORTS[0],
    ...[...SPORTS.slice(1)].sort((a, b) => {
      const ca = listings.filter(l => l.sport === a.id).length;
      const cb = listings.filter(l => l.sport === b.id).length;
      return cb - ca;
    }),
  ];

  // Hide conversations with people you've blocked
  const visibleChats = inboxChats.filter(ch => !(ch.participants || []).some((p: string) => p !== user.uid && isBlocked(p)));

  // Unread: last message from someone else, newer than when I last opened the chat
  const isUnread = (ch: any) =>
    ch.lastSenderId && ch.lastSenderId !== user.uid &&
    (ch.updatedAt?.seconds || 0) > (ch.reads?.[user.uid]?.seconds || 0);
  const unreadMsgs = visibleChats.filter(isUnread).length;
  const unreadNotifs = notifs.filter(n => !n.read).length;
  const unreadTotal = unreadMsgs + unreadNotifs;

  // Mark a chat as read when you open it
  const markChatRead = (chatId: string) =>
    setDoc(doc(db, 'chats', chatId), {reads: {[user.uid]: serverTimestamp()}}, {merge: true});

  // Mark all activity notifications as read (when the Activity tab is viewed)
  function markNotifsRead() {
    notifs.filter(n => !n.read).forEach(n => updateDoc(doc(db, 'notifs', n.id), {read: true}));
  }

  const filtered = listings.filter(l => {
    if (isBlocked(l.sellerId)) return false;
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
      otherId: listing.sellerId,
    });
    setChatOpen(true);
    setSelectedListing(null);
    markChatRead(chatId);
  }

  // Open a conversation from the inbox
  function openChatFromInbox(chat: any) {
    const otherName = chat.sellerId === user.uid ? chat.buyerName : chat.sellerName;
    const otherId = chat.sellerId === user.uid ? chat.buyerId : chat.sellerId;
    setActiveChat({id: chat.id, title: chat.listingTitle, price: chat.listingPrice, otherName, otherId});
    setChatOpen(true);
    setInboxOpen(false);
    markChatRead(chat.id);
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
    const remaining = 4 - newPhotos.length;
    if (remaining <= 0) { Alert.alert('Photo limit', 'You can add up to 4 photos per listing.'); return; }
    const opts = {mediaType: 'photo' as const, maxWidth: 1000, maxHeight: 1000, quality: 0.6 as const, includeBase64: true};
    const cb = (res: any) => {
      if (res.didCancel || res.errorCode) return;
      const added = (res.assets || [])
        .filter((a: any) => a?.base64)
        .map((a: any) => `data:${a.type || 'image/jpeg'};base64,${a.base64}`);
      if (added.length) setNewPhotos(prev => [...prev, ...added].slice(0, 4));
    };
    mode === 'camera' ? launchCamera(opts, cb) : launchImageLibrary({...opts, selectionLimit: remaining}, cb);
  }

  // Shared card used by the main grid, My Listings and Saved
  function renderCard(item: any) {
    const cond = condLabel(item.cond);
    const mine = item.sellerId === user.uid;
    const st = sellerStats(item.sellerId);
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
            <Text style={styles.cardSeller} numberOfLines={1}>{item.seller}{st ? ` · ${st.avg}★` : ''}</Text>
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
          onMenu={() => setMenuOpen(true)}
          colors={colors}
          blocked={blockedUsers}
          onBlock={blockUser}
          onReport={reportContent}
        />
      ) : tab === 'inbox' ? (
        <SafeAreaView style={styles.safe}>
          <View style={[styles.header, {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}]}>
            <Logo colors={colors} />
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={[styles.avatarBtn, {backgroundColor: avatarColor}]}><Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text></TouchableOpacity>
          </View>

          {/* Messages | Activity switcher */}
          <View style={styles.segmentRow}>
            <TouchableOpacity style={[styles.segment, inboxView === 'messages' && styles.segmentActive]} onPress={() => setInboxView('messages')}>
              <Text style={[styles.segmentText, inboxView === 'messages' && styles.segmentTextActive]}>Messages{unreadMsgs > 0 ? ` (${unreadMsgs})` : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segment, inboxView === 'activity' && styles.segmentActive]} onPress={() => { setInboxView('activity'); markNotifsRead(); }}>
              <Text style={[styles.segmentText, inboxView === 'activity' && styles.segmentTextActive]}>Activity{unreadNotifs > 0 ? ` (${unreadNotifs})` : ''}</Text>
            </TouchableOpacity>
          </View>

          {inboxView === 'activity' ? (
            notifs.length === 0 ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{fontWeight: '500', color: TEXT, marginBottom: 4}}>No activity yet</Text>
                <Text style={{fontSize: 13, color: TEXT2}}>Comments, ratings and follows show up here</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 90}}>
                {notifs.map(n => (
                  <View key={n.id} style={[styles.notifRow, !n.read && styles.notifUnread]}>
                    <View style={[styles.notifDot, {backgroundColor: n.read ? 'transparent' : GOLD}]} />
                    <View style={{flex: 1}}>
                      <Text style={styles.notifText}>{n.text}</Text>
                      <Text style={styles.notifTime}>{notifAgo(n.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
          ) : visibleChats.length === 0 ? (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{fontSize: 34, marginBottom: 10}}>💬</Text>
              <Text style={{fontWeight: '500', color: TEXT, marginBottom: 4}}>No messages yet</Text>
              <Text style={{fontSize: 13, color: TEXT2}}>Message a seller to start chatting</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 90}}>
              {visibleChats.map(chat => {
                const otherName = chat.sellerId === user.uid ? chat.buyerName : chat.sellerName;
                const otherId = chat.sellerId === user.uid ? chat.buyerId : chat.sellerId;
                const otherU = usersMap[otherId] || {};
                const unread = isUnread(chat);
                return (
                  <TouchableOpacity key={chat.id} style={styles.convoRow} onPress={() => openChatFromInbox(chat)}>
                    <View style={[styles.convoAvatar, {backgroundColor: otherU.avatarColor || '#FBF1D6'}]}>
                      <Text style={{fontSize: 20}}>{otherU.avatarEmoji || (otherName ? otherName.charAt(0).toUpperCase() : '🏆')}</Text>
                    </View>
                    <View style={{flex: 1, minWidth: 0}}>
                      <Text style={[styles.convoName, unread && {fontWeight: '800'}]} numberOfLines={1}>{otherName}</Text>
                      <Text style={styles.convoItem} numberOfLines={1}>{chat.listingTitle}</Text>
                      <Text style={[styles.convoLast, unread && {color: TEXT, fontWeight: '600'}]} numberOfLines={1}>{chat.lastMessage || 'No messages yet'}</Text>
                    </View>
                    {unread && <View style={styles.unreadDot} />}
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
        <Logo colors={colors} />
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
        <Btn style={styles.sellBtn} onPress={() => setPostOpen(true)}>
          <Text style={styles.sellBtnText}>+ Sell</Text>
        </Btn>
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
                <View style={[styles.sportTabDot, {backgroundColor: s.bg || GOLD}]} />
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
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={GOLD} onRefresh={() => {
            // Data is already live via Firebase — give quick visual feedback
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 600);
          }} />
        }
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
              <Text style={{fontSize: 17, fontWeight: '600', color: TEXT}}>{editingId ? 'Edit listing' : 'List your gear'}</Text>
              <TouchableOpacity onPress={() => { setPostOpen(false); setEditingId(null); setSportDropOpen(false); }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.postLabel}>Photos ({newPhotos.length}/4)</Text>
              {newPhotos.length === 0 ? (
                <TouchableOpacity style={styles.photoDrop} onPress={pickListingPhoto}>
                  <View style={{alignItems: 'center'}}>
                    <Text style={{fontSize: 28}}>📷</Text>
                    <Text style={{color: TEXT2, fontSize: 13, marginTop: 4}}>Add up to 4 photos of your gear</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 4}}>
                  {newPhotos.map((ph, i) => (
                    <View key={i} style={styles.photoThumbWrap}>
                      <Image source={{uri: ph}} style={styles.photoThumb} />
                      <TouchableOpacity style={styles.photoRemove} onPress={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}>
                        <Text style={{color: 'white', fontSize: 12}}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {newPhotos.length < 4 && (
                    <TouchableOpacity style={styles.photoAddTile} onPress={pickListingPhoto}>
                      <Text style={{fontSize: 22, color: GOLD}}>＋</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
              <Text style={styles.postLabel}>Item name</Text>
              <TextInput style={styles.postInput} placeholder="e.g. Adidas football boots" placeholderTextColor={TEXT3} value={newTitle} onChangeText={setNewTitle} />
              <Text style={styles.postLabel}>Price ($)</Text>
              <TextInput style={styles.postInput} placeholder="0" placeholderTextColor={TEXT3} keyboardType="numeric" value={newPrice} onChangeText={setNewPrice} />
              <Text style={styles.postLabel}>Sport</Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setSportDropOpen(o => !o)}>
                <Text style={styles.dropdownBtnText}>{SPORTS.find(s => s.id === newSport)?.label || 'Choose a sport'}</Text>
                <Text style={styles.dropdownCaret}>{sportDropOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {sportDropOpen && (
                <View style={styles.dropdownList}>
                  <ScrollView style={{maxHeight: 220}} nestedScrollEnabled>
                    {SPORTS_ABC.map(s => (
                      <TouchableOpacity key={s.id} onPress={() => { setNewSport(s.id); setSportDropOpen(false); }}
                        style={[styles.dropdownItem, newSport === s.id && styles.dropdownItemActive]}>
                        <Text style={[styles.dropdownItemText, newSport === s.id && styles.dropdownItemTextActive]}>{s.label}</Text>
                        {newSport === s.id && <Text style={styles.dropdownCheck}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
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
                <Text style={styles.cbtnText}>{editingId ? 'Save changes' : 'Post listing'}</Text>
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
              {(() => {
                const pics = selectedListing?.photos?.length ? selectedListing.photos : (selectedListing?.photo ? [selectedListing.photo] : []);
                if (!pics.length) {
                  return (
                    <View style={[styles.detImg, {backgroundColor: selectedListing?.bg}]}>
                      <Text style={styles.detEmoji}>{selectedListing?.emoji}</Text>
                    </View>
                  );
                }
                return (
                  <View style={{marginBottom: 14}}>
                    <ScrollView
                      horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                      onScroll={e => setPhotoPage(Math.round(e.nativeEvent.contentOffset.x / (width - 44)))}
                      scrollEventThrottle={16}>
                      {pics.map((ph: string, i: number) => (
                        <Image key={i} source={{uri: ph}} style={[styles.detImgPhoto, {width: width - 44, aspectRatio: 3 / 2}]} />
                      ))}
                    </ScrollView>
                    {pics.length > 1 && (
                      <View style={{flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8}}>
                        {pics.map((_: string, i: number) => (
                          <View key={i} style={{width: 7, height: 7, borderRadius: 4, backgroundColor: i === photoPage ? GOLD : colors.BORDER2}} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}
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
                <View style={{flex: 1}}>
                  <Text style={styles.sellerName}>{selectedListing?.seller}</Text>
                  {(() => {
                    const st = selectedListing ? sellerStats(selectedListing.sellerId) : null;
                    return <Text style={styles.sellerRating}>{st ? `${st.avg} ★ · ${st.count} rating${st.count === 1 ? '' : 's'}` : 'New seller · no ratings yet'}</Text>;
                  })()}
                </View>
                {selectedListing?.sellerId !== user.uid && (
                  <TouchableOpacity style={styles.rateBtn} onPress={() => openRate(selectedListing.sellerId, selectedListing.seller)}>
                    <Text style={styles.rateBtnText}>{myRatingOf(selectedListing?.sellerId) ? 'Edit rating' : 'Rate'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {selectedListing?.sellerId === user.uid ? (
                <>
                  <TouchableOpacity style={[styles.cbtn, {marginBottom: 10}]} onPress={() => startEdit(selectedListing)}>
                    <Text style={styles.cbtnText}>Edit listing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.soldBtn} onPress={() => markAsSold(selectedListing)}>
                    <Text style={styles.soldBtnText}>✓ Mark as sold</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.cbtn} onPress={() => openChat(selectedListing)}>
                    <Text style={styles.cbtnText}>Message seller</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{alignItems: 'center', paddingVertical: 14}}
                    onPress={() => {
                      const l = selectedListing;
                      reportContent({type: 'listing', targetId: l.id, targetText: l.title, reportedId: l.sellerId, reportedName: l.seller});
                    }}>
                    <Text style={{fontSize: 13, color: TEXT3, fontWeight: '500'}}>Report this listing</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Chat modal lives at root level now (renders on every tab) */}

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
            {visibleChats.length === 0 ? (
              <View style={{alignItems: 'center', paddingVertical: 50}}>
                <Text style={{fontSize: 34, marginBottom: 10}}>💬</Text>
                <Text style={{fontWeight: '500', color: TEXT, marginBottom: 4}}>No messages yet</Text>
                <Text style={{fontSize: 13, color: TEXT2}}>Message a seller to start chatting</Text>
              </View>
            ) : (
              <ScrollView>
                {visibleChats.map(chat => {
                  const otherName = chat.sellerId === user.uid ? chat.buyerName : chat.sellerName;
                  const otherId = chat.sellerId === user.uid ? chat.buyerId : chat.sellerId;
                  const otherU = usersMap[otherId] || {};
                  return (
                    <TouchableOpacity key={chat.id} style={styles.convoRow} onPress={() => openChatFromInbox(chat)}>
                      <View style={[styles.convoAvatar, {backgroundColor: otherU.avatarColor || '#FBF1D6'}]}>
                        <Text style={{fontSize: 20}}>{otherU.avatarEmoji || (otherName ? otherName.charAt(0).toUpperCase() : '🏆')}</Text>
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
              {activeChat?.otherId ? (
                <TouchableOpacity style={styles.rateBtn} onPress={() => openRate(activeChat.otherId, activeChat.otherName)}>
                  <Text style={styles.rateBtnText}>★ Rate</Text>
                </TouchableOpacity>
              ) : null}
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

      {/* Dropdown Menu — root level, works on every tab */}
      <Modal visible={menuOpen} animationType="fade" transparent>
        <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <View style={[styles.menuAvatar, {backgroundColor: avatarColor}]}>
                <Text style={styles.menuAvatarText}>{username.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.menuName}>{username}</Text>
                <Text style={styles.menuEmail} numberOfLines={1}>{email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setTab('profile');}}>
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setTab('inbox');}}>
              <Text style={styles.menuItemText}>Inbox</Text>
              {unreadTotal > 0 && (<View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{unreadTotal}</Text></View>)}
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setTab('market'); setMyListingsOpen(true);}}>
              <Text style={styles.menuItemText}>My Listings</Text>
              {myListings.length > 0 && (<View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{myListings.length}</Text></View>)}
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setTab('market'); setSavedOpen(true);}}>
              <Text style={styles.menuItemText}>Saved</Text>
              {savedListings.length > 0 && (<View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{savedListings.length}</Text></View>)}
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={toggleDark}>
              <Text style={styles.menuItemText}>Dark mode</Text>
              <View style={[styles.toggle, dark && styles.toggleOn]}><View style={[styles.toggleKnob, dark && styles.toggleKnobOn]} /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); setSettingsOpen(true);}}>
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => {setMenuOpen(false); signOut(auth);}}>
              <Text style={[styles.menuItemText, {color: '#D4537E'}]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rate a seller */}
      <Modal visible={!!rateTarget} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.detModal}>
            <View style={styles.detHeader}>
              <Text style={{fontSize: 17, fontWeight: '600', color: TEXT}}>Rate {rateTarget?.name}</Text>
              <TouchableOpacity onPress={() => setRateTarget(null)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 18}}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRateStars(s)}>
                  <Text style={{fontSize: 38, color: s <= rateStars ? GOLD : colors.BORDER2}}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.postLabel}>Comment (optional)</Text>
            <TextInput
              style={[styles.postInput, {height: 80, textAlignVertical: 'top'}]}
              multiline
              placeholder="How was the sale? Was the item as described?"
              placeholderTextColor={TEXT3}
              value={rateText}
              onChangeText={setRateText}
            />
            <Btn style={[styles.cbtn, {marginTop: 16, marginBottom: 8}]} onPress={submitRating}>
              <Text style={styles.cbtnText}>Submit rating</Text>
            </Btn>
          </View>
        </View>
      </Modal>

      {/* Settings */}
      {settingsOpen && (
        <Settings
          colors={colors}
          username={username}
          email={email}
          dark={dark}
          toggleDark={toggleDark}
          blockedUsers={Object.entries(blockedUsers).map(([id, name]) => ({id, name}))}
          onUnblock={unblockUser}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        {[{id: 'community', label: 'Community'}, {id: 'market', label: 'SportsSwap'}, {id: 'inbox', label: 'Inbox'}, {id: 'profile', label: 'Profile'}].map(t => (
          <TouchableOpacity key={t.id} style={styles.bnavBtn} onPress={() => setTab(t.id)}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={[styles.bnavText, tab === t.id && styles.bnavActive]}>{t.label}</Text>
              {t.id === 'inbox' && unreadTotal > 0 && (
                <View style={styles.navBadge}><Text style={styles.navBadgeText}>{unreadTotal > 9 ? '9+' : unreadTotal}</Text></View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Toast message={toast} onHide={() => setToast('')} colors={colors} />
      <ConfirmModal data={confirm} onClose={() => setConfirm(null)} colors={colors} />
    </View>
  );
}

function makeStyles(c: any) {
  const {GOLD, GOLD_LIGHT, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER} = c;
  return StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG3},
  toggle: {marginLeft: 'auto', width: 42, height: 24, borderRadius: 12, backgroundColor: BG3, justifyContent: 'center', padding: 2},
  toggleOn: {backgroundColor: GOLD},
  toggleKnob: {width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff'},
  toggleKnobOn: {alignSelf: 'flex-end'},
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
  sellBtn: {backgroundColor: GOLD, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9, shadowColor: GOLD, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: {width: 0, height: 3}, elevation: 2},
  sellBtnText: {color: 'white', fontSize: 13, fontWeight: '700', letterSpacing: 0.3},
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
  sportTabDot: {width: 9, height: 9, borderRadius: 5, marginRight: 2},
  sportTabLabel: {fontSize: 13, color: TEXT2},
  sportTabLabelActive: {color: GOLD, fontWeight: '500'},
  countBadge: {backgroundColor: GOLD_LIGHT, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1},
  countBadgeText: {fontSize: 10, color: GOLD_TEXT},
  grid: {padding: 14},
  row: {gap: 14, marginBottom: 14},
  card: {width: CARD_WIDTH, backgroundColor: BG, borderRadius: 20, borderWidth: 0.5, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {width: 0, height: 4}, elevation: 2},
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
  msgBtn: {backgroundColor: GOLD_LIGHT, borderRadius: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 0.5, borderColor: '#E3B948'},
  msgBtnText: {fontSize: 13, color: GOLD_TEXT, fontWeight: '500'},
  empty: {alignItems: 'center', paddingTop: 60},
  emptyText: {color: TEXT2, fontSize: 15},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  detModal: {backgroundColor: BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, maxHeight: '90%'},
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
  rateBtn: {backgroundColor: GOLD_LIGHT, borderWidth: 0.5, borderColor: GOLD, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7},
  rateBtnText: {fontSize: 12, fontWeight: '700', color: GOLD_TEXT},
  cbtn: {backgroundColor: GOLD, borderRadius: 16, paddingVertical: 15, alignItems: 'center', shadowColor: GOLD, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: {width: 0, height: 4}, elevation: 3},
  cbtnText: {color: 'white', fontSize: 15, fontWeight: '700', letterSpacing: 0.3},
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
  dropdownBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: BG, marginBottom: 10},
  dropdownBtnText: {fontSize: 14, color: TEXT},
  dropdownCaret: {fontSize: 10, color: TEXT2},
  dropdownList: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, backgroundColor: BG, marginTop: -4, marginBottom: 10, overflow: 'hidden'},
  dropdownItem: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: BORDER},
  dropdownItemActive: {backgroundColor: GOLD_LIGHT},
  dropdownItemText: {fontSize: 14, color: TEXT},
  dropdownItemTextActive: {color: GOLD_TEXT, fontWeight: '600'},
  dropdownCheck: {fontSize: 14, color: GOLD_TEXT, fontWeight: '700'},
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
  // Inbox segments + activity
  segmentRow: {flexDirection: 'row', backgroundColor: BG2, borderRadius: 12, padding: 4, marginHorizontal: 16, marginTop: 12, marginBottom: 6},
  segment: {flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9},
  segmentActive: {backgroundColor: BG, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: {width: 0, height: 1}, elevation: 1},
  segmentText: {fontSize: 13, color: TEXT2, fontWeight: '500'},
  segmentTextActive: {color: TEXT, fontWeight: '700'},
  notifRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: BORDER},
  notifUnread: {},
  notifDot: {width: 8, height: 8, borderRadius: 4},
  notifText: {fontSize: 14, color: TEXT, lineHeight: 19},
  notifTime: {fontSize: 12, color: TEXT2, marginTop: 2},
  unreadDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: GOLD},
  navBadge: {backgroundColor: GOLD, borderRadius: 9, minWidth: 17, height: 17, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', marginLeft: 5},
  navBadgeText: {color: 'white', fontSize: 10, fontWeight: '800'},
  // Photo picker thumbnails
  photoThumbWrap: {width: 90, height: 90, borderRadius: 12, marginRight: 8, overflow: 'hidden'},
  photoThumb: {width: '100%', height: '100%', resizeMode: 'cover'},
  photoAddTile: {width: 90, height: 90, borderRadius: 12, borderWidth: 1, borderColor: GOLD, borderStyle: 'dashed', backgroundColor: BG2, alignItems: 'center', justifyContent: 'center'},
  // Photos
  cardImgPhoto: {width: '100%', height: '100%', resizeMode: 'cover'},
  detImgPhoto: {width: '100%', height: '100%', borderRadius: 10, resizeMode: 'cover'},
  photoDrop: {height: 150, borderRadius: 10, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', backgroundColor: BG2, alignItems: 'center', justifyContent: 'center', marginBottom: 4, overflow: 'hidden'},
  photoPreview: {width: '100%', height: '100%', resizeMode: 'cover'},
  photoRemove: {position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center'},
  });
}
