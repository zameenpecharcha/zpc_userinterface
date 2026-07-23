import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { gql, useQuery, useMutation, useApolloClient } from '@apollo/client';
import { SEARCH_POSTS, CREATE_POST, TRENDING_POSTS, DELETE_POST, UPDATE_POST, UPDATE_COMMENT, DELETE_COMMENT, UNLIKE_COMMENT } from '../graphql/posts';
import { GET_SUGGESTED_USERS, FOLLOW_USER, GET_USER_NOTIFICATIONS, MARK_NOTIFICATION_READ } from '../graphql/user';
import CreatePost from './CreatePost';
import { PostService } from '../services/postService';
import { useAuth } from '../contexts/AuthContext';
import { renderMentionContent, nameInitials, stringToColor } from '../utils/mentions';
import CommentListItem from './comments/CommentListItem';
import CommentComposer from './comments/CommentComposer';
import { normalizeReactionEmoji } from './comments/commentReactions';
// import { styled } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Avatar,
  InputBase,
  Stack,
  useMediaQuery,
  Menu,
  MenuItem,
  CircularProgress,
  Skeleton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Divider,
  TextField,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EventIcon from '@mui/icons-material/Event';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareSymbol from './icons/ShareSymbol';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ProfilePage from './ProfilePage';
