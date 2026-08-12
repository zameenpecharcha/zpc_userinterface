import React, { useEffect, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  Avatar,
  Box,
  Button,
  ClickAwayListener,
  IconButton,
  InputBase,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Typography,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { SEARCH_USERS_LIGHT } from '../../graphql/user';
import {
  getActiveMentionQuery,
  insertMentionToken,
  expandPrettyMentions,
  nameInitials,
  stringToColor,
} from '../../utils/mentions';
import { COMMENT_COMPOSER_EMOJIS } from './commentReactions';

type CommentComposerProps = {
  onSubmit: (text: string) => void | Promise<void>;
  placeholder?: string;
  matte?: boolean;
  /** Controlled text (edit). When omitted, composer owns its own draft. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Seed name→id maps when editing existing `@[id:Name]` content. */
  seedUserNameToId?: Map<string, string> | Record<string, string>;
  autoFocus?: boolean;
  showEmoji?: boolean;
  /** `icon` = round send; `button` = Send + optional Cancel. */
  actions?: 'icon' | 'button';
  onCancel?: () => void;
  submittingExternal?: boolean;
  minRows?: number;
  maxRows?: number;
  submitLabel?: string;
};

const mapsFromSeed = (
  seed?: Map<string, string> | Record<string, string>
): Map<string, string> => {
  if (!seed) return new Map();
  if (seed instanceof Map) return new Map(seed);
  return new Map(Object.entries(seed));
};

const CommentComposer: React.FC<CommentComposerProps> = ({
  onSubmit,
  placeholder = 'Write a comment… Type @ to mention',
  matte = false,
  value: valueProp,
  onValueChange,
  seedUserNameToId,
  autoFocus = false,
  showEmoji = true,
  actions = 'icon',
  onCancel,
  submittingExternal = false,
  minRows = 1,
  maxRows = 4,
  submitLabel = 'Send',
}) => {
  const controlled = valueProp !== undefined;
  const [innerText, setInnerText] = useState(valueProp ?? '');
  const text = controlled ? valueProp! : innerText;
  const setText = (next: string) => {
    if (!controlled) setInnerText(next);
    onValueChange?.(next);
  };

  const [submitting, setSubmitting] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const fieldWrapRef = useRef<HTMLDivElement | null>(null);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionedUserNamesRef = useRef<Map<string, string>>(mapsFromSeed(seedUserNameToId));

  const [searchUsers, { data: mentionData, loading: mentionLoading }] = useLazyQuery(
    SEARCH_USERS_LIGHT,
    { fetchPolicy: 'network-only', nextFetchPolicy: 'cache-first' }
  );

  useEffect(() => {
    mentionedUserNamesRef.current = mapsFromSeed(seedUserNameToId);
  }, [seedUserNameToId]);

  useEffect(() => {
    if (controlled) return;
    // keep uncontrolled reset path only
  }, [controlled]);

  useEffect(() => {
    return () => {
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
    };
  }, []);

  const mentionUsers: Array<{ id: number | string; firstName: string; lastName?: string }> =
    mentionData?.users ?? [];

  const busy = submitting || submittingExternal;

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    setText(next);
    setEmojiAnchor(null);
    requestAnimationFrame(() => {
      if (el) {
        const pos = start + emoji.length;
        el.focus();
        el.setSelectionRange?.(pos, pos);
      }
    });
  };

  const handleChange = (value: string, cursor: number) => {
    setText(value);
    const active = getActiveMentionQuery(value, cursor);
    if (active) {
      setMentionOpen(true);
      setMentionQuery(active.query);
      setMentionStart(active.start);
      setMentionIndex(0);
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = setTimeout(() => {
        const term = active.query.trim();
        // Search from 1 character so "@v…" works immediately
        if (term.length < 1) return;
        searchUsers({ variables: { search: term, page: 1, limit: 8 }, errorPolicy: 'all' });
      }, 180);
    } else {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionStart(null);
    }
  };

  const selectMention = (user: { id: number | string; firstName: string; lastName?: string }) => {
    if (mentionStart === null) return;
    const el = inputRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const label =
      `${user.firstName || ''} ${user.lastName || ''}`.trim().replace(/[\[\]]/g, '').slice(0, 40) ||
      'User';
    const token = `@${label}`;
    const { text: next, cursor: nextCursor } = insertMentionToken(text, cursor, mentionStart, token);
    mentionedUserNamesRef.current.set(label, String(user.id));
    setText(next);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.setSelectionRange?.(nextCursor, nextCursor);
    });
  };

  const handleSubmit = async () => {
    if (!text.trim() || busy) return;
    setSubmitting(true);
    try {
      const content = expandPrettyMentions(text.trim(), mentionedUserNamesRef.current);
      await onSubmit(content);
      if (!controlled) {
        setInnerText('');
        mentionedUserNamesRef.current = mapsFromSeed(seedUserNameToId);
      }
      setMentionOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', position: 'relative', width: '100%' }}>
      <Popper
        open={mentionOpen}
        anchorEl={fieldWrapRef.current}
        placement="top-start"
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'flip', options: { fallbackPlacements: ['bottom-start'] } },
          { name: 'preventOverflow', options: { padding: 8 } },
        ]}
        style={{ zIndex: 15000 }}
      >
        <ClickAwayListener
          onClickAway={() => {
            setMentionOpen(false);
          }}
        >
          <Paper
            elevation={8}
            sx={{
              width: fieldWrapRef.current?.offsetWidth || 280,
              maxWidth: 'min(360px, 92vw)',
              maxHeight: 220,
              overflowY: 'auto',
              borderRadius: 2,
              border: '1px solid rgba(90,70,50,0.12)',
              bgcolor: '#FFFCF0',
            }}
          >
            <List dense disablePadding>
              {mentionLoading && (
                <Box sx={{ px: 1.5, py: 1 }}>
                  <Typography fontSize={12} color="#3A4540">Searching…</Typography>
                </Box>
              )}
              {!mentionLoading && mentionUsers.length === 0 && (
                <Box sx={{ px: 1.5, py: 1 }}>
                  <Typography fontSize={12} color="#3A4540">
                    {mentionQuery.trim() ? 'No people found' : 'Type a name after @'}
                  </Typography>
                </Box>
              )}
              {mentionUsers.map((user, idx) => {
                const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
                return (
                  <ListItemButton
                    key={String(user.id)}
                    selected={idx === mentionIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMention(user);
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: stringToColor(name) }}>
                        {nameInitials(name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={name || `User ${user.id}`}
                      primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
      <Box
        ref={fieldWrapRef}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.5,
          bgcolor: matte ? 'rgba(235,230,212,0.55)' : '#EBE6D4',
          border: matte ? '1.5px solid rgba(22, 48, 42, 0.18)' : '1.5px solid #DDD6C0',
          borderRadius: actions === 'button' ? 999 : 3,
          px: 1.25,
          py: 0.75,
          '&:focus-within': {
            borderColor: '#16302A',
            bgcolor: matte ? 'rgba(235,230,212,0.78)' : 'rgba(235, 230, 212,0.9)',
          },
        }}
      >
        <InputBase
          inputRef={inputRef}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => {
            const el = e.target;
            handleChange(el.value, el.selectionStart ?? el.value.length);
          }}
          placeholder={placeholder}
          sx={{ flex: 1, fontSize: 15, fontWeight: 600, py: 0.5 }}
          multiline
          minRows={minRows}
          maxRows={maxRows}
          onKeyDown={(e) => {
            if (mentionOpen && mentionUsers.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex((i) => (i + 1) % mentionUsers.length);
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex((i) => (i - 1 + mentionUsers.length) % mentionUsers.length);
                return;
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMention(mentionUsers[mentionIndex] || mentionUsers[0]);
                return;
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setMentionOpen(false);
                return;
              }
            }
            if (e.key === 'Escape' && onCancel) {
              e.preventDefault();
              onCancel();
              return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        {showEmoji && (
          <IconButton
            size="small"
            onClick={(e) => setEmojiAnchor(e.currentTarget)}
            aria-label="Insert emoji"
            sx={{ color: '#3A4540', mb: 0.15 }}
          >
            <SentimentSatisfiedAltIcon sx={{ fontSize: 22 }} />
          </IconButton>
        )}
      </Box>

      {actions === 'icon' ? (
        <IconButton
          onClick={handleSubmit}
          disabled={busy || !text.trim()}
          sx={{
            width: 46,
            height: 46,
            flexShrink: 0,
            bgcolor: text.trim() ? '#16302A' : '#DDD6C0',
            color: text.trim() ? '#EBE6D4' : '#A89F84',
            borderRadius: 3,
            '&:hover': { bgcolor: text.trim() ? '#0F221C' : '#DDD6C0' },
            '&.Mui-disabled': { bgcolor: '#DDD6C0', color: '#A89F84' },
          }}
        >
          <SendRoundedIcon sx={{ fontSize: 22 }} />
        </IconButton>
      ) : (
        <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, alignItems: 'center' }}>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSubmit}
            disabled={busy || !text.trim()}
            sx={{
              bgcolor: '#16302A',
              fontWeight: 800,
              borderRadius: 999,
              px: 2,
              py: 0.85,
              minWidth: 0,
              textTransform: 'none',
              '&:hover': { bgcolor: '#0F221C' },
            }}
          >
            {busy ? '…' : submitLabel}
          </Button>
          {onCancel && (
            <Button
              onClick={onCancel}
              sx={{ color: '#3A4540', fontWeight: 700, borderRadius: 999, px: 1.5, textTransform: 'none' }}
            >
              Cancel
            </Button>
          )}
        </Box>
      )}

      <Menu
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        PaperProps={{
          sx: {
            p: 1,
            width: 280,
            maxHeight: 220,
            borderRadius: 2,
            zIndex: 13000,
          },
        }}
        sx={{ zIndex: 13000 }}
        MenuListProps={{ sx: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0.25, p: 0 } }}
      >
        {COMMENT_COMPOSER_EMOJIS.map((emoji) => (
          <MenuItem
            key={emoji}
            onClick={() => insertEmoji(emoji)}
            sx={{ minWidth: 0, justifyContent: 'center', borderRadius: 1, fontSize: 20, px: 0.5, py: 0.5 }}
          >
            {emoji}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default CommentComposer;
