import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton, Avatar,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoneIcon from '@mui/icons-material/Done';
import { WS_CHAT_URL } from '../apollo-client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  messageId: string;
  userId: string;
  text: string;
  sentAt: number;
  eventType: number;   // 0=msg 1=typing_start 2=typing_stop 3=read 4=react 5=delete 6=presence
  status: number;      // 0=sent 1=delivered 2=read
  isDeleted: boolean;
  reactionEmoji?: string;
  replyToMessageId?: string;
  mediaUrl?: string;
  mediaName?: string;
  isOnline?: boolean;
}

interface ChatProps {
  roomId: string;
  userId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const stringToColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},55%,40%)`;
};

const initials = (id: string) => id.slice(0, 2).toUpperCase();

// ── Chat component ───────────────────────────────────────────────────────────

const Chat: React.FC<ChatProps> = ({ roomId, userId }) => {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [connected, setConnected] = useState(false);
  const [typingSet, setTypingSet] = useState<Set<string>>(new Set());
  const wsRef          = useRef<WebSocket | null>(null);
  const bottomRef      = useRef<HTMLDivElement | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── WebSocket ──────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    const url = `${WS_CHAT_URL}/${roomId}/${userId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen  = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();

    ws.onmessage = ({ data }) => {
      try {
        const msg: ChatMessage = JSON.parse(data);
        if (msg.eventType === 1) {
          setTypingSet(s => new Set(s).add(msg.userId));
        } else if (msg.eventType === 2) {
          setTypingSet(s => { const n = new Set(s); n.delete(msg.userId); return n; });
        } else if (msg.eventType === 5) {
          setMessages(prev => prev.map(m =>
            m.messageId === msg.messageId ? { ...m, isDeleted: true } : m));
        } else if (msg.eventType === 4) {
          setMessages(prev => prev.map(m =>
            m.messageId === msg.messageId ? { ...m, reactionEmoji: msg.reactionEmoji } : m));
        } else if (msg.eventType === 0 && msg.text) {
          setMessages(prev => {
            // Update existing optimistic message or add new one
            if (prev.some(m => m.messageId === msg.messageId)) {
              return prev.map(m => m.messageId === msg.messageId ? { ...m, ...msg } : m);
            }
            return [...prev, msg];
          });
        }
      } catch { /* ignore malformed frames */ }
    };
  }, [roomId, userId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingSet]);

  // ── Typing ─────────────────────────────────────────────────────────────────

  const sendEvent = (eventType: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ eventType }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    sendEvent(1);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendEvent(2), 1500);
  };

  // ── Send ───────────────────────────────────────────────────────────────────

  const send = () => {
    const text = input.trim();
    if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return;
    const messageId = crypto.randomUUID();
    const now = Date.now();
    // Show message immediately (optimistic)
    setMessages(prev => [...prev, {
      messageId, userId, text, sentAt: now,
      eventType: 0, status: 0, isDeleted: false,
    }]);
    wsRef.current.send(JSON.stringify({ text, messageId }));
    setInput('');
    if (typingTimer.current) clearTimeout(typingTimer.current);
    sendEvent(2);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const otherTyping = Array.from(typingSet).filter(u => u !== userId);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#ECE5DD' }}>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {messages.length === 0 && (
          <Box sx={{ m: 'auto', textAlign: 'center', color: '#777', userSelect: 'none' }}>
            <Typography variant="body2">No messages yet — say hello! 👋</Typography>
          </Box>
        )}

        {messages.map((msg) => {
          const isMe = msg.userId === userId;
          return (
            <Box key={msg.messageId}
              sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 0.75 }}
            >
              {!isMe && (
                <Avatar sx={{ width: 30, height: 30, fontSize: 11, bgcolor: stringToColor(msg.userId), flexShrink: 0, mb: '2px' }}>
                  {initials(msg.userId)}
                </Avatar>
              )}
              <Box sx={{
                maxWidth: '70%',
                bgcolor: isMe ? '#DCF8C6' : '#fff',
                color: '#111',
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                px: 1.5, py: 0.75,
                boxShadow: '0 1px 2px rgba(0,0,0,0.13)',
                position: 'relative',
                wordBreak: 'break-word',
              }}>
                {!isMe && (
                  <Typography variant="caption" sx={{ fontWeight: 700, color: stringToColor(msg.userId), display: 'block', mb: 0.25, fontSize: 11 }}>
                    {msg.userId}
                  </Typography>
                )}

                {msg.isDeleted ? (
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999', fontSize: 13 }}>
                    🚫 This message was deleted
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ lineHeight: 1.45, fontSize: 14 }}>
                    {msg.text}
                  </Typography>
                )}

                {msg.reactionEmoji && (
                  <Box sx={{ position: 'absolute', bottom: -10, right: 6, bgcolor: '#fff', borderRadius: 3, px: 0.5, fontSize: 13, boxShadow: 1 }}>
                    {msg.reactionEmoji}
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#aaa', fontSize: 10, lineHeight: 1 }}>
                    {fmtTime(msg.sentAt)}
                  </Typography>
                  {isMe && (
                    msg.status >= 2
                      ? <DoneAllIcon sx={{ fontSize: 13, color: '#53bdeb' }} />
                      : msg.status >= 1
                        ? <DoneAllIcon sx={{ fontSize: 13, color: '#aaa' }} />
                        : <DoneIcon sx={{ fontSize: 13, color: '#aaa' }} />
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Typing indicator */}
        {otherTyping.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75 }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 11, bgcolor: stringToColor(otherTyping[0]) }}>
              {initials(otherTyping[0])}
            </Avatar>
            <Box sx={{ bgcolor: '#fff', borderRadius: '18px 18px 18px 4px', px: 1.5, py: 0.75, boxShadow: '0 1px 2px rgba(0,0,0,0.13)' }}>
              <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center', height: 18 }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <Box key={i} sx={{
                    width: 6, height: 6, borderRadius: '50%', bgcolor: '#aaa',
                    animation: 'typingBounce 1.2s infinite',
                    animationDelay: `${delay}s`,
                    '@keyframes typingBounce': {
                      '0%,80%,100%': { transform: 'scale(0.6)', opacity: 0.4 },
                      '40%':         { transform: 'scale(1)',   opacity: 1   },
                    },
                  }} />
                ))}
              </Box>
            </Box>
          </Box>
        )}

        <div ref={bottomRef} />
      </Box>

      {/* Input bar */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, px: 1.5, py: 1, bgcolor: '#F0F0F0', borderTop: '1px solid #ddd' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder={connected ? 'Type a message' : 'Connecting…'}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={!connected}
          variant="outlined"
          sx={{
            bgcolor: '#fff',
            borderRadius: 5,
            '& .MuiOutlinedInput-root': { borderRadius: 5, px: 1.5, fontSize: 14 },
            '& fieldset': { border: 'none' },
          }}
        />
        <IconButton
          onClick={send}
          disabled={!connected || !input.trim()}
          sx={{
            bgcolor: connected && input.trim() ? '#25D366' : '#ccc',
            color: '#fff',
            width: 40, height: 40, flexShrink: 0,
            '&:hover': { bgcolor: '#1ebe5d' },
            '&:disabled': { bgcolor: '#ccc', color: '#fff' },
            transition: 'background-color 0.2s',
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Chat;
