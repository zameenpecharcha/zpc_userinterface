import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import {
  Box, Typography, TextField, IconButton, Avatar, Menu, MenuItem,
  Popover, CircularProgress, InputAdornment, Drawer, Divider, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoneIcon from '@mui/icons-material/Done';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { WS_CHAT_URL } from '../apollo-client';
import { GET_CHAT_MESSAGES, REQUEST_CHAT_UPLOAD } from '../graphql/chat';
import { nameInitials, stringToColor } from '../utils/mentions';
import { MATTE_HEADER, MATTE_INSET } from '../theme/surfaces';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  messageId: string;
  userId: string;
  text: string;
  sentAt: number;
  eventType: number;   // 0=msg … 5=delete 6=presence 7=edit
  status: number;      // proto: 0=SENDING 1=SENT 2=DELIVERED 3=READ
  isDeleted: boolean;
  editedAt?: number;
  reactionEmoji?: string;
  replyToMessageId?: string;
  type?: number;       // 0=TEXT 1=IMAGE 2=VIDEO 3=AUDIO 4=FILE
  mediaKey?: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaMimeType?: string;
  isOnline?: boolean;
}

interface ChatProps {
  roomId: string;
  userId: string;
  onConnectionChange?: (connected: boolean) => void;
  /** Presence updates for other users in this room (peer online/offline). */
  onPeerPresenceChange?: (peerUserId: string, isOnline: boolean) => void;
  /** Avatar URL map keyed by userId for message bubbles. */
  userAvatars?: Record<string, string>;
  /** Display name map keyed by userId — used for initials when photo missing. */
  userNames?: Record<string, string>;
  peerAvatarUrl?: string;
  peerDisplayName?: string;
}

const QUICK_EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘', '🤩', '😎',
  '🤔', '😮', '😢', '😭', '😤', '😅', '🙄', '😴', '🥳', '😇',
  '👍', '👎', '👏', '🙏', '🔥', '❤️', '💯', '✨', '🎉', '🏠',
  '✅', '❌', '⭐', '💬', '📎', '📷', '📍', '💡', '🤝', '🙌',
];

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const normalizeRoomId = (id: string): string => {
  if (!id) return id;
  const trimmed = id.trim();
  if (trimmed.startsWith('dm-')) {
    const parts = trimmed.split('-');
    if (parts.length >= 3 && parts[1] && parts[2]) {
      const userA = parts[1];
      const userB = parts.slice(2).join('-');
      const [first, second] = [userA, userB].sort();
      return `dm:${first}:${second}`;
    }
  }
  if (trimmed.startsWith('dm:')) {
    const parts = trimmed.split(':');
    if (parts.length >= 3 && parts[1] && parts[2]) {
      const [first, second] = [parts[1], parts[2]].sort();
      return `dm:${first}:${second}`;
    }
  }
  return trimmed;
};

const getRoomCandidates = (id: string): string[] => {
  const normalized = normalizeRoomId(id);
  const candidates = [id, normalized];
  if (id.startsWith('dm-')) {
    const parts = id.split('-');
    if (parts.length >= 3 && parts[1] && parts[2]) {
      candidates.push(`dm:${parts[1]}:${parts[2]}`);
    }
  }
  if (id.startsWith('dm:')) {
    const parts = id.split(':');
    if (parts.length >= 3 && parts[1] && parts[2]) {
      candidates.push(`dm-${parts[1]}-${parts[2]}`);
    }
  }
  return Array.from(new Set(candidates.filter(Boolean)));
};

const mapHistory = (rows: any[]): ChatMessage[] => (
  [...rows]
    .sort((a, b) => a.sentAt - b.sentAt)
    .map((m) => ({
      messageId: m.messageId,
      userId: m.userId,
      text: m.text,
      sentAt: m.sentAt,
      eventType: m.eventType,
      status: m.status,
      isDeleted: !!m.isDeleted,
      editedAt: m.editedAt || 0,
      reactionEmoji: m.reactionEmoji,
      replyToMessageId: m.replyToMessageId,
      type: m.type,
      mediaKey: m.mediaKey,
      mediaUrl: m.mediaUrl,
      mediaName: m.mediaName,
      mediaMimeType: m.mediaMimeType,
    }))
);