import ChatPage from './ChatPage';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE, MATTE_INSET, MATTE_PANEL } from '../theme/surfaces';

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8080/api/v1/graphql';
const API_GATEWAY_URL = (process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080').replace(/\/$/, '');




const GET_POST_COMMENTS_QUERY = gql`
query GetPostComments($postId: Int!, $page: Int, $limit: Int) {
  postComments(postId: $postId, page: $page, limit: $limit) {
    id
    postId
    userId
    userFirstName
    userLastName
    userRole
    comment
    parentCommentId
    status
    addedAt
    commentedAt
    editedAt
    profilePhoto
    profilePhotoSignedUrl
    replies {
      id
      postId
      userId
      userFirstName
      userLastName
      userRole
      comment
      parentCommentId
      status
      addedAt
      commentedAt
      editedAt
      likeCount
      profilePhoto
      profilePhotoSignedUrl
    }
    likeCount
  }
}
`;

const CREATE_COMMENT_MUTATION = gql`
mutation CreateComment($postId: Int!, $userId: Int!, $comment: String!, $parentCommentId: Int) {
  createComment(
    postId: $postId
    userId: $userId
    comment: $comment
    parentCommentId: $parentCommentId
  ) {
    success
    message
    comment {
      id
      postId
      userId
      userFirstName
      userLastName
      userRole
      comment
      parentCommentId
      status
      addedAt
      commentedAt
      editedAt
      likeCount
    }
  }
}
`;

const LIKE_COMMENT_MUTATION = gql`
mutation LikeComment($commentId: Int!, $userId: Int!, $reactionType: String) {
  likeComment(commentId: $commentId, userId: $userId, reactionType: $reactionType) {
    success
    message
    comment {
      id
      likeCount
    }
  }
}
`;

const LIKE_POST_MUTATION = gql`
mutation LikePost($postId: Int!, $userId: Int!) {
  likePost(postId: $postId, userId: $userId) {
    success
    message
    post {
      id
      likeCount
    }
  }
}
`;

const UNLIKE_POST_MUTATION = gql`
mutation UnlikePost($postId: Int!, $userId: Int!) {
  unlikePost(postId: $postId, userId: $userId) {
    success
    message
    post {
      id
      likeCount
    }
  }
}
`;

const GET_USER_QUERY = gql`
query GetUser($id: Int!) {
  user(id: $id) {
    id
    firstName
    lastName
    email
    phone
    profilePhoto
    role
    address
    profilePhotoSignedUrl
    coverPhotoSignedUrl
    latitude
    longitude
    bio
    isactive
    emailVerified
    phoneVerified
    createdAt
  }
}
`;

// Get user data dynamically to handle login state changes
const getUserData = () => {
  try {
    const stored = localStorage.getItem('user') || localStorage.getItem('userInfo');
    console.log('getUserData - stored from localStorage:', stored);
    const parsed = stored ? JSON.parse(stored) : {};
    console.log('getUserData - parsed user data:', parsed);
    return parsed;
  } catch (error) {
    console.error('getUserData - error parsing user data:', error);
    return {};
  }
};

const storedUser = getUserData();
// const userId = storedUser?.id;
const interFont = {
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

const leftNav = [
  { icon: <HomeIcon />, label: 'Home' },
  { icon: <PeopleIcon />, label: 'Site Visits' },
  { icon: <GroupIcon />, label: 'Properties' },
  { icon: <StorefrontIcon />, label: 'Marketplace' },
  { icon: <EventIcon />, label: 'Events' },
];

/** Soft matte card surface (not flat white). */
const MATTE_POST_SX = MATTE_SURFACE;

// Memoized Post component to prevent unnecessary re-renders
interface PostProps {
  post: {
    id: number;
    userId: number;
    userFirstName: string;
    userLastName: string;
    userRole: string;
    title: string;
    content: string;
    visibility: string;
    propertyType: string;
    location: string;
    price: number;
    status: string;
    createdAt: string;
    likeCount: number;
    commentCount: number;
    profilePhoto?: string;
    media?: Array<{
      id: number;
      mediaType: string;
      mediaUrl: string;
      signedUrl?: string;
      caption?: string;
      mediaOrder: number;
      mediaSize?: number;
      uploadedAt: string;
    }>;
  };
  onLikeToggle: (postId: number) => void;
  onCommentClick: (postId: number) => void;
  onOpenProfile: (userId: number) => void;
  onEditPost?: (post: PostProps['post']) => void;
  onDeletePost?: (postId: number) => void;
  currentUserId?: number | string | null;
  likedPosts: { [postId: number]: boolean };
  likeCounts: { [postId: number]: number };
  commentCounts: { [postId: number]: number };
}

const PostSkeleton = () => (
  <Box sx={{ ...MATTE_POST_SX, borderRadius: 3, p: 3, mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Skeleton variant="circular" width={44} height={44} sx={{ mr: 2 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="30%" height={24} />
        <Skeleton variant="text" width="20%" height={16} />
      </Box>
    </Box>
    <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1 }} />
    <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, mb: 2 }} />
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
    </Box>
  </Box>
);

const Post = memo(({ post, onLikeToggle, onCommentClick, onOpenProfile, onEditPost, onDeletePost, currentUserId, likedPosts, likeCounts, commentCounts }: PostProps) => {
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  const [isAnimating, setIsAnimating] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const isOwner = currentUserId != null && String(currentUserId) === String(post.userId);
  const authorName = `${post.userFirstName || ''} ${post.userLastName || ''}`.trim();
  const photoUrl = (post as any).userProfilePhotoSignedUrl || (post as any).userProfilePhoto || post.profilePhoto || undefined;

  const handleLikeClick = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
    onLikeToggle(post.id);
  }, [post.id, onLikeToggle]);

  return (
    <Box
      id={`post-${post.id}`}
      sx={{
      ...MATTE_POST_SX,
      borderRadius: 4,
      p: 3,
      transition: 'box-shadow 0.2s, transform 0.2s',
      '&:hover': {
        boxShadow: '0 2px 4px rgba(60, 45, 30, 0.06), 0 12px 28px rgba(60, 45, 30, 0.1), inset 0 1px 0 rgba(255,255,255,0.55)',
        transform: 'translateY(-2px)',
      },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Avatar
          src={photoUrl}
          sx={{ mr: 2, width: 44, height: 44, boxShadow: 1, cursor: 'pointer', bgcolor: stringToColor(authorName || String(post.userId)), fontWeight: 700 }}
          onClick={() => onOpenProfile(post.userId)}
        >
          {nameInitials(authorName, String(post.userId))}
        </Avatar>
        <Box
          onClick={() => onOpenProfile(post.userId)}
          sx={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
          role="button"
          aria-label={`Open profile of ${post.userFirstName} ${post.userLastName}`}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#2563EB', ...interFont }}>
            {post.userFirstName} {post.userLastName}
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
            {post.userRole}
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#6B7280' }}>
            {formatDate(post.createdAt)}
          </Typography>
        </Box>
        {isOwner && (
          <>
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Post options">
              <MoreVertIcon />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MenuItem onClick={() => { setMenuAnchor(null); onEditPost?.(post); }}>Edit</MenuItem>
              <MenuItem
                sx={{ color: '#DC2626' }}
                onClick={() => {
                  setMenuAnchor(null);
                  if (window.confirm('Delete this post?')) onDeletePost?.(post.id);
                }}
              >
                Delete
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
      <Typography sx={{ color: '#2563EB', fontWeight: 700, fontSize: 17, mb: 1 }}>{post.title}</Typography>
      <Typography sx={{ color: '#374151', fontSize: 16, mb: 2, whiteSpace: 'pre-wrap' }}>
        {renderMentionContent(post.content, { onOpenProfile })}
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 1 }}>
        <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(37,99,235,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Location: {post.location}</Typography>
        <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(99,102,241,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Type: {post.propertyType}</Typography>
        <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(239,68,68,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Price: ₹{post.price}</Typography>
      </Box>
      {post.media && post.media.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {post.media.map((media, index) => 
            media.mediaType === 'image' && (
              <Box key={media.id} sx={{ flex: '1 1 300px', maxWidth: '100%', position: 'relative' }}>
                <div>
                  {/* Debug media object */}
                  {(() => { console.log('Media object:', media); return null; })()}
                  <img
                    src={media.signedUrl || media.mediaUrl}
                    alt={media.caption || `Post media ${index + 1}`}
                    style={{ 
                      width: '100%', 
                      borderRadius: 12, 
                      maxHeight: 340, 
                      objectFit: 'cover', 
                      boxShadow: '0 2px 8px rgba(37,99,235,0.08)'
                    }}
                    onError={(e) => {
                      console.error('Image load error for:', {
                        mediaId: media.id,
                        signedUrl: media.signedUrl,
                        mediaUrl: media.mediaUrl,
                        currentSrc: e.currentTarget.src,
                        error: e
                      });
                      const img = e.currentTarget;
                      // If using signedUrl, fallback to mediaUrl
                      if (img.src === media.signedUrl && media.mediaUrl) {
                        console.log('Falling back to mediaUrl for media:', media.id);
                        img.src = media.mediaUrl;
                      }
                    }}
                  />
                  {media.caption && (
                    <Typography 
                      sx={{ 
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        right: 8,
                        color: '#fff',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        padding: '4px 8px',
                        borderRadius: 1,
                        fontSize: 14
                      }}
                    >
                      {media.caption}
                    </Typography>
                  )}
                </div>
              </Box>
            )
          )}
        </Box>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mt: 1.75,
          pt: 1.25,
          borderTop: '1.5px solid #E8EDF5',
          gap: 0.25,
        }}
      >
        <Button
          startIcon={
            likedPosts[post.id] ? (
              <FavoriteIcon
                className={`liked-heart-icon ${isAnimating ? 'liked-heart-icon-clicked' : ''}`}
                sx={{ fontSize: 22 }}
              />
            ) : (
              <FavoriteBorderIcon
                className={isAnimating ? 'liked-heart-icon-clicked' : ''}
                sx={{ color: '#64748B', fontSize: 22 }}
              />
            )
          }
          sx={{
            minWidth: 0,
            bgcolor: 'transparent',
            color: likedPosts[post.id] ? '#EF4444' : '#64748B',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 14,
            borderRadius: 2,
            py: 0.5,
            px: 0.75,
            gap: 0.25,
            boxShadow: 'none',
            '& .MuiButton-startIcon': { mr: 0.35 },
            '&:hover': {
              bgcolor: 'transparent',
              color: likedPosts[post.id] ? '#DC2626' : '#334155',
            },
          }}
          onClick={handleLikeClick}
        >
          {likeCounts[post.id] !== undefined ? likeCounts[post.id] : post.likeCount || 0}
        </Button>
        <Button
          startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 21, color: 'inherit' }} />}
          sx={{
            minWidth: 0,
            bgcolor: 'transparent',
            color: '#64748B',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 14,
            borderRadius: 2,
            py: 0.5,
            px: 0.75,
            gap: 0.25,
            '& .MuiButton-startIcon': { mr: 0.35 },
            '&:hover': { bgcolor: 'transparent', color: '#2563EB' },
          }}
          onClick={() => onCommentClick(post.id)}
        >
          {commentCounts[post.id] !== undefined ? commentCounts[post.id] : (post.commentCount || 0)}
        </Button>
        <IconButton
          aria-label="Share"
          sx={{
            color: '#64748B',
            borderRadius: 2,
            p: 0.65,
            bgcolor: 'transparent',
            '&:hover': { bgcolor: 'transparent', color: '#2563EB' },
          }}
        >
          <ShareSymbol sx={{ fontSize: 21 }} />
        </IconButton>
      </Box>
    </Box>
  );
});

const CommentsModal = memo(({
  open,
  post,
  onClose,
  comments,
  loadingComments,
  onAddComment,
  onReactComment,
  onEditComment,
  onDeleteComment,
  currentUserId,
  likedComments,
  commentReactions,
  commentLikeCounts,
  likingComment,
  replyingCommentId,
  replyText,
  setReplyText,
  setReplyingCommentId,
  replying
}: any) => {
  if (!open || !post) {
    return null;
  }

  const commentCount = comments?.length || 0;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        bgcolor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: { xs: 'flex-end', sm: 'center' },
        justifyContent: 'center',
        p: { xs: 0, sm: 2 },
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          ...MATTE_SURFACE,
          borderRadius: { xs: '20px 20px 0 0', sm: '20px' },
          width: { xs: '100%', sm: 'min(560px, 92vw)' },
          height: { xs: 'min(90dvh, 90vh)', sm: 'min(720px, 86vh)' },
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, sm: 2.5 },
            py: 1.75,
            flexShrink: 0,
            ...MATTE_HEADER,
            boxShadow: 'none',
            color: 'inherit',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#0F172A', fontSize: { xs: '1.15rem', sm: '1.3rem' }, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Comments
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B', mt: 0.25 }}>
              {commentCount} {commentCount === 1 ? 'reply' : 'replies'}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: '#0F172A',
              bgcolor: '#F1F5F9',
              width: 36,
              height: 36,
              '&:hover': { bgcolor: '#E2E8F0' },
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2, sm: 2.5 }, py: 2 }}>
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25, minWidth: 0 }}>
              <Avatar
                src={(post as any).userProfilePhotoSignedUrl || (post as any).userProfilePhoto || post.profilePhoto || `https://randomuser.me/api/portraits/lego/${post.userId % 10}.jpg`}
                sx={{ width: 44, height: 44, flexShrink: 0, fontWeight: 800, bgcolor: '#2563EB' }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0F172A', ...interFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.userFirstName} {post.userLastName}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                  {post.userRole} · {new Date(post.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
            {post.title && (
              <Typography sx={{ color: '#0F172A', fontWeight: 900, fontSize: 17, mb: 0.5, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
                {post.title}
              </Typography>
            )}
            <Typography sx={{ color: '#334155', fontSize: 15, fontWeight: 500, lineHeight: 1.55, wordBreak: 'break-word' }}>
              {renderMentionContent(post.content, {})}
            </Typography>
          </Box>

          <Typography sx={{ fontWeight: 900, color: '#0F172A', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1.5 }}>
            All comments
          </Typography>

          {loadingComments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} sx={{ color: '#2563EB' }} /></Box>
          ) : comments && comments.length > 0 ? (
            <Stack spacing={1.75}>
              {comments.map((comment: any) => (
                <CommentListItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  likedComments={likedComments}
                  commentReactions={commentReactions}
                  commentLikeCounts={commentLikeCounts}
                  likingComment={likingComment}
                  replyingCommentId={replyingCommentId}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  setReplyingCommentId={setReplyingCommentId}
                  replying={replying}
                  onReply={(text: string) => onAddComment(post.id, text, comment.id)}
                  onReactComment={onReactComment}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                />
              ))}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A', mb: 0.5 }}>No comments yet</Typography>
              <Typography sx={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Be the first to start the thread.</Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 2, sm: 2.5 },
            pt: 1.5,
            pb: { xs: 'max(14px, env(safe-area-inset-bottom))', sm: 2 },
            ...MATTE_HEADER,
            borderBottom: 'none',
            borderTop: '1px solid rgba(90, 70, 50, 0.1)',
            boxShadow: 'none',
            color: 'inherit',
          }}
        >
          <CommentComposer matte onSubmit={(text: string) => onAddComment(post.id, text)} />
        </Box>
      </Box>
    </Box>
  );
});


