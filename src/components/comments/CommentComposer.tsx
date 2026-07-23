import React, { useRef, useState } from 'react';
import { Box, IconButton, InputBase, Menu, MenuItem } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { COMMENT_COMPOSER_EMOJIS } from './commentReactions';

type CommentComposerProps = {
  onSubmit: (text: string) => void | Promise<void>;
  placeholder?: string;
  matte?: boolean;
};

const CommentComposer: React.FC<CommentComposerProps> = ({
  onSubmit,
  placeholder = 'Write a comment...',
  matte = false,
}) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

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

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.5,
          bgcolor: matte ? 'rgba(255,255,255,0.55)' : '#F1F5F9',
          border: matte ? '1.5px solid rgba(90, 70, 50, 0.12)' : '1.5px solid #E2E8F0',
          borderRadius: 3,
          px: 1.25,
          py: 0.75,
          '&:focus-within': { borderColor: '#2563EB', bgcolor: matte ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.9)' },
        }}
      >
        <InputBase
          inputRef={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          sx={{ flex: 1, fontSize: 15, fontWeight: 600, py: 0.5 }}
          multiline
          minRows={1}
          maxRows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <IconButton
          size="small"
          onClick={(e) => setEmojiAnchor(e.currentTarget)}
          aria-label="Insert emoji"
          sx={{ color: '#64748B', mb: 0.15 }}
        >
          <SentimentSatisfiedAltIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Box>
      <IconButton
        onClick={handleSubmit}
        disabled={submitting || !text.trim()}
        sx={{
          width: 46,
          height: 46,
          flexShrink: 0,
          bgcolor: text.trim() ? '#2563EB' : '#E2E8F0',
          color: text.trim() ? '#fff' : '#94A3B8',
          borderRadius: 3,
          '&:hover': { bgcolor: text.trim() ? '#1D4ED8' : '#E2E8F0' },
          '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
        }}
      >
        <SendRoundedIcon sx={{ fontSize: 22 }} />
      </IconButton>

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
