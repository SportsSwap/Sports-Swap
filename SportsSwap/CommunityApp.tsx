import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Image, Alert, ActivityIndicator, SafeAreaView, Vibration, Dimensions,
} from 'react-native';

const WIDTH = Dimensions.get('window').width;

// Tiny tap feedback for likes/votes (no-op on the simulator — only real phones vibrate)
const buzz = () => { try { Vibration.vibrate(10); } catch (e) {} };
import {launchImageLibrary} from 'react-native-image-picker';
import {db} from './firebase';
import {
  collection, addDoc, onSnapshot, orderBy, query, serverTimestamp,
  doc, updateDoc, deleteDoc, setDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import {lightColors} from './theme';
import Logo from './Logo';
import Btn from './Btn';
import {Toast, ConfirmModal, SportPicker} from './Feedback';
import Icon from './Icon';

const SPORTS = [
  {id: 'football', label: 'Football', bg: '#EAF3DE'},
  {id: 'afl', label: 'AFL', bg: '#FAEEDA'},
  {id: 'rugby', label: 'Rugby', bg: '#FAECE7'},
  {id: 'basketball', label: 'Basketball', bg: '#FAEEDA'},
  {id: 'netball', label: 'Netball', bg: '#FCEBEB'},
  {id: 'cricket', label: 'Cricket', bg: '#EAF3DE'},
  {id: 'tennis', label: 'Tennis', bg: '#EAF3DE'},
  {id: 'golf', label: 'Golf', bg: '#EAF3DE'},
  {id: 'swimming', label: 'Swimming', bg: '#E6F1FB'},
  {id: 'surf', label: 'Surfing', bg: '#E6F1FB'},
  {id: 'surflifesaving', label: 'Surf life saving', bg: '#E6F1FB'},
  {id: 'cycling', label: 'Cycling', bg: '#E6F1FB'},
  {id: 'running', label: 'Cross country', bg: '#FAECE7'},
  {id: 'athletics', label: 'Athletics', bg: '#FAECE7'},
  {id: 'fieldhockey', label: 'Field hockey', bg: '#EAF3DE'},
  {id: 'icehockey', label: 'Ice hockey', bg: '#E6F1FB'},
  {id: 'baseball', label: 'Baseball', bg: '#FAEEDA'},
  {id: 'volleyball', label: 'Volleyball', bg: '#FCEBEB'},
  {id: 'skiing', label: 'Snow sports', bg: '#E6F1FB'},
  {id: 'gym', label: 'Gym', bg: '#EEEDFE'},
  {id: 'martial', label: 'Martial arts', bg: '#FCEBEB'},
  {id: 'badminton', label: 'Badminton', bg: '#EAF3DE'},
  {id: 'boxing', label: 'Boxing', bg: '#FAECE7'},
  {id: 'climbing', label: 'Rock climbing', bg: '#FAEEDA'},
  {id: 'dance', label: 'Dance', bg: '#FCEBEB'},
  {id: 'diving', label: 'Diving', bg: '#E6F1FB'},
  {id: 'equestrian', label: 'Horse riding', bg: '#FAEEDA'},
  {id: 'lacrosse', label: 'Lacrosse', bg: '#EAF3DE'},
  {id: 'rowing', label: 'Rowing', bg: '#E6F1FB'},
  {id: 'sailing', label: 'Sailing', bg: '#E6F1FB'},
  {id: 'skateboarding', label: 'Skateboarding', bg: '#FAECE7'},
  {id: 'softball', label: 'Softball', bg: '#FAEEDA'},
  {id: 'squash', label: 'Squash', bg: '#EAF3DE'},
  {id: 'tabletennis', label: 'Table tennis', bg: '#EAF3DE'},
  {id: 'triathlon', label: 'Triathlon', bg: '#FAECE7'},
  {id: 'waterpolo', label: 'Water polo', bg: '#E6F1FB'},
  {id: 'wrestling', label: 'Wrestling', bg: '#FCEBEB'},
];
// Alphabetical by label — used for every sport dropdown
const SPORTS_ABC = [...SPORTS].sort((a, b) => a.label.localeCompare(b.label));
const sportOf = (id: string) => SPORTS.find(s => s.id === id);

// Relative time: <1h → minutes, <24h → hours, ≤7d → days, older → the date
function timeAgo(ts: any) {
  if (!ts || !ts.seconds) return 'just now';
  const secs = Math.floor(Date.now() / 1000) - ts.seconds;
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days <= 7) return days + 'd ago';
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
}

const AV_PALETTE = ['#EAF3DE', '#FAEEDA', '#E6F1FB', '#FAECE7', '#EEEDFE', '#FCEBEB'];
function colorFor(name: string) {
  let h = 0; for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) % AV_PALETTE.length;
  return AV_PALETTE[h];
}
function initials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

// Profanity filter
const BANNED = new Set(['fuck','fucking','fucker','fucked','motherfucker','shit','shitty','bullshit','bitch','asshole','arsehole','ass','arse','bastard','cunt','dick','dickhead','piss','slut','whore','fag','faggot','retard','retarded','nigger','nigga','wank','wanker','prick','twat','douche','cock','bollocks']);
const hasProfanity = (t: string) => (t || '').toLowerCase().split(/[^a-z]+/).some(w => w && BANNED.has(w));
function clean(t: string) {
  if (hasProfanity(t)) { Alert.alert('Please keep it respectful', "Your message contains language that isn't allowed and can't be posted."); return false; }
  return true;
}