const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, isAuthenticated } = useAuth();
  const { data, loading, error, refetch } = useQuery(SEARCH_POSTS, {
    variables: { page: 1, limit: 10 },
    fetchPolicy: 'cache-and-network',
  });

  const { data: trendingData, loading: trendingLoading } = useQuery(TRENDING_POSTS, {
    variables: { limit: 5 },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore',
  });

  const client = useApolloClient();



  // Optimized state management
  const [commentsModalOpen, setCommentsModalOpen] = useState<{ open: boolean; postId: number | null }>({ open: false, postId: null });
  const [likedPosts, setLikedPosts] = useState<{ [postId: number]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [postId: number]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [postId: number]: number }>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);

  // Hydrate liked state from server (persists across refresh)
  useEffect(() => {
    if (!data?.searchPosts) return;
    const nextLiked: { [postId: number]: boolean } = {};
    const nextCounts: { [postId: number]: number } = {};
    const nextCommentCounts: { [postId: number]: number } = {};
    data.searchPosts.forEach((p: any) => {
      if (p.isLiked) nextLiked[p.id] = true;
      nextCounts[p.id] = p.likeCount || 0;
      nextCommentCounts[p.id] = p.commentCount || 0;
    });
    setLikedPosts(prev => ({ ...nextLiked, ...prev }));
    setLikeCounts(prev => ({ ...nextCounts, ...prev }));
    setCommentCounts(prev => ({ ...nextCommentCounts, ...prev }));
  }, [data?.searchPosts]);

  const [likingPost, setLikingPost] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [unlikingPost, setUnlikingPost] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'profile'>('home');

  // Comments state
  const [commentsByPost, setCommentsByPost] = useState<{ [postId: number]: any[] }>({});
  const [loadingComments, setLoadingComments] = useState<{ [postId: number]: boolean }>({});
  const [likedComments, setLikedComments] = useState<{ [commentId: number]: boolean }>({});
  const [commentReactions, setCommentReactions] = useState<{ [commentId: number]: string }>({});
  const [commentLikeCounts, setCommentLikeCounts] = useState<{ [commentId: number]: number }>({});
  const [likingComment, setLikingComment] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Auto-refresh state (simplified - always enabled)
  const [isRefreshing, setIsRefreshing] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const commentsRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Authenticated user object (from localStorage) – do not repurpose for viewing profiles
  const [currentUser, setCurrentUser] = useState(getUserData());
  const activeUserId = currentUser?.id || authUser?.id || storedUser?.id;

  const { data: suggestedData, loading: suggestedLoading, refetch: refetchSuggested } = useQuery(GET_SUGGESTED_USERS, {
    variables: { userId: parseInt(String(activeUserId || 0)), limit: 8 },
    skip: !activeUserId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: notifData, refetch: refetchNotifs } = useQuery(GET_USER_NOTIFICATIONS, {
    variables: { userId: parseInt(String(activeUserId || 0)), page: 1, limit: 20 },
    skip: !activeUserId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60000,
  });
  const [markNotificationRead] = useMutation(MARK_NOTIFICATION_READ);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const notifications = notifData?.userNotifications?.notifications || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const [followedSuggestedIds, setFollowedSuggestedIds] = useState<{ [userId: number]: boolean }>({});
  const [followingSuggestedId, setFollowingSuggestedId] = useState<number | null>(null);
  const [findFriendsOpen, setFindFriendsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDiscoverOpen, setMobileDiscoverOpen] = useState(false);
  // Ref to track currentUser without causing effect re-runs
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  // The user whose profile we are viewing from the feed
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  const isMobile = useMediaQuery('(max-width:900px)');

  // Open messaging dock on Home (desktop) from /chat redirect or Profile DM
  useEffect(() => {
    const state = location.state as { openChat?: boolean; autoSelectRoomId?: string } | null;
    if (!state?.openChat && !state?.autoSelectRoomId) return;
    if (isMobile) {
      navigate('/chat', { replace: true, state: { autoSelectRoomId: state.autoSelectRoomId } });
      return;
    }
    setChatRoomId(state.autoSelectRoomId || null);
    setChatOpen(true);
    window.history.replaceState({}, '');
  }, [location.state, isMobile, navigate]);

  // GraphQL mutations
  const [createComment] = useMutation(CREATE_COMMENT_MUTATION);
  const [likeComment] = useMutation(LIKE_COMMENT_MUTATION);
  const [unlikeComment] = useMutation(UNLIKE_COMMENT);
  const [updateCommentMutation] = useMutation(UPDATE_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);
  const [likePost] = useMutation(LIKE_POST_MUTATION);
  const [unlikePost] = useMutation(UNLIKE_POST_MUTATION);
  const [createPostMutation] = useMutation(CREATE_POST);
  const [updatePostMutation] = useMutation(UPDATE_POST);
  const [deletePostMutation] = useMutation(DELETE_POST);
  const [followUserMutation] = useMutation(FOLLOW_USER);
  // Mention notifications are created server-side on createPost / createComment.

  // Create Post form state (simplified for new component)
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [editPost, setEditPost] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Function to fetch fresh user data from backend
  const fetchAndUpdateUserData = useCallback(async () => {
    const userData = getUserData();
    if (userData && userData.id) {
      try {
        console.log('Fetching fresh user data from backend for user ID:', userData.id);
        
        // Get the authorization token
        const token = localStorage.getItem('token');
        console.log('Authorization token found:', token ? 'Yes' : 'No');
        console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'None');
        
        if (!token) {
          console.error('No authorization token found');
          return;
        }
        
        // Use direct fetch instead of Apollo Client to avoid the invariant violation
        console.log('Making direct GraphQL request...');
        const response = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            query: `
              query GetUser($id: Int!) {
                user(id: $id) {
                  id
                  firstName
                  lastName
                  email
                  phone
                  profilePhoto
                  role
                  address
                  profilePhotoSignedUrl
                  coverPhotoSignedUrl
                  latitude
                  longitude
                  bio
                  isactive
                  emailVerified
                  phoneVerified
                  createdAt
                }
              }
            `,
            variables: { id: userData.id }
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('GraphQL response:', result);
        
        if (result.data?.user) {
          console.log('Fresh user data from backend:', result.data.user);
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(result.data.user));
          localStorage.setItem('userInfo', JSON.stringify(result.data.user));
          // Update current user state
          setCurrentUser(result.data.user);
          console.log('Updated user data in localStorage and state');
        } else if (result.errors) {
          console.error('GraphQL errors:', result.errors);
        }
      } catch (error) {
        console.error('Error fetching fresh user data:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
      }
    }
  }, []);

  // Check for user data updates
  useEffect(() => {
    const checkUserData = () => {
      const userData = getUserData();
      if (JSON.stringify(userData) !== JSON.stringify(currentUserRef.current)) {
        console.log('checkUserData - updating currentUser with new data');
        setCurrentUser(userData);
      }
    };

    // Defer profile refresh so it doesn't compete with feed/trending/suggested
    const t = window.setTimeout(() => {
      fetchAndUpdateUserData();
    }, 1500);

    // Check user data on focus (when user comes back to the tab)
    window.addEventListener('focus', checkUserData);

    // Also check periodically
    const userCheckInterval = setInterval(checkUserData, 5000);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('focus', checkUserData);
      clearInterval(userCheckInterval);
    };
  }, [fetchAndUpdateUserData]); // removed currentUser – use currentUserRef to avoid infinite loop

  // Auto-refresh functionality (every 5 minutes)
  useEffect(() => {
    if (!loading) {
      refreshTimerRef.current = setInterval(async () => {
        try {
          await refetch();
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }, 300000); // 5 minutes

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [loading, refetch]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (commentsRefreshTimerRef.current) {
        clearInterval(commentsRefreshTimerRef.current);
      }
    };
  }, []);

  // Memoized user data to prevent re-renders (using current user state)
  const currentUserData = useMemo(() => {
    if (!currentUser || !currentUser.id) return null;
    return {
      name: `${currentUser.firstName} ${currentUser.lastName}`,
      title: currentUser.role || 'User',
      location: currentUser.address || 'No location',
      coverImage: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&h=300&fit=crop',
      profileImage: (currentUser as any).profilePhotoSignedUrl || currentUser.profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg',
      friendsCount: 0,
      postsCount: 0,
      rating: 0,
      totalReviews: 0,
      isOnline: true
    };
  }, [currentUser]);

  // Memoized handlers to prevent re-renders
  const handleMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleProfileClick = useCallback(() => {
    // Open own profile explicitly
    setSelectedProfileId(storedUser?.id || currentUser?.id || null);
    setCurrentPage('profile');
    handleClose();
  }, [handleClose, currentUser?.id]);

  const handleGoHome = useCallback(() => {
    setCurrentPage('home');
  }, []);

  const handleOpenProfile = useCallback((uid: number) => {
    setSelectedProfileId(uid);
    setCurrentPage('profile');
  }, []);

  const handleFollowSuggested = useCallback(async (followingId: number) => {
    if (!activeUserId || followedSuggestedIds[followingId]) return;
    setFollowingSuggestedId(followingId);
    try {
      await followUserMutation({
        variables: {
          userId: parseInt(String(activeUserId)),
          followingId,
        },
      });
      setFollowedSuggestedIds(prev => ({ ...prev, [followingId]: true }));
      await refetchSuggested();
    } catch (error) {
      console.error('Error following suggested user:', error);
    } finally {
      setFollowingSuggestedId(null);
    }
  }, [activeUserId, followedSuggestedIds, followUserMutation, refetchSuggested]);

  const handleTrendingPostClick = useCallback((postId: number) => {
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Helper function to check if user has property management permissions
  const canManageProperties = useCallback(() => {
    const user = authUser || currentUser || storedUser;
    if (!user) {
      return false;
    }
    if (!user.role || user.role.trim() === '') {
      return false;
    }
    const userRole = user.role.toLowerCase().trim();
    return userRole === 'builder' || userRole === 'admin';
  }, [authUser, currentUser, storedUser]);

  const handleCreatePost = useCallback(async (postData: any) => {
    if (!currentUser || !currentUser.id) {
      console.error('User not logged in');
      return;
    }

    try {
      setCpSubmitting(true);
      
      // Get the authorization token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authorization token found');
      }
      
      // Upload media files to S3 using presigned URLs
      const uploadedMedia: { name: string; url: string; contentType: string }[] = [];
      
      if (postData.media && postData.media.length > 0) {
        for (const file of postData.media) {
          console.log('=== Starting file upload ===');
          console.log('File:', file.name, 'Type:', file.type);
          
          const qs = new URLSearchParams({ 
            fileName: file.name, 
            contentType: file.type 
          }).toString();
          
          console.log('Requesting presigned URL with params:', qs);
          
          const presignRes = await fetch(`${API_GATEWAY_URL}/api/v1/uploads/presign-post-media?${qs}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!presignRes.ok) {
            const errorText = await presignRes.text();
            console.error('Presigned URL request failed:', presignRes.status, errorText);
            throw new Error(`Failed to get upload URL: ${presignRes.status} ${errorText}`);
          }
          
          const presignData = await presignRes.json();
          console.log('Presigned URL response:', presignData);
          
          const { url, publicUrl } = presignData;
          
          console.log('Using presigned URL for PUT:', url);
          console.log('Public URL:', publicUrl);
          
          const putRes = await fetch(url, { 
            method: 'PUT', 
            headers: { 
              'Content-Type': file.type,
              // Don't add Authorization header to S3 PUT request
            }, 
            body: file 
          });
          
          if (!putRes.ok) {
            const errorText = await putRes.text();
            console.error('S3 PUT request failed:', putRes.status, errorText);
            throw new Error(`Failed to upload media: ${putRes.status} ${errorText}`);
          }
          
          console.log('File uploaded successfully');
          uploadedMedia.push({ 
            name: file.name, 
            url: publicUrl, 
            contentType: file.type 
          });
        }
      }

      // Create post using GraphQL mutation with proper authorization
      const { data } = await createPostMutation({
        variables: {
          userId: parseInt(currentUser.id.toString()),
          title: postData.title,
          content: postData.content,
          visibility: postData.visibility,
          propertyType: postData.type,
          location: postData.location || '',
          price: 0, // Default price, can be extended later
          status: 'active',
          latitude: postData.latitude || null,
          longitude: postData.longitude || null,
          media: uploadedMedia.map((media, index) => ({
            mediaType: media.contentType.startsWith('video/') ? 'video' : 'image',
            mediaOrder: index + 1,
            filePath: media.url,
            fileName: media.name,
            contentType: media.contentType
          })),
        }
      });

      if (data?.createPost?.success) {
        setCreateOpen(false);
        // Mentions are notified server-side in createPost (users + property owners).
        await refetch();
      } else {
        throw new Error(data?.createPost?.message || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      // You can add error handling here (snackbar, alert, etc.)
    } finally {
      setCpSubmitting(false);
    }
  }, [currentUser, createPostMutation, refetch]);

  const handleEditPost = useCallback((post: any) => {
    setEditPost(post);
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
  }, []);

  const handleSaveEditPost = useCallback(async () => {
    if (!editPost?.id) return;
    setEditSaving(true);
    try {
      const { data: result } = await updatePostMutation({
        variables: {
          postId: Number(editPost.id),
          title: editTitle.trim(),
          content: editContent.trim(),
        },
      });
      if (result?.updatePost?.success) {
        setEditPost(null);
        await refetch();
      } else {
        window.alert(result?.updatePost?.message || 'Failed to update post');
      }
    } catch (err) {
      console.error('Error updating post:', err);
      window.alert('Failed to update post');
    } finally {
      setEditSaving(false);
    }
  }, [editPost, editTitle, editContent, updatePostMutation, refetch]);

  const handleDeletePost = useCallback(async (postId: number) => {
    try {
      const { data: result } = await deletePostMutation({
        variables: { postId: Number(postId) },
      });
      if (result?.deletePost?.success) {
        await refetch();
      } else {
        window.alert(result?.deletePost?.message || 'Failed to delete post');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      window.alert('Failed to delete post');
    }
  }, [deletePostMutation, refetch]);

  const handleLikeToggle = useCallback(async (postId: number) => {
    if (!currentUser?.id) return;

    const isCurrentlyLiked = likedPosts[postId];
    const currentLikeCount = likeCounts[postId] !== undefined ? likeCounts[postId] : (data?.searchPosts?.find((p: any) => p.id === postId)?.likeCount || 0);

    try {
      // Optimistic update
      setLikedPosts(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
      setLikeCounts(prev => ({
        ...prev,
        [postId]: isCurrentlyLiked ? currentLikeCount - 1 : currentLikeCount + 1
      }));

      if (isCurrentlyLiked) {
        // Unlike the post
        const { data: result } = await unlikePost({
          variables: {
            postId,
            userId: parseInt(currentUser.id.toString())
          }
        });

        if (result?.unlikePost?.success) {
          setLikeCounts(prev => ({
            ...prev,
            [postId]: result.unlikePost.post.likeCount
          }));
        } else {
          // Revert optimistic update on failure
          setLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
          setLikeCounts(prev => ({ ...prev, [postId]: currentLikeCount }));
        }
      } else {
        // Like the post
        const { data: result } = await likePost({
          variables: {
            postId,
            userId: parseInt(currentUser.id.toString())
          }
        });

        if (result?.likePost?.success) {
          setLikeCounts(prev => ({
            ...prev,
            [postId]: result.likePost.post.likeCount
          }));
        } else {
          // Revert optimistic update on failure
          setLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
          setLikeCounts(prev => ({ ...prev, [postId]: currentLikeCount }));
        }
      }
    } catch (error) {
      console.error('Error toggling post like:', error);
      // Revert optimistic update on error
      setLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
      setLikeCounts(prev => ({ ...prev, [postId]: currentLikeCount }));
    }
  }, [currentUser, likedPosts, likeCounts, data, likePost, unlikePost]);

  const handleCommentClick = useCallback(async (postId: number) => {
    console.log('Home: Opening comments modal for post:', postId);
    setCommentsModalOpen({ open: true, postId });

    // Fetch comments if not already loaded
    if (!commentsByPost[postId] && !loadingComments[postId]) {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      try {
        const { data: commentsData } = await client.query({
          query: GET_POST_COMMENTS_QUERY,
          variables: { postId, page: 1, limit: 50 },
          fetchPolicy: 'network-only',
        });

        if (commentsData?.postComments) {
          setCommentsByPost(prev => ({ ...prev, [postId]: commentsData.postComments }));
          setCommentCounts(prev => ({ ...prev, [postId]: commentsData.postComments.length }));
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      }
    }

    // Start auto-refresh for comments when modal is open
    commentsRefreshTimerRef.current = setInterval(async () => {
      try {
        const { data: commentsData } = await client.query({
          query: GET_POST_COMMENTS_QUERY,
          variables: { postId, page: 1, limit: 50 },
          fetchPolicy: 'network-only'
        });

        if (commentsData?.postComments) {
          setCommentsByPost(prev => ({ ...prev, [postId]: commentsData.postComments }));
          setCommentCounts(prev => ({ ...prev, [postId]: commentsData.postComments.length }));
        }
      } catch (error) {
        console.error('Comments auto-refresh failed:', error);
      }
    }, 1000); // Refresh comments every 1 second
  }, [commentsByPost, loadingComments, client]);

  const handleCommentsModalClose = useCallback(() => {
    setCommentsModalOpen({ open: false, postId: null });
    // Stop comments auto-refresh when modal is closed
    if (commentsRefreshTimerRef.current) {
      clearInterval(commentsRefreshTimerRef.current);
      commentsRefreshTimerRef.current = null;
    }
  }, []);

  const handleAddComment = useCallback(async (postId: number, commentText: string, parentCommentId?: number) => {
    if (!currentUser?.id || !commentText.trim()) return;

    try {
      const { data: result } = await createComment({
        variables: {
          postId,
          userId: parseInt(currentUser.id.toString()),
          comment: commentText,
          parentCommentId: parentCommentId || null
        }
      });

      if (result?.createComment?.success) {
        // Refresh comments for this post
        const { data: commentsData } = await client.query({
          query: GET_POST_COMMENTS_QUERY,
          variables: { postId, page: 1, limit: 50 },
          fetchPolicy: 'network-only',
        });

        if (commentsData?.postComments) {
          setCommentsByPost(prev => ({ ...prev, [postId]: commentsData.postComments }));
        }

        // Bump count for top-level comments
        if (!parentCommentId) {
          setCommentCounts(prev => {
            const current = prev[postId] !== undefined
              ? prev[postId]
              : (data?.searchPosts?.find((p: any) => p.id === postId)?.commentCount || 0);
            return { ...prev, [postId]: current + 1 };
          });
        }

        // Clear reply text if it was a reply
        if (parentCommentId) {
          setReplyText('');
          setReplyingCommentId(null);
        }
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  }, [currentUser, createComment, client, data?.searchPosts]);

  const refreshPostComments = useCallback(async (postId: number) => {
    const { data: commentsData } = await client.query({
      query: GET_POST_COMMENTS_QUERY,
      variables: { postId, page: 1, limit: 50 },
      fetchPolicy: 'network-only',
    });
    if (commentsData?.postComments) {
      setCommentsByPost(prev => ({ ...prev, [postId]: commentsData.postComments }));
    }
  }, [client]);

  const handleReactComment = useCallback(async (commentId: number, emoji: string) => {
    if (!currentUser?.id) return;
    const userId = parseInt(currentUser.id.toString());
    const current = normalizeReactionEmoji(commentReactions[commentId]) || (likedComments[commentId] ? '❤️' : null);
    const same = current === emoji;

    setLikingComment(true);
    try {
      if (same) {
        const { data: result } = await unlikeComment({ variables: { commentId, userId } });
        if (result?.unlikeComment?.success) {
          setLikedComments(prev => ({ ...prev, [commentId]: false }));
          setCommentReactions(prev => {
            const next = { ...prev };
            delete next[commentId];
            return next;
          });
          setCommentLikeCounts(prev => ({
            ...prev,
            [commentId]: result.unlikeComment.comment?.likeCount ?? Math.max(0, (prev[commentId] || 1) - 1),
          }));
        }
      } else {
        const { data: result } = await likeComment({
          variables: { commentId, userId, reactionType: emoji },
        });
        if (result?.likeComment?.success) {
          const wasLiked = Boolean(current);
          setLikedComments(prev => ({ ...prev, [commentId]: true }));
          setCommentReactions(prev => ({ ...prev, [commentId]: emoji }));
          setCommentLikeCounts(prev => ({
            ...prev,
            [commentId]: result.likeComment.comment?.likeCount ?? (prev[commentId] || 0) + (wasLiked ? 0 : 1),
          }));
        }
      }
    } catch (error) {
      console.error('Error reacting to comment:', error);
    } finally {
      setLikingComment(false);
    }
  }, [currentUser, commentReactions, likedComments, likeComment, unlikeComment]);

  const handleEditComment = useCallback(async (commentId: number, text: string) => {
    try {
      const { data: result } = await updateCommentMutation({
        variables: { commentId, comment: text },
      });
      if (result?.updateComment?.success) {
        const postId = commentsModalOpen.postId;
        if (postId) await refreshPostComments(postId);
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  }, [updateCommentMutation, commentsModalOpen.postId, refreshPostComments]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (!window.confirm('Delete this comment?')) return;
    const postId = commentsModalOpen.postId;
    const existing = postId ? commentsByPost[postId] : null;
    const wasTopLevel = Boolean(existing?.some((c: any) => c.id === commentId));
    try {
      const { data: result } = await deleteCommentMutation({
        variables: { commentId },
      });
      if (result?.deleteComment?.success) {
        if (postId) {
          await refreshPostComments(postId);
          if (wasTopLevel) {
            setCommentCounts(prev => ({
              ...prev,
              [postId]: Math.max(0, (prev[postId] || 1) - 1),
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }, [deleteCommentMutation, commentsModalOpen.postId, commentsByPost, refreshPostComments]);


  // Manual refresh handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleManualRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refetch();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Memoized current post for modal
  const currentPost = useMemo(() => {
    if (!commentsModalOpen.postId || !data?.searchPosts) return null;
    return data.searchPosts.find((p: any) => p.id === commentsModalOpen.postId);
  }, [commentsModalOpen.postId, data?.searchPosts]);

  // Render Profile Page
  if (currentPage === 'profile') {
    const authUserId = currentUser?.id || storedUser?.id;
    if (!authUserId) {
      return <Typography sx={{ m: 4, color: 'red' }}>User not logged in. Please log in again.</Typography>;
    }
    if (!selectedProfileId) {
      return <Typography sx={{ m: 4 }}>No profile selected.</Typography>;
    }

    return (
      <>
        <ProfilePage
          onGoBack={handleGoHome}
          userId={selectedProfileId}
          currentUserId={authUserId}
          onOpenProfile={handleOpenProfile}
        />
        {!isMobile && chatOpen && (
          <ChatPage
            embedded
            initialRoomId={chatRoomId}
            onClose={() => {
              setChatOpen(false);
              setChatRoomId(null);
            }}
          />
        )}
      </>
    );
  }

  // Render Home Page
  return (
    <Box
      sx={{
        minHeight: '100vh',
        ...interFont,
        ...PAGE_ATMOSPHERE,
      }}
    >
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          ...MATTE_HEADER,
          zIndex: 1201,
          bgcolor: '#F3EFE8 !important',
          backgroundColor: '#F3EFE8 !important',
          backgroundImage: 'linear-gradient(180deg, #F6F2EB 0%, #EFEAE2 100%) !important',
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            px: { xs: 1, sm: 2, md: 4 },
            minHeight: { xs: 56, sm: 64 },
            gap: { xs: 0.5, sm: 2 },
            display: 'grid',
            gridTemplateColumns: { xs: 'auto 1fr auto', md: '1fr minmax(280px, 480px) 1fr' },
            alignItems: 'center',
          }}
        >
          {isMobile && (
            <IconButton
              edge="start"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
              size="small"
              sx={{ mr: 0.25, color: '#2563EB', gridColumn: '1' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Typography
            component="div"
            title="Zameen pe charcha"
            sx={{
              fontWeight: 800,
              color: '#2563EB',
              letterSpacing: { xs: '-0.01em', sm: 0.3 },
              ...interFont,
              fontSize: { xs: 'clamp(0.9rem, 3.8vw, 1.1rem)', sm: '1.35rem', md: '1.5rem' },
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pr: 0.5,
              gridColumn: { xs: '2', md: '1' },
              justifySelf: { xs: 'start', md: 'start' },
            }}
          >
            Zameen pe charcha
          </Typography>

          {/* Search — centered on desktop */}
          {!isMobile && (
            <Box
              sx={{
                gridColumn: '2',
                justifySelf: 'center',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: '#F3F4F6',
                  px: 1.75,
                  py: 0.75,
                  borderRadius: 3,
                  width: '100%',
                  maxWidth: 480,
                  boxShadow: 1,
                  transition: 'box-shadow 0.2s, background 0.2s',
                  '&:hover': { boxShadow: 3, bgcolor: '#EEF2FB' },
                }}
              >
                <SearchIcon sx={{ color: '#9CA3AF', fontSize: 20 }} />
                <InputBase
                  placeholder="Search zameen pe charcha"
                  fullWidth
                  sx={{
                    fontSize: 15,
                    ...interFont,
                    '& input': { py: 0.5 },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Actions */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.15, sm: 1 },
              flexShrink: 0,
              gridColumn: { xs: '3', md: '3' },
              justifySelf: 'end',
            }}
          >
            <IconButton
              title="Messages"
              onClick={() => {
                if (isMobile) {
                  navigate('/chat');
                } else {
                  setChatOpen(true);
                }
              }}
              size={isMobile ? 'small' : 'medium'}
              sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}
            >
              <MessageIcon sx={{ color: '#2563EB', fontSize: { xs: 22, sm: 24 } }} />
            </IconButton>
            <IconButton
              title="Notifications"
              size={isMobile ? 'small' : 'medium'}
              onClick={(e) => setNotifAnchor(e.currentTarget)}
              sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}
            >
              <Badge badgeContent={unreadCount} color="error" max={9}>
                <NotificationsIcon sx={{ color: '#2563EB', fontSize: { xs: 22, sm: 24 } }} />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={() => setNotifAnchor(null)}
              PaperProps={{ sx: { width: { xs: 'min(360px, calc(100vw - 24px))', sm: 360 }, maxHeight: 420 } }}
            >
              {notifications.length === 0 && (
                <MenuItem disabled>No notifications</MenuItem>
              )}
              {notifications.map((n: any) => (
                <MenuItem
                  key={n.id}
                  onClick={async () => {
                    if (!n.read && activeUserId) {
                      try {
                        await markNotificationRead({
                          variables: {
                            notificationId: n.id,
                            userId: parseInt(String(activeUserId)),
                          },
                        });
                        refetchNotifs();
                      } catch (err) {
                        console.warn('markNotificationRead failed', err);
                      }
                    }
                    setNotifAnchor(null);
                  }}
                  sx={{
                    alignItems: 'flex-start',
                    whiteSpace: 'normal',
                    bgcolor: n.read ? 'transparent' : 'rgba(37,99,235,0.06)',
                  }}
                >
                  <Box>
                    <Typography fontWeight={600} fontSize={14}>{n.title}</Typography>
                    <Typography fontSize={13} color="text.secondary">{n.message}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
            <IconButton
              title="Find friends"
              size={isMobile ? 'small' : 'medium'}
              onClick={() => {
                setFindFriendsOpen(true);
                refetchSuggested();
              }}
              sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}
            >
              <PersonAddIcon sx={{ color: '#2563EB', fontSize: { xs: 22, sm: 24 } }} />
            </IconButton>
            {isMobile && (
              <IconButton
                title="Discover"
                size="small"
                onClick={() => setMobileDiscoverOpen(true)}
                sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}
              >
                <WhatshotIcon sx={{ color: '#2563EB', fontSize: 22 }} />
              </IconButton>
            )}
            <IconButton
              onClick={handleMenu}
              title="Profile"
              size={isMobile ? 'small' : 'medium'}
              sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' }, p: { xs: 0.5, sm: 1 } }}
            >
              <Avatar
                src={currentUserData?.profileImage || ''}
                sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, boxShadow: 1 }}
              />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={handleProfileClick}>Profile</MenuItem>
              {canManageProperties() && (
                <MenuItem onClick={() => { handleClose(); window.location.href = '/create-property'; }}>
                  Create Property
                </MenuItem>
              )}
              {canManageProperties() && (
                <MenuItem onClick={() => { handleClose(); window.location.href = '/my-properties'; }}>
                  My Properties
                </MenuItem>
              )}
              <MenuItem onClick={handleClose}>Settings</MenuItem>
              <MenuItem
                onClick={() => {
                  localStorage.removeItem('user');
                  localStorage.removeItem('userInfo');
                  localStorage.removeItem('token');
                  localStorage.removeItem('refreshToken');
                  window.location.href = '/';
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>

        {/* Mobile search row — full width under brand/actions */}
        {isMobile && (
          <Box
            sx={{
              px: 1.5,
              pb: 1.25,
              pt: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: '#F3F4F6',
                px: 1.5,
                py: 0.85,
                borderRadius: 999,
                width: '100%',
                border: '1px solid #E5E7EB',
              }}
            >
              <SearchIcon sx={{ color: '#9CA3AF', fontSize: 20, flexShrink: 0 }} />
              <InputBase
                placeholder="Search people, places…"
                fullWidth
                inputProps={{ 'aria-label': 'Search' }}
                sx={{
                  fontSize: 15,
                  ...interFont,
                  '& input': {
                    py: 0.25,
                    '&::placeholder': { opacity: 0.7 },
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </AppBar>

      {/* Layout — extra top pad on mobile for two-row header */}
      <Box sx={{ display: 'flex', pt: { xs: 14, sm: 9 }, px: isMobile ? 0 : 3 }}>
        {/* Left Sidebar */}
        {!isMobile && (
          <Box sx={{ width: 240, mr: 3, position: 'sticky', top: 88, alignSelf: 'flex-start', height: 'fit-content', zIndex: 2 }}>
            <Box sx={{
              borderRadius: 4,
              p: 2,
              bgcolor: 'rgba(255,255,255,0.7)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              transition: 'box-shadow 0.2s',
            }}>
              {leftNav.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.2,
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontWeight: 500,
                    color: '#374151',
                    fontSize: 16,
                    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(37,99,235,0.08)',
                      color: '#2563EB',
                      boxShadow: 2,
                    },
                  }}
                >
                  <Box sx={{ color: '#2563EB', fontSize: 22 }}>{item.icon}</Box>
                  <span>{item.label}</span>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Main Feed */}
        <Box sx={{ flex: 1, minWidth: 0, mx: 0, mt: isMobile ? 0 : 2, maxWidth: 'none' }}>
          {/* Create Post Card */}
          <Box
            sx={{
              mb: { xs: 2, sm: 4 },
              mx: { xs: 1.25, sm: 0 },
              p: { xs: 1.5, sm: 3 },
              ...MATTE_POST_SX,
              borderRadius: { xs: 3, sm: 4 },
            }}
          >
            <Box
              onClick={() => setCreateOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                cursor: 'pointer',
              }}
            >
              <Avatar
                src={currentUserData?.profileImage || ''}
                sx={{ width: { xs: 36, sm: 44 }, height: { xs: 36, sm: 44 }, flexShrink: 0 }}
              />
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  bgcolor: '#F3F4F6',
                  px: { xs: 1.75, sm: 2.5 },
                  py: { xs: 1.15, sm: 1.4 },
                  borderRadius: 3,
                  boxShadow: 1,
                  transition: 'box-shadow 0.2s, background 0.2s',
                  '&:hover': { boxShadow: 3, bgcolor: '#EEF2FB' },
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: 14, sm: 17 },
                    color: '#9CA3AF',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    ...interFont,
                  }}
                >
                  What&apos;s on your mind?
                </Typography>
              </Box>
            </Box>
          </Box>



          {/* Posts Feed */}
          {loading && !data ? (
            <Stack spacing={4}>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </Stack>
          ) : error ? (
            <Box sx={{ textAlign: 'center', mt: 6, px: 2 }}>
              <Typography color="error" sx={{ fontWeight: 600, mb: 1 }}>
                Error loading posts
              </Typography>
              <Typography sx={{ color: '#6B7280', fontSize: 14, wordBreak: 'break-word' }}>
                {error.message}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2, textTransform: 'none' }}
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </Box>
          ) : (
            <Stack spacing={4}>
              {data?.searchPosts?.map((post: any) => (
                <Post
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentClick={handleCommentClick}
                  onOpenProfile={handleOpenProfile}
                  onEditPost={handleEditPost}
                  onDeletePost={handleDeletePost}
                  currentUserId={activeUserId}
                  likedPosts={likedPosts}
                  likeCounts={likeCounts}
                  commentCounts={commentCounts}
                />
              ))}
            </Stack>
          )}
        </Box>

        {/* Right Sidebar */}
        {!isMobile && (
          <Box sx={{ width: 280, ml: 3, display: 'flex', flexDirection: 'column', gap: 3, position: 'sticky', top: 88, alignSelf: 'flex-start', height: 'fit-content', zIndex: 2 }}>
            {/* People You May Know */}
            <Box sx={{ ...MATTE_PANEL, borderRadius: 4, p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#2563EB', ...interFont }}>People You May Know</Typography>
              {suggestedLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : (
                <Stack spacing={2}>
                  {(suggestedData?.suggestedUsers ?? []).map((friend: any) => (
                    <Box key={friend.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, ...MATTE_INSET, borderRadius: 3, p: 1.2 }}>
                      <Avatar
                        src={friend.profilePhotoSignedUrl || friend.profilePhoto || `https://randomuser.me/api/portraits/lego/${friend.id % 10}.jpg`}
                        sx={{ width: 38, height: 38, mr: 1, cursor: 'pointer' }}
                        onClick={() => handleOpenProfile(friend.id)}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                          onClick={() => handleOpenProfile(friend.id)}
                        >
                          {friend.firstName} {friend.lastName}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#6B7280' }}>{friend.role || 'User'}</Typography>
                      </Box>
                      <Button
                        size="small"
                        variant={followedSuggestedIds[friend.id] ? 'outlined' : 'contained'}
                        disabled={followedSuggestedIds[friend.id] || followingSuggestedId === friend.id}
                        onClick={() => handleFollowSuggested(friend.id)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: 2,
                          minWidth: 72,
                          bgcolor: followedSuggestedIds[friend.id] ? 'transparent' : '#2563EB',
                        }}
                      >
                        {followedSuggestedIds[friend.id] ? 'Following' : followingSuggestedId === friend.id ? '...' : 'Follow'}
                      </Button>
                    </Box>
                  ))}
                  {(suggestedData?.suggestedUsers ?? []).length === 0 && (
                    <Typography sx={{ fontSize: 13, color: '#6B7280' }}>No suggestions right now</Typography>
                  )}
                </Stack>
              )}
            </Box>
            {/* Trending Posts */}
            <Box sx={{ ...MATTE_PANEL, borderRadius: 4, p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#2563EB', ...interFont }}>Trending</Typography>
              {trendingLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : (
                <Stack spacing={1.5}>
                  {(trendingData?.trendingPosts ?? []).map((trend: any) => (
                    <Box
                      key={trend.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        ...MATTE_INSET,
                        borderRadius: 3,
                        p: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.65)' },
                      }}
                      onClick={() => handleTrendingPostClick(trend.id)}
                    >
                      <Typography sx={{ color: '#2563EB', fontWeight: 600, fontSize: 15, pr: 1 }}>
                        {trend.title}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: '#6366F1', fontWeight: 500, bgcolor: 'rgba(99,102,241,0.08)', px: 1.2, borderRadius: 2, whiteSpace: 'nowrap' }}>
                        {trend.likeCount || 0} likes
                      </Typography>
                    </Box>
                  ))}
                  {(trendingData?.trendingPosts ?? []).length === 0 && (
                    <Typography sx={{ fontSize: 13, color: '#6B7280' }}>No trending posts yet</Typography>
                  )}
                </Stack>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Mobile: left nav drawer (replaces left sidebar) */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 'min(300px, 86vw)',
            pt: 'env(safe-area-inset-top)',
            pb: 'env(safe-area-inset-bottom)',
            ...MATTE_PANEL,
            borderRadius: 0,
          },
        }}
      >
        <Box sx={{ px: 2, py: 2 }}>
          <Typography sx={{ fontWeight: 800, color: '#2563EB', fontSize: '1.15rem', mb: 0.5, ...interFont }}>
            Zameen pe charcha
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#6B7280', mb: 2 }}>Menu</Typography>
          <Stack spacing={0.5}>
            {leftNav.map((item, idx) => (
              <Box
                key={idx}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (item.label === 'Properties') {
                    window.location.href = '/my-properties';
                  } else if (item.label === 'Home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.75,
                  px: 1.5,
                  py: 1.35,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: 15,
                  '&:active': { bgcolor: 'rgba(37,99,235,0.1)' },
                }}
              >
                <Box sx={{ color: '#2563EB', display: 'flex' }}>{item.icon}</Box>
                <span>{item.label}</span>
              </Box>
            ))}
          </Stack>
        </Box>
      </Drawer>

      {/* Mobile: discover drawer (replaces right sidebar) */}
      <Drawer
        anchor="right"
        open={mobileDiscoverOpen}
        onClose={() => setMobileDiscoverOpen(false)}
        PaperProps={{
          sx: {
            width: 'min(340px, 92vw)',
            pt: 'env(safe-area-inset-top)',
            pb: 'env(safe-area-inset-bottom)',
            ...MATTE_PANEL,
            borderRadius: 0,
          },
        }}
      >
        <Box sx={{ px: 2, py: 2 }}>
          <Typography sx={{ fontWeight: 800, color: '#2563EB', fontSize: '1.1rem', mb: 2, ...interFont }}>
            Discover
          </Typography>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25, color: '#2563EB', ...interFont }}>
            People you may know
          </Typography>
          {suggestedLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Stack spacing={1.25} sx={{ mb: 2.5 }}>
              {(suggestedData?.suggestedUsers ?? []).slice(0, 6).map((friend: any) => (
                <Box
                  key={friend.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    ...MATTE_INSET,
                    borderRadius: 2,
                    p: 1.1,
                  }}
                >
                  <Avatar
                    src={
                      friend.profilePhotoSignedUrl ||
                      friend.profilePhoto ||
                      `https://randomuser.me/api/portraits/lego/${friend.id % 10}.jpg`
                    }
                    sx={{ width: 40, height: 40, cursor: 'pointer' }}
                    onClick={() => {
                      setMobileDiscoverOpen(false);
                      handleOpenProfile(friend.id);
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                      onClick={() => {
                        setMobileDiscoverOpen(false);
                        handleOpenProfile(friend.id);
                      }}
                    >
                      {friend.firstName} {friend.lastName}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 12, color: '#6B7280' }}>
                      {friend.role || 'User'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={followedSuggestedIds[friend.id] ? 'outlined' : 'contained'}
                    disabled={followedSuggestedIds[friend.id] || followingSuggestedId === friend.id}
                    onClick={() => handleFollowSuggested(friend.id)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      minWidth: 72,
                      bgcolor: followedSuggestedIds[friend.id] ? 'transparent' : '#2563EB',
                    }}
                  >
                    {followedSuggestedIds[friend.id]
                      ? 'Following'
                      : followingSuggestedId === friend.id
                        ? '...'
                        : 'Follow'}
                  </Button>
                </Box>
              ))}
              {(suggestedData?.suggestedUsers ?? []).length === 0 && (
                <Typography sx={{ fontSize: 13, color: '#6B7280' }}>No suggestions right now</Typography>
              )}
            </Stack>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25, color: '#2563EB', ...interFont }}>
            Trending
          </Typography>
          {trendingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Stack spacing={1.25}>
              {(trendingData?.trendingPosts ?? []).map((trend: any) => (
                <Box
                  key={trend.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    ...MATTE_INSET,
                    borderRadius: 2,
                    p: 1.1,
                    cursor: 'pointer',
                    '&:active': { bgcolor: 'rgba(255,255,255,0.65)' },
                  }}
                  onClick={() => {
                    setMobileDiscoverOpen(false);
                    handleTrendingPostClick(trend.id);
                  }}
                >
                  <Typography sx={{ color: '#2563EB', fontWeight: 600, fontSize: 14, pr: 0.5 }}>
                    {trend.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#6366F1',
                      fontWeight: 500,
                      bgcolor: 'rgba(99,102,241,0.08)',
                      px: 1,
                      borderRadius: 2,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {trend.likeCount || 0} likes
                  </Typography>
                </Box>
              ))}
              {(trendingData?.trendingPosts ?? []).length === 0 && (
                <Typography sx={{ fontSize: 13, color: '#6B7280' }}>No trending posts yet</Typography>
              )}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Find friends / People you may know */}
      <Dialog
        open={findFriendsOpen}
        onClose={() => setFindFriendsOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            m: { xs: 1.5, sm: 2 },
            maxHeight: { xs: '85vh', sm: 520 },
            ...MATTE_SURFACE,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2563EB', pb: 1, ...interFont }}>
          People you may know
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
          {suggestedLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (suggestedData?.suggestedUsers ?? []).length === 0 ? (
            <Typography sx={{ fontSize: 14, color: '#6B7280', textAlign: 'center', py: 3 }}>
              No suggestions right now. Check back later.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {(suggestedData?.suggestedUsers ?? []).map((friend: any) => (
                <Box
                  key={friend.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    ...MATTE_INSET,
                    borderRadius: 2,
                    p: 1.25,
                  }}
                >
                  <Avatar
                    src={
                      friend.profilePhotoSignedUrl ||
                      friend.profilePhoto ||
                      `https://randomuser.me/api/portraits/lego/${friend.id % 10}.jpg`
                    }
                    sx={{ width: 44, height: 44, cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => {
                      setFindFriendsOpen(false);
                      handleOpenProfile(friend.id);
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{ fontWeight: 600, fontSize: 15, cursor: 'pointer', ...interFont }}
                      noWrap
                      onClick={() => {
                        setFindFriendsOpen(false);
                        handleOpenProfile(friend.id);
                      }}
                    >
                      {friend.firstName} {friend.lastName}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280' }} noWrap>
                      {friend.role || 'User'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={followedSuggestedIds[friend.id] ? 'outlined' : 'contained'}
                    disabled={followedSuggestedIds[friend.id] || followingSuggestedId === friend.id}
                    onClick={() => handleFollowSuggested(friend.id)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      minWidth: 84,
                      flexShrink: 0,
                      bgcolor: followedSuggestedIds[friend.id] ? 'transparent' : '#2563EB',
                    }}
                  >
                    {followedSuggestedIds[friend.id]
                      ? 'Following'
                      : followingSuggestedId === friend.id
                        ? '...'
                        : 'Follow'}
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button onClick={() => setFindFriendsOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comments Modal */}
      <CommentsModal
        open={commentsModalOpen.open}
        post={currentPost}
        onClose={handleCommentsModalClose}
        comments={commentsByPost[commentsModalOpen.postId!]}
        loadingComments={loadingComments[commentsModalOpen.postId!]}
        onAddComment={handleAddComment}
        onReactComment={handleReactComment}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        currentUserId={currentUser?.id}
        likedComments={likedComments}
        commentReactions={commentReactions}
        commentLikeCounts={commentLikeCounts}
        likingComment={likingComment}
        replyingCommentId={replyingCommentId}
        replyText={replyText}
        setReplyText={setReplyText}
        setReplyingCommentId={setReplyingCommentId}
        replying={false}
      />

      {/* Create Post Modal */}
      <CreatePost
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreatePost}
        loading={cpSubmitting}
      />

      <Dialog open={Boolean(editPost)} onClose={() => !editSaving && setEditPost(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit post</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            fullWidth
            disabled={editSaving}
          />
          <TextField
            label="Content"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            disabled={editSaving}
            helperText="Use @[userId:Name] or @[p:propertyId:Title] for mentions"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPost(null)} disabled={editSaving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEditPost}
            disabled={editSaving || !editTitle.trim() || !editContent.trim()}
            sx={{ textTransform: 'none' }}
          >
            {editSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LinkedIn-style messaging dock on desktop Home */}
      {!isMobile && chatOpen && (
        <ChatPage
          embedded
          initialRoomId={chatRoomId}
          onClose={() => {
            setChatOpen(false);
            setChatRoomId(null);
          }}
        />
      )}
    </Box>
  );
};

export default Home;