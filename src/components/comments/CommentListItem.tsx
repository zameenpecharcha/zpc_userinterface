import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import {
  renderMentionContent,
  nameInitials,
  stringToColor,
  collapseMentionTokens,
  mentionMapsFromTokens,
} from '../../utils/mentions';
import { formatDateTime } from '../../utils/datetime';
import { MATTE_INSET } from '../../theme/surfaces';
import {
  COMMENT_REACTION_EMOJIS,
  normalizeReactionEmoji,
} from './commentReactions';
import CommentComposer from './CommentComposer';

/** Indent caps so deep threads stay readable on mobile. */
const MAX_INDENT_DEPTH = 4;
/** Collapse nested branches (depth >= this) by default. */
const COLLAPSE_FROM_DEPTH = 2;
/** Within an expanded branch, show this many before "Show more". */
const INITIAL_VISIBLE_REPLIES = 3;

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
  /** Parent id for the reply being composed is the bubble the user clicked Reply on. */
  onReply: (text: string, parentCommentId: string) => void | Promise<void>;
  onReactComment: (commentId: string, emoji: string) => void | Promise<void>;
  onEditComment: (commentId: string, text: string) => void | Promise<void>;
  onDeleteComment: (commentId: string) => void | Promise<void>;
  showReplyAction?: boolean;
  depth?: number;
};

const defaultFormatTime = (value: any) => formatDateTime(value);

const CommentBubble: React.FC<{
  item: any;
  depth?: number;
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
  depth = 0,
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
  const [editText, setEditText] = useState(() => collapseMentionTokens(item.comment || ''));
  const [saving, setSaving] = useState(false);
  const [animating, setAnimating] = useState(false);

  const isReply = depth > 0;
  const isOwner = currentUserId != null && String(item.userId) === String(currentUserId);
  const reaction = normalizeReactionEmoji(commentReactions[item.id]) || (likedComments[item.id] ? '❤️' : null);
  const likeCount = commentLikeCounts[item.id] !== undefined
    ? commentLikeCounts[item.id]
    : (item.likeCount || 0);
  const prettyStored = collapseMentionTokens(item.comment || '');

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor({ el: e.currentTarget, x: e.clientX, y: e.clientY });
  };

  const handleReact = async (emoji: string) => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
    await onReactComment(item.id, emoji);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: isReply ? 1 : 1.25, minWidth: 0, mb: 0 }}>
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
              <CommentComposer
                value={editText}
                onValueChange={setEditText}
                seedUserNameToId={mentionMapsFromTokens(item.comment || '').userNameToId}
                autoFocus
                actions="button"
                submitLabel="Save"
                showEmoji
                matte
                placeholder="Edit comment… Type @ to mention"
                submittingExternal={saving}
                minRows={1}
                maxRows={4}
                onCancel={() => {
                  setEditing(false);
                  setEditText(prettyStored);
                }}
                onSubmit={async (expanded) => {
                  const pretty = collapseMentionTokens(expanded).trim();
                  if (!pretty || pretty === prettyStored) {
                    setEditing(false);
                    setEditText(prettyStored);
                    return;
                  }
                  setSaving(true);
                  try {
                    await onEditComment(item.id, expanded);
                    setEditing(false);
                  } finally {
                    setSaving(false);
                  }
                }}
              />
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
                setEditText(collapseMentionTokens(item.comment || ''));
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
  depth = 0,
}) => {
  const replies = useMemo(
    () => (Array.isArray(comment.replies) ? comment.replies : []),
    [comment.replies],
  );
  const [branchOpen, setBranchOpen] = useState(depth < COLLAPSE_FROM_DEPTH);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const indentDepth = Math.min(depth, MAX_INDENT_DEPTH);
  const visibleReplies = branchOpen
    ? (showAllReplies ? replies : replies.slice(0, INITIAL_VISIBLE_REPLIES))
    : [];
  const hiddenCount = branchOpen
    ? Math.max(0, replies.length - INITIAL_VISIBLE_REPLIES)
    : replies.length;

  const isComposingHere = String(replyingCommentId) === String(comment.id);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <CommentBubble
        item={comment}
        depth={depth}
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

      {replies.length > 0 && !branchOpen && (
        <Button
          size="small"
          onClick={() => setBranchOpen(true)}
          sx={{
            alignSelf: 'flex-start',
            mt: 0.75,
            ml: { xs: 1.5 + indentDepth * 1.25, sm: 3 + indentDepth * 1.5 },
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 12.5,
            color: '#16302A',
            px: 0.5,
            minWidth: 0,
          }}
        >
          View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </Button>
      )}

      {(visibleReplies.length > 0 || isComposingHere) && (
        <Box
          sx={{
            mt: 1,
            ml: { xs: 1.25 + indentDepth * 1.1, sm: 2.75 + indentDepth * 1.35 },
            pl: { xs: 1.1, sm: 1.35 },
            borderLeft: '2px solid rgba(22,48,42,0.14)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.15,
          }}
        >
          {visibleReplies.map((reply: any) => (
            <Box key={reply.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.65, minWidth: 0 }}>
              {depth < MAX_INDENT_DEPTH && (
                <SubdirectoryArrowRightIcon
                  aria-hidden
                  sx={{ mt: 0.85, flexShrink: 0, fontSize: 18, color: '#7A847C' }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <CommentListItem
                  comment={reply}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  formatTime={formatTime}
                  likedComments={likedComments}
                  commentReactions={commentReactions}
                  commentLikeCounts={commentLikeCounts}
                  likingComment={likingComment}
                  replyingCommentId={replyingCommentId}
                  setReplyingCommentId={setReplyingCommentId}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  replying={replying}
                  onReply={onReply}
                  onReactComment={onReactComment}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  showReplyAction={showReplyAction}
                />
              </Box>
            </Box>
          ))}

          {branchOpen && !showAllReplies && replies.length > INITIAL_VISIBLE_REPLIES && (
            <Button
              size="small"
              onClick={() => setShowAllReplies(true)}
              sx={{
                alignSelf: 'flex-start',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12.5,
                color: '#16302A',
                px: 0.5,
                minWidth: 0,
              }}
            >
              Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
            </Button>
          )}

          {branchOpen && depth >= COLLAPSE_FROM_DEPTH && (
            <Button
              size="small"
              onClick={() => {
                setBranchOpen(false);
                setShowAllReplies(false);
              }}
              sx={{
                alignSelf: 'flex-start',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 12,
                color: '#5C675F',
                px: 0.5,
                minWidth: 0,
              }}
            >
              Hide replies
            </Button>
          )}

          {isComposingHere && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              <SubdirectoryArrowRightIcon
                aria-hidden
                sx={{ mt: 1.15, flexShrink: 0, fontSize: 18, color: '#7A847C' }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <CommentComposer
                  autoFocus
                  actions="button"
                  showEmoji
                  matte
                  placeholder="Write a reply… Type @ to mention"
                  submittingExternal={!!replying}
                  minRows={1}
                  maxRows={3}
                  onCancel={() => {
                    setReplyingCommentId(null);
                    setReplyText('');
                  }}
                  onSubmit={async (expanded) => {
                    if (!expanded.trim()) return;
                    await onReply(expanded, String(comment.id));
                    setReplyingCommentId(null);
                    setReplyText('');
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default CommentListItem;