export default function CommunityApp({tab, username, uid, onInbox, onMenu, colors, blocked = {}, onBlock, onReport}: any) {
  const c = colors || lightColors;
  const {GOLD, GOLD_DARK, GOLD_LIGHT, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER} = c;
  const styles = useMemo(() => makeStyles(c), [c]);

  function Avatar({name, size, photo}: any) {
    return (
      <View style={[styles.avatar, {width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(name)}]}>
        {photo ? <Image source={{uri: photo}} style={{width: size, height: size, borderRadius: size / 2}} />
          : <Text style={{fontSize: size * 0.4, fontWeight: '700', color: TEXT}}>{initials(name)}</Text>}
      </View>
    );
  }
  function SportTag({id}: any) {
    const s = sportOf(id);
    return (
      <View style={styles.sportTag}>
        <View style={[styles.sportDot, {backgroundColor: s?.bg || '#ccc'}]} />
        <Text style={styles.sportTagText}>{s?.label || id}</Text>
      </View>
    );
  }

  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<any>({sport: 'football', bio: '', photo: null});
  const [profileTab, setProfileTab] = useState('posts');
  const [myVotes, setMyVotes] = useState<any>({});

  const [threadId, setThreadId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [composer, setComposer] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [follows, setFollows] = useState<any[]>([]);
  const [sportFilter, setSportFilter] = useState('all');
  const [feedSort, setFeedSort] = useState<'top' | 'new'>('top');
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewUser, setViewUser] = useState<any>(null);
  const [eventGroup, setEventGroup] = useState<any>(null);
  const [sharePost, setSharePost] = useState<any>(null);
  const [listView, setListView] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<any>(null);
  const [chooser, setChooser] = useState<any>(null); // {target, groupId, sport} for the share sheet

  // Live data from Firebase
  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'cposts'), orderBy('createdAt', 'desc')), snap => {
      setAllPosts(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, 'groups'), snap => {
      setGroups(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const u3 = onSnapshot(collection(db, 'follows'), snap => {
      setFollows(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const u4 = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Hydrate my saved sports/bio/photo from my user doc (once)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    const me = users.find(u => u.id === uid);
    if (!me) return;
    hydratedRef.current = true;
    setProfile((prev: any) => ({
      ...prev,
      sports: me.sports && me.sports.length ? me.sports : (me.mainSport ? [me.mainSport] : prev.sports || []),
      sport: me.mainSport || (me.sports && me.sports[0]) || prev.sport,
      photo: me.avatarPhoto || prev.photo,
      bio: me.bio != null ? me.bio : prev.bio,
    }));
  }, [users, uid]);

  // Hide content from people you've blocked
  const posts = allPosts.filter(p => !blocked[p.authorId]);

  // One profile photo per person, used everywhere — mine comes from local state (freshest), others from their user doc
  const photoOf = (id: string) => (id === uid ? profile.photo : null) || users.find(u => u.id === id)?.avatarPhoto || null;

  const thread = posts.find(p => p.id === threadId);
  const group = groups.find(g => g.id === groupId);
  const isMod = (g: any) => g && g.creatorId === uid;
  const isJoined = (g: any) => !!(g && (g.roster || []).some((m: any) => m.id === uid));
  const memberCount = (g: any) => (g.roster || []).length;

  // ----- Follow (one-way: followers / following) -----
  const followingCount = follows.filter(f => f.followerId === uid).length;
  const followerCount = follows.filter(f => f.followingId === uid).length;
  const isFollowing = (otherId: string) => follows.some(f => f.followerId === uid && f.followingId === otherId);
  const followDocId = (otherId: string) => {
    const f = follows.find(x => x.followerId === uid && x.followingId === otherId);
    return f ? f.id : null;
  };
  async function follow(other: any) {
    if (other.id === uid || isFollowing(other.id)) return;
    await addDoc(collection(db, 'follows'), {followerId: uid, followerName: username, followingId: other.id, followingName: other.name, createdAt: serverTimestamp()});
    // Notify them in Inbox > Activity
    await addDoc(collection(db, 'notifs'), {
      toId: other.id, kind: 'follow', read: false,
      text: username + ' started following you',
      createdAt: serverTimestamp(),
    });
  }
  async function unfollow(otherId: string) {
    const id = followDocId(otherId);
    if (id) await deleteDoc(doc(db, 'follows', id));
  }
  const removeFollowDoc = (id: string) => deleteDoc(doc(db, 'follows', id));

  async function votePost(p: any, dir: number) {
    buzz();
    const cur = myVotes[p.id] || 0;
    let nv = 0, delta = 0;
    if (cur === dir) { nv = 0; delta = -dir; } else { nv = dir; delta = dir - cur; }
    setMyVotes({...myVotes, [p.id]: nv});
    try { await updateDoc(doc(db, 'cposts', p.id), {votes: (p.votes || 0) + delta}); } catch (e) {}
  }
  async function addCommentTo(p: any, text: string, tags: {id: string; name: string}[] = []) {
    if (!text.trim() || !clean(text)) return false;
    const next = [...(p.comments || []), {authorId: uid, authorName: username, text: text.trim(), votes: 0, tags}];
    await updateDoc(doc(db, 'cposts', p.id), {comments: next});
    // Let the post author know (in Inbox > Activity)
    if (p.authorId !== uid) {
      await addDoc(collection(db, 'notifs'), {
        toId: p.authorId, kind: 'comment', read: false,
        text: `${username} commented on your post: "${text.trim().slice(0, 60)}"`,
        createdAt: serverTimestamp(),
      });
    }
    // Let anyone tagged in the comment know
    tags.forEach(t => { if (t.id !== uid) addDoc(collection(db, 'notifs'), {
      toId: t.id, kind: 'tag', read: false,
      text: `${username} tagged you in a comment`,
      createdAt: serverTimestamp(),
    }).catch(() => {}); });
    return true;
  }
  // Event RSVP (opt in / opt out)
  const isGoing = (ev: any) => (ev.attendees || []).some((a: any) => a.id === uid);
  async function toggleRsvp(ev: any) {
    const attendees = isGoing(ev) ? (ev.attendees || []).filter((a: any) => a.id !== uid) : [...(ev.attendees || []), {id: uid, name: username}];
    await updateDoc(doc(db, 'cposts', ev.id), {attendees});
  }
  // Moderator: pin / unpin a message
  const togglePin = (p: any) => updateDoc(doc(db, 'cposts', p.id), {pinned: !p.pinned});

  // Delete your own post / comment
  function deletePost(p: any) {
    if (p.authorId !== uid) return;
    setConfirm({
      title: 'Delete post?',
      message: 'This will permanently delete your post. This cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => { await deleteDoc(doc(db, 'cposts', p.id)); setThreadId(null); setToast('Post deleted'); },
    });
  }
  async function deleteComment(p: any, c: any) {
    if (c.authorId !== uid) return;
    const next = (p.comments || []).filter((x: any) => x !== c);
    await updateDoc(doc(db, 'cposts', p.id), {comments: next});
  }

  // Save / bookmark community posts (stored on your user doc)
  const savedPostIds: string[] = (users.find(u => u.id === uid)?.savedPostIds) || [];
  const isPostSaved = (id: string) => savedPostIds.includes(id);
  function toggleSavePost(p: any) {
    buzz();
    const next = isPostSaved(p.id) ? savedPostIds.filter(x => x !== p.id) : [...savedPostIds, p.id];
    setDoc(doc(db, 'users', uid), {savedPostIds: next}, {merge: true});
  }

  // "You reposted" / "Sam reposted" / "Sam + 3 others reposted"
  function repostLabel(reposts: any[] = []) {
    if (!reposts.length) return '';
    const mine = reposts.some((r: any) => r.id === uid);
    const others = reposts.filter((r: any) => r.id !== uid);
    if (mine && !others.length) return 'You reposted';
    const lead = mine ? 'You' : others[0].name;
    const rest = (mine ? others.length : others.length - 1);
    return rest > 0 ? `${lead} + ${rest} other${rest === 1 ? '' : 's'} reposted` : `${lead} reposted`;
  }
  const iReposted = (p: any) => (p.reposts || []).some((r: any) => r.id === uid);

  // Repost — don't duplicate the post, just record who reposted it on the original
  function repost(p: any) {
    buzz();
    const reposters: any[] = p.reposts || [];
    const mine = reposters.some((r: any) => r.id === uid);
    setToast(mine ? 'Removed your repost' : 'Reposted');
    updateDoc(doc(db, 'cposts', p.id), {
      reposts: mine
        ? arrayRemove(...reposters.filter((r: any) => r.id === uid))
        : arrayUnion({id: uid, name: username}),
    }).catch(() => setToast("Couldn't repost — check your connection"));
  }

  const myGroups = groups.filter(g => isJoined(g));
  const myFollowers = follows.filter(f => f.followingId === uid).map(f => ({id: f.followerId, name: f.followerName}));

  async function shareToGroup(p: any, g: any) {
    await addDoc(collection(db, 'cposts'), {
      authorId: uid, authorName: username, sport: p.sport, groupId: g.id, kind: p.kind || 'post',
      text: p.text || '', photo: p.photo || null, repostFrom: p.repostFrom || p.authorName,
      announcement: false, votes: 0, comments: [], createdAt: serverTimestamp(),
    });
    setSharePost(null);
    Alert.alert('Shared', `Posted to ${g.name}.`);
  }
  async function shareToFollower(p: any, f: any) {
    const chatId = 'dm_' + [uid, f.id].sort().join('_');
    await setDoc(doc(db, 'chats', chatId), {
      participants: [uid, f.id], sellerId: f.id, sellerName: f.name, buyerId: uid, buyerName: username,
      listingTitle: 'Shared posts', listingPrice: '', listingEmoji: '📣', listingBg: '#FBF1D6',
      lastMessage: '📣 ' + (p.text ? p.text.slice(0, 40) : 'Shared a post'), updatedAt: serverTimestamp(),
    }, {merge: true});
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: uid, senderName: username,
      text: '📣 Shared a ' + (p.kind === 'achievement' ? 'achievement' : p.kind === 'question' ? 'question' : 'post') + ': ' + (p.text || ''),
      createdAt: serverTimestamp(),
    });
    setSharePost(null);
    Alert.alert('Sent', `Shared to ${f.name}'s inbox.`);
  }

  // Choose what kind of thing to share
  function openComposerChooser(target: string, groupId?: string, sport?: string) {
    setChooser({target, groupId, sport});
  }

  // Photos on a post — swipeable carousel; tap to reveal tagged people, tap a tag to open their profile
  function PostPhotos({p}: any) {
    const pics: string[] = p.photos && p.photos.length ? p.photos : (p.photo ? [p.photo] : []);
    const tags: {id: string; name: string}[] = p.tags || [];
    const [page, setPage] = useState(0);
    const [showTags, setShowTags] = useState(false);
    const [w, setW] = useState(WIDTH - 60); // measured on layout for exact paging
    if (!pics.length) return null;
    return (
      <View style={styles.photoPager} onLayout={e => setW(e.nativeEvent.layout.width)}>
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, w)))}>
          {pics.map((ph, i) => (
            <TouchableOpacity key={i} activeOpacity={0.95} onPress={() => tags.length && setShowTags(s => !s)}>
              <Image source={{uri: ph}} style={[styles.photoPagerImg, {width: w}]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        {pics.length > 1 && (
          <View style={styles.photoDots}>
            {pics.map((_, i) => <View key={i} style={[styles.photoDot, i === page && styles.photoDotOn]} />)}
          </View>
        )}
        {tags.length > 0 && !showTags && (
          <TouchableOpacity style={styles.tagHintPill} onPress={() => setShowTags(true)}>
            <Icon name="pricetag" size={12} color="#fff" /><Text style={styles.tagHintText}>{tags.length}</Text>
          </TouchableOpacity>
        )}
        {tags.length > 0 && showTags && (
          <View style={styles.tagOverlay}>
            {tags.map(t => (
              <TouchableOpacity key={t.id} style={styles.tagOverlayChip} onPress={() => { setThreadId(null); setViewUser({id: t.id, name: t.name, sport: ''}); }}>
                <Text style={styles.tagOverlayChipText}>@{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Reaction control: medals for achievements, up/down votes for everything else
  function Reaction({p}: any) {
    const mv = myVotes[p.id] || 0;
    if (p.kind === 'achievement') {
      return (
        <Btn style={[styles.medalBtn, mv === 1 && styles.medalBtnActive]} onPress={() => votePost(p, 1)} scaleTo={1.1}>
          <Icon name="medal" size={17} color={mv === 1 ? GOLD : TEXT2} />
          <Text style={[styles.medalText, mv === 1 && {color: GOLD_TEXT}]}>{p.votes || 0}</Text>
        </Btn>
      );
    }
    return (
      <View style={styles.votePill}>
        <TouchableOpacity style={{paddingHorizontal: 7, paddingVertical: 4}} onPress={() => votePost(p, 1)}><Icon name="arrow-up" size={18} color={mv === 1 ? '#E8590C' : TEXT2} /></TouchableOpacity>
        <Text style={styles.voteScore}>{p.votes || 0}</Text>
        <TouchableOpacity style={{paddingHorizontal: 7, paddingVertical: 4}} onPress={() => votePost(p, -1)}><Icon name="arrow-down" size={18} color={mv === -1 ? '#4263EB' : TEXT2} /></TouchableOpacity>
      </View>
    );
  }

  // ---------- POST CARD ----------
  function PostCard({p, onOpen, canPin}: any) {
    return (
      <TouchableOpacity style={[styles.card, p.kind === 'achievement' && styles.cardAchievement, p.kind === 'question' && styles.cardQuestion, (p.reposts || []).length > 0 && styles.cardRepost, p.pinned && styles.cardPinned]} onPress={onOpen} activeOpacity={0.9}>
        {p.pinned && <View style={styles.pinBadge}><Text style={styles.pinBadgeText}>PINNED</Text></View>}
        {(p.reposts || []).length > 0 && <View style={styles.repostBadge}><Icon name="repeat" size={12} color={GOLD_DARK} /><Text style={styles.repostBadgeText}>{repostLabel(p.reposts)}</Text></View>}
        {p.announcement && <View style={styles.annBadge}><Text style={styles.annBadgeText}>ANNOUNCEMENT</Text></View>}
        {p.kind === 'achievement' && <View style={styles.starBadge}><Icon name="medal" size={12} color={GOLD_DARK} /><Text style={styles.starBadgeText}>ACHIEVEMENT</Text></View>}
        {p.kind === 'question' && <View style={styles.qBadge}><Text style={styles.qBadgeText}>QUESTION</Text></View>}
        <View style={styles.cardHead}>
          <TouchableOpacity onPress={() => setViewUser({id: p.authorId, name: p.authorName, sport: p.sport})}>
            <Avatar name={p.authorName} size={40} photo={photoOf(p.authorId)} />
          </TouchableOpacity>
          <View style={{flex: 1, marginLeft: 10}}>
            <Text style={styles.author}>{p.authorName}</Text>
            <Text style={styles.meta}>{timeAgo(p.createdAt)}</Text>
          </View>
          <SportTag id={p.sport} />
        </View>
        {!!p.text && <Text style={styles.body}>{p.text}</Text>}
        {(p.tags || []).length > 0 && (
          <View style={styles.inlineTagRow}>
            <Text style={styles.meta}>with </Text>
            {(p.tags || []).map((t: any, i: number) => (
              <TouchableOpacity key={t.id} onPress={() => setViewUser({id: t.id, name: t.name, sport: ''})}>
                <Text style={styles.inlineTag}>@{t.name}{i < (p.tags.length - 1) ? ', ' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <PostPhotos p={p} />
        <View style={styles.actions}>
          <Reaction p={p} />
          <Btn style={styles.iconBtn} onPress={onOpen} scaleTo={1.15}><Icon name="chatbubble-outline" size={19} color={TEXT2} /><Text style={styles.iconCount}>{(p.comments || []).length}</Text></Btn>
          <Btn style={styles.iconBtn} onPress={() => repost(p)} scaleTo={1.15}><Icon name="repeat" size={20} color={iReposted(p) ? GOLD : TEXT2} />{(p.reposts || []).length > 0 && <Text style={[styles.iconCount, iReposted(p) && {color: GOLD}]}>{(p.reposts || []).length}</Text>}</Btn>
          <Btn style={styles.iconBtn} onPress={() => setSharePost(p)} scaleTo={1.15}><Icon name="arrow-redo-outline" size={19} color={TEXT2} /></Btn>
          <Btn style={styles.iconBtn} onPress={() => toggleSavePost(p)} scaleTo={1.15}><Icon name={isPostSaved(p.id) ? 'bookmark' : 'bookmark-outline'} size={19} color={isPostSaved(p.id) ? GOLD : TEXT2} /></Btn>
          <View style={{flex: 1}} />
          {canPin && <Btn style={styles.iconBtn} onPress={() => togglePin(p)} scaleTo={1.15}><Icon name={p.pinned ? 'pin' : 'pin-outline'} size={19} color={p.pinned ? GOLD : TEXT2} /></Btn>}
          {p.authorId === uid && <Btn style={styles.iconBtn} onPress={() => deletePost(p)} scaleTo={1.15}><Icon name="trash-outline" size={19} color="#C0506E" /></Btn>}
          {p.authorId !== uid && onReport && <Btn style={styles.iconBtn} onPress={() => onReport({type: 'post', targetId: p.id, targetText: p.text || '', reportedId: p.authorId, reportedName: p.authorName})} scaleTo={1.15}><Icon name="flag-outline" size={18} color={TEXT2} /></Btn>}
        </View>
      </TouchableOpacity>
    );
  }

  // ---------- COMMUNITY FEED ----------
  function CommunityFeed() {
    const q = search.trim().toLowerCase();

    // While searching, show matching People & Groups (not posts) — live typeahead
    if (q) {
      const people = users.filter(u => !blocked[u.id] && (u.username || '').toLowerCase().includes(q));
      const grps = groups.filter(g => (g.name || '').toLowerCase().includes(q));
      return (
        <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 90}} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>People</Text>
          {people.length ? people.map(u => (
            <TouchableOpacity key={u.id} style={styles.resultRow} onPress={() => setViewUser({id: u.id, name: u.username, sport: u.mainSport || ''})}>
              <Avatar name={u.username} size={42} photo={photoOf(u.id)} />
              <Text style={styles.resultName}>{u.username}{u.id === uid ? '  (You)' : ''}</Text>
            </TouchableOpacity>
          )) : <Text style={styles.noResult}>No people found</Text>}

          <Text style={[styles.sectionLabel, {marginTop: 18}]}>Groups</Text>
          {grps.length ? grps.map(g => (
            <TouchableOpacity key={g.id} style={styles.resultRow} onPress={() => openGroup(g)}>
              <Avatar name={g.name} size={42} photo={g.photo} />
              <View style={{flex: 1, marginLeft: 0}}>
                <Text style={styles.resultName}>{g.name}</Text>
                <Text style={styles.meta}>{memberCount(g)} members{g.priv ? ' · Private' : ''}</Text>
              </View>
            </TouchableOpacity>
          )) : <Text style={styles.noResult}>No groups found</Text>}
        </ScrollView>
      );
    }

    // ----- Feed ranking (Instagram/Reddit style) -----
    // Every post gets a score; the feed is sorted by it.
    //  • Recency decays the score with a ~24h half-life, so a 6-month-old post
    //    scores ~0 no matter who wrote it.
    //  • Posts from people you follow get a 3x boost — they win while fresh,
    //    but stale posts from followed people don't beat new content.
    //  • Votes and comments add engagement points (also decayed).
    //  • Posts in your main sport get a small 1.2x bump.
    const followingIds = new Set(follows.filter(f => f.followerId === uid).map(f => f.followingId));
    const nowSecs = Math.floor(Date.now() / 1000);
    function feedScore(p: any) {
      const ageHours = (nowSecs - (p.createdAt?.seconds || nowSecs)) / 3600;
      const recency = Math.pow(0.5, ageHours / 24);
      const engagement = 100 + (p.votes || 0) * 4 + (p.comments || []).length * 6;
      const followBoost = followingIds.has(p.authorId) ? 3 : 1;
      const mySports = profile.sports && profile.sports.length ? profile.sports : [profile.sport];
      const sportBoost = mySports.includes(p.sport) ? 1.2 : 1;
      return engagement * recency * followBoost * sportBoost;
    }

    let feed = posts.filter(p => !p.groupId && (sportFilter === 'all' || p.sport === sportFilter));
    if (feedSort === 'top') feed = [...feed].sort((a, b) => feedScore(b) - feedScore(a));

    // Trending: most-voted public posts from the last 7 days
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
    const trending = posts
      .filter(p => !p.groupId && (p.votes || 0) > 0 && (p.createdAt?.seconds || 0) > weekAgo)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 3);

    return (
      <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 90}}>
        {trending.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Trending this week</Text>
            <View style={[styles.pageCard, {paddingVertical: 6, marginBottom: 16}]}>
              {trending.map((p, i) => (
                <TouchableOpacity key={p.id} style={[styles.trendRow, i < trending.length - 1 && {borderBottomWidth: 0.5, borderBottomColor: BORDER}]} onPress={() => setThreadId(p.id)}>
                  <Text style={styles.trendRank}>{i + 1}</Text>
                  <View style={{flex: 1}}>
                    <Text style={styles.trendText} numberOfLines={1}>{p.text || (p.kind === 'achievement' ? 'Achievement' : 'Photo post')}</Text>
                    <Text style={styles.meta}>{p.authorName} · {sportOf(p.sport)?.label || p.sport}</Text>
                  </View>
                  <Text style={styles.trendVotes}>▲ {p.votes || 0}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Discussion groups */}
        <Text style={styles.sectionLabel}>Discussion groups</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
          <TouchableOpacity style={styles.createGroupCard} onPress={() => setCreateOpen(true)}>
            <Icon name="add" size={22} color={GOLD} />
            <Text style={styles.createGroupText}>Create group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.joinGroupCard} onPress={() => setJoinOpen(true)}>
            <Icon name="key-outline" size={20} color="#185FA5" />
            <Text style={styles.joinGroupText}>Join with code</Text>
          </TouchableOpacity>
          {[...groups].sort((a, b) => memberCount(b) - memberCount(a)).map(g => (
            <TouchableOpacity key={g.id} style={styles.groupCard} onPress={() => openGroup(g)}>
              <Avatar name={g.name} size={36} photo={g.photo} />
              <Text style={styles.groupCardName} numberOfLines={1}>{g.name}</Text>
              <Text style={styles.groupCardMembers}>{memberCount(g)} members{g.priv ? ' · Private' : ''}</Text>
              <View style={[styles.joinBtn, isJoined(g) && styles.joinedBtn]}>
                <Text style={[styles.joinBtnText, isJoined(g) && {color: '#fff'}]}>{isJoined(g) ? 'Visit' : '+ Join'}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {groups.length === 0 && <Text style={{color: TEXT2, alignSelf: 'center', paddingHorizontal: 12}}>No groups yet — create the first one!</Text>}
        </ScrollView>

        {/* Feed + sport filter dropdown */}
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14}}>
          <View style={styles.sortToggle}>
            <TouchableOpacity style={[styles.sortOpt, feedSort === 'top' && styles.sortOptActive]} onPress={() => setFeedSort('top')}>
              <Text style={[styles.sortOptText, feedSort === 'top' && styles.sortOptTextActive]}>For you</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortOpt, feedSort === 'new' && styles.sortOptActive]} onPress={() => setFeedSort('new')}>
              <Text style={[styles.sortOptText, feedSort === 'new' && styles.sortOptTextActive]}>Newest</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
            <Text style={styles.filterBtnText}>{sportFilter === 'all' ? 'All sports' : sportOf(sportFilter)?.label}  ▾</Text>
          </TouchableOpacity>
        </View>

        {/* Composer */}
        <TouchableOpacity style={styles.composerBar} onPress={() => openComposerChooser('community')}>
          <Avatar name={username} size={34} photo={profile.photo} />
          <Text style={styles.composerPh}>Share news, achievements or ask a question…</Text>
        </TouchableOpacity>

        {/* Posts */}
        {feed.length ? feed.map(p => <PostCard key={p.id} p={p} onOpen={() => setThreadId(p.id)} />)
          : <View style={{alignItems: 'center', paddingTop: 30}}><Text style={{fontWeight: '600', color: TEXT}}>No posts yet</Text><Text style={{color: TEXT2, marginTop: 4}}>Be the first to share something!</Text></View>}
      </ScrollView>
    );
  }

  // ---------- GROUPS ----------
  async function openGroup(g: any) {
    // Private groups you haven't joined need the code — open the in-app Join sheet
    if (g.priv && !isJoined(g)) { setJoinOpen(true); return; }
    setGroupId(g.id);
  }
  async function joinGroup(g: any) {
    const roster = [...(g.roster || []), {id: uid, name: username}];
    await updateDoc(doc(db, 'groups', g.id), {roster});
  }
  async function leaveGroup(g: any) {
    const roster = (g.roster || []).filter((m: any) => m.id !== uid);
    await updateDoc(doc(db, 'groups', g.id), {roster});
  }
  async function toggleJoin(g: any) { isJoined(g) ? leaveGroup(g) : joinGroup(g); }
  async function removeMember(g: any, id: string) {
    Alert.alert('Remove member', 'Remove this member from the group?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Remove', style: 'destructive', onPress: async () => {
        const roster = (g.roster || []).filter((m: any) => m.id !== id);
        await updateDoc(doc(db, 'groups', g.id), {roster});
      }},
    ]);
  }
  function makeAnnouncement(g: any) {
    if (!(Alert as any).prompt) { Alert.alert('Announce', 'Use the post box to share with the group.'); return; }
    (Alert as any).prompt('New announcement', `Notify all ${memberCount(g)} members:`, async (text?: string) => {
      if (!text || !text.trim() || !clean(text)) return;
      await addDoc(collection(db, 'cposts'), {authorId: uid, authorName: username, sport: g.sport, groupId: g.id, announcement: true, text: text.trim(), photo: null, votes: 0, comments: [], createdAt: serverTimestamp()});
      Alert.alert('Announcement posted', `A notification was sent to all ${memberCount(g)} members.`);
    });
  }
  function editTraining(g: any) {
    if (!(Alert as any).prompt) return;
    (Alert as any).prompt('Training times', 'Set training times:', async (t?: string) => {
      if (t == null) return; await updateDoc(doc(db, 'groups', g.id), {training: t.trim()});
    }, undefined, g.training || '');
  }

  function GroupPage() {
    const g = group; if (!g) return null;
    const all = posts.filter(p => p.groupId === g.id);
    const anns = all.filter(p => p.announcement);
    const events = all.filter(p => p.kind === 'event');
    const convos = all.filter(p => !p.announcement && p.kind !== 'event')
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)); // pinned first
    const mod = isMod(g);
    return (
      <Modal visible animationType="slide" onRequestClose={() => setGroupId(null)}>
        <View style={{flex: 1, backgroundColor: BG3}}>
          <View style={styles.topbar}><TouchableOpacity style={styles.backBtn} onPress={() => setGroupId(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 50}}>
            <View style={styles.pageCard}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Avatar name={g.name} size={64} photo={g.photo} />
                <View style={{flex: 1, marginLeft: 14}}>
                  <Text style={styles.groupTitle}>{g.name}{g.priv ? '  · Private' : ''}</Text>
                  <Text style={styles.meta}>{memberCount(g)} members · {sportOf(g.sport)?.label}</Text>
                  <Text style={styles.modLine}>Moderator: <Text style={{fontWeight: '700'}}>{g.creatorName}</Text>{mod ? ' (you)' : ''}</Text>
                </View>
              </View>
              <View style={{flexDirection: 'row', gap: 8, marginTop: 12}}>
                <TouchableOpacity style={[styles.smallBtn, isJoined(g) ? styles.smallBtnAlt : styles.smallBtnGold]} onPress={() => toggleJoin(g)}>
                  <Text style={[styles.smallBtnText, !isJoined(g) && {color: '#fff'}]}>{isJoined(g) ? '✓ Joined' : '+ Join'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, styles.smallBtnAlt]} onPress={() => Alert.alert('Share group', 'Group link copied! Share it with friends.')}><Text style={styles.smallBtnText}>↗ Share</Text></TouchableOpacity>
              </View>
              <Text style={[styles.body, {marginTop: 12}]}>{g.desc}</Text>
              {!!g.training && (<View style={styles.infoCard}><View style={{width: 3, alignSelf: 'stretch', backgroundColor: GOLD, borderRadius: 2, marginRight: 10}} /><View><Text style={styles.infoTitle}>TRAINING TIMES</Text><Text style={styles.infoText}>{g.training}</Text></View></View>)}
              {mod && (
                <View style={styles.modBox}>
                  <Text style={styles.modBoxTitle}>MODERATOR TOOLS</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                    <Btn style={styles.modBtn} onPress={() => makeAnnouncement(g)} scaleTo={1.08}><Text style={styles.modBtnText}>Announce</Text></Btn>
                    <Btn style={styles.modBtn} onPress={() => setEventGroup(g)} scaleTo={1.08}><Text style={styles.modBtnText}>+ Event</Text></Btn>
                    <Btn style={styles.modBtn} onPress={() => editTraining(g)} scaleTo={1.08}><Text style={styles.modBtnText}>Training</Text></Btn>
                  </View>
                  <Text style={[styles.infoTitle, {marginTop: 12, marginBottom: 6}]}>MEMBERS</Text>
                  {(g.roster || []).map((m: any) => (
                    <View key={m.id} style={styles.memberRow}>
                      <Avatar name={m.name} size={30} photo={photoOf(m.id)} />
                      <Text style={{flex: 1, marginLeft: 8, fontSize: 13, color: TEXT}}>{m.name}{m.id === g.creatorId ? ' · moderator' : ''}</Text>
                      {m.id !== g.creatorId && <TouchableOpacity onPress={() => removeMember(g, m.id)}><Text style={{color: '#B23', fontSize: 12, fontWeight: '600'}}>Remove</Text></TouchableOpacity>}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.composerBar, {marginTop: 14}]} onPress={() => openComposerChooser('group', g.id, g.sport)}>
              <Avatar name={username} size={34} photo={profile.photo} />
              <Text style={styles.composerPh}>Start a conversation in {g.name}…</Text>
            </TouchableOpacity>

            {anns.map(p => (<View key={p.id} style={styles.announce}><Text style={styles.announceHead}>📢 Announcement · {p.authorName}</Text><Text style={styles.body}>{p.text}</Text></View>))}

            {events.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, {marginTop: 6}]}>Events</Text>
                {events.map(ev => (
                  <View key={ev.id} style={styles.eventCard}>
                    <Text style={styles.eventTitle}>{ev.eventTitle}</Text>
                    {!!ev.eventDate && <Text style={styles.eventMeta}>When · {ev.eventDate}</Text>}
                    {!!ev.eventLocation && <Text style={styles.eventMeta}>Where · {ev.eventLocation}</Text>}
                    <Text style={[styles.eventMeta, {marginTop: 4}]}>{(ev.attendees || []).length} going</Text>
                    <Btn style={[styles.smallBtn, isGoing(ev) ? styles.smallBtnGold : styles.smallBtnAlt, {marginTop: 10}]} onPress={() => toggleRsvp(ev)}>
                      <Text style={[styles.smallBtnText, isGoing(ev) && {color: '#fff'}]}>{isGoing(ev) ? "Going — tap to opt out" : 'Count me in'}</Text>
                    </Btn>
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.sectionLabel, {marginTop: 6}]}>Conversations</Text>
            {convos.length ? convos.map(p => <PostCard key={p.id} p={p} onOpen={() => setThreadId(p.id)} canPin={mod} />)
              : <Text style={{color: TEXT2, textAlign: 'center', padding: 20}}>No conversations yet — be the first to post!</Text>}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ---------- THREAD ----------
  function ThreadView() {
    const p = thread; if (!p) return null;
    const [ct, setCt] = useState('');
    const [ctags, setCtags] = useState<{id: string; name: string}[]>([]);
    const [ctagOpen, setCtagOpen] = useState(false);
    const [ctagQuery, setCtagQuery] = useState('');
    const toggleCtag = (u: any) => setCtags(prev => prev.some(t => t.id === u.id) ? prev.filter(t => t.id !== u.id) : [...prev, {id: u.id, name: u.username}]);
    const ctagOptions = users.filter(u => u.id !== uid && !blocked[u.id] && (u.username || '').toLowerCase().includes(ctagQuery.trim().toLowerCase()));
    async function sendComment() {
      if (await addCommentTo(p, ct, ctags)) { setCt(''); setCtags([]); setCtagOpen(false); setCtagQuery(''); }
    }
    const sorted = [...(p.comments || [])].filter((cm: any) => !blocked[cm.authorId]).sort((a, b) => (b.votes || 0) - (a.votes || 0));
    return (
      <Modal visible animationType="slide" onRequestClose={() => setThreadId(null)}>
        <View style={{flex: 1, backgroundColor: BG3}}>
          <View style={styles.topbar}><TouchableOpacity style={styles.backBtn} onPress={() => setThreadId(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 60}}>
            <View style={styles.pageCard}>
              {p.kind === 'achievement' && <View style={styles.starBadge}><Icon name="medal" size={12} color={GOLD_DARK} /><Text style={styles.starBadgeText}>Achievement</Text></View>}
              {p.kind === 'question' && <View style={styles.qBadge}><Text style={styles.qBadgeText}>Question</Text></View>}
              <View style={styles.cardHead}>
                <Avatar name={p.authorName} size={40} photo={photoOf(p.authorId)} />
                <View style={{flex: 1, marginLeft: 10}}><Text style={styles.author}>{p.authorName}</Text><Text style={styles.meta}>{timeAgo(p.createdAt)} · {sportOf(p.sport)?.label}</Text></View>
              </View>
              {!!p.text && <Text style={[styles.body, {fontSize: 16}]}>{p.text}</Text>}
              {(p.tags || []).length > 0 && (
                <View style={styles.inlineTagRow}>
                  <Text style={styles.meta}>with </Text>
                  {(p.tags || []).map((t: any, i: number) => (
                    <TouchableOpacity key={t.id} onPress={() => { setThreadId(null); setViewUser({id: t.id, name: t.name, sport: ''}); }}>
                      <Text style={styles.inlineTag}>@{t.name}{i < (p.tags.length - 1) ? ', ' : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <PostPhotos p={p} />
              <View style={styles.actions}>
                <Reaction p={p} />
                <View style={styles.iconBtn}><Icon name="chatbubble-outline" size={19} color={TEXT2} /><Text style={styles.iconCount}>{(p.comments || []).length}</Text></View>
                <Btn style={styles.iconBtn} onPress={() => repost(p)} scaleTo={1.15}><Icon name="repeat" size={20} color={iReposted(p) ? GOLD : TEXT2} />{(p.reposts || []).length > 0 && <Text style={[styles.iconCount, iReposted(p) && {color: GOLD}]}>{(p.reposts || []).length}</Text>}</Btn>
                <Btn style={styles.iconBtn} onPress={() => setSharePost(p)} scaleTo={1.15}><Icon name="arrow-redo-outline" size={19} color={TEXT2} /></Btn>
                <Btn style={styles.iconBtn} onPress={() => toggleSavePost(p)} scaleTo={1.15}><Icon name={isPostSaved(p.id) ? 'bookmark' : 'bookmark-outline'} size={19} color={isPostSaved(p.id) ? GOLD : TEXT2} /></Btn>
                <View style={{flex: 1}} />
                {p.authorId === uid && <Btn style={styles.iconBtn} onPress={() => deletePost(p)} scaleTo={1.15}><Icon name="trash-outline" size={19} color="#C0506E" /></Btn>}
                {p.authorId !== uid && onReport && <Btn style={styles.iconBtn} onPress={() => onReport({type: 'post', targetId: p.id, targetText: p.text || '', reportedId: p.authorId, reportedName: p.authorName})} scaleTo={1.15}><Icon name="flag-outline" size={18} color={TEXT2} /></Btn>}
              </View>
              <View style={styles.commentRow}>
                <TextInput style={styles.commentInput} placeholder="Add a comment…" placeholderTextColor={TEXT3} value={ct} onChangeText={setCt} />
                <TouchableOpacity style={styles.commentTagBtn} onPress={() => setCtagOpen(o => !o)}><Icon name="at" size={20} color={ctags.length ? GOLD : TEXT2} /></TouchableOpacity>
                <TouchableOpacity style={styles.commentSend} onPress={sendComment}><Text style={{color: '#fff', fontWeight: '600'}}>Send</Text></TouchableOpacity>
              </View>
              {ctags.length > 0 && (
                <View style={[styles.chipWrap, {marginTop: 8}]}>
                  {ctags.map(t => (
                    <TouchableOpacity key={t.id} style={styles.sportChip} onPress={() => toggleCtag({id: t.id, username: t.name})}>
                      <Text style={styles.sportChipText}>@{t.name}</Text><Text style={styles.sportChipX}>  ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {ctagOpen && (
                <View style={styles.dropList}>
                  <TextInput style={[styles.input, {margin: 8}]} placeholder="Search people to tag…" placeholderTextColor={TEXT3} value={ctagQuery} onChangeText={setCtagQuery} />
                  <ScrollView style={{maxHeight: 180}} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {ctagOptions.length ? ctagOptions.map(u => {
                      const on = ctags.some(t => t.id === u.id);
                      return (
                        <TouchableOpacity key={u.id} style={[styles.dropItem, on && styles.dropItemOn]} onPress={() => toggleCtag(u)}>
                          <Text style={[styles.dropItemText, on && {color: GOLD_TEXT, fontWeight: '600'}]}>@{u.username}</Text>
                          {on && <Icon name="checkmark" size={16} color={GOLD_TEXT} />}
                        </TouchableOpacity>
                      );
                    }) : <Text style={{color: TEXT2, padding: 12}}>No people found</Text>}
                  </ScrollView>
                </View>
              )}
              <Text style={[styles.sectionLabel, {marginTop: 14}]}>{(p.comments || []).length} Comments · top</Text>
              {sorted.map((c, i) => (
                <View key={i} style={styles.tcomment}>
                  <Avatar name={c.authorName} size={32} photo={photoOf(c.authorId)} />
                  <View style={{flex: 1, marginLeft: 10}}>
                    <Text style={styles.author}>{c.authorName}</Text>
                    <Text style={styles.body}>{c.text}</Text>
                    {(c.tags || []).length > 0 && (
                      <View style={[styles.inlineTagRow, {marginTop: 4, marginBottom: 0}]}>
                        {(c.tags || []).map((t: any, j: number) => (
                          <TouchableOpacity key={t.id} onPress={() => { setThreadId(null); setViewUser({id: t.id, name: t.name, sport: ''}); }}>
                            <Text style={styles.inlineTag}>@{t.name}{j < (c.tags.length - 1) ? ', ' : ''}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {c.authorId === uid && <TouchableOpacity onPress={() => deleteComment(p, c)}><Text style={{color: '#B23', fontSize: 12, fontWeight: '600'}}>Delete</Text></TouchableOpacity>}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ---------- COMPOSER ----------
  function Composer() {
    const [text, setText] = useState('');
    const [sport, setSport] = useState(composer?.sport || 'football');
    const [photos, setPhotos] = useState<string[]>([]);
    const [tags, setTags] = useState<{id: string; name: string}[]>([]);
    const [tagOpen, setTagOpen] = useState(false);
    const [tagQuery, setTagQuery] = useState('');
    const [postTarget, setPostTarget] = useState(composer.target === 'group' ? composer.groupId : 'community');
    const targetOptions = [{id: 'community', label: 'Community'}, ...myGroups.map(g => ({id: g.id, label: g.name}))];
    const kind = composer.kind || 'post';
    const kindTitle = kind === 'question' ? 'Ask a question' : kind === 'achievement' ? 'Share an achievement' : (composer.target === 'group' ? 'Post to group' : 'Create a post');
    const kindPh = kind === 'question' ? "What's your question?" : kind === 'achievement' ? 'Share your achievement!' : 'Share news, a tip, a result…';
    function pick() {
      const remaining = 10 - photos.length;
      if (remaining <= 0) { setToast('You can add up to 10 photos'); return; }
      launchImageLibrary({mediaType: 'photo', maxWidth: 900, maxHeight: 900, quality: 0.6, includeBase64: true, selectionLimit: remaining}, (res: any) => {
        const added = (res.assets || []).filter((a: any) => a?.base64).map((a: any) => `data:${a.type || 'image/jpeg'};base64,${a.base64}`);
        if (added.length) setPhotos(prev => [...prev, ...added].slice(0, 10));
      });
    }
    const toggleTag = (u: any) => setTags(prev => prev.some(t => t.id === u.id) ? prev.filter(t => t.id !== u.id) : [...prev, {id: u.id, name: u.username}]);
    const tagOptions = users.filter(u => u.id !== uid && !blocked[u.id] && (u.username || '').toLowerCase().includes(tagQuery.trim().toLowerCase()));
    function post() {
      if (!text.trim() && !photos.length) { setToast('Write a message or add a photo'); return; }
      if (!clean(text)) return;
      // Close immediately and write in the background — never block the app on the network
      setComposer(null);
      setToast('Posted');
      addDoc(collection(db, 'cposts'), {
        authorId: uid, authorName: username, sport, groupId: postTarget === 'community' ? null : postTarget,
        announcement: false, kind, text: text.trim(), photo: photos[0] || null, photos, tags, votes: 0, comments: [], createdAt: serverTimestamp(),
      }).catch(() => setToast("Couldn't post — check your connection"));
      // Notify anyone tagged
      tags.forEach(t => addDoc(collection(db, 'notifs'), {
        toId: t.id, kind: 'tag', read: false,
        text: `${username} tagged you in a ${kind === 'achievement' ? 'achievement' : kind === 'question' ? 'question' : 'post'}`,
        createdAt: serverTimestamp(),
      }).catch(() => {}));
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setComposer(null)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>{kindTitle}</Text><TouchableOpacity onPress={() => setComposer(null)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Post to</Text>
            <SportPicker value={postTarget} onChange={setPostTarget} options={targetOptions} colors={c} small placeholder="Community" />
            <Text style={styles.label}>Sport</Text>
            <SportPicker value={sport} onChange={setSport} options={SPORTS_ABC} colors={c} small />

            <Text style={styles.label}>Photos ({photos.length}/10)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 4}}>
              {photos.map((ph, i) => (
                <View key={i} style={styles.composerThumbWrap}>
                  <Image source={{uri: ph}} style={styles.composerThumb} />
                  <TouchableOpacity style={styles.composerThumbX} onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))}><Icon name="close" size={13} color="#fff" /></TouchableOpacity>
                </View>
              ))}
              {photos.length < 4 && (
                <TouchableOpacity style={styles.composerAddTile} onPress={pick}><Icon name="camera-outline" size={22} color={GOLD} /></TouchableOpacity>
              )}
            </ScrollView>

            <Text style={styles.label}>Tag people</Text>
            {tags.length > 0 && (
              <View style={styles.chipWrap}>
                {tags.map(t => (
                  <TouchableOpacity key={t.id} style={styles.sportChip} onPress={() => toggleTag({id: t.id, username: t.name})}>
                    <Text style={styles.sportChipText}>@{t.name}</Text><Text style={styles.sportChipX}>  ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.dropBtn} onPress={() => setTagOpen(o => !o)}>
              <Text style={styles.dropBtnText}>{tags.length ? 'Tag more people' : 'Tag people'}</Text>
              <Icon name={tagOpen ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT2} />
            </TouchableOpacity>
            {tagOpen && (
              <View style={styles.dropList}>
                <TextInput style={[styles.input, {margin: 8}]} placeholder="Search people…" placeholderTextColor={TEXT3} value={tagQuery} onChangeText={setTagQuery} />
                <ScrollView style={{maxHeight: 200}} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {tagOptions.length ? tagOptions.map(u => {
                    const on = tags.some(t => t.id === u.id);
                    return (
                      <TouchableOpacity key={u.id} style={[styles.dropItem, on && styles.dropItemOn]} onPress={() => toggleTag(u)}>
                        <Text style={[styles.dropItemText, on && {color: GOLD_TEXT, fontWeight: '600'}]}>@{u.username}</Text>
                        {on && <Icon name="checkmark" size={16} color={GOLD_TEXT} />}
                      </TouchableOpacity>
                    );
                  }) : <Text style={{color: TEXT2, padding: 12}}>No people found</Text>}
                </ScrollView>
              </View>
            )}

            <Text style={styles.label}>{kind === 'question' ? 'Your question' : kind === 'achievement' ? 'Your achievement' : 'Description'}</Text>
            <TextInput style={styles.textArea} multiline placeholder={kindPh} placeholderTextColor={TEXT3} value={text} onChangeText={setText} />
            <Btn style={styles.primaryBtn} onPress={post}><Text style={styles.primaryBtnText}>Post</Text></Btn>
          </ScrollView>
        </View></View>
      </Modal>
    );
  }

  // ---------- CREATE GROUP ----------
  function CreateGroup() {
    const [name, setName] = useState('');
    const [sport, setSport] = useState('football');
    const [priv, setPriv] = useState(false);
    const [code, setCode] = useState('');
    const [desc, setDesc] = useState('');
    const [busy, setBusy] = useState(false);
    function create() {
      if (!name.trim()) { setToast('Give your group a name'); return; }
      if (priv && !code.trim()) { setToast('Set a join code for your private group'); return; }
      // Close immediately and write in the background — never block the app on the network
      setCreateOpen(false);
      setToast(priv ? 'Group created — join code: ' + code.trim().toUpperCase() : 'Group created');
      addDoc(collection(db, 'groups'), {
        name: name.trim(), sport, creatorId: uid, creatorName: username,
        roster: [{id: uid, name: username}], training: '', priv, code: code.trim().toUpperCase(),
        desc: desc.trim() || 'A new community group.', photo: null, createdAt: serverTimestamp(),
      }).catch(() => setToast("Couldn't create group — check your connection"));
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Create a group</Text><TouchableOpacity onPress={() => setCreateOpen(false)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <Text style={styles.label}>Group name</Text>
            <TextInput style={styles.input} placeholder="e.g. Sydney Sunday Runners" placeholderTextColor={TEXT3} value={name} onChangeText={setName} />
            <Text style={styles.label}>Sport</Text>
            <SportPicker value={sport} onChange={setSport} options={SPORTS_ABC} colors={c} small />
            <Text style={styles.label}>Privacy</Text>
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
              <TouchableOpacity style={[styles.pill, !priv && styles.pillActive]} onPress={() => setPriv(false)}><Text style={[styles.pillText, !priv && {color: GOLD_TEXT}]}>Public</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.pill, priv && styles.pillActive]} onPress={() => setPriv(true)}><Text style={[styles.pillText, priv && {color: GOLD_TEXT}]}>Private (code)</Text></TouchableOpacity>
            </View>
            {priv && (<><Text style={styles.label}>Join code</Text><TextInput style={styles.input} placeholder="e.g. FOOTY2026" placeholderTextColor={TEXT3} autoCapitalize="characters" value={code} onChangeText={setCode} /></>)}
            <Text style={styles.label}>About</Text>
            <TextInput style={styles.textArea} multiline placeholder="Describe your group…" placeholderTextColor={TEXT3} value={desc} onChangeText={setDesc} />
            <Btn style={styles.primaryBtn} onPress={create} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create group</Text>}</Btn>
          </ScrollView>
        </View></View>
      </Modal>
    );
  }

  // ---------- JOIN A GROUP (private code) ----------
  function JoinGroup() {
    const [code, setCode] = useState('');
    function join() {
      const entered = code.trim().toUpperCase();
      if (!entered) { setToast('Enter a join code'); return; }
      const match = groups.find(g => g.priv && (g.code || '').toUpperCase() === entered);
      if (!match) { setToast('No private group matches that code'); return; }
      setJoinOpen(false);
      if (!isJoined(match)) joinGroup(match);
      setTimeout(() => setGroupId(match.id), 350);
      setToast(`Joined ${match.name}`);
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setJoinOpen(false)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Join a private group</Text><TouchableOpacity onPress={() => setJoinOpen(false)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
          <View style={styles.joinKeyWrap}><Icon name="key" size={26} color="#185FA5" /></View>
          <Text style={[styles.body, {textAlign: 'center', marginBottom: 4}]}>Enter the code the group owner gave you.</Text>
          <Text style={[styles.meta, {textAlign: 'center', marginBottom: 12}]}>Public groups don't need a code — just tap Join on them.</Text>
          <TextInput style={styles.joinCodeInput} placeholder="e.g. FOOTY2026" placeholderTextColor={TEXT3} autoCapitalize="characters" value={code} onChangeText={setCode} />
          <Btn style={styles.joinBlueBtn} onPress={join}><Text style={styles.primaryBtnText}>Join group</Text></Btn>
        </View></View>
      </Modal>
    );
  }

  // ---------- CREATE EVENT (moderator) ----------
  function CreateEvent() {
    const g = eventGroup; if (!g) return null;
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [loc, setLoc] = useState('');
    const [busy, setBusy] = useState(false);
    function create() {
      if (!title.trim()) { setToast('Give your event a name'); return; }
      if (!clean(title)) return;
      // Close immediately and write in the background — never block the app on the network
      setEventGroup(null);
      setToast('Event posted');
      addDoc(collection(db, 'cposts'), {
        authorId: uid, authorName: username, sport: g.sport, groupId: g.id, kind: 'event',
        eventTitle: title.trim(), eventDate: date.trim(), eventLocation: loc.trim(),
        attendees: [{id: uid, name: username}], announcement: false, text: '', photo: null, votes: 0, comments: [], createdAt: serverTimestamp(),
      }).catch(() => setToast("Couldn't post event — check your connection"));
    }
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setEventGroup(null)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Create an event</Text><TouchableOpacity onPress={() => setEventGroup(null)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <Text style={styles.label}>Event name</Text>
            <TextInput style={styles.input} placeholder="e.g. Saturday training session" placeholderTextColor={TEXT3} value={title} onChangeText={setTitle} />
            <Text style={styles.label}>Date & time</Text>
            <TextInput style={styles.input} placeholder="e.g. Sat 14 June, 10:00am" placeholderTextColor={TEXT3} value={date} onChangeText={setDate} />
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} placeholder="e.g. Queens Park, field 3" placeholderTextColor={TEXT3} value={loc} onChangeText={setLoc} />
            <Text style={{fontSize: 12, color: TEXT2, marginTop: 10}}>📢 All members will be notified, and can opt in or out.</Text>
            <Btn style={styles.primaryBtn} onPress={create} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Post event</Text>}</Btn>
          </ScrollView>
        </View></View>
      </Modal>
    );
  }

  // ---------- PROFILE ----------
  function ProfileScreen() {
    const myPosts = posts.filter(p => p.authorId === uid && !p.groupId && !p.announcement);
    const joined = groups.filter(g => isJoined(g));
    const mySports = profile.sports && profile.sports.length ? profile.sports : (profile.sport ? [profile.sport] : []);
    return (
      <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 90}}>
        <View style={styles.pageCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Avatar name={username} size={72} photo={profile.photo} />
            <View style={{flexDirection: 'row', flex: 1, justifyContent: 'space-around'}}>
              <View style={{alignItems: 'center'}}><Text style={styles.statNum}>{myPosts.length}</Text><Text style={styles.meta}>Posts</Text></View>
              <TouchableOpacity style={{alignItems: 'center'}} onPress={() => setListView('followers')}><Text style={styles.statNum}>{followerCount}</Text><Text style={styles.meta}>Followers</Text></TouchableOpacity>
              <TouchableOpacity style={{alignItems: 'center'}} onPress={() => setListView('following')}><Text style={styles.statNum}>{followingCount}</Text><Text style={styles.meta}>Following</Text></TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.groupTitle, {marginTop: 12}]}>{username}</Text>
          {mySports.length ? (
            <View style={[styles.chipWrap, {marginTop: 6, marginBottom: 0}]}>
              {mySports.map((id: string) => {
                const s = sportOf(id);
                return <View key={id} style={styles.sportChip}><Text style={styles.sportChipText}>{s?.label || id}</Text></View>;
              })}
            </View>
          ) : (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}><Text style={styles.meta}>No sports yet — tap Edit profile</Text></View>
          )}
          <Text style={[styles.body, {marginTop: 8}]}>{profile.bio || 'Add a bio to tell people about yourself and your sport.'}</Text>
          <View style={{flexDirection: 'row', gap: 10, marginTop: 14}}>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnAlt, {flex: 1}]} onPress={() => setEditOpen(true)}><Text style={styles.smallBtnText}>Edit profile</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnGold, {flex: 1}]} onPress={() => openComposerChooser('community', undefined, profile.sport)}><Text style={[styles.smallBtnText, {color: '#fff'}]}>+ New post</Text></TouchableOpacity>
          </View>
          {joined.length > 0 && (
            <View style={{marginTop: 14, borderTopWidth: 0.5, borderTopColor: BORDER, paddingTop: 12}}>
              <Text style={styles.infoTitle}>GROUPS YOU'RE IN</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8}}>
                {joined.map(g => <TouchableOpacity key={g.id} style={styles.chip} onPress={() => openGroup(g)}><Avatar name={g.name} size={22} photo={g.photo} /><Text style={{fontSize: 13, marginLeft: 6, color: TEXT}}>{g.name}</Text></TouchableOpacity>)}
              </View>
            </View>
          )}
        </View>

        <View style={styles.profileTabs}>
          <TouchableOpacity style={[styles.pTab, profileTab === 'posts' && styles.pTabActive]} onPress={() => setProfileTab('posts')}><Text style={[styles.pTabText, profileTab === 'posts' && {color: GOLD}]}>Posts</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.pTab, profileTab === 'saved' && styles.pTabActive]} onPress={() => setProfileTab('saved')}><Text style={[styles.pTabText, profileTab === 'saved' && {color: GOLD}]}>Saved</Text></TouchableOpacity>
        </View>
        {profileTab === 'posts'
          ? (myPosts.length ? myPosts.map(p => <PostCard key={p.id} p={p} onOpen={() => setThreadId(p.id)} />) : <Text style={{color: TEXT2, textAlign: 'center', padding: 24}}>No posts yet. Tap “New post”.</Text>)
          : (() => {
              const savedList = posts.filter(p => isPostSaved(p.id));
              return savedList.length ? savedList.map(p => <PostCard key={p.id} p={p} onOpen={() => setThreadId(p.id)} />) : <Text style={{color: TEXT2, textAlign: 'center', padding: 24}}>No saved posts yet — tap “Save” on any post.</Text>;
            })()}
      </ScrollView>
    );
  }

  // How many people are part of a sport, and how many of them you follow
  const followingIds = new Set(follows.filter(f => f.followerId === uid).map(f => f.followingId));
  const sportsOfUser = (u: any) => (u.sports && u.sports.length ? u.sports : [u.mainSport || u.sport].filter(Boolean));
  function sportCounts(sportId: string) {
    let members = 0, mutuals = 0;
    users.forEach(u => {
      if (sportsOfUser(u).includes(sportId)) {
        members++;
        if (u.id !== uid && followingIds.has(u.id)) mutuals++;
      }
    });
    return {members, mutuals};
  }

  function EditProfile() {
    const [sports, setSports] = useState<string[]>(
      profile.sports && profile.sports.length ? profile.sports : (profile.sport ? [profile.sport] : []),
    );
    const [bio, setBio] = useState(profile.bio);
    const [photo, setPhoto] = useState(profile.photo);
    const [dropOpen, setDropOpen] = useState(false);
    const toggleSport = (id: string) => setSports(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    function pick() {
      launchImageLibrary({mediaType: 'photo', maxWidth: 500, maxHeight: 500, quality: 0.8, includeBase64: true}, (res: any) => {
        const a = res.assets?.[0]; if (a?.base64) setPhoto(`data:${a.type || 'image/jpeg'};base64,${a.base64}`);
      });
    }
    function save() {
      const sport = sports[0] || '';
      setProfile({sport, sports, bio: bio.trim(), photo});
      setDoc(doc(db, 'users', uid), {sports, mainSport: sport || null, avatarPhoto: photo || null, bio: bio.trim()}, {merge: true});
      setEditOpen(false);
      setToast('Profile saved');
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Edit profile</Text><TouchableOpacity onPress={() => setEditOpen(false)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={{alignSelf: 'center', marginBottom: 8}} onPress={pick}><Avatar name={username} size={84} photo={photo} /><Text style={{textAlign: 'center', color: GOLD, fontSize: 12, marginTop: 4}}>Change photo</Text></TouchableOpacity>

            <Text style={styles.label}>Your sports</Text>
            {sports.length > 0 && (
              <View style={styles.chipWrap}>
                {sports.map(id => (
                  <TouchableOpacity key={id} style={styles.sportChip} onPress={() => toggleSport(id)}>
                    <Text style={styles.sportChipText}>{sportOf(id)?.label || id}</Text>
                    <Text style={styles.sportChipX}>  ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.dropBtn} onPress={() => setDropOpen(o => !o)}>
              <Text style={styles.dropBtnText}>{sports.length ? 'Add another sport' : 'Add a sport'}</Text>
              <Text style={styles.dropCaret}>{dropOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {dropOpen && (
              <View style={styles.dropList}>
                <ScrollView style={{maxHeight: 260}} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {SPORTS_ABC.map(s => {
                    const {members, mutuals} = sportCounts(s.id);
                    const on = sports.includes(s.id);
                    return (
                      <TouchableOpacity key={s.id} style={[styles.dropItem, on && styles.dropItemOn]} onPress={() => toggleSport(s.id)}>
                        <View style={{flex: 1}}>
                          <Text style={[styles.dropItemText, on && {color: GOLD_TEXT, fontWeight: '600'}]}>{s.label}</Text>
                          <Text style={styles.dropItemSub}>{members} {members === 1 ? 'person' : 'people'}{mutuals > 0 ? ` · ${mutuals} you follow` : ''}</Text>
                        </View>
                        {on && <Text style={{color: GOLD_TEXT, fontWeight: '700'}}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={styles.label}>Bio</Text>
            <TextInput style={styles.textArea} multiline placeholder="Tell people about you…" placeholderTextColor={TEXT3} value={bio} onChangeText={setBio} />
            <Btn style={styles.primaryBtn} onPress={save}><Text style={styles.primaryBtnText}>Save</Text></Btn>
          </ScrollView>
        </View></View>
      </Modal>
    );
  }

  // ---------- ANOTHER USER'S PROFILE PAGE ----------
  function UserProfilePage() {
    const u = viewUser; if (!u) return null;
    const userData = users.find(x => x.id === u.id);
    const sp = sportOf((userData && userData.mainSport) || u.sport);
    const theirPosts = posts.filter(p => p.authorId === u.id && !p.groupId && !p.announcement);
    const theirFollowers = follows.filter(f => f.followingId === u.id).length;
    const theirFollowing = follows.filter(f => f.followerId === u.id).length;
    const isMe = u.id === uid;
    return (
      <Modal visible animationType="slide" onRequestClose={() => setViewUser(null)}>
        <View style={{flex: 1, backgroundColor: BG3}}>
          <View style={styles.topbar}><TouchableOpacity style={styles.backBtn} onPress={() => setViewUser(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 50}}>
            <View style={styles.pageCard}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Avatar name={u.name} size={72} photo={photoOf(u.id)} />
                <View style={{flexDirection: 'row', flex: 1, justifyContent: 'space-around'}}>
                  <View style={{alignItems: 'center'}}><Text style={styles.statNum}>{theirPosts.length}</Text><Text style={styles.meta}>Posts</Text></View>
                  <View style={{alignItems: 'center'}}><Text style={styles.statNum}>{theirFollowers}</Text><Text style={styles.meta}>Followers</Text></View>
                  <View style={{alignItems: 'center'}}><Text style={styles.statNum}>{theirFollowing}</Text><Text style={styles.meta}>Following</Text></View>
                </View>
              </View>
              <Text style={[styles.groupTitle, {marginTop: 12}]}>{u.name}</Text>
              {sp && <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}><View style={[styles.sportDot, {backgroundColor: sp.bg}]} /><Text style={styles.meta}>  {sp.label}</Text></View>}
              {!isMe && (isFollowing(u.id)
                ? <Btn style={[styles.smallBtn, styles.smallBtnAlt, {marginTop: 14}]} onPress={() => unfollow(u.id)}><Text style={styles.smallBtnText}>Following — tap to unfollow</Text></Btn>
                : <Btn style={[styles.smallBtn, styles.smallBtnGold, {marginTop: 14}]} onPress={() => follow(u)}><Text style={[styles.smallBtnText, {color: '#fff'}]}>+ Follow</Text></Btn>
              )}
              {!isMe && (
                <View style={{flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12}}>
                  {onReport && (
                    <TouchableOpacity onPress={() => onReport({type: 'user', targetId: u.id, targetText: '', reportedId: u.id, reportedName: u.name})}>
                      <Text style={{fontSize: 13, color: TEXT3, fontWeight: '500'}}>Report</Text>
                    </TouchableOpacity>
                  )}
                  {onBlock && (
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Block ' + u.name + '?', "You won't see their posts, listings or messages anymore. You can unblock them in Settings.", [
                        {text: 'Cancel', style: 'cancel'},
                        {text: 'Block', style: 'destructive', onPress: () => { onBlock(u.id, u.name); setViewUser(null); }},
                      ]);
                    }}>
                      <Text style={{fontSize: 13, color: '#C0506E', fontWeight: '500'}}>Block</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.sectionLabel, {marginTop: 16}]}>{isMe ? 'Your posts' : 'Posts'}</Text>
            {theirPosts.length ? theirPosts.map(p => <PostCard key={p.id} p={p} onOpen={() => { setViewUser(null); setTimeout(() => setThreadId(p.id), 350); }} />) : <Text style={styles.noResult}>No posts yet.</Text>}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: BG3}}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Logo colors={c} />
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
            <TouchableOpacity onPress={() => onInbox && onInbox()}><Text style={{fontSize: 13, fontWeight: '600', color: TEXT2}}>Inbox</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onMenu && onMenu()}><Avatar name={username} size={32} photo={profile.photo} /></TouchableOpacity>
          </View>
        </View>
        {tab === 'community' && (
          <View style={styles.searchWrap}>
            <TextInput style={styles.searchInput} placeholder="Search people or groups" placeholderTextColor={TEXT3} value={search} onChangeText={setSearch} returnKeyType="search" />
            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{fontSize: 16, color: TEXT3}}>✕</Text></TouchableOpacity>}
          </View>
        )}
      </View>

      {loading
        ? <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}><ActivityIndicator size="large" color={GOLD} /><Text style={{color: TEXT2, marginTop: 10}}>Loading community…</Text></View>
        : (tab === 'community' ? CommunityFeed() : ProfileScreen())}

      {thread && <ThreadView />}
      {group && <GroupPage />}
      {composer && <Composer />}
      {createOpen && <CreateGroup />}
      {joinOpen && <JoinGroup />}
      {eventGroup && <CreateEvent />}
      {editOpen && <EditProfile />}

      {/* Sport filter dropdown */}
      {filterOpen && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
          <View style={styles.overlay}><View style={styles.sheet}>
            <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Filter by sport</Text><TouchableOpacity onPress={() => setFilterOpen(false)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
            <ScrollView>
              <TouchableOpacity style={styles.filterOption} onPress={() => { setSportFilter('all'); setFilterOpen(false); }}>
                <Text style={styles.filterOptionText}>All sports</Text>{sportFilter === 'all' && <Text style={{color: GOLD, fontWeight: '700'}}>✓</Text>}
              </TouchableOpacity>
              {SPORTS_ABC.map(s => (
                <TouchableOpacity key={s.id} style={styles.filterOption} onPress={() => { setSportFilter(s.id); setFilterOpen(false); }}>
                  <Text style={styles.filterOptionText}>{s.label}</Text>
                  {sportFilter === s.id && <Text style={{color: GOLD, fontWeight: '700'}}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View></View>
        </Modal>
      )}

      {/* Full profile page */}
      {viewUser && <UserProfilePage />}

      {/* Followers / Following list */}
      {listView && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setListView(null)}>
          <View style={styles.overlay}><View style={styles.sheet}>
            <View style={styles.sheetHead}><Text style={styles.sheetTitle}>{listView === 'followers' ? 'Followers' : 'Following'}</Text><TouchableOpacity onPress={() => setListView(null)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
            <ScrollView>
              {(listView === 'followers'
                ? follows.filter(f => f.followingId === uid).map(f => ({docId: f.id, id: f.followerId, name: f.followerName}))
                : follows.filter(f => f.followerId === uid).map(f => ({docId: f.id, id: f.followingId, name: f.followingName}))
              ).map(person => (
                <View key={person.docId} style={styles.shareRow}>
                  <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', flex: 1}} onPress={() => { setListView(null); setTimeout(() => setViewUser({id: person.id, name: person.name, sport: ''}), 350); }}>
                    <Avatar name={person.name} size={38} photo={photoOf(person.id)} />
                    <Text style={[styles.shareRowText, {marginLeft: 10}]}>{person.name}</Text>
                  </TouchableOpacity>
                  <Btn style={[styles.smallBtn, styles.smallBtnAlt, {paddingVertical: 6, paddingHorizontal: 14}]} onPress={() => removeFollowDoc(person.docId)}>
                    <Text style={[styles.smallBtnText, {fontSize: 13}]}>{listView === 'followers' ? 'Remove' : 'Unfollow'}</Text>
                  </Btn>
                </View>
              ))}
              {((listView === 'followers' ? followerCount : followingCount) === 0) && <Text style={styles.noResult}>{listView === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</Text>}
            </ScrollView>
          </View></View>
        </Modal>
      )}

      {/* Share sheet */}
      {sharePost && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSharePost(null)}>
          <View style={styles.overlay}><View style={styles.sheet}>
            <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Share</Text><TouchableOpacity onPress={() => setSharePost(null)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
            <ScrollView>
              <TouchableOpacity style={styles.shareOpt} onPress={() => { setSharePost(null); Alert.alert('Link copied', 'Post link copied (preview).'); }}>
                <Text style={styles.shareOptText}>Copy link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareOpt} onPress={() => { const p = sharePost; setSharePost(null); repost(p); }}>
                <Text style={styles.shareOptText}>Repost to feed</Text>
              </TouchableOpacity>

              <Text style={[styles.label, {marginTop: 14}]}>Share to a group</Text>
              {myGroups.length ? myGroups.map(g => (
                <TouchableOpacity key={g.id} style={styles.shareRow} onPress={() => shareToGroup(sharePost, g)}>
                  <Avatar name={g.name} size={34} photo={g.photo} />
                  <Text style={styles.shareRowText}>{g.name}</Text>
                </TouchableOpacity>
              )) : <Text style={styles.noResult}>Join a group to share into it.</Text>}

              <Text style={[styles.label, {marginTop: 14}]}>Send to a follower</Text>
              {myFollowers.length ? myFollowers.map(f => (
                <TouchableOpacity key={f.id} style={styles.shareRow} onPress={() => shareToFollower(sharePost, f)}>
                  <Avatar name={f.name} size={34} />
                  <Text style={styles.shareRowText}>{f.name}</Text>
                </TouchableOpacity>
              )) : <Text style={styles.noResult}>No followers yet.</Text>}
            </ScrollView>
          </View></View>
        </Modal>
      )}

      {/* Share chooser — clean in-app sheet */}
      {chooser && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setChooser(null)}>
          <View style={styles.overlay}><View style={styles.sheet}>
            <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Share something</Text><TouchableOpacity onPress={() => setChooser(null)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
            {[
              {kind: 'post', label: 'Create a post', sub: 'Share news, a tip or a result'},
              {kind: 'question', label: 'Ask a question', sub: 'Get help from the community'},
              {kind: 'achievement', label: 'Share an achievement', sub: 'Celebrate a win or milestone'},
            ].map(opt => (
              <TouchableOpacity key={opt.kind} style={styles.chooseRow}
                onPress={() => {
                  const ch = chooser; setChooser(null);
                  // Wait for this sheet to finish closing before opening the composer —
                  // opening a second modal mid-dismiss freezes touches on iOS.
                  setTimeout(() => setComposer({target: ch.target, groupId: ch.groupId, sport: ch.sport, kind: opt.kind}), 350);
                }}>
                <View style={{flex: 1}}>
                  <Text style={styles.chooseLabel}>{opt.label}</Text>
                  <Text style={styles.chooseSub}>{opt.sub}</Text>
                </View>
                <Text style={styles.chooseChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View></View>
        </Modal>
      )}

      <Toast message={toast} onHide={() => setToast('')} colors={c} />
      <ConfirmModal data={confirm} onClose={() => setConfirm(null)} colors={c} />
    </SafeAreaView>
  );
}

function makeStyles(c: any) {
  const {GOLD, GOLD_DARK, GOLD_LIGHT, GOLD_TEXT, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER} = c;
  return StyleSheet.create({
  header: {backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerLogo: {fontSize: 18, fontWeight: '700', color: GOLD},
  searchWrap: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginTop: 10, borderWidth: 0.5, borderColor: BORDER},
  searchInput: {flex: 1, fontSize: 14, color: TEXT, padding: 0},
  avatar: {alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  sportTag: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4},
  sportDot: {width: 8, height: 8, borderRadius: 4, marginRight: 6},
  sportTagText: {fontSize: 11, color: TEXT2, fontWeight: '600'},
  card: {backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: {width: 0, height: 4}, elevation: 2},
  cardHead: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  author: {fontSize: 14, fontWeight: '600', color: TEXT},
  meta: {fontSize: 12, color: TEXT2},
  body: {fontSize: 14, color: TEXT, lineHeight: 21, marginBottom: 12},
  postImg: {width: '100%', height: 220, borderRadius: 8, marginBottom: 12, resizeMode: 'cover'},
  composerThumbWrap: {width: 90, height: 90, marginRight: 8, borderRadius: 10, overflow: 'hidden', position: 'relative'},
  composerThumb: {width: 90, height: 90, borderRadius: 10},
  composerThumbX: {position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center'},
  composerAddTile: {width: 90, height: 90, borderRadius: 10, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', backgroundColor: BG2, alignItems: 'center', justifyContent: 'center'},
  photoPager: {width: '100%', height: 240, borderRadius: 10, marginBottom: 12, position: 'relative'},
  photoPagerImg: {height: 240, borderRadius: 10, resizeMode: 'cover'},
  photoDots: {position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6},
  photoDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)'},
  photoDotOn: {backgroundColor: '#fff'},
  tagHintPill: {position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5},
  tagHintText: {color: '#fff', fontSize: 11, fontWeight: '600'},
  tagOverlay: {position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  tagOverlayChip: {backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5},
  tagOverlayChipText: {color: '#111', fontSize: 12, fontWeight: '600'},
  inlineTagRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8},
  inlineTag: {color: '#185FA5', fontSize: 13, fontWeight: '600'},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  iconBtn: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16},
  iconCount: {fontSize: 13, fontWeight: '600', color: TEXT2},
  repostLabel: {fontSize: 12, color: TEXT2, fontWeight: '600', marginBottom: 8},
  repostBadge: {flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8},
  repostBadgeText: {fontSize: 12, color: GOLD_DARK, fontWeight: '700'},
  shareOpt: {paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: BORDER},
  shareOptText: {fontSize: 15, fontWeight: '500', color: TEXT},
  shareRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  shareRowText: {fontSize: 14, color: TEXT, fontWeight: '500'},
  votePill: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 4, paddingVertical: 2},
  voteArrow: {fontSize: 16, color: TEXT2, paddingHorizontal: 8, paddingVertical: 4},
  voteScore: {fontSize: 14, fontWeight: '700', color: TEXT, minWidth: 24, textAlign: 'center'},
  actPill: {backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8},
  actPillText: {fontSize: 13, fontWeight: '600', color: TEXT2},
  composerBar: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 18, padding: 14, marginBottom: 16},
  composerPh: {flex: 1, marginLeft: 10, color: TEXT3, fontSize: 14},
  sectionLabel: {fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: TEXT3, marginBottom: 10},
  createGroupCard: {width: 120, backgroundColor: BG, borderWidth: 1, borderColor: GOLD, borderStyle: 'dashed', borderRadius: 18, padding: 12, marginRight: 10, alignItems: 'center', justifyContent: 'center'},
  createGroupText: {fontSize: 12, fontWeight: '600', color: GOLD, marginTop: 4},
  joinGroupCard: {width: 120, backgroundColor: BG, borderWidth: 1, borderColor: '#378ADD', borderStyle: 'dashed', borderRadius: 18, padding: 12, marginRight: 10, alignItems: 'center', justifyContent: 'center'},
  joinGroupText: {fontSize: 12, fontWeight: '600', color: '#185FA5', marginTop: 4},
  joinKeyWrap: {alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: '#E6F1FB', alignItems: 'center', justifyContent: 'center', marginBottom: 12, marginTop: 4},
  joinCodeInput: {borderWidth: 1, borderColor: '#378ADD', borderRadius: 10, padding: 14, fontSize: 18, fontWeight: '700', letterSpacing: 2, textAlign: 'center', color: TEXT, backgroundColor: BG2},
  joinBlueBtn: {backgroundColor: '#185FA5', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 16},
  groupCard: {width: 152, backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 18, padding: 12, marginRight: 10},
  groupCardName: {fontSize: 13, fontWeight: '600', color: TEXT, marginTop: 8},
  groupCardMembers: {fontSize: 11, color: TEXT2, marginBottom: 8},
  joinBtn: {backgroundColor: GOLD_LIGHT, borderWidth: 0.5, borderColor: '#E3B948', borderRadius: 6, paddingVertical: 5, alignItems: 'center'},
  joinedBtn: {backgroundColor: GOLD, borderColor: GOLD},
  joinBtnText: {fontSize: 12, fontWeight: '600', color: GOLD_TEXT},
  topbar: {backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, paddingTop: 50},
  backBtn: {alignSelf: 'flex-start', backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8},
  backText: {fontSize: 14, fontWeight: '600', color: TEXT},
  pageCard: {backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 22, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: {width: 0, height: 4}, elevation: 2},
  groupTitle: {fontSize: 19, fontWeight: '700', color: TEXT},
  modLine: {fontSize: 12, color: TEXT2, marginTop: 3},
  smallBtn: {borderRadius: 14, paddingVertical: 11, paddingHorizontal: 18, alignItems: 'center'},
  smallBtnGold: {backgroundColor: GOLD},
  smallBtnAlt: {backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER},
  smallBtnText: {fontSize: 14, fontWeight: '600', color: TEXT},
  infoCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, padding: 12, marginTop: 12},
  infoTitle: {fontSize: 11, fontWeight: '700', letterSpacing: 0.3, color: TEXT3},
  infoText: {fontSize: 14, color: TEXT, fontWeight: '500'},
  modBox: {backgroundColor: GOLD_LIGHT, borderWidth: 0.5, borderColor: '#E3B948', borderRadius: 8, padding: 12, marginTop: 12},
  modBoxTitle: {fontSize: 12, fontWeight: '700', color: GOLD_DARK, marginBottom: 10},
  modBtn: {backgroundColor: BG, borderWidth: 0.5, borderColor: '#E3B948', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8},
  modBtnText: {fontSize: 13, fontWeight: '600', color: GOLD_DARK},
  memberRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 6},
  announce: {backgroundColor: GOLD_LIGHT, borderWidth: 0.5, borderColor: '#E3B948', borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 8, padding: 12, marginBottom: 12},
  announceHead: {fontSize: 11, fontWeight: '700', color: GOLD_DARK, marginBottom: 5},
  commentRow: {flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center'},
  commentInput: {flex: 1, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: TEXT},
  commentTagBtn: {width: 38, height: 38, borderRadius: 19, borderWidth: 0.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center'},
  commentSend: {backgroundColor: GOLD, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9},
  tcomment: {flexDirection: 'row', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: BORDER},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, maxHeight: '90%'},
  sheetHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14},
  sheetTitle: {fontSize: 17, fontWeight: '600', color: TEXT},
  x: {fontSize: 22, color: TEXT2},
  label: {fontSize: 12, color: TEXT2, marginTop: 12, marginBottom: 6},
  input: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, padding: 11, fontSize: 14, color: TEXT},
  textArea: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, padding: 11, fontSize: 14, color: TEXT, height: 90, textAlignVertical: 'top'},
  photoDrop: {height: 140, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 8, backgroundColor: BG2, alignItems: 'center', justifyContent: 'center'},
  pill: {backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8},
  pillActive: {backgroundColor: GOLD_LIGHT, borderColor: GOLD},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8},
  sportChip: {flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD_LIGHT, borderWidth: 0.5, borderColor: GOLD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7},
  sportChipText: {fontSize: 13, color: GOLD_TEXT, fontWeight: '600'},
  sportChipX: {fontSize: 12, color: GOLD_TEXT},
  dropBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: BG},
  dropBtnText: {fontSize: 14, color: TEXT},
  dropCaret: {fontSize: 10, color: TEXT2},
  dropList: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, backgroundColor: BG, marginTop: 6, overflow: 'hidden'},
  dropItem: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: BORDER},
  dropItemOn: {backgroundColor: GOLD_LIGHT},
  dropItemText: {fontSize: 14, color: TEXT},
  dropItemSub: {fontSize: 11, color: TEXT2, marginTop: 2},
  pillText: {fontSize: 12, color: TEXT2},
  primaryBtn: {backgroundColor: GOLD, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 18, shadowColor: GOLD, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: {width: 0, height: 4}, elevation: 3},
  primaryBtnText: {color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3},
  annBadge: {backgroundColor: GOLD_LIGHT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8},
  annBadgeText: {fontSize: 11, fontWeight: '700', color: GOLD_DARK},
  starBadge: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3D6', borderWidth: 0.5, borderColor: '#E3B948', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8},
  starBadgeText: {fontSize: 11, fontWeight: '700', color: GOLD_DARK},
  qBadge: {backgroundColor: '#E6F1FB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8},
  qBadgeText: {fontSize: 11, fontWeight: '700', color: '#0C447C'},
  medalBtn: {flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 0.5, borderColor: BG2},
  medalBtnActive: {backgroundColor: GOLD_LIGHT, borderColor: GOLD},
  medalText: {fontSize: 14, fontWeight: '700', color: TEXT},
  cardPinned: {borderColor: GOLD, borderWidth: 1},
  cardAchievement: {borderColor: GOLD, borderWidth: 1},
  cardRepost: {borderColor: GOLD, borderWidth: 1, backgroundColor: GOLD_LIGHT},
  cardQuestion: {borderColor: '#378ADD', borderWidth: 1},
  pinBadge: {backgroundColor: GOLD_LIGHT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8},
  pinBadgeText: {fontSize: 11, fontWeight: '700', color: GOLD_DARK},
  eventCard: {backgroundColor: BG, borderWidth: 1, borderColor: GOLD, borderRadius: 12, padding: 14, marginBottom: 12},
  eventTitle: {fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 6},
  eventMeta: {fontSize: 13, color: TEXT2, marginTop: 2},
  statNum: {fontSize: 20, fontWeight: '700', color: TEXT},
  chip: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5},
  profileTabs: {flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, marginTop: 16, marginBottom: 8},
  pTab: {flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent'},
  pTabActive: {borderBottomColor: GOLD},
  pTabText: {fontSize: 14, fontWeight: '600', color: TEXT2},
  filterBtn: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7},
  filterBtnText: {fontSize: 13, fontWeight: '600', color: TEXT},
  chooseRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 10},
  chooseLabel: {fontSize: 15, fontWeight: '600', color: TEXT},
  chooseSub: {fontSize: 12, color: TEXT2, marginTop: 2},
  chooseChevron: {fontSize: 22, color: TEXT3, marginLeft: 10},
  filterOption: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: BORDER},
  filterOptionText: {fontSize: 15, color: TEXT},
  resultRow: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, padding: 10, marginBottom: 8},
  resultName: {fontSize: 15, fontWeight: '600', color: TEXT},
  noResult: {fontSize: 13, color: TEXT2, paddingVertical: 6},
  trendRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11},
  trendRank: {fontSize: 16, fontWeight: '800', color: GOLD, width: 22, textAlign: 'center'},
  trendText: {fontSize: 14, fontWeight: '600', color: TEXT},
  trendVotes: {fontSize: 13, fontWeight: '700', color: TEXT2},
  sortToggle: {flexDirection: 'row', backgroundColor: BG2, borderRadius: 18, padding: 3, borderWidth: 0.5, borderColor: BORDER},
  sortOpt: {paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15},
  sortOptActive: {backgroundColor: BG, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: {width: 0, height: 1}, elevation: 1},
  sortOptText: {fontSize: 13, fontWeight: '500', color: TEXT2},
  sortOptTextActive: {color: GOLD, fontWeight: '700'},
  });
}
