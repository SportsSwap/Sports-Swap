import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Image, Alert,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';

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
function sportOf(id: string) {
  return SPORTS.find(s => s.id === id);
}

const NAMES: any = {
  JR: 'Jordan Reilly', MK: 'Mia Kovac', SP: 'Sam Park',
  AL: 'Alex Lee', TW: 'Tom Walsh', CH: 'Charlie Hughes', You: 'You',
};
const AV_COLOR: any = {
  JR: '#EAF3DE', MK: '#E6F1FB', SP: '#FAECE7', AL: '#EEEDFE', TW: '#E6F1FB', CH: '#EAF3DE', You: '#E6F1FB',
};
function nameOf(init: string) { return NAMES[init] || init; }

// Profanity filter — keeps posts, comments and chats clean
const BANNED = new Set(['fuck','fucking','fucker','fucked','motherfucker','shit','shitty','bullshit','bitch','asshole','arsehole','ass','arse','bastard','cunt','dick','dickhead','piss','slut','whore','fag','faggot','retard','retarded','nigger','nigga','wank','wanker','prick','twat','douche','cock','bollocks']);
function hasProfanity(t: string) {
  return (t || '').toLowerCase().split(/[^a-z]+/).some(w => w && BANNED.has(w));
}
function clean(t: string) {
  if (hasProfanity(t)) {
    Alert.alert('Please keep it respectful', "Your message contains language that isn't allowed on SportsSwap and can't be posted.");
    return false;
  }
  return true;
}

let UID = 1000;
const seedPosts = () => ([
  {id: 1, author: 'JR', sport: 'football', time: '2h', text: 'Anyone watch the derby last night? That last-minute winner was unreal. What did everyone think of the ref though…', votes: 24, myVote: 0, comments: [{author: 'MK', text: 'Robbed us on that offside call!', votes: 46}, {author: 'SP', text: 'Best game of the season so far', votes: 12}]},
  {id: 2, author: 'CH', sport: 'running', time: '5h', text: 'Just smashed my 10k PB — 42:18! Switching to the Vaporfly 3s made a massive difference. Happy to answer any questions for anyone chasing a sub-45.', votes: 41, myVote: 0, comments: [{author: 'TW', text: 'Congrats! Those shoes are worth every cent', votes: 8}]},
  {id: 3, author: 'AL', sport: 'cycling', time: '1d', text: "Group ride this Sunday 7am from the city — all paces welcome. Looking to build a regular bunch. Drop a comment if you're keen.", votes: 18, myVote: 0, comments: []},
  {id: 4, author: 'SP', sport: 'tennis', time: '2d', text: 'Hot take: a good restring matters more than a new racket for most club players. Change my mind.', votes: 33, myVote: 0, comments: [{author: 'JR', text: '100% agree, fresh strings feel like a new frame', votes: 27}]},
]);
const seedGroups = () => ([
  {id: 1, name: 'Sydney Sunday Runners', sport: 'running', members: 342, joined: false, creator: 'CH', memberList: ['CH', 'AL', 'SP'], training: 'Sun 7am — Centennial Park main gate', priv: false, code: '', desc: 'Weekly social runs around Sydney. All paces welcome!'},
  {id: 2, name: 'Footy Tragics', sport: 'football', members: 1280, joined: true, creator: 'JR', memberList: ['JR', 'MK', 'SP', 'You'], training: 'Sat 10am — Queens Park field 3', priv: false, code: '', desc: 'For everyone who lives and breathes football. Match chat, transfers, banter.'},
  {id: 3, name: 'Tennis Ladder Club', sport: 'tennis', members: 156, joined: false, creator: 'SP', memberList: ['SP', 'JR'], training: '', priv: false, code: '', desc: 'Organise hits, find partners and climb the local ladder.'},
  {id: 4, name: 'Gym Gains', sport: 'gym', members: 874, joined: true, creator: 'You', memberList: ['You', 'CH', 'AL', 'TW'], training: 'Mon/Wed/Fri 6pm — PowerHouse Gym', priv: false, code: '', desc: 'Lifting tips, PBs and programs. No judgement, just gains.'},
]);

