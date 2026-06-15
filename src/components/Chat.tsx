import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, List, ListItem,
  ListItemText, Avatar, Divider, CircularProgress, Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { WS_CHAT_URL } from '../apollo-client';

interface Message {
  messageId: string;
  userId: string;
  text: string;
  sentAt: number;
  eventType: number;
  mediaUrl?: string;
  mediaName?: string;
}

interface ChatProps {
  roomId: string;
  userId: string;
  displayName?: string;
}

const Chat: React.FC<ChatProps> = ({ roomId, userId, displayName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const url = `${WS_CHAT_URL}/${roomId}/${userId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => { setConnected(true); setError(null); };
    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3s
      setTimeout(connect, 3000);
    };
    ws.onerror = () => setError('Connection error — retrying...');

    ws.onmessage = (evt) => {
      try {
        const msg: Message = JSON.parse(evt.data);
        if (msg.eventType === 1) {
          setTypingUsers(s => new Set(s).add(msg.userId));
        } else if (msg.eventType === 2) {
          setTypingUsers(s => { const n = new Set(s); n.delete(msg.userId); return n; });
        } else if (msg.eventType === 0 && msg.text) {
          setMessages(prev => [...prev, msg]);
        }
      } catch {}
    };
  }, [roomId, userId]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendTyping = (start: boolean) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ eventType: start ? 1 : 2 }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    sendTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(false), 1500);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ text }));
    setInput('');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    sendTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (unix_ms: number) =>
    new Date(unix_ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: '8px 8px 0 0' }}>
        <Typography variant="h6" fontWeight={600}>
          {displayName || `Room: ${roomId}`}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {connected ? '● Online' : '○ Connecting...'}
        </Typography>
      </Box>

      {error && <Alert severity="warning" sx={{ m: 1 }}>{error}</Alert>}

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
            <Typography variant="body2">No messages yet. Say hello! 👋</Typography>
          </Box>
        )}
        <List disablePadding>
          {messages.map((msg) => {
            const isMe = msg.userId === userId;
            return (
              <ListItem
                key={msg.messageId}
                sx={{ justifyContent: isMe ? 'flex-end' : 'flex-start', px: 0, py: 0.5 }}
              >
                {!isMe && (
                  <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: 'secondary.main', fontSize: 12 }}>
                    {msg.userId.slice(0, 2).toUpperCase()}
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '70%',
                    bgcolor: isMe ? 'primary.main' : 'grey.100',
                    color: isMe ? 'white' : 'text.primary',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    px: 2, py: 1,
                  }}
                >
                  {!isMe && (
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      {msg.userId}
                    </Typography>
                  )}
                  <Typography variant="body2">{msg.text}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'right', mt: 0.5 }}>
                    {formatTime(msg.sentAt)}
                  </Typography>
                </Box>
              </ListItem>
            );
          })}
        </List>
        {typingUsers.size > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {Array.from(typingUsers).filter(u => u !== userId).join(', ')} typing...
          </Typography>
        )}
        <div ref={bottomRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Type a message…"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={!connected}
          variant="outlined"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <IconButton
          color="primary"
          onClick={sendMessage}
          disabled={!connected || !input.trim()}
          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { bgcolor: 'grey.300' } }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default Chat;