const mediaTypeFromMime = (mime: string): number => {
  if (!mime) return 4;
  if (mime.startsWith('image/')) return 1;
  if (mime.startsWith('video/')) return 2;
  if (mime.startsWith('audio/')) return 3;
  return 4;
};

// ── Chat component ───────────────────────────────────────────────────────────

const Chat: React.FC<ChatProps> = ({
  roomId,
  userId,
  onConnectionChange,
  onPeerPresenceChange,
  userAvatars,
  userNames,
  peerAvatarUrl,
  peerDisplayName,
}) => {
  const apollo = useApolloClient();
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [connected, setConnected] = useState(false);
  const [typingSet, setTypingSet] = useState<Set<string>>(new Set());
  const [msgMenu, setMsgMenu] = useState<{
    message: ChatMessage;
    position: { top: number; left: number };
  } | null>(null);
  const [actionSheet, setActionSheet] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [hiddenForMe, setHiddenForMe] = useState<Set<string>>(() => new Set());
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const wsRef          = useRef<WebSocket | null>(null);
  const bottomRef      = useRef<HTMLDivElement | null>(null);
  const inputRef       = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const authReconnectAttemptedRef = useRef(false);
  const pendingMessagesRef = useRef<string[]>([]);
  // Synchronously compute the canonical roomId — never derive it from async state
  // to avoid the race where the WebSocket connects with the wrong room.
  const canonicalRoomId = normalizeRoomId(roomId);

  useEffect(() => {
    onConnectionChange?.(connected);
  }, [connected, onConnectionChange]);

  // Bug-4 fix: clear messages AND typing indicators immediately when room changes
  // so stale Room-A messages never bleed into Room-B's view.
  useEffect(() => {
    setMessages([]);
    setTypingSet(new Set());
    setHiddenForMe(new Set());
    setEditingMessage(null);
    setMsgMenu(null);
    setActionSheet(null);
    setConnected(false);
  }, [canonicalRoomId]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!roomId || !userId) {
        setMessages([]);
        return;
      }

      try {
        const result = await apollo.query({
          query: GET_CHAT_MESSAGES,
          variables: { roomId: canonicalRoomId, userId, limit: 50, beforeUnixMs: 0 },
          fetchPolicy: 'network-only',
        });

        if (cancelled) return;
        const rows = result.data?.getMessages?.messages ?? [];
        setMessages(mapHistory(rows));
      } catch (err) {
        console.error('Chat history load failed', { roomId, canonicalRoomId, userId, err });
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [apollo, roomId, canonicalRoomId, userId]);

  // ── WebSocket ──────────────────────────────────────────────────────────────

  const sendReadReceipt = useCallback((messageId: string) => {
    if (!messageId || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ eventType: 3, messageId }));
  }, []);

  const connect = useCallback(() => {
    shouldReconnectRef.current = true;
    const token = localStorage.getItem('token') || '';
    // Bug-1/2/6 fix: use the synchronously-computed canonicalRoomId (not async
    // resolvedRoomId state) so the WebSocket always connects to the correct room.
    const url = token
      ? `${WS_CHAT_URL}/${canonicalRoomId}/${userId}?token=${encodeURIComponent(token)}`
      : `${WS_CHAT_URL}/${canonicalRoomId}/${userId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen  = () => {
      authReconnectAttemptedRef.current = false;
      setConnected(true);
      while (pendingMessagesRef.current.length > 0) {
        const payload = pendingMessagesRef.current.shift();
        if (payload && ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    };
    ws.onclose = (ev) => {
      setConnected(false);
      if (ev.code === 1008) {
        const token = localStorage.getItem('token');
        if (token && !authReconnectAttemptedRef.current && shouldReconnectRef.current) {
          authReconnectAttemptedRef.current = true;
          reconnectTimer.current = setTimeout(connect, 3000);
        }
        return;
      }
      if (!shouldReconnectRef.current) return;
      reconnectTimer.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();

    ws.onmessage = ({ data }) => {
      try {
        const msg: ChatMessage = JSON.parse(data);
        const eventType = typeof msg.eventType === 'number' ? msg.eventType : 0;
        const normalizedStatus = typeof msg.status === 'number' ? msg.status : 0;
        if (eventType === 1) {
          setTypingSet(s => new Set(s).add(msg.userId));
        } else if (eventType === 2) {
          setTypingSet(s => { const n = new Set(s); n.delete(msg.userId); return n; });
        } else if (eventType === 5) {
          // Only apply tombstone when the deleter owns the message
          setMessages(prev => prev.map(m =>
            m.messageId === msg.messageId && String(m.userId) === String(msg.userId)
              ? { ...m, isDeleted: true, text: '' }
              : m));
        } else if (eventType === 7) {
          setMessages(prev => prev.map(m =>
            m.messageId === msg.messageId && String(m.userId) === String(msg.userId)
              ? { ...m, text: msg.text, editedAt: (msg as any).editedAt || Date.now() }
              : m));
        } else if (eventType === 4) {
          setMessages(prev => prev.map(m =>
            m.messageId === msg.messageId ? { ...m, reactionEmoji: msg.reactionEmoji } : m));
        } else if (eventType === 3) {
          setMessages(prev => prev.map(m =>
            m.messageId === msg.messageId ? { ...m, status: 3 } : m));
        } else if (eventType === 6) {
          if (msg.userId && msg.userId !== userId) {
            onPeerPresenceChange?.(msg.userId, !!msg.isOnline);
          }
        } else if ((eventType === 0 || msg.text || (msg as any).mediaKey || msg.mediaUrl) && msg.messageId) {
          setMessages(prev => {
            const exists = prev.some(m => m.messageId === msg.messageId);
            if (exists) {
              return prev.map(m => m.messageId === msg.messageId ? { ...m, ...msg, status: normalizedStatus || 0 } : m);
            }
            const next = [...prev, { ...msg, eventType: 0, status: normalizedStatus || (msg.userId === userId ? 1 : 0) }];
            if (msg.userId !== userId) {
              sendReadReceipt(msg.messageId);
            }
            return next;
          });
        }
      } catch { /* ignore malformed frames */ }
    };
  }, [canonicalRoomId, userId, sendReadReceipt, onPeerPresenceChange]);

  useEffect(() => {
    connect();
    return () => {
      // Bug-5 fix: set flag FIRST so any in-flight onclose handler won't schedule
      // a new reconnect, then cancel the timer and null all refs.
      shouldReconnectRef.current = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      pendingMessagesRef.current = [];
    };
  }, [connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingSet]);

  // Input is local-only while typing; websocket is used only on send.

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const clearPendingFile = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingPreview]);

  const insertEmoji = useCallback((emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? input.length;
    const next = `${input.slice(0, start)}${emoji}${input.slice(end)}`;
    setInput(next);
    setEmojiAnchor(null);
    setTimeout(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      const pos = start + emoji.length;
      inputRef.current.setSelectionRange(pos, pos);
    }, 0);
  }, [input]);

  const sendPayload = useCallback((payloadObj: Record<string, unknown>, optimistic: ChatMessage) => {
    const payload = JSON.stringify(payloadObj);
    setMessages(prev => {
      const exists = prev.some(m => m.messageId === optimistic.messageId);
      return exists ? prev : [...prev, optimistic];
    });
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
    } else {
      pendingMessagesRef.current.push(payload);
    }
  }, []);

  // ── Send ───────────────────────────────────────────────────────────────────

  const send = useCallback(async () => {
    const text = input.trim();

    // Teams-style edit: save via eventType 7 instead of sending a new message
    if (editingMessage) {
      if (!text || editingMessage.isDeleted) {
        setEditingMessage(null);
        setInput('');
        return;
      }
      const payload = JSON.stringify({
        eventType: 7,
        messageId: editingMessage.messageId,
        text,
      });
      const editedAt = Date.now();
      setMessages(prev => prev.map(m =>
        m.messageId === editingMessage.messageId
          ? { ...m, text, editedAt }
          : m));
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(payload);
      } else {
        pendingMessagesRef.current.push(payload);
      }
      setEditingMessage(null);
      setInput('');
      return;
    }

    if ((!text && !pendingFile) || uploading) return;

    if (pendingFile) {
      setUploading(true);
      try {
        const file = pendingFile;
        const { data } = await apollo.mutate({
          mutation: REQUEST_CHAT_UPLOAD,
          variables: {
            userId,
            roomId: canonicalRoomId,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            fileSizeBytes: file.size,
          },
        });
        const upload = data?.requestChatUpload;
        if (!upload?.uploadUrl || !upload?.mediaKey) {
          throw new Error('Failed to get upload URL');
        }
        const putRes = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!putRes.ok) {
          throw new Error(`Upload failed (${putRes.status})`);
        }
        const messageId = crypto.randomUUID();
        const now = Date.now();
        const msgType = mediaTypeFromMime(file.type);
        sendPayload(
          {
            type: msgType,
            text,
            messageId,
            sentAt: now,
            mediaKey: upload.mediaKey,
            mediaName: file.name,
            mediaSizeBytes: file.size,
            mediaMimeType: file.type || 'application/octet-stream',
          },
          {
            messageId,
            userId,
            text,
            sentAt: now,
            eventType: 0,
            status: 0,
            isDeleted: false,
            type: msgType,
            mediaKey: upload.mediaKey,
            mediaName: file.name,
            mediaMimeType: file.type || 'application/octet-stream',
            mediaUrl: pendingPreview || undefined,
          }
        );
        setInput('');
        clearPendingFile();
      } catch (err) {
        console.error('Chat media upload failed:', err);
        window.alert(err instanceof Error ? err.message : 'Failed to upload media');
      } finally {
        setUploading(false);
      }
      return;
    }

    const messageId = crypto.randomUUID();
    const now = Date.now();
    sendPayload(
      { text, messageId, sentAt: now },
      {
        messageId, userId, text, sentAt: now,
        eventType: 0, status: 0, isDeleted: false, type: 0,
      }
    );
    setInput('');
  }, [
    input, pendingFile, uploading, apollo, userId, canonicalRoomId,
    sendPayload, clearPendingFile, pendingPreview, editingMessage,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && editingMessage) {
      e.preventDefault();
      setEditingMessage(null);
      setInput('');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      window.alert('File is too large (max 25 MB)');
      e.target.value = '';
      return;
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const reactToMessage = useCallback((msg: ChatMessage, emoji: string) => {
    setMsgMenu(null);
    setActionSheet(null);
    if (!msg.messageId || msg.isDeleted) return;
    const payload = JSON.stringify({
      eventType: 4,
      messageId: msg.messageId,
      reactionEmoji: emoji,
    });
    setMessages(prev => prev.map(m =>
      m.messageId === msg.messageId ? { ...m, reactionEmoji: emoji } : m));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
    } else {
      pendingMessagesRef.current.push(payload);
    }
  }, []);

  const displayNameFor = useCallback((uid: string) => {
    if (userNames?.[uid]) return userNames[uid];
    if (peerDisplayName && uid !== userId) return peerDisplayName;
    return uid;
  }, [userNames, peerDisplayName, userId]);

  const initialsFor = useCallback((uid: string) => {
    return nameInitials(displayNameFor(uid), uid);
  }, [displayNameFor]);

  const openMessageActions = useCallback((msg: ChatMessage, anchor?: HTMLElement | null, clientPoint?: { x: number; y: number }) => {
    if (msg.isDeleted) return;
    if (isMobile && !anchor && !clientPoint) {
      setActionSheet(msg);
      setMsgMenu(null);
      return;
    }
    // Prefer click coordinates so the menu stays put even if the ⋯ button unmounts.
    let top = clientPoint?.y ?? 0;
    let left = clientPoint?.x ?? 0;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      top = rect.top;
      left = rect.left + rect.width / 2;
    }
    if (!top && !left && typeof window !== 'undefined') {
      // Fallback: open near the message via action sheet on tiny screens
      setActionSheet(msg);
      setMsgMenu(null);
      return;
    }
    setMsgMenu({ message: msg, position: { top, left } });
    setActionSheet(null);
  }, [isMobile]);

  const isOwnMessage = useCallback((msg: ChatMessage) => (
    String(msg.userId) === String(userId)
  ), [userId]);

  const startEdit = useCallback((msg: ChatMessage) => {
    setMsgMenu(null);
    setActionSheet(null);
    if (msg.isDeleted || !isOwnMessage(msg)) return;
    // Only text (or caption) edits — media-only stays delete-only
    if (!msg.text?.trim() && (msg.mediaKey || msg.mediaUrl)) {
      window.alert('Media messages can be deleted, but not edited.');
      return;
    }
    setEditingMessage(msg);
    setInput(msg.text || '');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOwnMessage]);

  /** Delete for everyone — own messages only (server-enforced). */
  const deleteMessage = useCallback((msg: ChatMessage) => {
    setMsgMenu(null);
    setActionSheet(null);
    if (!msg.messageId || msg.isDeleted || !isOwnMessage(msg)) return;
    if (!window.confirm('Delete this message for everyone?')) return;
    const payload = JSON.stringify({
      eventType: 5,
      messageId: msg.messageId,
      sentAt: msg.sentAt,
    });
    setMessages(prev => prev.map(m =>
      m.messageId === msg.messageId ? { ...m, isDeleted: true, text: '' } : m));
    if (editingMessage?.messageId === msg.messageId) {
      setEditingMessage(null);
      setInput('');
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
    } else {
      pendingMessagesRef.current.push(payload);
    }
  }, [isOwnMessage, editingMessage]);

  /** Remove for me only — hides any message in this session (Teams-style). */
  const removeForMe = useCallback((msg: ChatMessage) => {
    setMsgMenu(null);
    setActionSheet(null);
    if (!msg.messageId) return;
    setHiddenForMe(prev => {
      const next = new Set(prev);
      next.add(msg.messageId);
      return next;
    });
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const otherTyping = Array.from(typingSet).filter(u => u !== userId);

  const LI_BLUE = '#0A66C2';

  const avatarFor = (uid: string) =>
    userAvatars?.[uid] || (peerAvatarUrl && uid !== userId ? peerAvatarUrl : undefined);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      bgcolor: '#F3EFE8',
      backgroundImage: 'linear-gradient(165deg, #F6F2EB 0%, #EFEAE2 55%, #EAE4DB 100%)',
    }}>

      {/* Messages — LinkedIn-style thread */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        px: 2,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        bgcolor: 'transparent',
      }}>
        {messages.length === 0 && (
          <Box sx={{ m: 'auto', textAlign: 'center', color: '#666', userSelect: 'none', px: 2 }}>
            <Typography variant="body2" fontWeight={600} color="#191919" mb={0.5}>No messages yet</Typography>
            <Typography variant="caption" color="#666">Send a message to start the conversation.</Typography>
          </Box>
        )}

        {messages.filter((msg) => !hiddenForMe.has(msg.messageId)).map((msg) => {
          const isMe = isOwnMessage(msg);
          const otherAvatar = avatarFor(msg.userId);
          const showActions = !msg.isDeleted && (
            isMobile
            || hoveredMsgId === msg.messageId
            || msgMenu?.message.messageId === msg.messageId
          );
          return (
            <Box
              key={msg.messageId}
              sx={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 1,
                '&:hover .msg-actions': { opacity: 1, pointerEvents: 'auto' },
              }}
              onMouseEnter={() => !isMobile && setHoveredMsgId(msg.messageId)}
              onMouseLeave={() => {
                if (isMobile) return;
                // Keep hover while the options menu is open for this message
                if (msgMenu?.message.messageId === msg.messageId) return;
                setHoveredMsgId((id) => (id === msg.messageId ? null : id));
              }}
            >
              {!isMe && (
                <Avatar
                  src={otherAvatar || undefined}
                  sx={{ width: 28, height: 28, fontSize: 10, fontWeight: 700, bgcolor: stringToColor(displayNameFor(msg.userId)), flexShrink: 0 }}
                >
                  {initialsFor(msg.userId)}
                </Avatar>
              )}
              <Box sx={{ position: 'relative', maxWidth: '78%' }}>
                {showActions && (
                  <Box
                    className="msg-actions"
                    sx={{
                      position: 'absolute',
                      top: -14,
                      ...(isMe ? { left: 4 } : { right: 4 }),
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: '#fff',
                      border: '1px solid rgba(90,70,50,0.12)',
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      zIndex: 2,
                      opacity: isMobile ? 1 : 0,
                      pointerEvents: isMobile ? 'auto' : 'none',
                      transition: 'opacity 0.12s',
                    }}
                  >
                    <IconButton
                      size="small"
                      aria-label="Message options"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMessageActions(msg, e.currentTarget, { x: e.clientX, y: e.clientY });
                      }}
                      sx={{ p: 0.45, color: '#555' }}
                    >
                      <MoreHorizIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                )}
                <Box
                  onContextMenu={(e) => {
                    if (msg.isDeleted) return;
                    e.preventDefault();
                    openMessageActions(msg, null, { x: e.clientX, y: e.clientY });
                  }}
                  onTouchStart={() => {
                    if (msg.isDeleted) return;
                    longPressTriggered.current = false;
                    clearLongPress();
                    longPressTimer.current = setTimeout(() => {
                      longPressTriggered.current = true;
                      openMessageActions(msg);
                    }, 450);
                  }}
                  onTouchEnd={clearLongPress}
                  onTouchMove={clearLongPress}
                  sx={{
                    bgcolor: isMe ? LI_BLUE : 'rgba(255,255,255,0.72)',
                    color: isMe ? '#fff' : '#191919',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    border: isMe ? 'none' : '1px solid rgba(90, 70, 50, 0.08)',
                    px: 1.5,
                    py: 1,
                    boxShadow: 'none',
                    position: 'relative',
                    wordBreak: 'break-word',
                    cursor: !msg.isDeleted ? 'pointer' : 'default',
                    WebkitTouchCallout: 'none',
                  }}
                >
                  {msg.isDeleted ? (
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: isMe ? 'rgba(255,255,255,0.75)' : '#999', fontSize: 13 }}>
                      This message was deleted
                    </Typography>
                  ) : (
                    <>
                      {(msg.mediaUrl || msg.mediaKey || msg.mediaName) && (
                        <Box sx={{ mb: msg.text ? 1 : 0 }}>
                          {(msg.mediaMimeType?.startsWith('image/') || msg.type === 1 || (!!msg.mediaUrl && !msg.mediaMimeType)) && msg.mediaUrl ? (
                            <Box
                              component="img"
                              src={msg.mediaUrl}
                              alt={msg.mediaName || 'Shared image'}
                              sx={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: 220,
                                borderRadius: 1.5,
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 1,
                                py: 0.75,
                                borderRadius: 1,
                                bgcolor: isMe ? 'rgba(255,255,255,0.15)' : '#F4F2EE',
                              }}
                            >
                              <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, opacity: 0.85 }} />
                              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
                                {msg.mediaName || 'Attachment'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                      {msg.text ? (
                        <Typography variant="body2" sx={{ lineHeight: 1.45, fontSize: 14, fontWeight: 400, whiteSpace: 'pre-wrap' }}>
                          {msg.text}
                        </Typography>
                      ) : null}
                    </>
                  )}

                  {msg.reactionEmoji && !msg.isDeleted && (
                    <Box sx={{ position: 'absolute', bottom: -10, right: 6, ...MATTE_INSET, borderRadius: 3, px: 0.5, fontSize: 13 }}>
                      {msg.reactionEmoji}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', mt: 0.5 }}>
                    {!!msg.editedAt && !msg.isDeleted && (
                      <Typography variant="caption" sx={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#8C8C8C', fontSize: 10, fontStyle: 'italic', lineHeight: 1 }}>
                        Edited
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#8C8C8C', fontSize: 10, lineHeight: 1 }}>
                      {fmtTime(msg.sentAt)}
                    </Typography>
                    {isMe && !msg.isDeleted && (
                      msg.status >= 3
                        ? <DoneAllIcon sx={{ fontSize: 13, color: '#fff' }} />
                        : msg.status >= 2
                          ? <DoneAllIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }} />
                          : <DoneIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }} />
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })}

        {otherTyping.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <Avatar
              src={avatarFor(otherTyping[0]) || undefined}
              sx={{ width: 28, height: 28, fontSize: 10, fontWeight: 700, bgcolor: stringToColor(displayNameFor(otherTyping[0])) }}
            >
              {initialsFor(otherTyping[0])}
            </Avatar>
            <Box sx={{ ...MATTE_INSET, bgcolor: 'rgba(255,255,255,0.72)', borderRadius: '12px 12px 12px 2px', px: 1.5, py: 1 }}>
              <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center', height: 16 }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <Box key={i} sx={{
                    width: 5, height: 5, borderRadius: '50%', bgcolor: '#8C8C8C',
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

      <Menu
        open={Boolean(msgMenu)}
        onClose={() => setMsgMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          msgMenu
            ? { top: msgMenu.position.top, left: msgMenu.position.left }
            : undefined
        }
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        disableScrollLock
        slotProps={{
          root: { sx: { zIndex: 10050 } },
          paper: { sx: { zIndex: 10050 } },
        }}
        sx={{ zIndex: 10050 }}
        MenuListProps={{ dense: true }}
      >
        <Box sx={{ display: 'flex', gap: 0.25, px: 1, py: 0.5 }}>
          {REACTION_EMOJIS.map((emoji) => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => msgMenu && reactToMessage(msgMenu.message, emoji)}
              sx={{ fontSize: 18 }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>
        {msgMenu?.message && isOwnMessage(msgMenu.message) && (
          <>
            <Divider />
            <MenuItem
              onClick={() => msgMenu && startEdit(msgMenu.message)}
              sx={{ fontSize: 14, gap: 1 }}
            >
              <EditOutlinedIcon sx={{ fontSize: 18 }} /> Edit
            </MenuItem>
            <MenuItem
              onClick={() => msgMenu && deleteMessage(msgMenu.message)}
              sx={{ color: '#DC2626', fontSize: 14, gap: 1 }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} /> Delete for everyone
            </MenuItem>
          </>
        )}
        {msgMenu?.message && !isOwnMessage(msgMenu.message) && !msgMenu.message.isDeleted && (
          <>
            <Divider />
            <MenuItem
              onClick={() => msgMenu && removeForMe(msgMenu.message)}
              sx={{ fontSize: 14, gap: 1 }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} /> Remove for me
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Mobile Teams-style action sheet */}
      <Drawer
        anchor="bottom"
        open={Boolean(actionSheet)}
        onClose={() => setActionSheet(null)}
        ModalProps={{ sx: { zIndex: 10050 } }}
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            px: 1,
            pb: 'max(12px, env(safe-area-inset-bottom))',
            pt: 1,
            zIndex: 10051,
          },
        }}
      >
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: '#D1D5DB', mx: 'auto', mb: 1.5 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, px: 1, pb: 1 }}>
          {REACTION_EMOJIS.map((emoji) => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => actionSheet && reactToMessage(actionSheet, emoji)}
              sx={{ fontSize: 22 }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>
        {actionSheet && isOwnMessage(actionSheet) && (
          <>
            <Divider />
            <MenuItem onClick={() => startEdit(actionSheet)} sx={{ py: 1.5, gap: 1.5 }}>
              <EditOutlinedIcon /> Edit message
            </MenuItem>
            <MenuItem onClick={() => deleteMessage(actionSheet)} sx={{ py: 1.5, gap: 1.5, color: '#DC2626' }}>
              <DeleteOutlineIcon /> Delete for everyone
            </MenuItem>
          </>
        )}
        {actionSheet && !isOwnMessage(actionSheet) && !actionSheet.isDeleted && (
          <>
            <Divider />
            <MenuItem onClick={() => removeForMe(actionSheet)} sx={{ py: 1.5, gap: 1.5 }}>
              <DeleteOutlineIcon /> Remove for me
            </MenuItem>
          </>
        )}
        <MenuItem onClick={() => setActionSheet(null)} sx={{ py: 1.5, justifyContent: 'center', color: '#64748B' }}>
          Cancel
        </MenuItem>
      </Drawer>

      {/* Composer */}
      <Box sx={{
        ...MATTE_HEADER,
        borderBottom: 'none',
        borderTop: '1px solid rgba(90, 70, 50, 0.1)',
        boxShadow: 'none',
        color: 'inherit',
        flexShrink: 0,
      }}>
        {editingMessage && (
          <Box sx={{
            px: 1.5, pt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(90,70,50,0.08)',
          }}>
            <Box sx={{ minWidth: 0, borderLeft: '3px solid #0A66C2', pl: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0A66C2' }}>Editing message</Typography>
              <Typography noWrap sx={{ fontSize: 12, color: '#666', maxWidth: 280 }}>
                {editingMessage.text}
              </Typography>
            </Box>
            <IconButton
              size="small"
              aria-label="Cancel edit"
              onClick={() => { setEditingMessage(null); setInput(''); }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}
        {pendingFile && (
          <Box sx={{ px: 1.5, pt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {pendingPreview ? (
              <Box
                component="img"
                src={pendingPreview}
                alt="Preview"
                sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 1, border: '1px solid #E0E0E0' }}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.75, bgcolor: '#F4F2EE', borderRadius: 1 }}>
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 18, color: '#666' }} />
                <Typography fontSize={12} fontWeight={600} color="#333" noWrap sx={{ maxWidth: 180 }}>
                  {pendingFile.name}
                </Typography>
              </Box>
            )}
            <IconButton size="small" onClick={clearPendingFile} disabled={uploading} aria-label="Remove attachment">
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.25 }}>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            onChange={onPickFile}
          />
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder={
              editingMessage
                ? 'Edit your message…'
                : connected
                  ? 'Write a message…'
                  : 'Write a message… (connecting)'
            }
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={uploading}
            variant="outlined"
            inputRef={inputRef}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end" sx={{ alignSelf: 'center', ml: 0.25, gap: 0.15 }}>
                  <IconButton
                    size="small"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach file"
                    sx={{ color: '#666', p: 0.45, '&:hover': { color: LI_BLUE } }}
                  >
                    <AttachFileIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={uploading}
                    onClick={(e) => setEmojiAnchor(e.currentTarget)}
                    aria-label="Insert emoji"
                    edge="end"
                    sx={{ color: '#666', p: 0.45, '&:hover': { color: LI_BLUE } }}
                  >
                    <InsertEmoticonIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: '#F4F2EE',
              borderRadius: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                pl: 1.25,
                pr: 0.5,
                py: 0.35,
                minHeight: 40,
                fontSize: 14,
                alignItems: 'center',
                '& fieldset': { borderColor: '#E0E0E0' },
                '&:hover fieldset': { borderColor: '#B0B0B0' },
                '&.Mui-focused fieldset': { borderColor: LI_BLUE, borderWidth: 1 },
              },
              '& .MuiOutlinedInput-input': {
                py: 0.75,
              },
            }}
          />
          <IconButton
            onClick={() => { void send(); }}
            disabled={uploading || (!input.trim() && !pendingFile)}
            sx={{
              bgcolor: !uploading && (input.trim() || pendingFile) ? LI_BLUE : '#E0E0E0',
              color: !uploading && (input.trim() || pendingFile) ? '#fff' : '#8C8C8C',
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 1.5,
              alignSelf: 'center',
              '&:hover': { bgcolor: !uploading && (input.trim() || pendingFile) ? '#004182' : '#E0E0E0' },
              '&:disabled': { bgcolor: '#E0E0E0', color: '#8C8C8C' },
              transition: 'background-color 0.15s',
            }}
          >
            {uploading ? <CircularProgress size={18} sx={{ color: '#8C8C8C' }} /> : <SendIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Box>
      </Box>

      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        disableScrollLock
        slotProps={{
          paper: {
            sx: {
              p: 1,
              width: 280,
              maxHeight: 220,
              overflowY: 'auto',
              zIndex: 10000,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            },
          },
          root: { sx: { zIndex: 10000 } },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '2px',
          }}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <Box
              key={emoji}
              component="button"
              type="button"
              onClick={() => insertEmoji(emoji)}
              sx={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 22,
                lineHeight: 1.2,
                p: 0.5,
                borderRadius: 1,
                fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif',
                '&:hover': { bgcolor: '#F4F2EE' },
              }}
            >
              {emoji}
            </Box>
          ))}
        </Box>
      </Popover>
    </Box>
  );
};

export default Chat;