function Avatar({init, size, photo}: any) {
  return (
    <View style={[styles.avatar, {width: size, height: size, borderRadius: size / 2, backgroundColor: AV_COLOR[init] || BG2}]}>
      {photo ? <Image source={{uri: photo}} style={{width: size, height: size, borderRadius: size / 2}} />
        : <Text style={{fontSize: size * 0.4, fontWeight: '700', color: TEXT}}>{init === 'You' ? 'Me' : init}</Text>}
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

export default function CommunityApp({tab, username}: {tab: string; username: string}) {
  const [posts, setPosts] = useState<any[]>(seedPosts());
  const [groups, setGroups] = useState<any[]>(seedGroups());
  const [profile, setProfile] = useState<any>({name: username || 'You', sport: 'all', bio: '', photo: null});
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [profileTab, setProfileTab] = useState('posts');

  const [thread, setThread] = useState<any>(null);
  const [groupView, setGroupView] = useState<any>(null);
  const [composer, setComposer] = useState<any>(null); // {target:'community'|'group'}
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = () => { setPosts(p => [...p]); setGroups(g => [...g]); };

  function votePost(p: any, dir: number) {
    if (p.myVote === dir) { p.votes -= dir; p.myVote = 0; }
    else { p.votes += dir - (p.myVote || 0); p.myVote = dir; }
    refresh(); if (thread) setThread({...p});
  }

  // ---------- POST CARD ----------
  function PostCard({p, onOpen}: any) {
    return (
      <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.9}>
        {p.announcement && (
          <View style={styles.annBadge}><Text style={styles.annBadgeText}>📢 Announcement</Text></View>
        )}
        <View style={styles.cardHead}>
          <Avatar init={p.author} size={40} photo={p.author === 'You' ? profile.photo : null} />
          <View style={{flex: 1, marginLeft: 10}}>
            <Text style={styles.author}>{p.author === 'You' ? profile.name : nameOf(p.author)}</Text>
            <Text style={styles.meta}>{p.time} ago</Text>
          </View>
          <SportTag id={p.sport} />
        </View>
        {!!p.text && <Text style={styles.body}>{p.text}</Text>}
        {!!p.photo && <Image source={{uri: p.photo}} style={styles.postImg} />}
        <View style={styles.actions}>
          <View style={styles.votePill}>
            <TouchableOpacity onPress={() => votePost(p, 1)}><Text style={[styles.voteArrow, p.myVote === 1 && {color: '#E8590C'}]}>▲</Text></TouchableOpacity>
            <Text style={styles.voteScore}>{p.votes}</Text>
            <TouchableOpacity onPress={() => votePost(p, -1)}><Text style={[styles.voteArrow, p.myVote === -1 && {color: '#4263EB'}]}>▼</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actPill} onPress={onOpen}><Text style={styles.actPillText}>💬 {p.comments.length}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actPill} onPress={() => Alert.alert('Shared', 'Link copied (preview)')}><Text style={styles.actPillText}>↗ Share</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ---------- COMMUNITY FEED ----------
  function CommunityFeed() {
    return (
      <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 90}}>
        <TouchableOpacity style={styles.composerBar} onPress={() => setComposer({target: 'community'})}>
          <Avatar init="You" size={34} photo={profile.photo} />
          <Text style={styles.composerPh}>Share news, tips or a question…</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Discussion groups</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
          <TouchableOpacity style={styles.createGroupCard} onPress={() => setCreateOpen(true)}>
            <Text style={{fontSize: 22, color: GOLD}}>＋</Text>
            <Text style={styles.createGroupText}>Create group</Text>
          </TouchableOpacity>
          {[...groups].sort((a, b) => b.members - a.members).map(g => (
            <TouchableOpacity key={g.id} style={styles.groupCard} onPress={() => openGroup(g)}>
              <Avatar init={g.name[0]} size={36} photo={g.photo} />
              <Text style={styles.groupCardName} numberOfLines={1}>{g.name}</Text>
              <Text style={styles.groupCardMembers}>{g.members.toLocaleString()} members</Text>
              <View style={[styles.joinBtn, g.joined && styles.joinedBtn]}>
                <Text style={[styles.joinBtnText, g.joined && {color: '#fff'}]}>{g.joined ? 'Visit' : (g.priv ? 'Join 🔒' : '+ Join')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {posts.filter(p => !p.groupId).map(p => <PostCard key={p.id} p={p} onOpen={() => setThread(p)} />)}
      </ScrollView>
    );
  }

  // ---------- GROUPS ----------
  function openGroup(g: any) {
    if (g.priv && !g.joined) {
      Alert.prompt ? Alert.prompt('Private group', `Enter the join code for "${g.name}":`, (code?: string) => {
        if (code == null) return;
        if (code.trim().toUpperCase() !== g.code) { Alert.alert('Incorrect code', 'You need the right code to join.'); return; }
        g.joined = true; g.members += 1; setGroupView({...g});
      }) : (() => { g.joined = true; setGroupView({...g}); })();
      return;
    }
    setGroupView(g);
  }
  function toggleJoin(g: any) {
    g.joined = !g.joined; g.members += g.joined ? 1 : -1; refresh(); setGroupView({...g});
  }
  const isMod = (g: any) => g.creator === 'You';

  function makeAnnouncement(g: any) {
    Alert.prompt && Alert.prompt('New announcement', `Notify all ${g.members.toLocaleString()} members:`, (text?: string) => {
      if (!text || !text.trim() || !clean(text)) return;
      setPosts(prev => [{id: UID++, author: 'You', sport: g.sport, groupId: g.id, announcement: true, time: 'now', text: text.trim(), votes: 0, myVote: 0, comments: []}, ...prev]);
      Alert.alert('Announcement posted', `A notification was sent to all ${g.members.toLocaleString()} members.`);
    });
  }
  function editTraining(g: any) {
    Alert.prompt && Alert.prompt('Training times', 'Set training times:', (t?: string) => { if (t == null) return; g.training = t.trim(); refresh(); setGroupView({...g}); }, undefined, g.training);
  }
  function removeMember(g: any, init: string) {
    Alert.alert('Remove member', `Remove ${nameOf(init)} from ${g.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Remove', style: 'destructive', onPress: () => { g.memberList = g.memberList.filter((m: string) => m !== init); g.members -= 1; refresh(); setGroupView({...g}); }},
    ]);
  }

  function GroupPage() {
    const g = groupView; if (!g) return null;
    const all = posts.filter(p => p.groupId === g.id);
    const anns = all.filter(p => p.announcement);
    const convos = all.filter(p => !p.announcement);
    const mod = isMod(g);
    return (
      <Modal visible animationType="slide" onRequestClose={() => setGroupView(null)}>
        <View style={{flex: 1, backgroundColor: BG3}}>
          <View style={styles.topbar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setGroupView(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 50}}>
            <View style={styles.pageCard}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Avatar init={g.name[0]} size={64} photo={g.photo} />
                <View style={{flex: 1, marginLeft: 14}}>
                  <Text style={styles.groupTitle}>{g.name}{g.priv ? '  🔒' : ''}</Text>
                  <Text style={styles.meta}>{g.members.toLocaleString()} members · {sportOf(g.sport)?.label}</Text>
                  <Text style={styles.modLine}>Moderator: <Text style={{fontWeight: '700'}}>{nameOf(g.creator)}</Text>{mod ? ' (you)' : ''}</Text>
                </View>
              </View>
              <View style={{flexDirection: 'row', gap: 8, marginTop: 12}}>
                <TouchableOpacity style={[styles.smallBtn, g.joined ? styles.smallBtnAlt : styles.smallBtnGold]} onPress={() => toggleJoin(g)}>
                  <Text style={[styles.smallBtnText, !g.joined && {color: '#fff'}]}>{g.joined ? '✓ Joined' : '+ Join'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, styles.smallBtnAlt]} onPress={() => Alert.alert('Share group', 'Group link copied! Share it with friends.')}>
                  <Text style={styles.smallBtnText}>↗ Share</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.body, {marginTop: 12}]}>{g.desc}</Text>
              {!!g.training && (
                <View style={styles.infoCard}>
                  <Text style={{fontSize: 20}}>🗓️</Text>
                  <View style={{marginLeft: 10}}>
                    <Text style={styles.infoTitle}>TRAINING TIMES</Text>
                    <Text style={styles.infoText}>{g.training}</Text>
                  </View>
                </View>
              )}
              {mod && (
                <View style={styles.modBox}>
                  <Text style={styles.modBoxTitle}>⚙️ Moderator tools</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                    <TouchableOpacity style={styles.modBtn} onPress={() => makeAnnouncement(g)}><Text style={styles.modBtnText}>📢 Announce</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.modBtn} onPress={() => editTraining(g)}><Text style={styles.modBtnText}>🗓️ Training</Text></TouchableOpacity>
                  </View>
                  <Text style={[styles.infoTitle, {marginTop: 12, marginBottom: 6}]}>MEMBERS</Text>
                  {g.memberList.map((m: string) => (
                    <View key={m} style={styles.memberRow}>
                      <Avatar init={m} size={30} photo={m === 'You' ? profile.photo : null} />
                      <Text style={{flex: 1, marginLeft: 8, fontSize: 13, color: TEXT}}>{nameOf(m)}{m === g.creator ? ' · moderator' : ''}</Text>
                      {m !== g.creator && <TouchableOpacity onPress={() => removeMember(g, m)}><Text style={{color: '#B23', fontSize: 12, fontWeight: '600'}}>Remove</Text></TouchableOpacity>}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.composerBar, {marginTop: 14}]} onPress={() => setComposer({target: 'group', group: g})}>
              <Avatar init="You" size={34} photo={profile.photo} />
              <Text style={styles.composerPh}>Start a conversation in {g.name}…</Text>
            </TouchableOpacity>

            {anns.map(p => (
              <View key={p.id} style={styles.announce}>
                <Text style={styles.announceHead}>📢 Announcement · {nameOf(p.author)} · {p.time}</Text>
                <Text style={styles.body}>{p.text}</Text>
              </View>
            ))}
            <Text style={[styles.sectionLabel, {marginTop: 6}]}>Conversations</Text>
            {convos.length ? convos.map(p => <PostCard key={p.id} p={p} onOpen={() => setThread(p)} />)
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
    const sorted = [...p.comments].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    function addComment() {
      if (!ct.trim() || !clean(ct)) return;
      p.comments.push({author: 'You', text: ct.trim(), votes: 0});
      setCt(''); setThread({...p}); refresh();
    }
    return (
      <Modal visible animationType="slide" onRequestClose={() => setThread(null)}>
        <View style={{flex: 1, backgroundColor: BG3}}>
          <View style={styles.topbar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setThread(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 60}}>
            <View style={styles.pageCard}>
              <View style={styles.cardHead}>
                <Avatar init={p.author} size={40} photo={p.author === 'You' ? profile.photo : null} />
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.author}>{p.author === 'You' ? profile.name : nameOf(p.author)}</Text>
                  <Text style={styles.meta}>{p.time} ago · {sportOf(p.sport)?.label}</Text>
                </View>
              </View>
              {!!p.text && <Text style={[styles.body, {fontSize: 16}]}>{p.text}</Text>}
              {!!p.photo && <Image source={{uri: p.photo}} style={styles.postImg} />}
              <View style={styles.actions}>
                <View style={styles.votePill}>
                  <TouchableOpacity onPress={() => votePost(p, 1)}><Text style={[styles.voteArrow, p.myVote === 1 && {color: '#E8590C'}]}>▲</Text></TouchableOpacity>
                  <Text style={styles.voteScore}>{p.votes}</Text>
                  <TouchableOpacity onPress={() => votePost(p, -1)}><Text style={[styles.voteArrow, p.myVote === -1 && {color: '#4263EB'}]}>▼</Text></TouchableOpacity>
                </View>
                <View style={styles.actPill}><Text style={styles.actPillText}>💬 {p.comments.length}</Text></View>
              </View>
              <View style={styles.commentRow}>
                <TextInput style={styles.commentInput} placeholder="Add a comment…" placeholderTextColor={TEXT3} value={ct} onChangeText={setCt} />
                <TouchableOpacity style={styles.commentSend} onPress={addComment}><Text style={{color: '#fff', fontWeight: '600'}}>Send</Text></TouchableOpacity>
              </View>
              <Text style={[styles.sectionLabel, {marginTop: 14}]}>{p.comments.length} Comments · top</Text>
              {sorted.map((c, i) => (
                <View key={i} style={styles.tcomment}>
                  <Avatar init={c.author} size={32} photo={c.author === 'You' ? profile.photo : null} />
                  <View style={{flex: 1, marginLeft: 10}}>
                    <Text style={styles.author}>{c.author === 'You' ? profile.name : nameOf(c.author)}</Text>
                    <Text style={styles.body}>{c.text}</Text>
                    <Text style={{fontSize: 12, color: TEXT2, marginTop: 2}}>▲ {c.votes || 0}</Text>
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
    const [sport, setSport] = useState(composer?.group?.sport || 'football');
    const [photo, setPhoto] = useState<string | null>(null);
    function pick() {
      launchImageLibrary({mediaType: 'photo', maxWidth: 1000, maxHeight: 1000, quality: 0.7, includeBase64: true}, (res: any) => {
        const a = res.assets?.[0]; if (a?.base64) setPhoto(`data:${a.type || 'image/jpeg'};base64,${a.base64}`);
      });
    }
    function post() {
      if (!text.trim() && !photo) { Alert.alert('Add something', 'Write a message or add a photo.'); return; }
      if (!clean(text)) return;
      const np: any = {id: UID++, author: 'You', sport, time: 'now', text: text.trim(), photo, votes: 0, myVote: 0, comments: []};
      if (composer.target === 'group') { np.groupId = composer.group.id; setPosts(prev => [np, ...prev]); }
      else { setPosts(prev => [np, ...prev]); }
      setComposer(null);
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setComposer(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{composer.target === 'group' ? 'Post to ' + composer.group.name : 'Create a post'}</Text>
              <TouchableOpacity onPress={() => setComposer(null)}><Text style={styles.x}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
                {SPORTS.map(s => (
                  <TouchableOpacity key={s.id} onPress={() => setSport(s.id)} style={[styles.pill, sport === s.id && styles.pillActive]}>
                    <Text style={[styles.pillText, sport === s.id && {color: GOLD_TEXT}]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Photo (optional)</Text>
              <TouchableOpacity style={styles.photoDrop} onPress={pick}>
                {photo ? <Image source={{uri: photo}} style={{width: '100%', height: '100%', borderRadius: 8}} />
                  : <Text style={{color: TEXT2}}>📷  Add a photo</Text>}
              </TouchableOpacity>
              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.textArea} multiline placeholder="Share news, a tip, a result…" placeholderTextColor={TEXT3} value={text} onChangeText={setText} />
              <TouchableOpacity style={styles.primaryBtn} onPress={post}><Text style={styles.primaryBtnText}>Post</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
    function create() {
      if (!name.trim()) { Alert.alert('Name needed', 'Give your group a name.'); return; }
      if (priv && !code.trim()) { Alert.alert('Code needed', 'Set a join code for your private group.'); return; }
      const g = {id: UID++, name: name.trim(), sport, members: 1, joined: true, creator: 'You', memberList: ['You'], training: '', priv, code: code.trim().toUpperCase(), desc: desc.trim() || 'A new community group.'};
      setGroups(prev => [g, ...prev]); setCreateOpen(false);
      if (priv) Alert.alert('Private group created', 'Your join code is: ' + g.code);
    }
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Create a group</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}><Text style={styles.x}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Group name</Text>
              <TextInput style={styles.input} placeholder="e.g. Sydney Sunday Runners" placeholderTextColor={TEXT3} value={name} onChangeText={setName} />
              <Text style={styles.label}>Sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
                {SPORTS.map(s => (
                  <TouchableOpacity key={s.id} onPress={() => setSport(s.id)} style={[styles.pill, sport === s.id && styles.pillActive]}>
                    <Text style={[styles.pillText, sport === s.id && {color: GOLD_TEXT}]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Privacy</Text>
              <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
                <TouchableOpacity style={[styles.pill, !priv && styles.pillActive]} onPress={() => setPriv(false)}><Text style={[styles.pillText, !priv && {color: GOLD_TEXT}]}>Public</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.pill, priv && styles.pillActive]} onPress={() => setPriv(true)}><Text style={[styles.pillText, priv && {color: GOLD_TEXT}]}>Private (code)</Text></TouchableOpacity>
              </View>
              {priv && (<>
                <Text style={styles.label}>Join code</Text>
                <TextInput style={styles.input} placeholder="e.g. FOOTY2026" placeholderTextColor={TEXT3} autoCapitalize="characters" value={code} onChangeText={setCode} />
              </>)}
              <Text style={styles.label}>About</Text>
              <TextInput style={styles.textArea} multiline placeholder="Describe your group…" placeholderTextColor={TEXT3} value={desc} onChangeText={setDesc} />
              <TouchableOpacity style={styles.primaryBtn} onPress={create}><Text style={styles.primaryBtnText}>Create group</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // ---------- PROFILE ----------
  function ProfileScreen() {
    const myActualPosts = posts.filter(p => p.author === 'You' && !p.groupId && !p.announcement).concat(myPosts);
    const replies = posts.filter(p => p.comments.some((c: any) => c.author === 'You'));
    const joined = groups.filter(g => g.joined);
    const sp = sportOf(profile.sport);
    return (
      <ScrollView contentContainerStyle={{padding: 14, paddingBottom: 90}}>
        <View style={styles.pageCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Avatar init="You" size={72} photo={profile.photo} />
            <View style={{flexDirection: 'row', flex: 1, justifyContent: 'space-around'}}>
              <View style={{alignItems: 'center'}}><Text style={styles.statNum}>{myActualPosts.length}</Text><Text style={styles.meta}>Posts</Text></View>
              <View style={{alignItems: 'center'}}><Text style={styles.statNum}>128</Text><Text style={styles.meta}>Followers</Text></View>
              <View style={{alignItems: 'center'}}><Text style={styles.statNum}>{joined.length}</Text><Text style={styles.meta}>Groups</Text></View>
            </View>
          </View>
          <Text style={[styles.groupTitle, {marginTop: 12}]}>{profile.name}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
            <View style={[styles.sportDot, {backgroundColor: sp?.bg || '#ccc'}]} />
            <Text style={styles.meta}>  {sp?.label || 'All sports'}</Text>
          </View>
          <Text style={[styles.body, {marginTop: 8}]}>{profile.bio || 'Add a bio to tell people about yourself and your sport.'}</Text>
          <View style={{flexDirection: 'row', gap: 10, marginTop: 14}}>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnAlt, {flex: 1}]} onPress={() => setEditOpen(true)}><Text style={styles.smallBtnText}>Edit profile</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnGold, {flex: 1}]} onPress={() => setComposer({target: 'profile'})}><Text style={[styles.smallBtnText, {color: '#fff'}]}>+ New post</Text></TouchableOpacity>
          </View>
          {joined.length > 0 && (
            <View style={{marginTop: 14, borderTopWidth: 0.5, borderTopColor: BORDER, paddingTop: 12}}>
              <Text style={styles.infoTitle}>GROUPS YOU'RE IN</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8}}>
                {joined.map(g => (
                  <TouchableOpacity key={g.id} style={styles.chip} onPress={() => openGroup(g)}>
                    <Avatar init={g.name[0]} size={22} photo={g.photo} />
                    <Text style={{fontSize: 13, marginLeft: 6, color: TEXT}}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.profileTabs}>
          <TouchableOpacity style={[styles.pTab, profileTab === 'posts' && styles.pTabActive]} onPress={() => setProfileTab('posts')}><Text style={[styles.pTabText, profileTab === 'posts' && {color: GOLD}]}>Posts</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.pTab, profileTab === 'replies' && styles.pTabActive]} onPress={() => setProfileTab('replies')}><Text style={[styles.pTabText, profileTab === 'replies' && {color: GOLD}]}>Replies</Text></TouchableOpacity>
        </View>
        {profileTab === 'posts'
          ? (myActualPosts.length ? myActualPosts.map(p => <PostCard key={p.id} p={p} onOpen={() => setThread(p)} />) : <Text style={{color: TEXT2, textAlign: 'center', padding: 24}}>No posts yet. Tap “New post”.</Text>)
          : (replies.length ? replies.map(p => <PostCard key={p.id} p={p} onOpen={() => setThread(p)} />) : <Text style={{color: TEXT2, textAlign: 'center', padding: 24}}>No replies yet.</Text>)}
      </ScrollView>
    );
  }

  function EditProfile() {
    const [name, setName] = useState(profile.name);
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
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Edit profile</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}><Text style={styles.x}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={{alignSelf: 'center', marginBottom: 8}} onPress={pick}>
                <Avatar init="You" size={84} photo={photo} />
                <Text style={{textAlign: 'center', color: GOLD, fontSize: 12, marginTop: 4}}>Change photo</Text>
              </TouchableOpacity>
              <Text style={styles.label}>Display name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={TEXT3} />
              <Text style={styles.label}>Main sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
                {SPORTS.map(s => (
                  <TouchableOpacity key={s.id} onPress={() => setSport(s.id)} style={[styles.pill, sport === s.id && styles.pillActive]}>
                    <Text style={[styles.pillText, sport === s.id && {color: GOLD_TEXT}]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Bio</Text>
              <TextInput style={styles.textArea} multiline placeholder="Tell people about you…" placeholderTextColor={TEXT3} value={bio} onChangeText={setBio} />
              <TouchableOpacity style={styles.primaryBtn} onPress={() => { setProfile({name: name.trim() || 'You', sport, bio: bio.trim(), photo}); setEditOpen(false); }}><Text style={styles.primaryBtnText}>Save</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: BG3}}>
      {tab === 'community' ? <CommunityFeed /> : <ProfileScreen />}
      {thread && <ThreadView />}
      {groupView && <GroupPage />}
      {composer && <Composer />}
      {createOpen && <CreateGroup />}
      {editOpen && <EditProfile />}
    </View>
  );
}

const styles = StyleSheet.create({
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
