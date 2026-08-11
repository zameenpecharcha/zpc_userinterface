import React, { useCallback, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { renderMentionContent, nameInitials, stringToColor } from '../../utils/mentions';
import { formatDateTime } from '../../utils/datetime';
import { MATTE_INSET } from '../../theme/surfaces';
import {
  COMMENT_REACTION_EMOJIS,
  normalizeReactionEmoji,
} from './commentReactions';

export type CommentListItemProps = {
  comment: any;
  currentUserId?: string | null;
  formatTime?: (value: any) => string;
  likedComments: { [commentId: string]: boolean };
  commentReactions: { [commentId: string]: string };
  commentLikeCounts: { [commentId: string]: number };
  likingComment?: boolean;
  replyingCommentId: string | null;
  setReplyingCommentId: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  replying?: boolean;
  onReply: (text: string) => void | Promise<void>;
  onReactComment: (commentId: string, emoji: string) => void | Promise<void>;
  onEditComment: (commentId: string, text: string) => void | Promise<void>;
  onDeleteComment: (commentId: string) => void | Promise<void>;
  showReplyAction?: boolean;
};

const defaultFormatTime = (value: any) => formatDateTime(value);

const CommentBubble: React.FC<{
  item: any;
  isReply?: boolean;
  currentUserId?: string | null;
  formatTime: (value: any) => string;
  likedComments: { [commentId: string]: boolean };
  commentReactions: { [commentId: string]: string };
  commentLikeCounts: { [commentId: string]: number };
  likingComment?: boolean;
  showReplyAction?: boolean;
  onStartReply?: () => void;
  onReactComment: (commentId: string, emoji: string) => void | Promise<void>;
  onEditComment: (commentId: string, text: string) => void | Promise<void>;
  onDeleteComment: (commentId: string) => void | Promise<void>;
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
              <Typography sx={{ fontWeight: 800, fontSize: isReply ? 12.5 : 13.5, color: '#0A1210', wordBreak: 'break-word' }}>
                {item.userFirstName} {item.userLastName}
              </Typography>
              {!isReply && item.userRole && (
                <Typography sx={{ fontSize: 11, color: '#3A4540', fontWeight: 700, mt: 0.15 }}>
                  {item.userRole}
                </Typography>
              )}
            </Box>
            {!editing && (
              <IconButton
                size="small"
                onClick={openMenu}
                sx={{ color: '#A89F84', p: 0.25, mt: -0.25, '&:hover': { color: '#3A4540', bgcolor: 'rgba(15,23,42,0.04)' } }}
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
                  bgcolor: '#EBE6D4',
                  border: '1.5px solid #DDD6C0',
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
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999, px: 1.5, bgcolor: '#16302A' }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="small"
                  disabled={saving}
                  onClick={() => { setEditing(false); setEditText(item.comment || ''); }}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999, color: '#3A4540' }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontSize: isReply ? 13 : 14.5, color: '#0A1210', mt: 0.5, fontWeight: 500, lineHeight: 1.45, wordBreak: 'break-word' }}>
              {renderMentionContent(item.comment || '', { variant: 'chip' })}
              {item.editedAt ? (
                <Typography component="span" sx={{ fontSize: 11, color: '#A89F84', fontWeight: 600, ml: 0.75 }}>
                  (edited)
                </Typography>
              ) : null}
            </Typography>
          )}
        </Box>

        {!editing && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mt: 0.5, pl: 0.5 }}>
            <Typography sx={{ fontSize: isReply ? 10 : 11, color: '#A89F84', fontWeight: 600, mr: 0.5 }}>
              {formatTime(item.addedAt)}
            </Typography>
            <Button
              size="small"
              startIcon={
                reaction ? (
                  <Box
                    component="span"
                    className={animating ? 'liked-heart-emoji' : undefined}
                    sx={{
                      fontSize: isReply ? 13 : 15,
                      lineHeight: 1,
                      display: 'inline-flex',
                      transform: animating ? 'scale(1.25)' : 'scale(1)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    {reaction}
                  </Box>
                ) : (
                  <FavoriteBorderIcon sx={{ fontSize: isReply ? 13 : 15, color: '#E11D48' }} />
                )
              }
              sx={{
                color: reaction ? '#E11D48' : '#3A4540',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: isReply ? 11 : 12,
                minWidth: 0,
                px: 0.5,
                bgcolor: 'transparent',
                '& .MuiButton-startIcon': { mr: 0.35 },
                '&:hover': { bgcolor: 'transparent', color: '#E11D48' },
              }}
              onClick={async (e) => {
                e.stopPropagation();
                setAnimating(true);
                setTimeout(() => setAnimating(false), 500);
                // Direct like/unlike with ❤️ — emoji picker lives under ⋯
                await onReactComment(item.id, '❤️');
              }}
              disabled={likingComment}
            >
              {likeCount}
            </Button>
            {showReplyAction && onStartReply && (
              <Button
                size="small"
                sx={{
                  color: '#16302A',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: isReply ? 11 : 12,
                  minWidth: 0,
                  px: 0.5,
                  bgcolor: 'transparent',
                  '&:hover': { bgcolor: 'transparent', color: '#0F221C' },
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
        PaperProps={{ sx: { minWidth: 168, borderRadius: 2, zIndex: 12000, py: 0.5 } }}
        sx={{ zIndex: 12000 }}
      >
        <Box sx={{ px: 1, pb: 0.75, pt: 0.25 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#A89F84', px: 0.75, mb: 0.5 }}>
            React
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
            {COMMENT_REACTION_EMOJIS.map((emoji) => (
              <MenuItem
                key={emoji}
                onClick={() => {
                  setMenuAnchor(null);
                  handleReact(emoji);
                }}
                sx={{
                  minWidth: 36,
                  justifyContent: 'center',
                  borderRadius: 999,
                  fontSize: 20,
                  px: 0.75,
                  bgcolor: reaction === emoji ? 'rgba(225,29,72,0.12)' : 'transparent',
                }}
              >
                {emoji}
              </MenuItem>
            ))}
          </Box>
        </Box>
        {isOwner && (
          <>
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
              sx={{ fontWeight: 600, fontSize: 14, color: '#E11D48' }}
            >
              Delete
            </MenuItem>
          </>
        )}
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
        onStartReply={() => setReplyingCommentId(String(comment.id))}
        onReactComment={onReactComment}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
      />

      {comment.replies && comment.replies.length > 0 && (
        <Stack spacing={1.1} sx={{ mt: 1.1, ml: { xs: 2.25, sm: 4.5 } }}>
          {comment.replies.map((reply: any) => (
            <Box
              key={reply.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              <SubdirectoryArrowRightIcon
                aria-hidden
                sx={{
                  mt: 0.85,
                  flexShrink: 0,
                  fontSize: 20,
                  color: '#7A847C',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <CommentBubble
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
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {String(replyingCommentId) === String(comment.id) && (
        <Box
          sx={{
            mt: 1.25,
            ml: { xs: 2.25, sm: 4.5 },
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <SubdirectoryArrowRightIcon
            aria-hidden
            sx={{ mt: 1.15, flexShrink: 0, fontSize: 20, color: '#7A847C' }}
          />
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              alignItems: { xs: 'stretch', sm: 'center' },
            }}
          >
          <InputBase
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            autoFocus
            sx={{
              bgcolor: '#EBE6D4',
              px: 1.5,
              py: 1,
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              flex: 1,
              minWidth: 0,
              border: '1.5px solid #DDD6C0',
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
                bgcolor: '#16302A',
                fontWeight: 800,
                borderRadius: 999,
                px: 2,
                py: 0.85,
                minWidth: 0,
                textTransform: 'none',
                '&:hover': { bgcolor: '#0F221C' },
              }}
              onClick={handleSendReply}
              disabled={replying || !replyText.trim()}
            >
              Send
            </Button>
            <Button
              sx={{ color: '#3A4540', fontWeight: 700, borderRadius: 999, px: 1.5, textTransform: 'none' }}
              onClick={() => { setReplyingCommentId(null); setReplyText(''); }}
            >
              Cancel
            </Button>
          </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CommentListItem;
