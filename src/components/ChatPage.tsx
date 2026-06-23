import React, { useState } from 'react';
import {
  Box, Typography, TextField, IconButton, Avatar, InputAdornment,
  Divider, List, ListItemButton, ListItemAvatar, ListItemText,
} from '@mui/material';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chat from './Chat';

// ── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  label: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const stringToColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},55%,40%)`;
};

const SIDEBAR_W = 340;

// ── Main component ───────────────────────────────────────────────────────────

const ChatPage: React.FC = () => {
  const storedUser = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';

  const [userId, setUserId]         = useState(storedUser);
  const [userInput, setUserInput]   = useState(storedUser);
  const [userSet, setUserSet]       = useState(!!storedUser);
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [newRoom, setNewRoom]       = useState('');
  const [search, setSearch]         = useState('');
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  // ── Step 1: set user identity ──────────────────────────────────────────────
  if (!userSet) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f2f5' }}>
        <Box sx={{
          bgcolor: '#fff', borderRadius: 3, p: 4, width: 340,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <Typography variant="h6" fontWeight={700} textAlign="center">Welcome to ZPC Chat</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Enter your user ID to start chatting
          </Typography>
          <TextField
            label="Your User ID"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            fullWidth size="small"
            placeholder="e.g. rohit123"
            onKeyDown={e => {
              if (e.key === 'Enter' && userInput.trim()) {
                setUserId(userInput.trim());
                localStorage.setItem('userId', userInput.trim());
                setUserSet(true);
              }
            }}
          />
          <Box
            component="button"
            onClick={() => {
              if (!userInput.trim()) return;
              setUserId(userInput.trim());
              localStorage.setItem('userId', userInput.trim());
              setUserSet(true);
            }}
            sx={{
              bgcolor: '#25D366', color: '#fff', border: 'none', borderRadius: 2,
              py: 1.2, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              '&:hover': { bgcolor: '#1ebe5d' },
            }}
          >
            Continue →
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Join / create room ──────────────────────────────────────────────────────
  const joinRoom = () => {
    const id = newRoom.trim();
    if (!id) return;
    const room: Room = { id, label: id };
    if (!rooms.find(r => r.id === id)) setRooms(prev => [room, ...prev]);
    setActiveRoom(room);
    setNewRoom('');
    setMobileView('chat');
  };

  const openRoom = (room: Room) => {
    setActiveRoom(room);
    setMobileView('chat');
  };

  const filteredRooms = rooms.filter(r =>
    r.label.toLowerCase().includes(search.toLowerCase())
  );

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f0f2f5', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <Box sx={{
        width: { xs: '100%', md: SIDEBAR_W },
        display: { xs: mobileView === 'sidebar' ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        bgcolor: '#fff',
        borderRight: '1px solid #e0e0e0',
        flexShrink: 0,
      }}>
        {/* Sidebar header */}
        <Box sx={{ bgcolor: '#128C7E', px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: stringToColor(userId), fontSize: 14 }}>
              {userId.slice(0, 2).toUpperCase()}
            </Avatar>
            <Typography variant="subtitle2" fontWeight={700} color="#fff">{userId}</Typography>
          </Box>
          <IconButton size="small" title="New chat" onClick={() => document.getElementById('new-room-input')?.focus()}>
            <AddCommentOutlinedIcon sx={{ color: '#fff', fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Search bar */}
        <Box sx={{ px: 1.5, py: 1, bgcolor: '#f0f2f5' }}>
          <TextField
            fullWidth size="small"
            placeholder="Search rooms"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#aaa' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: '#fff', borderRadius: 5,
              '& .MuiOutlinedInput-root': { borderRadius: 5, fontSize: 13 },
              '& fieldset': { border: 'none' },
            }}
          />
        </Box>

        {/* New room input */}
        <Box sx={{ px: 1.5, pb: 1, bgcolor: '#f0f2f5' }}>
          <TextField
            id="new-room-input"
            fullWidth size="small"
            placeholder="Enter room ID and press Enter"
            value={newRoom}
            onChange={e => setNewRoom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            InputProps={{
              endAdornment: newRoom.trim() ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={joinRoom}>
                    <AddCommentOutlinedIcon sx={{ fontSize: 16, color: '#128C7E' }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
            sx={{
              bgcolor: '#fff', borderRadius: 5,
              '& .MuiOutlinedInput-root': { borderRadius: 5, fontSize: 13 },
              '& fieldset': { border: 'none' },
            }}
          />
        </Box>

        <Divider />

        {/* Room list */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {filteredRooms.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 6, px: 3, color: '#aaa' }}>
              <Typography variant="body2">No rooms yet.</Typography>
              <Typography variant="caption">Type a room ID above and press Enter to join.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredRooms.map(room => (
                <React.Fragment key={room.id}>
                  <ListItemButton
                    selected={activeRoom?.id === room.id}
                    onClick={() => openRoom(room)}
                    sx={{
                      py: 1.5, px: 2,
                      '&.Mui-selected': { bgcolor: '#f0f2f5' },
                      '&:hover': { bgcolor: '#f5f5f5' },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: stringToColor(room.id), width: 46, height: 46, fontSize: 16 }}>
                        {room.id.slice(0, 2).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="subtitle2" fontWeight={600} noWrap>{room.label}</Typography>}
                      secondary={<Typography variant="caption" color="text.secondary">Tap to open</Typography>}
                    />
                  </ListItemButton>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Box>

      {/* ── Chat panel ── */}
      <Box sx={{
        flex: 1,
        display: { xs: mobileView === 'chat' ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {activeRoom ? (
          <>
            {/* Chat header */}
            <Box sx={{ bgcolor: '#128C7E', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
              <IconButton
                size="small"
                sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#fff' }}
                onClick={() => setMobileView('sidebar')}
              >
                <ArrowBackIcon />
              </IconButton>
              <Avatar sx={{ bgcolor: stringToColor(activeRoom.id), width: 38, height: 38, fontSize: 14 }}>
                {activeRoom.id.slice(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="#fff">{activeRoom.label}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                  room · {userId}
                </Typography>
              </Box>
            </Box>

            {/* Chat messages + input */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Chat roomId={activeRoom.id} userId={userId} />
            </Box>
          </>
        ) : (
          <Box sx={{ m: 'auto', textAlign: 'center', color: '#aaa', userSelect: 'none' }}>
            <Box sx={{ fontSize: 80, mb: 2 }}>💬</Box>
            <Typography variant="h6" fontWeight={600} color="#666">ZPC Chat</Typography>
            <Typography variant="body2">Select a room or enter a room ID to start chatting</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatPage;
