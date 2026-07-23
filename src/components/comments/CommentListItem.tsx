import React, { useCallback, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { renderMentionContent, nameInitials, stringToColor } from '../../utils/mentions';
import { MATTE_INSET } from '../../theme/surfaces';
import {
  COMMENT_REACTION_EMOJIS,
  normalizeReactionEmoji,
} from './commentReactions';

export type CommentListItemProps = {
  comment: any;
  currentUserId?: number | string | null;
  formatTime?: (value: any) => string;
  likedComments: { [commentId: number]: boolean };
  commentReactions: { [commentId: number]: string };
  commentLikeCounts: { [commentId: number]: number };
  likingComment?: boolean;
  replyingCommentId: number | null;
  setReplyingCommentId: (id: number | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  replying?: boolean;
  onReply: (text: string) => void | Promise<void>;
  onReactComment: (commentId: number, emoji: string) => void | Promise<void>;
  onEditComment: (commentId: number, text: string) => void | Promise<void>;
  onDeleteComment: (commentId: number) => void | Promise<void>;
  showReplyAction?: boolean;
};

const defaultFormatTime = (value: any) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
};

const CommentBubble: React.FC<{
  item: any;
  isReply?: boolean;
  currentUserId?: number | string | null;
  formatTime: (value: any) => string;
  likedComments: { [commentId: number]: boolean };
  commentReactions: { [commentId: number]: string };
  commentLikeCounts: { [commentId: number]: number };
  likingComment?: boolean;
  showReplyAction?: boolean;
  onStartReply?: () => void;
  onReactComment: (commentId: number, emoji: string) => void | Promise<void>;
  onEditComment: (commentId: number, text: string) => void | Promise<void>;
  onDeleteComment: (commentId: number) => void | Promise<void>;
}> = ({
  item,
  isReply = false,
  currentUserId,
  formatTime,
  likedComments,
  commentReactions,
  commentLikeCounts,
  likingComment,
  showReplyAction,
  onStartReply,
  onReactComment,
  onEditComment,
  onDeleteComment,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; x: number; y: number } | null>(null);
  const [reactAnchor, setReactAnchor] = useState<{ el: HTMLElement; x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.comment || '');
  const [saving, setSaving] = useState(false);
  const [animating, setAnimating] = useState(false);

  const isOwner = currentUserId != null && String(item.userId) === String(currentUserId);
  const reaction = normalizeReactionEmoji(commentReactions[item.id]) || (likedComments[item.id] ? '❤️' : null);
  const likeCount = commentLikeCounts[item.id] !== undefined
    ? commentLikeCounts[item.id]
    : (item.likeCount || 0);

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor({ el: e.currentTarget, x: e.clientX, y: e.clientY });
  };

  const openReactMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setReactAnchor({ el: e.currentTarget, x: e.clientX, y: e.clientY });
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === item.comment) {
      setEditing(false);
      setEditText(item.comment || '');
      return;
    }
    setSaving(true);
    try {
      await onEditComment(item.id, editText.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReact = async (emoji: string) => {
    setReactAnchor(null);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
    await onReactComment(item.id, emoji);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: isReply ? 1 : 1.25, minWidth: 0, mb: isReply ? 1.25 : 0 }}>
      <Avatar
        src={item.profilePhotoSignedUrl || item.profilePhoto || undefined}
        sx={{
          width: isReply ? 28 : 36,
          height: isReply ? 28 : 36,
          flexShrink: 0,
          fontWeight: 800,
          fontSize: isReply ? 11 : undefined,
          bgcolor: stringToColor(`${item.userFirstName || ''} ${item.userLastName || ''}` || String(item.userId)),
        }}
      >
        {nameInitials(`${item.userFirstName || ''} ${item.userLastName || ''}`, String(item.userId))}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            ...MATTE_INSET,
            borderRadius: isReply ? '4px 14px 14px 14px' : '4px 16px 16px 16px',
            px: isReply ? 1.25 : 1.5,
            py: isReply ? 0.9 : 1.15,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: isReply ? 12.5 : 13.5, color: '#0F172A', wordBreak: 'break-word' }}>
                {item.userFirstName} {item.userLastName}
              </Typography>
              {!isReply && item.userRole && (
                <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 700, mt: 0.15 }}>
                  {item.userRole}
                </Typography>
              )}
            </Box>
            {isOwner && !editing && (
              <IconButton
                size="small"
                onClick={openMenu}
                sx={{ color: '#94A3B8', p: 0.25, mt: -0.25, '&:hover': { color: '#475569', bgcolor: 'rgba(15,23,42,0.04)' } }}
                aria-label="Comment options"
              >
                <MoreHorizIcon sx={{ fontSize: isReply ? 16 : 18 }} />
              </IconButton>
            )}
          </Box>

          {editing ? (
            <Box sx={{ mt: 0.75 }}>
              <InputBase
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                multiline
                minRows={1}
                maxRows={4}
                sx={{
                  width: '100%',
                  bgcolor: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 2,
                  px: 1.25,
                  py: 0.75,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
                <Button
                  size="small"
                  variant="contained"
                  disableElevation
                  disabled={saving || !editText.trim()}
                  onClick={handleSaveEdit}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999, px: 1.5, bgcolor: '#2563EB' }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="small"
                  disabled={saving}
                  onClick={() => { setEditing(false); setEditText(item.comment || ''); }}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999, color: '#64748B' }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontSize: isReply ? 13 : 14.5, color: '#1E293B', mt: 0.5, fontWeight: 500, lineHeight: 1.45, wordBreak: 'break-word' }}>
              {renderMentionContent(item.comment || '', {})}
              {item.editedAt ? (
                <Typography component="span" sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, ml: 0.75 }}>
                  (edited)
                </Typography>
              ) : null}
            </Typography>
          )}
        </Box>

        {!editing && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mt: 0.5, pl: 0.5 }}>
            <Typography sx={{ fontSize: isReply ? 10 : 11, color: '#94A3B8', fontWeight: 600, mr: 0.5 }}>
              {formatTime(item.addedAt)}
            </Typography>
            <Button
              size="small"
              startIcon={
                reaction ? (
                  <Box component="span" sx={{ fontSize: isReply ? 13 : 15, lineHeight: 1, display: 'inline-flex', transform: animating ? 'scale(1.25)' : 'scale(1)', transition: 'transform 0.2s' }}>
                    {reaction}
                  </Box>
                ) : (
                  <FavoriteBorderIcon sx={{ fontSize: isReply ? 13 : 15, color: '#64748B' }} />
                )
              }
              sx={{
                color: reaction ? '#EF4444' : '#64748B',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: isReply ? 11 : 12,
                minWidth: 0,
                px: 0.5,
                bgcolor: 'transparent',
                '& .MuiButton-startIcon': { mr: 0.35 },
                '&:hover': { bgcolor: 'transparent', color: '#EF4444' },
              }}
              onClick={openReactMenu}
              disabled={likingComment}
            >
              {likeCount}
            </Button>
            {showReplyAction && onStartReply && (
              <Button
                size="small"
                sx={{
                  color: '#2563EB',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: isReply ? 11 : 12,
                  minWidth: 0,
                  px: 0.5,
                  bgcolor: 'transparent',
                  '&:hover': { bgcolor: 'transparent', color: '#1D4ED8' },
                }}
                onClick={onStartReply}
              >
                Reply
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Menu
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor?.el}
        onClose={() => setMenuAnchor(null)}
        anchorReference="anchorPosition"
        anchorPosition={menuAnchor ? { top: menuAnchor.y, left: menuAnchor.x } : undefined}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { minWidth: 140, borderRadius: 2, zIndex: 12000 } }}
        sx={{ zIndex: 12000 }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setEditText(item.comment || '');
            setEditing(true);
          }}
          sx={{ fontWeight: 600, fontSize: 14 }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onDeleteComment(item.id);
          }}
          sx={{ fontWeight: 600, fontSize: 14, color: '#DC2626' }}
        >
          Delete
        </MenuItem>
      </Menu>

      <Menu
        open={Boolean(reactAnchor)}
        anchorEl={reactAnchor?.el}
        onClose={() => setReactAnchor(null)}
        anchorReference="anchorPosition"
        anchorPosition={reactAnchor ? { top: reactAnchor.y, left: reactAnchor.x } : undefined}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'row',
            px: 0.75,
            py: 0.5,
            borderRadius: 999,
            gap: 0.25,
            zIndex: 12000,
          },
        }}
        sx={{ zIndex: 12000 }}
        MenuListProps={{ sx: { display: 'flex', flexDirection: 'row', p: 0, gap: 0.25 } }}
      >
        {COMMENT_REACTION_EMOJIS.map((emoji) => (
          <MenuItem
            key={emoji}
            onClick={() => handleReact(emoji)}
            sx={{
              minWidth: 36,
              justifyContent: 'center',
              borderRadius: 999,
              fontSize: 20,
              px: 0.75,
              bgcolor: reaction === emoji ? 'rgba(37,99,235,0.12)' : 'transparent',
            }}
          >
            {emoji}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

const CommentListItem: React.FC<CommentListItemProps> = ({
  comment,
  currentUserId,
  formatTime = defaultFormatTime,
  likedComments,
  commentReactions,
  commentLikeCounts,
  likingComment,
  replyingCommentId,
  setReplyingCommentId,
  replyText,
  setReplyText,
  replying,
  onReply,
  onReactComment,
  onEditComment,
  onDeleteComment,
  showReplyAction = true,
}) => {
  const handleSendReply = useCallback(async () => {
    if (!replyText.trim()) return;
    await onReply(replyText);
  }, [onReply, replyText]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <CommentBubble
        item={comment}
        currentUserId={currentUserId}
        formatTime={formatTime}
        likedComments={likedComments}
        commentReactions={commentReactions}
        commentLikeCounts={commentLikeCounts}
        likingComment={likingComment}
        showReplyAction={showReplyAction}
        onStartReply={() => setReplyingCommentId(comment.id)}
        onReactComment={onReactComment}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
      />

      {comment.replies && comment.replies.length > 0 && (
        <Box sx={{ mt: 1.25, ml: 0.5, pl: 1.5, borderLeft: '3px solid #E2E8F0' }}>
          {comment.replies.map((reply: any) => (
            <CommentBubble
              key={reply.id}
              item={reply}
              isReply
              currentUserId={currentUserId}
              formatTime={formatTime}
              likedComments={likedComments}
              commentReactions={commentReactions}
              commentLikeCounts={commentLikeCounts}
              likingComment={likingComment}
              showReplyAction={false}
              onReactComment={onReactComment}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
            />
          ))}
        </Box>
      )}

      {replyingCommentId === comment.id && (
        <Box sx={{ mt: 1.25, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: { xs: 'stretch', sm: 'center' }, pl: { xs: 0, sm: 5.5 } }}>
          <InputBase
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            autoFocus
            sx={{
              bgcolor: '#F1F5F9',
              px: 1.5,
              py: 1,
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              flex: 1,
              minWidth: 0,
              border: '1.5px solid #E2E8F0',
            }}
            multiline
            minRows={1}
            maxRows={3}
          />
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Button
              variant="contained"
              disableElevation
              sx={{
                bgcolor: '#2563EB',
                fontWeight: 800,
                borderRadius: 999,
                px: 2,
                py: 0.85,
                minWidth: 0,
                textTransform: 'none',
                '&:hover': { bgcolor: '#1D4ED8' },
              }}
              onClick={handleSendReply}
              disabled={replying || !replyText.trim()}
            >
              Send
            </Button>
            <Button
              sx={{ color: '#64748B', fontWeight: 700, borderRadius: 999, px: 1.5, textTransform: 'none' }}
              onClick={() => { setReplyingCommentId(null); setReplyText(''); }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CommentListItem;
