import React, {useState, useEffect} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Image, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {db} from './firebase';
import {
  collection, addDoc, onSnapshot, orderBy, query, serverTimestamp,
  doc, updateDoc, deleteDoc,
} from 'firebase/firestore';

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
const BORDER = 'rgba(0,0,0,0.12)';

const SPORTS = [
  {id: 'football', label: 'Football', bg: '#EAF3DE'},
  {id: 'basketball', label: 'Basketball', bg: '#FAEEDA'},
  {id: 'tennis', label: 'Tennis', bg: '#EAF3DE'},
  {id: 'cycling', label: 'Cycling', bg: '#E6F1FB'},
  {id: 'swimming', label: 'Swimming', bg: '#E6F1FB'},
  {id: 'running', label: 'Running', bg: '#FAECE7'},
  {id: 'gym', label: 'Gym', bg: '#EEEDFE'},
  {id: 'cricket', label: 'Cricket', bg: '#EAF3DE'},
  {id: 'golf', label: 'Golf', bg: '#EAF3DE'},
  {id: 'surf', label: 'Surfing', bg: '#E6F1FB'},
];
const sportOf = (id: string) => SPORTS.find(s => s.id === id);

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

export default function CommunityApp({tab, username, uid, onInbox, onMenu}: {tab: string; username: string; uid: string; onInbox?: () => void; onMenu?: () => void}) {
  const [posts, setPosts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
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

  // Live data from Firebase
  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'cposts'), orderBy('createdAt', 'desc')), snap => {
      setPosts(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, 'groups'), snap => {
      setGroups(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => { u1(); u2(); };
  }, []);

  const thread = posts.find(p => p.id === threadId);
  const group = groups.find(g => g.id === groupId);
  const isMod = (g: any) => g && g.creatorId === uid;
  const isJoined = (g: any) => !!(g && (g.roster || []).some((m: any) => m.id === uid));
  const memberCount = (g: any) => (g.roster || []).length;

  async function votePost(p: any, dir: number) {
    const cur = myVotes[p.id] || 0;
    let nv = 0, delta = 0;
    if (cur === dir) { nv = 0; delta = -dir; } else { nv = dir; delta = dir - cur; }
    setMyVotes({...myVotes, [p.id]: nv});
    try { await updateDoc(doc(db, 'cposts', p.id), {votes: (p.votes || 0) + delta}); } catch (e) {}
  }
  async function addCommentTo(p: any, text: string) {
    if (!text.trim() || !clean(text)) return false;
    const next = [...(p.comments || []), {authorId: uid, authorName: username, text: text.trim(), votes: 0}];
    await updateDoc(doc(db, 'cposts', p.id), {comments: next});
    return true;
  }

  // ---------- POST CARD ----------
  function PostCard({p, onOpen}: any) {
    const mv = myVotes[p.id] || 0;
    return (
      <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.9}>
        {p.announcement && <View style={styles.annBadge}><Text style={styles.annBadgeText}>📢 Announcement</Text></View>}
        <View style={styles.cardHead}>
          <Avatar name={p.authorName} size={40} photo={p.authorId === uid ? profile.photo : null} />
          <View style={{flex: 1, marginLeft: 10}}>
            <Text style={styles.author}>{p.authorName}</Text>
            <Text style={styles.meta}>just now</Text>
          </View>
          <SportTag id={p.sport} />
        </View>
        {!!p.text && <Text style={styles.body}>{p.text}</Text>}
        {!!p.photo && <Image source={{uri: p.photo}} style={styles.postImg} />}
        <View style={styles.actions}>
          <View style={styles.votePill}>
            <TouchableOpacity onPress={() => votePost(p, 1)}><Text style={[styles.voteArrow, mv === 1 && {color: '#E8590C'}]}>▲</Text></TouchableOpacity>
            <Text style={styles.voteScore}>{p.votes || 0}</Text>
            <TouchableOpacity onPress={() => votePost(p, -1)}><Text style={[styles.voteArrow, mv === -1 && {color: '#4263EB'}]}>▼</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actPill} onPress={onOpen}><Text style={styles.actPillText}>💬 {(p.comments || []).length}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actPill} onPress={() => Alert.alert('Shared', 'Link copied (preview)')}><Text style={styles.actPillText}>↗ Share</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ---------- COMMUNITY FEED ----------
  function CommunityFeed() {
    const q = search.trim().toLowerCase();
    const feed = posts.filter(p => !p.groupId && (!q || (p.text || '').toLowerCase().includes(q) || (p.authorName || '').toLowerCase().includes(q)));
    return (
      <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 90}}>
        <TouchableOpacity style={styles.composerBar} onPress={() => setComposer({target: 'community'})}>
          <Avatar name={username} size={34} photo={profile.photo} />
          <Text style={styles.composerPh}>Share news, tips or a question…</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Discussion groups</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
          <TouchableOpacity style={styles.createGroupCard} onPress={() => setCreateOpen(true)}>
            <Text style={{fontSize: 22, color: GOLD}}>＋</Text>
            <Text style={styles.createGroupText}>Create group</Text>
          </TouchableOpacity>
          {[...groups].sort((a, b) => memberCount(b) - memberCount(a)).map(g => (
            <TouchableOpacity key={g.id} style={styles.groupCard} onPress={() => openGroup(g)}>
              <Avatar name={g.name} size={36} photo={g.photo} />
              <Text style={styles.groupCardName} numberOfLines={1}>{g.name}</Text>
              <Text style={styles.groupCardMembers}>{memberCount(g)} members{g.priv ? ' · Private' : ''}</Text>
              <View style={[styles.joinBtn, isJoined(g) && styles.joinedBtn]}>
                <Text style={[styles.joinBtnText, isJoined(g) && {color: '#fff'}]}>{isJoined(g) ? 'Visit' : (g.priv ? 'Join 🔒' : '+ Join')}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {groups.length === 0 && <Text style={{color: TEXT2, alignSelf: 'center', paddingHorizontal: 12}}>No groups yet — create the first one!</Text>}
        </ScrollView>

        {feed.length ? feed.map(p => <PostCard key={p.id} p={p} onOpen={() => setThreadId(p.id)} />)
          : <View style={{alignItems: 'center', paddingTop: 30}}><Text style={{fontWeight: '600', color: TEXT}}>No posts yet</Text><Text style={{color: TEXT2, marginTop: 4}}>Be the first to share something!</Text></View>}
      </ScrollView>
    );
  }

  // ---------- GROUPS ----------
  async function openGroup(g: any) {
    if (g.priv && !isJoined(g)) {
      if ((Alert as any).prompt) {
        (Alert as any).prompt('Private group', `Enter the join code for "${g.name}":`, async (code?: string) => {
          if (code == null) return;
          if (code.trim().toUpperCase() !== g.code) { Alert.alert('Incorrect code', 'You need the right code to join.'); return; }
          await joinGroup(g); setGroupId(g.id);
        });
      } else { Alert.alert('Private group', 'This group needs a code to join.'); }
      return;
    }
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
    const convos = all.filter(p => !p.announcement);
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
                  <Text style={styles.groupTitle}>{g.name}{g.priv ? '  🔒' : ''}</Text>
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
              {!!g.training && (<View style={styles.infoCard}><Text style={{fontSize: 20}}>🗓️</Text><View style={{marginLeft: 10}}><Text style={styles.infoTitle}>TRAINING TIMES</Text><Text style={styles.infoText}>{g.training}</Text></View></View>)}
              {mod && (
                <View style={styles.modBox}>
                  <Text style={styles.modBoxTitle}>⚙️ Moderator tools</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                    <TouchableOpacity style={styles.modBtn} onPress={() => makeAnnouncement(g)}><Text style={styles.modBtnText}>📢 Announce</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.modBtn} onPress={() => editTraining(g)}><Text style={styles.modBtnText}>🗓️ Training</Text></TouchableOpacity>
                  </View>
                  <Text style={[styles.infoTitle, {marginTop: 12, marginBottom: 6}]}>MEMBERS</Text>
                  {(g.roster || []).map((m: any) => (
                    <View key={m.id} style={styles.memberRow}>
                      <Avatar name={m.name} size={30} photo={m.id === uid ? profile.photo : null} />
                      <Text style={{flex: 1, marginLeft: 8, fontSize: 13, color: TEXT}}>{m.name}{m.id === g.creatorId ? ' · moderator' : ''}</Text>
                      {m.id !== g.creatorId && <TouchableOpacity onPress={() => removeMember(g, m.id)}><Text style={{color: '#B23', fontSize: 12, fontWeight: '600'}}>Remove</Text></TouchableOpacity>}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.composerBar, {marginTop: 14}]} onPress={() => setComposer({target: 'group', groupId: g.id, sport: g.sport})}>
              <Avatar name={username} size={34} photo={profile.photo} />
              <Text style={styles.composerPh}>Start a conversation in {g.name}…</Text>
            </TouchableOpacity>

            {anns.map(p => (<View key={p.id} style={styles.announce}><Text style={styles.announceHead}>📢 Announcement · {p.authorName}</Text><Text style={styles.body}>{p.text}</Text></View>))}
            <Text style={[styles.sectionLabel, {marginTop: 6}]}>Conversations</Text>
            {convos.length ? convos.map(p => <PostCard key={p.id} p={p} onOpen={() => setThreadId(p.id)} />)
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
    const sorted = [...(p.comments || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const mv = myVotes[p.id] || 0;
    return (
      <Modal visible animationType="slide" onRequestClose={() => setThreadId(null)}>
        <View style={{flex: 1, backgroundColor: BG3}}>
          <View style={styles.topbar}><TouchableOpacity style={styles.backBtn} onPress={() => setThreadId(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 60}}>
            <View style={styles.pageCard}>
              <View style={styles.cardHead}>
                <Avatar name={p.authorName} size={40} photo={p.authorId === uid ? profile.photo : null} />
                <View style={{flex: 1, marginLeft: 10}}><Text style={styles.author}>{p.authorName}</Text><Text style={styles.meta}>{sportOf(p.sport)?.label}</Text></View>
              </View>
              {!!p.text && <Text style={[styles.body, {fontSize: 16}]}>{p.text}</Text>}
              {!!p.photo && <Image source={{uri: p.photo}} style={styles.postImg} />}
              <View style={styles.actions}>
                <View style={styles.votePill}>
                  <TouchableOpacity onPress={() => votePost(p, 1)}><Text style={[styles.voteArrow, mv === 1 && {color: '#E8590C'}]}>▲</Text></TouchableOpacity>
                  <Text style={styles.voteScore}>{p.votes || 0}</Text>
                  <TouchableOpacity onPress={() => votePost(p, -1)}><Text style={[styles.voteArrow, mv === -1 && {color: '#4263EB'}]}>▼</Text></TouchableOpacity>
                </View>
                <View style={styles.actPill}><Text style={styles.actPillText}>💬 {(p.comments || []).length}</Text></View>
              </View>
              <View style={styles.commentRow}>
                <TextInput style={styles.commentInput} placeholder="Add a comment…" placeholderTextColor={TEXT3} value={ct} onChangeText={setCt} />
                <TouchableOpacity style={styles.commentSend} onPress={async () => { if (await addCommentTo(p, ct)) setCt(''); }}><Text style={{color: '#fff', fontWeight: '600'}}>Send</Text></TouchableOpacity>
              </View>
              <Text style={[styles.sectionLabel, {marginTop: 14}]}>{(p.comments || []).length} Comments · top</Text>
              {sorted.map((c, i) => (
                <View key={i} style={styles.tcomment}>
                  <Avatar name={c.authorName} size={32} photo={c.authorId === uid ? profile.photo : null} />
                  <View style={{flex: 1, marginLeft: 10}}><Text style={styles.author}>{c.authorName}</Text><Text style={styles.body}>{c.text}</Text></View>
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
    const [photo, setPhoto] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    function pick() {
      launchImageLibrary({mediaType: 'photo', maxWidth: 1000, maxHeight: 1000, quality: 0.7, includeBase64: true}, (res: any) => {
        const a = res.assets?.[0]; if (a?.base64) setPhoto(`data:${a.type || 'image/jpeg'};base64,${a.base64}`);
      });
    }
    async function post() {
      if (!text.trim() && !photo) { Alert.alert('Add something', 'Write a message or add a photo.'); return; }
      if (!clean(text)) return;
      setBusy(true);
      await addDoc(collection(db, 'cposts'), {
        authorId: uid, authorName: username, sport, groupId: composer.target === 'group' ? composer.groupId : null,
        announcement: false, text: text.trim(), photo, votes: 0, comments: [], createdAt: serverTimestamp(),
      });
      setBusy(false); setComposer(null);
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setComposer(null)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>{composer.target === 'group' ? 'Post to group' : 'Create a post'}</Text><TouchableOpacity onPress={() => setComposer(null)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <Text style={styles.label}>Sport</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
              {SPORTS.map(s => <TouchableOpacity key={s.id} onPress={() => setSport(s.id)} style={[styles.pill, sport === s.id && styles.pillActive]}><Text style={[styles.pillText, sport === s.id && {color: GOLD_TEXT}]}>{s.label}</Text></TouchableOpacity>)}
            </ScrollView>
            <Text style={styles.label}>Photo (optional)</Text>
            <TouchableOpacity style={styles.photoDrop} onPress={pick}>{photo ? <Image source={{uri: photo}} style={{width: '100%', height: '100%', borderRadius: 8}} /> : <Text style={{color: TEXT2}}>📷  Add a photo</Text>}</TouchableOpacity>
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.textArea} multiline placeholder="Share news, a tip, a result…" placeholderTextColor={TEXT3} value={text} onChangeText={setText} />
            <TouchableOpacity style={styles.primaryBtn} onPress={post} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Post</Text>}</TouchableOpacity>
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
    async function create() {
      if (!name.trim()) { Alert.alert('Name needed', 'Give your group a name.'); return; }
      if (priv && !code.trim()) { Alert.alert('Code needed', 'Set a join code for your private group.'); return; }
      setBusy(true);
      await addDoc(collection(db, 'groups'), {
        name: name.trim(), sport, creatorId: uid, creatorName: username,
        roster: [{id: uid, name: username}], training: '', priv, code: code.trim().toUpperCase(),
        desc: desc.trim() || 'A new community group.', photo: null, createdAt: serverTimestamp(),
      });
      setBusy(false); setCreateOpen(false);
      if (priv) Alert.alert('Private group created', 'Your join code is: ' + code.trim().toUpperCase());
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Create a group</Text><TouchableOpacity onPress={() => setCreateOpen(false)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <Text style={styles.label}>Group name</Text>
            <TextInput style={styles.input} placeholder="e.g. Sydney Sunday Runners" placeholderTextColor={TEXT3} value={name} onChangeText={setName} />
            <Text style={styles.label}>Sport</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
              {SPORTS.map(s => <TouchableOpacity key={s.id} onPress={() => setSport(s.id)} style={[styles.pill, sport === s.id && styles.pillActive]}><Text style={[styles.pillText, sport === s.id && {color: GOLD_TEXT}]}>{s.label}</Text></TouchableOpacity>)}
            </ScrollView>
            <Text style={styles.label}>Privacy</Text>
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
              <TouchableOpacity style={[styles.pill, !priv && styles.pillActive]} onPress={() => setPriv(false)}><Text style={[styles.pillText, !priv && {color: GOLD_TEXT}]}>Public</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.pill, priv && styles.pillActive]} onPress={() => setPriv(true)}><Text style={[styles.pillText, priv && {color: GOLD_TEXT}]}>Private (code)</Text></TouchableOpacity>
            </View>
            {priv && (<><Text style={styles.label}>Join code</Text><TextInput style={styles.input} placeholder="e.g. FOOTY2026" placeholderTextColor={TEXT3} autoCapitalize="characters" value={code} onChangeText={setCode} /></>)}
            <Text style={styles.label}>About</Text>
            <TextInput style={styles.textArea} multiline placeholder="Describe your group…" placeholderTextColor={TEXT3} value={desc} onChangeText={setDesc} />
            <TouchableOpacity style={styles.primaryBtn} onPress={create} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create group</Text>}</TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>
    );
  }

  // ---------- PROFILE ----------
  function ProfileScreen() {
    const myPosts = posts.filter(p => p.authorId === uid && !p.groupId && !p.announcement);
    const replies = posts.filter(p => (p.comments || []).some((c: any) => c.authorId === uid));
    const joined = groups.filter(g => isJoined(g));
    const sp = sportOf(profile.sport);
    return (
      <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 90}}>
        <View style={styles.pageCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Avatar name={username} size={72} photo={profile.photo} />
            <View style={{flexDirection: 'row', flex: 1, justifyContent: 'space-around'}}>
              <View style={{alignItems: 'center'}}><Text style={styles.statNum}>{myPosts.length}</Text><Text style={styles.meta}>Posts</Text></View>
              <View style={{alignItems: 'center'}}><Text style={styles.statNum}>{joined.length}</Text><Text style={styles.meta}>Groups</Text></View>
            </View>
          </View>
          <Text style={[styles.groupTitle, {marginTop: 12}]}>{username}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}><View style={[styles.sportDot, {backgroundColor: sp?.bg || '#ccc'}]} /><Text style={styles.meta}>  {sp?.label || 'All sports'}</Text></View>
          <Text style={[styles.body, {marginTop: 8}]}>{profile.bio || 'Add a bio to tell people about yourself and your sport.'}</Text>
          <View style={{flexDirection: 'row', gap: 10, marginTop: 14}}>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnAlt, {flex: 1}]} onPress={() => setEditOpen(true)}><Text style={styles.smallBtnText}>Edit profile</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnGold, {flex: 1}]} onPress={() => setComposer({target: 'community', sport: profile.sport})}><Text style={[styles.smallBtnText, {color: '#fff'}]}>+ New post</Text></TouchableOpacity>
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
          <TouchableOpacity style={[styles.pTab, profileTab === 'replies' && styles.pTabActive]} onPress={() => setProfileTab('replies')}><Text style={[styles.pTabText, profileTab === 'replies' && {color: GOLD}]}>Replies</Text></TouchableOpacity>
        </View>
        {profileTab === 'posts'
          ? (myPosts.length ? myPosts.map(p => <PostCard key={p.id} p={p} onOpen={() => setThreadId(p.id)} />) : <Text style={{color: TEXT2, textAlign: 'center', padding: 24}}>No posts yet. Tap “New post”.</Text>)
          : (replies.length ? replies.map(p => <PostCard key={p.id} p={p} onOpen={() => setThreadId(p.id)} />) : <Text style={{color: TEXT2, textAlign: 'center', padding: 24}}>No replies yet.</Text>)}
      </ScrollView>
    );
  }

  function EditProfile() {
    const [sport, setSport] = useState(profile.sport);
    const [bio, setBio] = useState(profile.bio);
    const [photo, setPhoto] = useState(profile.photo);
    function pick() {
      launchImageLibrary({mediaType: 'photo', maxWidth: 500, maxHeight: 500, quality: 0.8, includeBase64: true}, (res: any) => {
        const a = res.assets?.[0]; if (a?.base64) setPhoto(`data:${a.type || 'image/jpeg'};base64,${a.base64}`);
      });
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={styles.overlay}><View style={styles.sheet}>
          <View style={styles.sheetHead}><Text style={styles.sheetTitle}>Edit profile</Text><TouchableOpacity onPress={() => setEditOpen(false)}><Text style={styles.x}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <TouchableOpacity style={{alignSelf: 'center', marginBottom: 8}} onPress={pick}><Avatar name={username} size={84} photo={photo} /><Text style={{textAlign: 'center', color: GOLD, fontSize: 12, marginTop: 4}}>Change photo</Text></TouchableOpacity>
            <Text style={styles.label}>Main sport</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
              {SPORTS.map(s => <TouchableOpacity key={s.id} onPress={() => setSport(s.id)} style={[styles.pill, sport === s.id && styles.pillActive]}><Text style={[styles.pillText, sport === s.id && {color: GOLD_TEXT}]}>{s.label}</Text></TouchableOpacity>)}
            </ScrollView>
            <Text style={styles.label}>Bio</Text>
            <TextInput style={styles.textArea} multiline placeholder="Tell people about you…" placeholderTextColor={TEXT3} value={bio} onChangeText={setBio} />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setProfile({sport, bio: bio.trim(), photo}); setEditOpen(false); }}><Text style={styles.primaryBtnText}>Save</Text></TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: BG3}}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLogo}>🏆 SportsSwap</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
            <TouchableOpacity onPress={() => onInbox && onInbox()}><Text style={{fontSize: 22}}>💬</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onMenu && onMenu()}><Avatar name={username} size={32} photo={profile.photo} /></TouchableOpacity>
          </View>
        </View>
        {tab === 'community' && (
          <View style={styles.searchWrap}>
            <Text style={{fontSize: 14}}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Search people or posts…" placeholderTextColor={TEXT3} value={search} onChangeText={setSearch} />
          </View>
        )}
      </View>

      {loading
        ? <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}><ActivityIndicator size="large" color={GOLD} /><Text style={{color: TEXT2, marginTop: 10}}>Loading community…</Text></View>
        : (tab === 'community' ? <CommunityFeed /> : <ProfileScreen />)}

      {thread && <ThreadView />}
      {group && <GroupPage />}
      {composer && <Composer />}
      {createOpen && <CreateGroup />}
      {editOpen && <EditProfile />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerLogo: {fontSize: 18, fontWeight: '700', color: GOLD},
  searchWrap: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginTop: 10, borderWidth: 0.5, borderColor: BORDER},
  searchInput: {flex: 1, fontSize: 14, color: TEXT, padding: 0},
  avatar: {alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  sportTag: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4},
  sportDot: {width: 8, height: 8, borderRadius: 4, marginRight: 6},
  sportTagText: {fontSize: 11, color: TEXT2, fontWeight: '600'},
  card: {backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, padding: 14, marginBottom: 14},
  cardHead: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  author: {fontSize: 14, fontWeight: '600', color: TEXT},
  meta: {fontSize: 12, color: TEXT2},
  body: {fontSize: 14, color: TEXT, lineHeight: 21, marginBottom: 12},
  postImg: {width: '100%', height: 220, borderRadius: 8, marginBottom: 12, resizeMode: 'cover'},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 10},
  votePill: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 4, paddingVertical: 2},
  voteArrow: {fontSize: 16, color: TEXT2, paddingHorizontal: 8, paddingVertical: 4},
  voteScore: {fontSize: 14, fontWeight: '700', color: TEXT, minWidth: 24, textAlign: 'center'},
  actPill: {backgroundColor: BG2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8},
  actPillText: {fontSize: 13, fontWeight: '600', color: TEXT2},
  composerBar: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, padding: 12, marginBottom: 16},
  composerPh: {flex: 1, marginLeft: 10, color: TEXT3, fontSize: 14},
  sectionLabel: {fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: TEXT3, marginBottom: 10},
  createGroupCard: {width: 120, backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, padding: 12, marginRight: 10, alignItems: 'center', justifyContent: 'center'},
  createGroupText: {fontSize: 12, fontWeight: '600', color: GOLD, marginTop: 4},
  groupCard: {width: 150, backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, padding: 12, marginRight: 10},
  groupCardName: {fontSize: 13, fontWeight: '600', color: TEXT, marginTop: 8},
  groupCardMembers: {fontSize: 11, color: TEXT2, marginBottom: 8},
  joinBtn: {backgroundColor: GOLD_LIGHT, borderWidth: 0.5, borderColor: '#E3B948', borderRadius: 6, paddingVertical: 5, alignItems: 'center'},
  joinedBtn: {backgroundColor: GOLD, borderColor: GOLD},
  joinBtnText: {fontSize: 12, fontWeight: '600', color: GOLD_TEXT},
  topbar: {backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, paddingTop: 50},
  backBtn: {alignSelf: 'flex-start', backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8},
  backText: {fontSize: 14, fontWeight: '600', color: TEXT},
  pageCard: {backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, padding: 18},
  groupTitle: {fontSize: 19, fontWeight: '700', color: TEXT},
  modLine: {fontSize: 12, color: TEXT2, marginTop: 3},
  smallBtn: {borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center'},
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
  commentSend: {backgroundColor: GOLD, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9},
  tcomment: {flexDirection: 'row', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: BORDER},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: BG, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%'},
  sheetHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14},
  sheetTitle: {fontSize: 17, fontWeight: '600', color: TEXT},
  x: {fontSize: 22, color: TEXT2},
  label: {fontSize: 12, color: TEXT2, marginTop: 12, marginBottom: 6},
  input: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, padding: 11, fontSize: 14, color: TEXT},
  textArea: {borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, padding: 11, fontSize: 14, color: TEXT, height: 90, textAlignVertical: 'top'},
  photoDrop: {height: 140, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 8, backgroundColor: BG2, alignItems: 'center', justifyContent: 'center'},
  pill: {backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8},
  pillActive: {backgroundColor: GOLD_LIGHT, borderColor: GOLD},
  pillText: {fontSize: 12, color: TEXT2},
  primaryBtn: {backgroundColor: GOLD, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 18},
  primaryBtnText: {color: '#fff', fontSize: 15, fontWeight: '600'},
  annBadge: {backgroundColor: GOLD_LIGHT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8},
  annBadgeText: {fontSize: 11, fontWeight: '700', color: GOLD_DARK},
  statNum: {fontSize: 20, fontWeight: '700', color: TEXT},
  chip: {flexDirection: 'row', alignItems: 'center', backgroundColor: BG2, borderWidth: 0.5, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5},
  profileTabs: {flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, marginTop: 16, marginBottom: 8},
  pTab: {flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent'},
  pTabActive: {borderBottomColor: GOLD},
  pTabText: {fontSize: 14, fontWeight: '600', color: TEXT2},
});
