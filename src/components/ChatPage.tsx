import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, TextField, IconButton, Avatar, InputAdornment,
  Divider, List, ListItemButton, ListItemAvatar, ListItemText,
  Badge, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, ToggleButton, ToggleButtonGroup, Chip, CircularProgress,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideoCallOutlinedIcon from '@mui/icons-material/VideoCallOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApolloClient, useQuery } from '@apollo/client';
import { SEARCH_USERS_LIGHT, GET_USER_PROFILE } from '../graphql/user';
import { CREATE_DM_ROOM_MUTATION, CREATE_GROUP_ROOM_MUTATION, GET_USER_ROOMS, GET_PRESENCE } from '../graphql/chat';
import Chat from './Chat';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE } from '../theme/surfaces';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConvType = 'direct' | 'group';

interface Conversation {
  id: string;
  type: ConvType;
  label: string;
  participants: string[];
  lastMessage?: string;
  lastTime?: number;
  unread: number;
  avatarUrl?: string;
  labelReady?: boolean;
  peerId?: string;
}

export interface ChatPageProps {
  /** When true, renders as LinkedIn-style messaging dock overlay (no full page). */
  embedded?: boolean;
  onClose?: () => void;
  /** Prefer over router state when embedding on Home. */
  initialRoomId?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const stringToColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.codePointAt(i)! + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},50%,38%)`;
};

const initials = (label: string) => {
  const cleaned = (label || '').trim();
  if (!cleaned || /^\d+$/.test(cleaned)) return '?';
  return cleaned.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
};

const NAME_CACHE_KEY = 'zpc_chat_peer_cache_v1';

type PeerCache = Record<string, { name: string; avatarUrl?: string }>;

const readPeerCache = (): PeerCache => {
  try {
    const raw = localStorage.getItem(NAME_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writePeerCache = (cache: PeerCache) => {
  try {
    localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota / private mode
  }
};

const displayNameFromParticipants = (
  members: Array<{ userId?: string; firstName?: string; lastName?: string; avatarUrl?: string }>,
  myUserId: string,
): { name: string; avatarUrl?: string; otherId?: string } => {
  const other = members.find(m => String(m.userId) !== String(myUserId)) || members[0];
  if (!other) return { name: '' };
  const name = `${other.firstName || ''} ${other.lastName || ''}`.trim();
  return {
    name,
    avatarUrl: other.avatarUrl || undefined,
    otherId: other.userId ? String(other.userId) : undefined,
  };
};
const fmtTime = (ms?: number) => {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};


const SIDEBAR_W = 360;
const DOCK_LIST_W = 340;
const DOCK_CHAT_W = 380;
const DOCK_H = 520;
const LI_BLUE   = '#0A66C2';
const LI_BG     = '#EFEAE2';
const LI_BORDER = 'rgba(90, 70, 50, 0.12)';
const LI_TEXT   = '#191919';

// ── ConvItem ──────────────────────────────────────────────────────────────────

const ConvItem: React.FC<{
  conv: Conversation;
  active: boolean;
  online?: boolean;
  onClick: () => void;
}> = ({ conv, active, online, onClick }) => (
  <>
    <ListItemButton
      onClick={onClick}
      sx={{
        py: 1.5, px: 2,
        bgcolor: active ? '#EAF0F8' : 'transparent',
        borderLeft: active ? `3px solid ${LI_BLUE}` : '3px solid transparent',
        '&:hover': { bgcolor: active ? '#EAF0F8' : LI_BG },
        transition: 'background 0.15s',
      }}
    >
      <ListItemAvatar sx={{ minWidth: 52 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            conv.type === 'group'
              ? <Box sx={{ width: 14, height: 14, bgcolor: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GroupAddOutlinedIcon sx={{ fontSize: 10, color: LI_BLUE }} />
                </Box>
              : online
                ? <Box sx={{ width: 12, height: 12, bgcolor: '#057642', borderRadius: '50%', border: '2px solid #fff' }} />
                : null
          }
        >
          <Avatar
            src={conv.avatarUrl || undefined}
            sx={{ bgcolor: stringToColor(conv.label), width: 46, height: 46, fontSize: 16, fontWeight: 700 }}
          >
            {initials(conv.label)}
          </Avatar>
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primaryTypographyProps={{ component: 'div' }}
        secondaryTypographyProps={{ component: 'div' }}
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography
              variant="subtitle2"
              fontWeight={conv.unread > 0 ? 700 : 500}
              noWrap
              sx={{
                fontSize: 14,
                color: conv.labelReady === false ? '#8C8C8C' : '#000',
                maxWidth: 160,
                fontStyle: conv.labelReady === false ? 'italic' : 'normal',
              }}
            >
              {conv.label}
            </Typography>
            <Typography variant="caption" sx={{ color: conv.unread > 0 ? LI_BLUE : '#777', fontSize: 11, flexShrink: 0, ml: 1 }}>
              {fmtTime(conv.lastTime)}
            </Typography>
          </Box>
        }
        secondary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
            <Typography variant="caption" noWrap sx={{ color: conv.unread > 0 ? '#333' : '#777', fontSize: 12, fontWeight: conv.unread > 0 ? 600 : 400, maxWidth: 175 }}>
              {conv.lastMessage ?? 'Start a conversation'}
            </Typography>
            {conv.unread > 0 && (
              <Box sx={{ bgcolor: LI_BLUE, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ml: 0.5 }}>
                <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{conv.unread}</Typography>
              </Box>
            )}
          </Box>
        }
      />
    </ListItemButton>
    <Divider sx={{ ml: 8 }} />
  </>
);

// ── New Conversation Dialog ───────────────────────────────────────────────────

const NewConvDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onStart: (conv: Conversation) => void;
  myUserId: string;
}> = ({ open, onClose, onStart, myUserId }) => {
  const apollo = useApolloClient();
  const [type, setType]             = useState<ConvType>('direct');
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [groupName, setGroupName]   = useState('');
  const [members, setMembers]       = useState<Array<{ id: string; label: string }>>([]);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(userSearch.trim()), 350);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const shouldSearch = !open ? false : (debouncedSearch.length === 0 || debouncedSearch.length >= 2);

  const { data, loading } = useQuery(SEARCH_USERS_LIGHT, {
    variables: { search: debouncedSearch, page: 1, limit: 30 },
    skip: !shouldSearch,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  const apiUsers: Array<{ id: number; firstName: string; lastName: string; email: string; role?: string; profilePhotoSignedUrl?: string }> =
    data?.users ?? [];

  const reset = () => { setType('direct'); setUserSearch(''); setGroupName(''); setMembers([]); setError(null); };
  const handleClose = () => { reset(); onClose(); };

  const startDirect = async (u: { id: number; firstName: string; lastName: string }) => {
    const otherId = String(u.id);
    setError(null);
    try {
      const result = await apollo.mutate({
        mutation: CREATE_DM_ROOM_MUTATION,
        variables: { createdBy: myUserId, userA: myUserId, userB: otherId },
        fetchPolicy: 'network-only',
      });
      const roomId = result.data?.createDmRoom?.roomId;
      if (!roomId) {
        setError('Failed to create conversation. Please try again.');
        return;
      }
      onStart({
        id: roomId,
        type: 'direct',
        label: `${u.firstName} ${u.lastName}`.trim(),
        participants: [myUserId, otherId],
        peerId: otherId,
        avatarUrl: (u as any).profilePhotoSignedUrl || undefined,
        unread: 0,
      });
      handleClose();
    } catch (err) {
      console.error('Failed to create DM room', err);
      setError('Failed to create conversation. Please try again.');
    }
  };

  const toggleMember = (u: { id: number; firstName: string; lastName: string }) => {
    const id = String(u.id);
    const label = `${u.firstName} ${u.lastName}`.trim();
    setMembers(prev => prev.some(m => m.id === id) ? prev.filter(m => m.id !== id) : [...prev, { id, label }]);
  };

  const startGroup = async () => {
    const name = groupName.trim();
    if (!name || members.length === 0) return;
    const memberIds = [myUserId, ...members.map(m => m.id)];
    setError(null);
    try {
      const result = await apollo.mutate({
        mutation: CREATE_GROUP_ROOM_MUTATION,
        variables: { createdBy: myUserId, name, memberIds },
        fetchPolicy: 'network-only',
      });
      const roomId = result.data?.createGroupRoom?.roomId;
      if (!roomId) {
        setError('Failed to create group. Please try again.');
        return;
      }
      onStart({ id: roomId, type: 'group', label: name, participants: memberIds, unread: 0 });
      handleClose();
    } catch (err) {
      console.error('Failed to create group room', err);
      setError('Failed to create group. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, ...MATTE_SURFACE } }}>
      <DialogTitle sx={{ pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={700} fontSize={18}>New message</Typography>
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 1.5 }}>
            {error}
          </Typography>
        )}
        <ToggleButtonGroup value={type} exclusive onChange={(_, v) => v && setType(v)} size="small" fullWidth sx={{ mb: 2 }}>
          <ToggleButton value="direct" sx={{ textTransform: 'none', fontWeight: 600, gap: 0.5 }}>
            <PersonOutlineIcon fontSize="small" /> Direct message
          </ToggleButton>
          <ToggleButton value="group" sx={{ textTransform: 'none', fontWeight: 600, gap: 0.5 }}>
            <GroupAddOutlinedIcon fontSize="small" /> Group chat
          </ToggleButton>
        </ToggleButtonGroup>

        {type === 'group' && (
          <TextField fullWidth size="small" label="Group name" placeholder="e.g. ZPC Team"
            value={groupName} onChange={e => setGroupName(e.target.value)} sx={{ mb: 1.5 }} />
        )}

        <TextField autoFocus fullWidth size="small"
          placeholder={type === 'direct' ? 'Search people…' : 'Search members to add…'}
          value={userSearch} onChange={e => setUserSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#aaa' }} /></InputAdornment> }}
        />

        {type === 'group' && members.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {members.map(m => (
              <Chip key={m.id} label={m.label} size="small"
                onDelete={() => setMembers(prev => prev.filter(x => x.id !== m.id))} sx={{ fontSize: 12 }} />
            ))}
          </Box>
        )}

        <Box sx={{ mt: 1.5, maxHeight: 260, overflowY: 'auto', borderRadius: 2, border: '1px solid #E0E0E0' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : apiUsers.filter(u => String(u.id) !== myUserId).length === 0 ? (
            <Typography variant="caption" color="#999" sx={{ display: 'block', textAlign: 'center', py: 3 }}>No users found</Typography>
          ) : (
            <List disablePadding>
              {apiUsers.filter(u => String(u.id) !== myUserId).map(u => {
                const isMember = members.some(m => m.id === String(u.id));
                return (
                  <ListItemButton key={u.id}
                    onClick={() => type === 'direct' ? startDirect(u) : toggleMember(u)}
                    selected={isMember}
                    sx={{ py: 1, px: 1.5, '&.Mui-selected': { bgcolor: '#EAF0F8' } }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar src={u.profilePhotoSignedUrl} sx={{ width: 34, height: 34, bgcolor: stringToColor(`${u.firstName} ${u.lastName}`), fontSize: 13 }}>
                        {initials(`${u.firstName} ${u.lastName}`)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={600} fontSize={13}>{u.firstName} {u.lastName}</Typography>}
                      secondary={<Typography variant="caption" color="#888" fontSize={11}>{u.role ?? u.email}</Typography>}
                    />
                    {type === 'group' && isMember && (
                      <Box sx={{ width: 18, height: 18, bgcolor: LI_BLUE, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloseIcon sx={{ fontSize: 11, color: '#fff' }} />
                      </Box>
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>
      </DialogContent>

      {type === 'group' && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#555' }}>Cancel</Button>
          <Button variant="contained" onClick={startGroup}
            disabled={!groupName.trim() || members.length === 0}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: LI_BLUE, borderRadius: 5, px: 3, '&:hover': { bgcolor: '#004aad' } }}
          >
            Create group ({members.length})
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

// ── Main ChatPage ─────────────────────────────────────────────────────────────

const ChatPage: React.FC<ChatPageProps> = ({
  embedded = false,
  onClose,
  initialRoomId = null,
}) => {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isWide = useMediaQuery('(min-width:901px)');
  // Dock on desktop when embedded on Home, or when somehow rendered wide in-page
  const isDesktopDock = embedded || isWide;

  const userId      = user ? String(user.id) : '';
  const shouldRedirectToHomeDock = !embedded && isWide;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter]               = useState<'all' | 'groups'>('all');
  const [newDlgOpen, setNewDlgOpen]       = useState(false);
  const [mobileView, setMobileView]       = useState<'sidebar' | 'chat'>('sidebar');
  const [wsConnected, setWsConnected]     = useState(false);
  const [peerOnline, setPeerOnline]       = useState<Record<string, boolean>>({});
  const [dockMinimized, setDockMinimized] = useState(false);
  const [startingDmId, setStartingDmId]   = useState<string | null>(null);
  // Map of userId → "First Last" for resolving DM conversation labels
  const [userNames, setUserNames]         = useState<Record<string, string>>(() => {
    const cache = readPeerCache();
    const names: Record<string, string> = {};
    Object.entries(cache).forEach(([id, v]) => { if (v?.name) names[id] = v.name; });
    return names;
  });
  const [userAvatars, setUserAvatars]     = useState<Record<string, string>>(() => {
    const cache = readPeerCache();
    const avatars: Record<string, string> = {};
    Object.entries(cache).forEach(([id, v]) => { if (v?.avatarUrl) avatars[id] = v.avatarUrl; });
    return avatars;
  });
  const apollo = useApolloClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Load active rooms from server ─────────────────────────────────────────
  const { data: roomsData, loading: roomsLoading } = useQuery(GET_USER_ROOMS, {
    variables: { userId },
    skip: !userId || shouldRedirectToHomeDock,
    fetchPolicy: 'cache-and-network',
    pollInterval: 20000,
  });

  const peopleSearchActive = debouncedSearch.length >= 2 && filter === 'all' && !shouldRedirectToHomeDock;
  const { data: peopleData, loading: peopleLoading } = useQuery(SEARCH_USERS_LIGHT, {
    variables: { search: debouncedSearch, page: 1, limit: 20 },
    skip: !peopleSearchActive || !userId,
    fetchPolicy: 'network-only',
  });
  const peopleResults = (peopleData?.users || []).filter((u: any) => String(u.id) !== userId);

  useEffect(() => {
    if (!roomsData?.getUserRooms) return;
    const cache = readPeerCache();
    const nextCache: PeerCache = { ...cache };
    const nextNames: Record<string, string> = {};
    const nextAvatars: Record<string, string> = {};

    const loaded: Conversation[] = roomsData.getUserRooms.map((r: any) => {
      const isGroup = r.roomType === 1;
      const memberIds: string[] = r.memberIds || [];
      const otherId = memberIds.find((id: string) => id !== userId);

      let label = (r.name || '').trim();
      let avatarUrl: string | undefined;
      let labelReady = true;

      if (!isGroup) {
        const fromParticipants = displayNameFromParticipants(r.participants || [], userId);
        if (fromParticipants.name) {
          label = fromParticipants.name;
          avatarUrl = fromParticipants.avatarUrl;
          if (fromParticipants.otherId) {
            nextNames[fromParticipants.otherId] = fromParticipants.name;
            if (fromParticipants.avatarUrl) nextAvatars[fromParticipants.otherId] = fromParticipants.avatarUrl;
            nextCache[fromParticipants.otherId] = {
              name: fromParticipants.name,
              avatarUrl: fromParticipants.avatarUrl,
            };
          }
        } else if (otherId && (userNames[otherId] || cache[otherId]?.name)) {
          label = userNames[otherId] || cache[otherId]?.name || '';
          avatarUrl = userAvatars[otherId] || cache[otherId]?.avatarUrl;
        } else {
          label = 'Loading…';
          labelReady = false;
          avatarUrl = otherId ? (userAvatars[otherId] || cache[otherId]?.avatarUrl) : undefined;
        }
      }

      if (!label) {
        label = isGroup ? 'Group chat' : 'Loading…';
        labelReady = !isGroup ? false : true;
      }

      return {
        id: r.roomId,
        type: isGroup ? ('group' as const) : ('direct' as const),
        label,
        labelReady,
        avatarUrl,
        participants: memberIds,
        peerId: isGroup ? undefined : otherId,
        lastMessage: r.lastMessage || undefined,
        lastTime: r.lastMessageAt || undefined,
        unread: r.hasUnread ? 1 : 0,
      };
    });

    if (Object.keys(nextNames).length > 0) {
      setUserNames(prev => ({ ...prev, ...nextNames }));
    }
    if (Object.keys(nextAvatars).length > 0) {
      setUserAvatars(prev => ({ ...prev, ...nextAvatars }));
    }
    writePeerCache(nextCache);

    setConversations(prev => {
      const serverIds = new Set(loaded.map(c => c.id));
      const pending = prev.filter(c => !serverIds.has(c.id));
      return [...loaded, ...pending];
    });

    // Batch presence for DM peers (do not treat our own WS as "peer online")
    const peerIds = Array.from(new Set(
      loaded.filter(c => c.type === 'direct' && c.peerId).map(c => c.peerId as string)
    ));
    if (peerIds.length > 0) {
      apollo.query({
        query: GET_PRESENCE,
        variables: { userIds: peerIds },
        fetchPolicy: 'network-only',
      }).then((res) => {
        const next: Record<string, boolean> = {};
        for (const p of res.data?.getPresence || []) {
          if (p?.userId) next[String(p.userId)] = !!p.isOnline;
        }
        setPeerOnline(prev => ({ ...prev, ...next }));
      }).catch(() => { /* presence optional */ });
    }
  }, [roomsData, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback resolver only for rooms still missing names (rare)
  useEffect(() => {
    if (!roomsData?.getUserRooms) return;
    const otherIds: string[] = [];
    for (const r of roomsData.getUserRooms) {
      if (r.roomType === 1) continue;
      const otherId = (r.memberIds || []).find((id: string) => id !== userId);
      const hasNameFromApi = (r.participants || []).some((p: any) => {
        const n = `${p.firstName || ''} ${p.lastName || ''}`.trim();
        return String(p.userId) === String(otherId) && !!n;
      });
      if (otherId && !hasNameFromApi && !userNames[otherId]) otherIds.push(otherId);
    }
    const unique = Array.from(new Set(otherIds));
    if (unique.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(unique.map(async (uid) => {
        try {
          const res = await apollo.query({
            query: GET_USER_PROFILE,
            variables: { id: parseInt(uid, 10) },
            fetchPolicy: 'cache-first',
          });
          const u = res.data?.user;
          if (u) {
            const name = `${u.firstName} ${u.lastName}`.trim();
            const avatarUrl = u.profilePhotoSignedUrl || u.profilePhoto || '';
            return [uid, name, avatarUrl] as const;
          }
        } catch {
          // leave unresolved
        }
        return null;
      }));
      if (cancelled) return;
      const nextNames: Record<string, string> = {};
      const nextAvatars: Record<string, string> = {};
      const cache = readPeerCache();
      entries.forEach((e) => {
        if (!e || !e[1]) return;
        nextNames[e[0]] = e[1];
        if (e[2]) nextAvatars[e[0]] = e[2];
        cache[e[0]] = { name: e[1], avatarUrl: e[2] || cache[e[0]]?.avatarUrl };
      });
      if (Object.keys(nextNames).length > 0) {
        setUserNames(prev => ({ ...prev, ...nextNames }));
        setUserAvatars(prev => ({ ...prev, ...nextAvatars }));
        writePeerCache(cache);
        setConversations(prev => prev.map(c => {
          if (c.type !== 'direct' || c.labelReady) return c;
          const otherId = c.participants.find(id => id !== userId);
          if (!otherId || !nextNames[otherId]) return c;
          return {
            ...c,
            label: nextNames[otherId],
            labelReady: true,
            avatarUrl: nextAvatars[otherId] || c.avatarUrl,
          };
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [roomsData, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setWsConnected(false);
  }, [activeId]);

  // ── Auto-select room from router state / embedded prop ────────────────────
  useEffect(() => {
    const state = location.state as { autoSelectRoomId?: string } | null;
    const roomFromNav = state?.autoSelectRoomId || initialRoomId || null;
    if (roomFromNav) {
      setActiveId(roomFromNav);
      setMobileView('chat');
      if (state?.autoSelectRoomId) {
        window.history.replaceState({}, '');
      }
    }
  }, [location.state, initialRoomId]);

  const handleNewConv = useCallback((conv: Conversation) => {
    setConversations(prev => {
      if (prev.some(c => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
    setActiveId(conv.id);
    setMobileView('chat');
    setSearch('');
  }, []);

  const openConversation = useCallback((conv: Conversation) => {
    setActiveId(conv.id);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
    setMobileView('chat');
  }, []);

  const startDmWithUser = useCallback(async (u: { id: number; firstName: string; lastName: string }) => {
    if (!userId) return;
    const otherId = String(u.id);
    const existing = conversations.find(c =>
      c.type === 'direct' && c.participants.includes(otherId) && c.participants.includes(userId)
    );
    if (existing) {
      openConversation(existing);
      setSearch('');
      return;
    }
    setStartingDmId(otherId);
    try {
      const result = await apollo.mutate({
        mutation: CREATE_DM_ROOM_MUTATION,
        variables: { createdBy: userId, userA: userId, userB: otherId },
        fetchPolicy: 'network-only',
      });
      const roomId = result.data?.createDmRoom?.roomId;
      if (!roomId) return;
      const label = `${u.firstName} ${u.lastName}`.trim();
      setUserNames(prev => ({ ...prev, [otherId]: label }));
      const cache = readPeerCache();
      cache[otherId] = { name: label, avatarUrl: cache[otherId]?.avatarUrl };
      writePeerCache(cache);
      handleNewConv({
        id: roomId,
        type: 'direct',
        label,
        labelReady: true,
        participants: [userId, otherId],
        peerId: otherId,
        avatarUrl: userAvatars[otherId] || cache[otherId]?.avatarUrl,
        unread: 0,
      });
    } catch (err) {
      console.error('Failed to start DM from search', err);
    } finally {
      setStartingDmId(null);
    }
  }, [userId, conversations, apollo, handleNewConv, openConversation]);

  const handlePeerPresenceChange = useCallback((peerUserId: string, isOnline: boolean) => {
    setPeerOnline(prev => {
      if (prev[peerUserId] === isOnline) return prev;
      return { ...prev, [peerUserId]: isOnline };
    });
  }, []);

  // Desktop /chat → Home + dock (must run after all hooks)
  if (shouldRedirectToHomeDock) {
    const state = (location.state as { autoSelectRoomId?: string } | null) || {};
    return (
      <Navigate
        to="/home"
        replace
        state={{ openChat: true, autoSelectRoomId: state.autoSelectRoomId || undefined }}
      />
    );
  }

  const activeConv = conversations.find(c => c.id === activeId) ?? null;
  const activePeerId = activeConv?.peerId
    || activeConv?.participants.find(id => id !== userId);
  const activePeerOnline = !!(activePeerId && peerOnline[activePeerId]);

  const q = search.trim().toLowerCase();
  const filtered = conversations.filter(c => {
    const matchFilter = filter === 'all' || c.type === 'group';
    if (!q) return matchFilter;
    const matchLabel = c.label.toLowerCase().includes(q);
    const matchMsg = (c.lastMessage || '').toLowerCase().includes(q);
    return matchFilter && (matchLabel || matchMsg);
  });

  const peopleToShow = peopleResults.filter((u: any) => {
    const id = String(u.id);
    const alreadyListed = filtered.some(c => c.type === 'direct' && c.participants.includes(id));
    return !alreadyListed;
  });

  const isSearching = q.length > 0;

  // LinkedIn dock: list + chat are separate bottom panels (chat rendered outside shell).
  // Mobile full-page: list XOR chat.
  const showList = isDesktopDock ? true : mobileView === 'sidebar';
  const showChatInShell = isDesktopDock ? false : mobileView === 'chat';
  const showDockChat = isDesktopDock && !!activeConv;

  const closeConversationPanel = () => {
    setActiveId(null);
    setMobileView('sidebar');
  };

  const closeChat = () => {
    if (embedded && onClose) {
      onClose();
      return;
    }
    navigate('/home');
  };

  if (isDesktopDock && dockMinimized) {
    return (
      <>
        <Box
          onClick={() => setDockMinimized(false)}
          sx={{
            position: 'fixed',
            bottom: 0,
            right: 16,
            zIndex: 1400,
            bgcolor: '#1B1F23',
            color: '#fff',
            borderRadius: '8px 8px 0 0',
            px: 2,
            py: 1.15,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            cursor: 'pointer',
            boxShadow: '0 -2px 12px rgba(0,0,0,0.18)',
            fontWeight: 600,
            fontSize: 14,
            userSelect: 'none',
            minWidth: 220,
            border: `1px solid ${LI_BORDER}`,
            borderBottom: 'none',
            '&:hover': { bgcolor: '#000' },
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: LI_BLUE, flexShrink: 0 }} />
          Messaging
          {conversations.some(c => c.unread > 0) && (
            <Box sx={{ bgcolor: LI_BLUE, borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 'auto' }}>
              {conversations.filter(c => c.unread > 0).length}
            </Box>
          )}
        </Box>
        <NewConvDialog open={newDlgOpen} onClose={() => setNewDlgOpen(false)} onStart={handleNewConv} myUserId={userId} />
      </>
    );
  }

  const panelChrome = {
    ...MATTE_SURFACE,
    borderRadius: '8px 8px 0 0',
    borderBottom: 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    height: DOCK_H,
    maxHeight: 'calc(100vh - 56px)',
  };

  const shell = (
    <Box sx={{
      display: 'flex',
      height: isDesktopDock ? '100%' : '100vh',
      ...(isDesktopDock ? {} : PAGE_ATMOSPHERE),
      bgcolor: isDesktopDock ? LI_BG : undefined,
      overflow: 'hidden',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      borderRadius: isDesktopDock ? 0 : 0,
      boxShadow: 'none',
    }}>

      {/* ── Sidebar ── */}
      <Box sx={{
        width: isDesktopDock ? '100%' : { xs: '100%', md: SIDEBAR_W },
        display: showList ? 'flex' : 'none',
        flexDirection: 'column',
        ...MATTE_SURFACE,
        borderRadius: 0,
        borderRight: isDesktopDock ? 'none' : `1px solid ${LI_BORDER}`,
        flexShrink: 0,
        height: '100%',
      }}>
        {/* Header */}
        <Box sx={{ px: 2, pt: 1.75, pb: 1.25, ...MATTE_HEADER, boxShadow: 'none', color: 'inherit' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isDesktopDock && (
                <Tooltip title="Back to Home">
                  <IconButton size="small" onClick={closeChat} sx={{ color: '#666' }}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Typography fontWeight={700} fontSize={isDesktopDock ? 16 : 20} color={LI_TEXT} letterSpacing="-0.02em">
                Messaging
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.15 }}>
              <Tooltip title="New message">
                <IconButton size="small" onClick={() => setNewDlgOpen(true)} sx={{ color: '#666', '&:hover': { bgcolor: LI_BG, color: LI_BLUE } }}>
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              {isDesktopDock && (
                <>
                  <Tooltip title="Minimize">
                    <IconButton size="small" onClick={() => setDockMinimized(true)} sx={{ color: '#666' }}>
                      <MinimizeIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Close">
                    <IconButton size="small" onClick={closeChat} sx={{ color: '#666' }}>
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>

          <TextField
            fullWidth size="small" placeholder="Search messages"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#8C8C8C' }} /></InputAdornment> }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5, bgcolor: LI_BG, fontSize: 13,
                '& fieldset': { border: `1px solid ${LI_BORDER}` },
                '&:hover fieldset': { borderColor: '#B0B0B0' },
                '&.Mui-focused fieldset': { borderColor: LI_BLUE },
              },
            }}
          />

          <Box sx={{ display: 'flex', gap: 0.5, mt: 1.25 }}>
            {(['all', 'groups'] as const).map(f => (
              <Box key={f} onClick={() => setFilter(f)} sx={{
                px: 1.5, py: 0.4, borderRadius: 5, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, userSelect: 'none',
                bgcolor: filter === f ? '#E8F0FE' : 'transparent',
                color: filter === f ? LI_BLUE : '#666',
                border: `1px solid ${filter === f ? LI_BLUE : 'transparent'}`,
                '&:hover': { bgcolor: filter === f ? '#E8F0FE' : LI_BG },
              }}>
                {f === 'all' ? 'Focused' : 'Groups'}
              </Box>
            ))}
          </Box>
        </Box>

        {/* List */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {roomsLoading && conversations.length === 0 && !isSearching ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 8 }}>
              <CircularProgress size={28} sx={{ color: LI_BLUE }} />
            </Box>
          ) : (
            <>
              {filtered.length > 0 && (
                <>
                  {isSearching && (
                    <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, fontSize: 11, fontWeight: 700, color: '#8C8C8C', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {filter === 'groups' ? 'Groups' : 'Chats & messages'}
                    </Typography>
                  )}
                  <List disablePadding>
                    {filtered.map(conv => (
                      <ConvItem
                        key={conv.id}
                        conv={conv}
                        active={conv.id === activeId}
                        online={!!(conv.peerId && peerOnline[conv.peerId])}
                        onClick={() => openConversation(conv)}
                      />
                    ))}
                  </List>
                </>
              )}

              {peopleSearchActive && (
                <>
                  <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, fontSize: 11, fontWeight: 700, color: '#8C8C8C', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    People
                  </Typography>
                  {peopleLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={22} sx={{ color: LI_BLUE }} />
                    </Box>
                  ) : peopleToShow.length === 0 ? (
                    <Typography variant="caption" color="#8C8C8C" sx={{ display: 'block', px: 2, py: 1.5 }}>
                      No people found
                    </Typography>
                  ) : (
                    <List disablePadding>
                      {peopleToShow.map((u: any) => {
                        const label = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                        const uid = String(u.id);
                        const busy = startingDmId === uid;
                        return (
                          <React.Fragment key={uid}>
                            <ListItemButton
                              disabled={busy}
                              onClick={() => startDmWithUser(u)}
                              sx={{ py: 1.25, px: 2, '&:hover': { bgcolor: LI_BG } }}
                            >
                              <ListItemAvatar sx={{ minWidth: 52 }}>
                                <Avatar
                                  src={u.profilePhotoSignedUrl || undefined}
                                  sx={{ bgcolor: stringToColor(label), width: 40, height: 40, fontSize: 14, fontWeight: 700 }}
                                >
                                  {initials(label)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle2" fontWeight={600} fontSize={14} color={LI_TEXT} noWrap>
                                    {label}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" color="#666" fontSize={12} noWrap>
                                    {busy ? 'Starting chat…' : (u.role || 'Message')}
                                  </Typography>
                                }
                              />
                              <PersonOutlineIcon sx={{ color: '#8C8C8C', fontSize: 18 }} />
                            </ListItemButton>
                            <Divider sx={{ ml: 8 }} />
                          </React.Fragment>
                        );
                      })}
                    </List>
                  )}
                </>
              )}

              {!roomsLoading && filtered.length === 0 && !peopleSearchActive && (
                <Box sx={{ textAlign: 'center', mt: 8, px: 4 }}>
                  <Typography variant="body2" fontWeight={700} color={LI_TEXT} mb={0.5}>
                    {isSearching ? 'No chats found' : 'No conversations yet'}
                  </Typography>
                  <Typography variant="caption" color="#666" lineHeight={1.5}>
                    {isSearching
                      ? 'Try another name, or type at least 2 letters to find people.'
                      : 'Search for people above, or use compose to start a group.'}
                  </Typography>
                </Box>
              )}

              {isSearching && filtered.length === 0 && peopleSearchActive && peopleToShow.length === 0 && !peopleLoading && (
                <Box sx={{ textAlign: 'center', mt: 4, px: 4 }}>
                  <Typography variant="body2" fontWeight={600} color={LI_TEXT} mb={0.5}>No results</Typography>
                  <Typography variant="caption" color="#666">Try a different name or message keyword.</Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* ── Conversation Panel (mobile / full-page only) ── */}
      <Box sx={{
        flex: 1,
        display: showChatInShell ? 'flex' : 'none',
        flexDirection: 'column',
        overflow: 'hidden',
        ...MATTE_SURFACE,
        borderRadius: 0,
        height: '100%',
      }}>
        {activeConv ? (
          <>
            <Box sx={{ px: 1.5, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...MATTE_HEADER, boxShadow: 'none', color: 'inherit', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <IconButton
                  size="small"
                  sx={{ color: '#666' }}
                  onClick={() => setMobileView('sidebar')}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={activeConv.avatarUrl || undefined}
                    sx={{ bgcolor: stringToColor(activeConv.label), width: 36, height: 36, fontWeight: 700, fontSize: 14 }}
                  >
                    {initials(activeConv.label)}
                  </Avatar>
                  {activeConv.type === 'direct' && (
                    <Box sx={{
                      position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%',
                      bgcolor: activePeerOnline ? '#057642' : '#8C8C8C', border: '2px solid #fff',
                    }} />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} fontSize={14} color={LI_TEXT} noWrap>{activeConv.label}</Typography>
                  <Typography fontSize={11} color="#666">
                    {activeConv.type === 'group'
                      ? `${activeConv.participants.length} members`
                      : activePeerOnline ? 'Active now' : 'Offline'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.15, flexShrink: 0 }}>
                <Tooltip title="Video call">
                  <IconButton size="small" sx={{ color: '#666', '&:hover': { color: LI_BLUE } }}><VideoCallOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="Conversation info">
                  <IconButton size="small" sx={{ color: '#666', '&:hover': { color: LI_BLUE } }}><InfoOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Chat
                roomId={activeConv.id}
                userId={userId}
                onConnectionChange={setWsConnected}
                onPeerPresenceChange={handlePeerPresenceChange}
                userAvatars={userAvatars}
                userNames={userNames}
                peerAvatarUrl={activeConv.avatarUrl || (activePeerId ? userAvatars[activePeerId] : undefined)}
                peerDisplayName={activeConv.label}
              />
            </Box>
          </>
        ) : (
          <Box sx={{ m: 'auto', textAlign: 'center', maxWidth: 360, px: 3 }}>
            <Typography variant="h6" fontWeight={700} color={LI_TEXT} mb={1} fontSize={18}>Your messages</Typography>
            <Typography variant="body2" color="#666" lineHeight={1.6} mb={2.5}>
              Select a conversation or start a new one to connect with other ZPC members.
            </Typography>
            <Button variant="contained" disableElevation startIcon={<EditIcon />} onClick={() => setNewDlgOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 5, px: 2.5, bgcolor: LI_BLUE, '&:hover': { bgcolor: '#004182' } }}
            >
              Compose message
            </Button>
          </Box>
        )}
      </Box>

      <NewConvDialog open={newDlgOpen} onClose={() => setNewDlgOpen(false)} onStart={handleNewConv} myUserId={userId} />
    </Box>
  );

  if (isDesktopDock) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          right: 16,
          zIndex: 1400,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        {/* Conversation opens to the LEFT of the inbox — LinkedIn pattern */}
        {showDockChat && activeConv && (
          <Box sx={{ ...panelChrome, width: DOCK_CHAT_W }}>
            <Box sx={{ px: 1.5, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...MATTE_HEADER, boxShadow: 'none', color: 'inherit', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={activeConv.avatarUrl || undefined}
                    sx={{ bgcolor: stringToColor(activeConv.label), width: 36, height: 36, fontWeight: 700, fontSize: 14 }}
                  >
                    {initials(activeConv.label)}
                  </Avatar>
                  {activeConv.type === 'direct' && (
                    <Box sx={{
                      position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%',
                      bgcolor: activePeerOnline ? '#057642' : '#8C8C8C', border: '2px solid #fff',
                    }} />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} fontSize={14} color={LI_TEXT} noWrap>{activeConv.label}</Typography>
                  <Typography fontSize={11} color="#666">
                    {activeConv.type === 'group'
                      ? `${activeConv.participants.length} members`
                      : activePeerOnline ? 'Active now' : 'Offline'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.15 }}>
                <Tooltip title="Minimize">
                  <IconButton size="small" onClick={() => setDockMinimized(true)} sx={{ color: '#666' }}>
                    <MinimizeIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close conversation">
                  <IconButton size="small" onClick={closeConversationPanel} sx={{ color: '#666' }}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <Chat
                roomId={activeConv.id}
                userId={userId}
                onConnectionChange={setWsConnected}
                onPeerPresenceChange={handlePeerPresenceChange}
                userAvatars={userAvatars}
                userNames={userNames}
                peerAvatarUrl={activeConv.avatarUrl || (activePeerId ? userAvatars[activePeerId] : undefined)}
                peerDisplayName={activeConv.label}
              />
            </Box>
          </Box>
        )}

        <Box sx={{ ...panelChrome, width: DOCK_LIST_W }}>
          {shell}
        </Box>
      </Box>
    );
  }

  return shell;
};

export default ChatPage;
