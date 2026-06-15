import React, { useState } from 'react';
import {
  Box, Container, Typography, TextField, Button, Paper, Grid, Chip,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Chat from './Chat';

const ChatPage: React.FC = () => {
  const storedUser = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';

  const [roomIdInput, setRoomIdInput] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [userId, setUserId] = useState(storedUser);

  const joinRoom = () => {
    const room = roomIdInput.trim();
    if (!room || !userId.trim()) return;
    setActiveRoom(room);
  };

  if (activeRoom) {
    return (
      <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Button variant="outlined" size="small" onClick={() => setActiveRoom(null)}>
            ← Leave Room
          </Button>
          <Chip label={`Room: ${activeRoom}`} color="primary" />
          <Chip label={`You: ${userId}`} variant="outlined" />
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <Chat roomId={activeRoom} userId={userId} displayName={`Room ${activeRoom}`} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <ChatBubbleOutlineIcon color="primary" sx={{ fontSize: 48 }} />
          <Typography variant="h5" fontWeight={700} mt={1}>
            Join a Chat Room
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a room ID to start chatting in real-time
          </Typography>
        </Box>

        <Grid container spacing={2} direction="column">
          <Grid item>
            <TextField
              label="Your User ID"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              fullWidth
              size="small"
              placeholder="e.g. user123"
            />
          </Grid>
          <Grid item>
            <TextField
              label="Room ID"
              value={roomIdInput}
              onChange={e => setRoomIdInput(e.target.value)}
              fullWidth
              size="small"
              placeholder="e.g. general"
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={joinRoom}
              disabled={!roomIdInput.trim() || !userId.trim()}
            >
              Join Room
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ChatPage;
