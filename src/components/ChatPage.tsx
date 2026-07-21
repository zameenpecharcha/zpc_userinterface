import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, TextField, IconButton, Avatar, InputAdornment,
  Divider, List, ListItemButton, ListItemAvatar, ListItemText,
  Badge, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, ToggleButton, ToggleButtonGroup, Chip, CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideoCallOutlinedIcon from '@mui/icons-material/VideoCallOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApolloClient, useQuery } from '@apollo/client';
import { SEARCH_USERS_LIGHT } from '../graphql/user';
import { CREATE_DM_ROOM_MUTATION, CREATE_GROUP_ROOM_MUTATION, GET_USER_ROOMS } from '../graphql/chat';
import Chat from './Chat';

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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const stringToColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.codePointAt(i)! + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},50%,38%)`;
};

const initials = (label: string) =>
  label.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';

const fmtTime = (ms?: number) => {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};


const SIDEBAR_W = 360;
const LI_BLUE   = '#0A66C2';
const LI_BG     = '#F3F6F8';

// ── ConvItem ──────────────────────────────────────────────────────────────────

const ConvItem: React.FC<{
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}> = ({ conv, active, onClick }) => (
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
              : null
          }
        >
          <Avatar sx={{ bgcolor: stringToColor(conv.label), width: 46, height: 46, fontSize: 16, fontWeight: 700 }}>
            {initials(conv.label)}
          </Avatar>
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="subtitle2" fontWeight={conv.unread > 0 ? 700 : 500} noWrap sx={{ fontSize: 14, color: '#000', maxWidth: 160 }}>
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
      onStart({ id: roomId, type: 'direct', label: `${u.firstName} ${u.lastName}`.trim(), participants: [myUserId, otherId], unread: 0 });
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
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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

const ChatPage: React.FC = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const userId      = user ? String(user.id) : '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState<'all' | 'groups'>('all');
  const [newDlgOpen, setNewDlgOpen]       = useState(false);
  const [mobileView, setMobileView]       = useState<'sidebar' | 'chat'>('sidebar');
  const [wsConnected, setWsConnected]     = useState(false);

  // ── Load active rooms from server ─────────────────────────────────────────
  const { data: roomsData, loading: roomsLoading } = useQuery(GET_USER_ROOMS, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (!roomsData?.getUserRooms) return;
    const loaded: Conversation[] = roomsData.getUserRooms.map((r: any) => {
      const isGroup = r.roomType === 1;
      // For DMs derive label from the other participant's name
      let label = r.name || '';
      if (!isGroup && r.participants) {
        const other = r.participants.find((p: any) => p.userId !== userId);
        if (other) {
          label = `${other.firstName} ${other.lastName}`.trim() || r.roomId;
        }
      }
      if (!label) label = r.roomId;
      return {
        id: r.roomId,
        type: isGroup ? ('group' as const) : ('direct' as const),
        label,
        participants: r.memberIds || [],
        lastMessage: r.lastMessage || undefined,
        lastTime: r.lastMessageAt || undefined,
        unread: r.hasUnread ? 1 : 0,
      };
    });
    setConversations(prev => {
      const serverIds = new Set(loaded.map(c => c.id));
      const pending = prev.filter(c => !serverIds.has(c.id));
      return [...loaded, ...pending];
    });
  }, [roomsData, userId]);

  useEffect(() => {
    setWsConnected(false);
  }, [activeId]);

  // ── Auto-select room from router state (from ProfilePage / PropertyPage) ──
  useEffect(() => {
    const state = location.state as { autoSelectRoomId?: string } | null;
    if (state?.autoSelectRoomId) {
      setActiveId(state.autoSelectRoomId);
      setMobileView('chat');
      // Clear state so back-navigation doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const activeConv = conversations.find(c => c.id === activeId) ?? null;

  const openConversation = (conv: Conversation) => {
    setActiveId(conv.id);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
    setMobileView('chat');
  };

  const handleNewConv = useCallback((conv: Conversation) => {
    setConversations(prev => {
      if (prev.some(c => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
    setActiveId(conv.id);
    setMobileView('chat');
  }, []);

  const filtered = conversations.filter(c => {
    const matchFilter = filter === 'all' || c.type === 'group';
    const matchSearch = c.label.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: LI_BG, overflow: 'hidden', fontFamily: 'Inter, Roboto, Arial, sans-serif' }}>

      {/* ── Sidebar ── */}
      <Box sx={{
        width: { xs: '100%', md: SIDEBAR_W },
        display: { xs: mobileView === 'sidebar' ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        bgcolor: '#fff',
        borderRight: '1px solid #E0E0E0',
        flexShrink: 0,
      }}>
        {/* Header */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #E8E8E8' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Back to Home">
                <IconButton size="small" onClick={() => navigate('/home')} sx={{ color: '#555' }}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography variant="h6" fontWeight={700} fontSize={20} color="#000">Messaging</Typography>
            </Box>
            <Tooltip title="New message">
              <IconButton size="small" onClick={() => setNewDlgOpen(true)} sx={{ color: '#555', '&:hover': { bgcolor: LI_BG, color: LI_BLUE } }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <TextField
            fullWidth size="small" placeholder="Search messages"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#aaa' }} /></InputAdornment> }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2, bgcolor: LI_BG, fontSize: 13,
                '& fieldset': { border: '1px solid #E0E0E0' },
                '&:hover fieldset': { borderColor: '#aaa' },
                '&.Mui-focused fieldset': { borderColor: LI_BLUE },
              },
            }}
          />

          <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5 }}>
            {(['all', 'groups'] as const).map(f => (
              <Box key={f} onClick={() => setFilter(f)} sx={{
                px: 1.5, py: 0.5, borderRadius: 5, cursor: 'pointer', fontSize: 13, fontWeight: 600, userSelect: 'none',
                bgcolor: filter === f ? '#EAF0F8' : 'transparent',
                color: filter === f ? LI_BLUE : '#666',
                border: `1px solid ${filter === f ? LI_BLUE : 'transparent'}`,
                '&:hover': { bgcolor: LI_BG },
              }}>
                {f === 'all' ? 'All' : 'Groups'}
              </Box>
            ))}
          </Box>
        </Box>

        {/* List */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {roomsLoading && conversations.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 8 }}>
              <CircularProgress size={32} sx={{ color: LI_BLUE }} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 8, px: 4 }}>
              <Box sx={{ fontSize: 48, mb: 1 }}>💬</Box>
              <Typography variant="body2" fontWeight={600} color="#333" mb={0.5}>No conversations yet</Typography>
              <Typography variant="caption" color="#888" lineHeight={1.5}>
                Click the <b>pencil icon</b> to start a direct message or create a group.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filtered.map(conv => (
                <ConvItem key={conv.id} conv={conv} active={conv.id === activeId} onClick={() => openConversation(conv)} />
              ))}
            </List>
          )}
        </Box>
      </Box>

      {/* ── Conversation Panel ── */}
      <Box sx={{
        flex: 1,
        display: { xs: mobileView === 'chat' ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#fff',
      }}>
        {activeConv ? (
          <>
            {/* Header */}
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E8E8', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <IconButton size="small" sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#555' }} onClick={() => setMobileView('sidebar')}>
                  <ArrowBackIcon />
                </IconButton>
                <Box sx={{ position: 'relative' }}>
                  <Avatar sx={{ bgcolor: stringToColor(activeConv.label), width: 44, height: 44, fontWeight: 700, fontSize: 16 }}>
                    {initials(activeConv.label)}
                  </Avatar>
                  {activeConv.type === 'direct' && (
                    <Box sx={{
                      position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%',
                      bgcolor: wsConnected ? '#2ECC71' : '#aaa', border: '2px solid #fff',
                    }} />
                  )}
                </Box>
                <Box>
                  <Typography fontWeight={700} fontSize={15} color="#000">{activeConv.label}</Typography>
                  <Typography fontSize={12} color={activeConv.type === 'direct' && wsConnected ? '#2ECC71' : '#777'}>
                    {activeConv.type === 'group'
                      ? `${activeConv.participants.length} members`
                      : wsConnected ? 'Connected' : 'Connecting…'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Video call">
                  <IconButton size="small" sx={{ color: '#555', '&:hover': { color: LI_BLUE } }}><VideoCallOutlinedIcon /></IconButton>
                </Tooltip>
                <Tooltip title="Conversation info">
                  <IconButton size="small" sx={{ color: '#555', '&:hover': { color: LI_BLUE } }}><InfoOutlinedIcon /></IconButton>
                </Tooltip>
                <Tooltip title="More options">
                  <IconButton size="small" sx={{ color: '#555', '&:hover': { color: LI_BLUE } }}><MoreHorizIcon /></IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Chat roomId={activeConv.id} userId={userId} onConnectionChange={setWsConnected} />
            </Box>
          </>
        ) : (
          <Box sx={{ m: 'auto', textAlign: 'center', maxWidth: 380, px: 3 }}>
            <Box sx={{ width: 96, height: 96, borderRadius: '50%', bgcolor: LI_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <Box sx={{ fontSize: 44 }}>💬</Box>
            </Box>
            <Typography variant="h6" fontWeight={700} color="#000" mb={1}>Your inbox</Typography>
            <Typography variant="body2" color="#666" lineHeight={1.6} mb={2.5}>
              Select a conversation or start a new one to connect with other ZPC members.
            </Typography>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setNewDlgOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 5, px: 3, borderColor: LI_BLUE, color: LI_BLUE, '&:hover': { bgcolor: '#EAF0F8', borderColor: LI_BLUE } }}
            >
              New message
            </Button>
          </Box>
        )}
      </Box>

      <NewConvDialog open={newDlgOpen} onClose={() => setNewDlgOpen(false)} onStart={handleNewConv} myUserId={userId} />
    </Box>
  );
};

export default ChatPage;
