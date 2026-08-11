import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { gql, useQuery, useMutation, useApolloClient } from '@apollo/client';
import { SEARCH_POSTS, CREATE_POST, TRENDING_POSTS, DELETE_POST, UPDATE_POST, UPDATE_COMMENT, DELETE_COMMENT, UNLIKE_COMMENT, GET_POST_COMMENTS, CREATE_COMMENT, LIKE_COMMENT, LIKE_POST, UNLIKE_POST, SHARE_POST, REPORT_POST, PIN_POST, UNPIN_POST } from '../graphql/posts';
import { GET_SUGGESTED_USERS, FOLLOW_USER, GET_USER_NOTIFICATIONS, MARK_NOTIFICATION_READ, GET_USER_PROFILE } from '../graphql/user';
import CreatePost from './CreatePost';
import { PostService } from '../services/postService';
import { useAuth } from '../contexts/AuthContext';
import { renderMentionContent, nameInitials, stringToColor } from '../utils/mentions';
import { formatDateTime, formatRelativeTime } from '../utils/datetime';
import CommentListItem from './comments/CommentListItem';
import CommentComposer from './comments/CommentComposer';
import { normalizeReactionEmoji } from './comments/commentReactions';
import { nestComments } from '../utils/nestComments';
import NotificationsPanel from './NotificationsPanel';
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
  Alert,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareSymbol from './icons/ShareSymbol';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ProfilePage from './ProfilePage';
import ChatPage from './ChatPage';
import { MATTE_SURFACE, MATTE_INSET, MATTE_PANEL, PAGE_ATMOSPHERE } from '../theme/surfaces';
import AdminBackground from './admin/AdminBackground';
import { ZpcLogoMark } from './brand/ZpcLogo';
import PostMediaCarousel from './PostMediaCarousel';
import { isAdminRole } from '../utils/roles';

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8080/api/v1/graphql';
const API_GATEWAY_URL = (process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080').replace(/\/$/, '');

const GET_USER_QUERY = gql`
query GetUser($id: String!) {
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
  fontFamily: "'DM Sans', 'Source Sans 3', system-ui, sans-serif",
};

const displayFont = {
  fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
};

const leftNav = [
  { icon: <HomeIcon fontSize="small" />, label: 'Home', href: null as string | null },
  { icon: <PeopleIcon fontSize="small" />, label: 'My Network', href: null },
  { icon: <GroupIcon fontSize="small" />, label: 'Properties', href: '/my-properties' },
];

const CARD_RADIUS = 2; // LinkedIn-like modest corners, ZPC cream glass fills

/** Soft matte card surface (not flat white). */
const MATTE_POST_SX = MATTE_SURFACE;

interface PostProps {
  post: {
    id: number;
    userId: number | string;
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
  onLikeToggle: (postId: number | string) => void;
  onCommentClick: (postId: number | string) => void;
  onOpenProfile: (userId: string) => void;
  onEditPost?: (post: PostProps['post']) => void;
  onDeletePost?: (postId: number | string) => void;
  onSharePost?: (postId: number | string) => void | Promise<void>;
  onReportPost?: (post: PostProps['post']) => void | Promise<void>;
  onPinPost?: (postId: number | string, pin: boolean) => void | Promise<void>;
  /** Live profile photo for the signed-in user (overrides stale post enrichment). */
  viewerProfilePhoto?: string | null;
  currentUserId?: number | string | null;
  likedPosts: { [postId: string]: boolean };
  likeCounts: { [postId: string]: number };
  commentCounts: { [postId: string]: number };
  commentsOpen?: boolean;
  comments?: any[];
  loadingComments?: boolean;
  commentsError?: string | null;
  onAddComment?: (postId: number | string, text: string, parentCommentId?: number | string) => void | Promise<void>;
  onReactComment?: (commentId: number | string, emoji: string) => void | Promise<void>;
  onEditComment?: (commentId: number | string, text: string) => void | Promise<void>;
  onDeleteComment?: (commentId: number | string) => void | Promise<void>;
  likedComments?: { [commentId: string]: boolean };
  commentReactions?: { [commentId: string]: string };
  commentLikeCounts?: { [commentId: string]: number };
  likingComment?: boolean;
  replyingCommentId?: string | null;
  replyText?: string;
  setReplyText?: (v: string) => void;
  setReplyingCommentId?: (id: string | null) => void;
}

const PostSkeleton = () => (
  <Box sx={{ ...MATTE_POST_SX, borderRadius: CARD_RADIUS, overflow: 'hidden', mb: 0 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1.75, pb: 1 }}>
      <Skeleton variant="circular" width={48} height={48} sx={{ mr: 1.5 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="38%" height={20} />
        <Skeleton variant="text" width="28%" height={16} />
      </Box>
    </Box>
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Skeleton variant="text" width="92%" height={18} />
      <Skeleton variant="text" width="74%" height={18} />
    </Box>
    <Skeleton variant="rectangular" height={220} sx={{ mb: 1 }} />
    <Box sx={{ display: 'flex', gap: 1, px: 1, py: 1 }}>
      <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 1 }} />
    </Box>
  </Box>
);

const Post = memo(({
  post,
  onLikeToggle,
  onCommentClick,
  onOpenProfile,
  onEditPost,
  onDeletePost,
  onSharePost,
  onReportPost,
  onPinPost,
  viewerProfilePhoto = null,
  currentUserId,
  likedPosts,
  likeCounts,
  commentCounts,
  commentsOpen = false,
  comments = [],
  loadingComments = false,
  commentsError = null,
  onAddComment,
  onReactComment,
  onEditComment,
  onDeleteComment,
  likedComments = {},
  commentReactions = {},
  commentLikeCounts = {},
  likingComment = false,
  replyingCommentId = null,
  replyText = '',
  setReplyText,
  setReplyingCommentId,
}: PostProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const isOwner = currentUserId != null && String(currentUserId) === String(post.userId);
  const authorName = `${post.userFirstName || ''} ${post.userLastName || ''}`.trim();
  const photoUrl = (() => {
    const isSelf = currentUserId != null && String(currentUserId) === String(post.userId);
    if (isSelf && viewerProfilePhoto) return viewerProfilePhoto;
    return (post as any).userProfilePhotoSignedUrl || (post as any).userProfilePhoto || post.profilePhoto || undefined;
  })();
  const likeCount = likeCounts[String(post.id)] !== undefined ? likeCounts[String(post.id)] : (likeCounts[post.id as any] !== undefined ? likeCounts[post.id as any] : (post.likeCount || 0));
  const commentCount = commentCounts[String(post.id)] !== undefined ? commentCounts[String(post.id)] : (commentCounts[post.id as any] !== undefined ? commentCounts[post.id as any] : (post.commentCount || 0));
  const liked = !!(likedPosts[String(post.id)] || likedPosts[post.id as any]);
  const relativeWhen = formatRelativeTime(post.createdAt) || formatDateTime(post.createdAt, {
    latitude: (post as any).latitude,
    longitude: (post as any).longitude,
  });

  const title = (post.title || '').trim();
  const body = (post.content || '').trim();
  const titleRedundant =
    !!title &&
    (body.toLowerCase().startsWith(title.toLowerCase()) || title.toLowerCase() === body.toLowerCase());

  const metaBits = [
    post.location ? String(post.location) : '',
    post.propertyType ? String(post.propertyType) : '',
    post.price != null && Number(post.price) > 0 ? `₹${post.price}` : '',
  ].filter(Boolean);

  const handleLikeClick = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
    onLikeToggle(post.id);
  }, [post.id, onLikeToggle]);

  const actionBtnSx = {
    flex: 1,
    minWidth: 0,
    bgcolor: 'transparent',
    color: '#3A4540',
    textTransform: 'none' as const,
    fontWeight: 650,
    fontSize: 13.5,
    borderRadius: 1.5,
    py: 1,
    px: 1,
    gap: 0.75,
    boxShadow: 'none',
    '& .MuiButton-startIcon': { mr: 0 },
    '&:hover': {
      bgcolor: 'rgba(22,48,42,0.06)',
      color: '#16302A',
    },
  };

  return (
    <Box
      id={`post-${post.id}`}
      sx={{
        ...MATTE_POST_SX,
        borderRadius: CARD_RADIUS,
        overflow: 'hidden',
        p: 0,
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow:
            '0 2px 4px rgba(60, 45, 30, 0.06), 0 12px 28px rgba(60, 45, 30, 0.1), inset 0 1px 0 rgba(235,230,212,0.55)',
        },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, px: 2, pt: 1.75, pb: 1 }}>
        <Avatar
          src={photoUrl}
          sx={{
            width: 48,
            height: 48,
            cursor: 'pointer',
            bgcolor: stringToColor(authorName || String(post.userId)),
            fontWeight: 700,
            fontSize: 16,
          }}
          onClick={() => onOpenProfile(String(post.userId))}
        >
          {nameInitials(authorName, String(post.userId))}
        </Avatar>
        <Box
          onClick={() => onOpenProfile(String(post.userId))}
          sx={{ cursor: 'pointer', flex: 1, minWidth: 0, pt: 0.15 }}
          role="button"
          aria-label={`Open profile of ${authorName || 'user'}`}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 15,
              color: '#16302A',
              lineHeight: 1.25,
              ...interFont,
              '&:hover': { textDecoration: 'underline', textDecorationThickness: 1.5 },
            }}
          >
            {authorName || 'ZPC member'}
          </Typography>
          {(post.userRole || '').trim() ? (
            <Typography sx={{ fontSize: 12.5, color: '#5C675F', fontWeight: 500, lineHeight: 1.3, mt: 0.15 }}>
              {(post.userRole || '').replace(/_/g, ' ')}
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: 12, color: '#7A847C', fontWeight: 500, mt: 0.15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span">{relativeWhen}</Box>
            <Box component="span" sx={{ opacity: 0.7 }}>·</Box>
            <Box component="span" sx={{ fontSize: 13 }} aria-hidden>🌐</Box>
          </Typography>
        </Box>
        {(isOwner || onReportPost || onPinPost) && (
          <>
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Post options" sx={{ color: '#3A4540' }}>
              <MoreVertIcon />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              {isOwner && (
                <MenuItem onClick={() => { setMenuAnchor(null); onEditPost?.(post); }}>Edit</MenuItem>
              )}
              {isOwner && onPinPost && (
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    onPinPost(post.id, !(post as any).isPinned);
                  }}
                >
                  {(post as any).isPinned ? 'Unpin from profile' : 'Pin to profile'}
                </MenuItem>
              )}
              {isOwner && (
                <MenuItem
                  sx={{ color: '#16302A' }}
                  onClick={() => {
                    setMenuAnchor(null);
                    if (window.confirm('Delete this post?')) onDeletePost?.(post.id);
                  }}
                >
                  Delete
                </MenuItem>
              )}
              {!isOwner && onReportPost && (
                <MenuItem
                  sx={{ color: '#B42318' }}
                  onClick={() => {
                    setMenuAnchor(null);
                    onReportPost(post);
                  }}
                >
                  Report post
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>

      <Box sx={{ px: 2, pb: metaBits.length || (post.media?.length ?? 0) > 0 ? 1 : 0.5 }}>
        {title && !titleRedundant ? (
          <Typography
            component="div"
            sx={{
              color: '#16302A',
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.4,
              mb: body ? 0.5 : 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {title}
          </Typography>
        ) : null}
        {body ? (
          <Typography
            component="div"
            sx={{
              color: '#16302A',
              fontSize: 14.5,
              lineHeight: 1.5,
              fontWeight: 450,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {renderMentionContent(body, {
              onOpenProfile,
              variant: 'chip',
            })}
          </Typography>
        ) : null}
        {metaBits.length > 0 ? (
          <Typography sx={{ mt: 0.85, fontSize: 12.5, color: '#5C675F', fontWeight: 500 }}>
            {metaBits.join(' · ')}
          </Typography>
        ) : null}
      </Box>

      {post.media && post.media.length > 0 && (
        <Box sx={{ width: '100%', bgcolor: 'rgba(10,18,16,0.04)' }}>
          <PostMediaCarousel media={post.media} maxHeight={{ xs: 360, sm: 480 }} edgeToEdge />
        </Box>
      )}

      {(likeCount > 0 || commentCount > 0) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            pt: 1.1,
            pb: 0.35,
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: '#5C675F', fontWeight: 500 }}>
            {likeCount > 0 ? (
              <>
                <Box component="span" sx={{ mr: 0.5 }} aria-hidden>{liked ? '❤️' : '🤍'}</Box>
                {likeCount}
              </>
            ) : (
              ' '
            )}
          </Typography>
          {commentCount > 0 ? (
            <Typography
              onClick={() => onCommentClick(post.id)}
              sx={{
                fontSize: 12.5,
                color: '#5C675F',
                fontWeight: 500,
                cursor: 'pointer',
                '&:hover': { color: '#16302A', textDecoration: 'underline' },
              }}
            >
              {commentCount} comment{commentCount === 1 ? '' : 's'}
            </Typography>
          ) : null}
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          mx: 1,
          mb: commentsOpen ? 0 : 0.75,
          mt: 0.35,
          pt: 0.35,
          borderTop: '1px solid rgba(90,70,50,0.12)',
          gap: 0.25,
        }}
      >
        <Button
          startIcon={
            liked ? (
              <Box
                component="span"
                className={`liked-heart-emoji ${isAnimating ? 'liked-heart-icon-clicked' : ''}`}
                aria-hidden
                sx={{ fontSize: 18, lineHeight: 1 }}
              >
                ❤️
              </Box>
            ) : (
              <FavoriteBorderIcon
                className={isAnimating ? 'liked-heart-icon-clicked' : ''}
                sx={{ color: 'inherit', fontSize: 20 }}
              />
            )
          }
          sx={{
            ...actionBtnSx,
            color: liked ? '#E11D48' : '#3A4540',
            '&:hover': {
              bgcolor: 'rgba(22,48,42,0.06)',
              color: liked ? '#E11D48' : '#16302A',
            },
          }}
          onClick={handleLikeClick}
        >
          Like
        </Button>
        <Button
          startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 20, color: 'inherit' }} />}
          sx={actionBtnSx}
          onClick={() => onCommentClick(post.id)}
        >
          Comment
        </Button>
        <Button
          startIcon={<ShareSymbol sx={{ fontSize: 19 }} />}
          sx={actionBtnSx}
          aria-label="Share"
          disabled={(post as any).allowShare === false || !onSharePost}
          onClick={() => onSharePost?.(post.id)}
        >
          Share
        </Button>
      </Box>

      {commentsOpen && (
        <Box
          sx={{
            px: 1.5,
            pt: 1,
            pb: 1.5,
            borderTop: '1px solid rgba(90,70,50,0.1)',
            bgcolor: 'rgba(235,230,212,0.28)',
          }}
        >
          <Box sx={{ mb: 1.25 }}>
            <CommentComposer
              matte
              onSubmit={(text: string) => {
                if (!onAddComment) return;
                return onAddComment(post.id, text);
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.25 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5C675F' }}>
              {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : 'Comments'}
            </Typography>
            <Typography
              onClick={() => onCommentClick(post.id)}
              sx={{ fontSize: 12, fontWeight: 600, color: '#5C675F', cursor: 'pointer', '&:hover': { color: '#16302A' } }}
            >
              Hide
            </Typography>
          </Box>

          {commentsError ? (
            <Alert severity="error" sx={{ mb: 1.25, borderRadius: 1.5 }}>
              {commentsError}
            </Alert>
          ) : null}

          {loadingComments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5 }}>
              <CircularProgress size={24} sx={{ color: '#16302A' }} />
            </Box>
          ) : comments && comments.length > 0 ? (
            <Stack spacing={1.5}>
              {nestComments(comments).map((comment: any) => (
                <CommentListItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId != null ? String(currentUserId) : null}
                  likedComments={likedComments}
                  commentReactions={commentReactions}
                  commentLikeCounts={commentLikeCounts}
                  likingComment={likingComment}
                  replyingCommentId={replyingCommentId}
                  replyText={replyText}
                  setReplyText={setReplyText || (() => {})}
                  setReplyingCommentId={setReplyingCommentId || (() => {})}
                  replying={false}
                  onReply={(text: string) => onAddComment?.(post.id, text, comment.id)}
                  onReactComment={onReactComment || (() => {})}
                  onEditComment={onEditComment || (() => {})}
                  onDeleteComment={onDeleteComment || (() => {})}
                />
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 13, color: '#5C675F', textAlign: 'center', py: 1.5 }}>
              No comments yet — be the first to reply.
            </Typography>
          )}
        </Box>
      )}
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
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [postId: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [postId: string]: number }>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);

  // Hydrate liked state from server (persists across refresh)
  useEffect(() => {
    if (!data?.searchPosts) return;
    const nextLiked: { [postId: string]: boolean } = {};
    const nextCounts: { [postId: string]: number } = {};
    const nextCommentCounts: { [postId: string]: number } = {};
    data.searchPosts.forEach((p: any) => {
      const id = String(p.id);
      if (p.isLiked) nextLiked[id] = true;
      nextCounts[id] = p.likeCount || 0;
      nextCommentCounts[id] = p.commentCount || 0;
    });
    setLikedPosts(prev => ({ ...nextLiked, ...prev }));
    setLikeCounts(prev => ({ ...nextCounts, ...prev }));
    setCommentCounts(prev => ({ ...nextCommentCounts, ...prev }));
  }, [data?.searchPosts]);

  const [likingPost, setLikingPost] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [unlikingPost, setUnlikingPost] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'profile'>('home');

  // Comments state
  const [commentsByPost, setCommentsByPost] = useState<{ [postId: string]: any[] }>({});
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({});
  const [likedComments, setLikedComments] = useState<{ [commentId: string]: boolean }>({});
  const [commentReactions, setCommentReactions] = useState<{ [commentId: string]: string }>({});
  const [commentLikeCounts, setCommentLikeCounts] = useState<{ [commentId: string]: number }>({});
  const [likingComment, setLikingComment] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
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
    variables: { userId: String(activeUserId || ''), limit: 8 },
    skip: !activeUserId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: ownProfileData, refetch: refetchOwnProfile } = useQuery(GET_USER_PROFILE, {
    variables: { id: String(activeUserId || '') },
    skip: !activeUserId,
    fetchPolicy: 'network-only',
    errorPolicy: 'ignore',
  });
  const ownProfile = ownProfileData?.user;
  const ownRatings = ownProfile?.ratings || [];
  const ownAvgRating =
    ownRatings.length > 0
      ? ownRatings.reduce((sum: number, r: any) => sum + (Number(r.ratingValue) || 0), 0) / ownRatings.length
      : 0;
  const ownFollowers = Number(ownProfile?.followersCount) || 0;
  const ownFollowing = Number(ownProfile?.followingCount) || 0;
  // Closest live proxy for “who engaged with your profile” until a views API exists.
  const profileViewsApprox = ownFollowers + ownRatings.length;

  const { data: notifData, refetch: refetchNotifs } = useQuery(GET_USER_NOTIFICATIONS, {
    variables: { userId: String(activeUserId || ''), page: 1, limit: 20 },
    skip: !activeUserId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000,
  });
  const [markNotificationRead] = useMutation(MARK_NOTIFICATION_READ);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const notifications = notifData?.userNotifications?.notifications || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const [followedSuggestedIds, setFollowedSuggestedIds] = useState<{ [userId: string]: boolean }>({});
  const [followingSuggestedId, setFollowingSuggestedId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [findFriendsOpen, setFindFriendsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDiscoverOpen, setMobileDiscoverOpen] = useState(false);
  // Ref to track currentUser without causing effect re-runs
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  // The user whose profile we are viewing from the feed
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const isMobile = useMediaQuery('(max-width:900px)');

  // Open messaging dock on Home (desktop) from /chat redirect or Profile DM
  useEffect(() => {
    const state = location.state as {
      openChat?: boolean;
      autoSelectRoomId?: string;
      openProfileId?: string;
      focusPostId?: number;
    } | null;
    if (!state) return;

    if (state.openProfileId) {
      setSelectedProfileId(String(state.openProfileId));
      setCurrentPage('profile');
      navigate('/home', { replace: true, state: {} });
      return;
    }

    if (state.focusPostId) {
      setCurrentPage('home');
      navigate('/home', { replace: true, state: {} });
      setTimeout(() => {
        const el = document.getElementById(`post-${state.focusPostId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
      return;
    }

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
  const [createComment] = useMutation(CREATE_COMMENT);
  const [likeComment] = useMutation(LIKE_COMMENT);
  const [unlikeComment] = useMutation(UNLIKE_COMMENT);
  const [updateCommentMutation] = useMutation(UPDATE_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);
  const [likePost] = useMutation(LIKE_POST);
  const [unlikePost] = useMutation(UNLIKE_POST);
  const [createPostMutation] = useMutation(CREATE_POST);
  const [updatePostMutation] = useMutation(UPDATE_POST);
  const [deletePostMutation] = useMutation(DELETE_POST);
  const [sharePostMutation] = useMutation(SHARE_POST);
  const [reportPostMutation] = useMutation(REPORT_POST);
  const [pinPostMutation] = useMutation(PIN_POST);
  const [unpinPostMutation] = useMutation(UNPIN_POST);
  const [followUserMutation] = useMutation(FOLLOW_USER);
  // Mention notifications are created server-side on createPost / createComment.

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
              query GetUser($id: String!) {
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

  // Refresh avatar/cover on Home after Profile photo upload (or return to Home)
  useEffect(() => {
    const refreshPhotos = (detail?: any) => {
      if (detail && typeof detail === 'object') {
        setCurrentUser((prev: any) => ({ ...(prev || {}), ...detail, id: String(detail.id || prev?.id || '') }));
      } else {
        const userData = getUserData();
        if (userData) setCurrentUser(userData);
      }
      if (activeUserId) {
        refetchOwnProfile?.({ fetchPolicy: 'network-only' });
        refetch?.();
      }
    };
    const onPhotosUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      refreshPhotos(detail);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshPhotos();
    };
    window.addEventListener('zpc:user-photos-updated', onPhotosUpdated as EventListener);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('zpc:user-photos-updated', onPhotosUpdated as EventListener);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [activeUserId, refetchOwnProfile, refetch]);

  // Memoized user data to prevent re-renders (using current user state)
  const currentUserData = useMemo(() => {
    if (!currentUser || !currentUser.id) return null;
    const first = ownProfile?.firstName || currentUser.firstName || '';
    const last = ownProfile?.lastName || currentUser.lastName || '';
    // Prefer auth/localStorage photos first — Profile uploads update those immediately,
    // while Apollo ownProfile can stay stale while Home stays mounted.
    const profileImage =
      (currentUser as any).profilePhotoSignedUrl ||
      currentUser.profilePhoto ||
      (authUser as any)?.profilePhotoSignedUrl ||
      (authUser as any)?.profilePhoto ||
      ownProfile?.profilePhotoSignedUrl ||
      ownProfile?.profilePhoto ||
      '';
    const coverImage =
      (currentUser as any).coverPhotoSignedUrl ||
      (currentUser as any).coverPhoto ||
      (authUser as any)?.coverPhotoSignedUrl ||
      (authUser as any)?.coverPhoto ||
      ownProfile?.coverPhotoSignedUrl ||
      (ownProfile as any)?.coverPhoto ||
      '';
    return {
      name: `${first} ${last}`.trim() || 'ZPC member',
      title: ownProfile?.role || currentUser.role || 'User',
      location: ownProfile?.address || currentUser.address || '',
      coverImage,
      profileImage,
      friendsCount: ownFollowers,
      postsCount: 0,
      rating: Number(ownAvgRating.toFixed(1)),
      totalReviews: ownRatings.length,
      isOnline: true,
    };
  }, [currentUser, ownProfile, ownFollowers, ownAvgRating, ownRatings.length, authUser]);

  // Memoized handlers to prevent re-renders
  const handleMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleProfileClick = useCallback(() => {
    // Open own profile explicitly
    const ownId = storedUser?.id ?? currentUser?.id;
    setSelectedProfileId(ownId != null ? String(ownId) : null);
    setCurrentPage('profile');
    handleClose();
  }, [handleClose, currentUser?.id]);

  const handleGoHome = useCallback(() => {
    setCurrentPage('home');
  }, []);

  const handleOpenProfile = useCallback((uid: string | number) => {
    setSelectedProfileId(String(uid));
    setCurrentPage('profile');
  }, []);

  const handleFollowSuggested = useCallback(async (followingId: string | number) => {
    const fid = String(followingId);
    if (!activeUserId || followedSuggestedIds[fid]) return;
    setFollowingSuggestedId(fid);
    try {
      await followUserMutation({
        variables: {
          userId: String(activeUserId),
          followingId: fid,
        },
      });
      setFollowedSuggestedIds(prev => ({ ...prev, [fid]: true }));
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

  const canAccessAdmin = useCallback(() => {
    const user = authUser || currentUser || storedUser;
    return isAdminRole(user?.role);
  }, [authUser, currentUser, storedUser]);

  const handleCreatePost = useCallback(async (postData: any) => {
    const user = currentUser || authUser || storedUser;
    if (!user?.id) {
      setCpError('You must be signed in to create a post.');
      return;
    }

    setCpError(null);
    setCpSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authorization token found. Please sign in again.');
      }

      // Upload media files to S3 using presigned URLs
      const uploadedMedia: { name: string; url: string; contentType: string }[] = [];

      if (postData.media && postData.media.length > 0) {
        for (const file of postData.media) {
          const qs = new URLSearchParams({
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
          }).toString();

          const presignRes = await fetch(`${API_GATEWAY_URL}/api/v1/uploads/presign-post-media?${qs}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!presignRes.ok) {
            const errorText = await presignRes.text();
            throw new Error(`Failed to get upload URL: ${presignRes.status} ${errorText}`);
          }

          const { url, publicUrl } = await presignRes.json();
          if (!url || !publicUrl) {
            throw new Error('Upload service returned an incomplete response.');
          }

          const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: file,
          });

          if (!putRes.ok) {
            const errorText = await putRes.text();
            throw new Error(`Failed to upload media: ${putRes.status} ${errorText}`);
          }

          uploadedMedia.push({
            name: file.name,
            url: publicUrl,
            contentType: file.type || 'application/octet-stream',
          });
        }
      }

      const { data, errors } = await createPostMutation({
        variables: {
          userId: parseInt(String(user.id), 10),
          title: postData.title,
          content: postData.content,
          visibility: postData.visibility || 'public',
          propertyType: postData.type,
          location: postData.location || '',
          price: 0,
          status: 'active',
          latitude: postData.latitude ?? null,
          longitude: postData.longitude ?? null,
          media:
            uploadedMedia.length > 0
              ? uploadedMedia.map((media, index) => ({
                  mediaType: media.contentType.startsWith('video/') ? 'video' : 'image',
                  mediaOrder: index + 1,
                  filePath: media.url,
                  fileName: media.name,
                  contentType: media.contentType,
                }))
              : null,
        },
        errorPolicy: 'all',
      });

      if (errors?.length && !data?.createPost?.success) {
        throw new Error(errors.map((e: any) => e.message).join('; ') || 'Failed to create post');
      }

      if (!data?.createPost?.success) {
        throw new Error(data?.createPost?.message || 'Failed to create post');
      }

      // Close immediately on success, then refresh feed
      setCreateOpen(false);
      setCpError(null);

      try {
        await refetch();
      } catch (refetchErr) {
        console.warn('Post created but feed refresh failed:', refetchErr);
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      const graphMsg =
        error?.graphQLErrors?.map((e: any) => e.message).filter(Boolean).join('; ') ||
        error?.networkError?.result?.errors?.map((e: any) => e.message).join('; ') ||
        error?.message ||
        'Failed to create post';
      setCpError(graphMsg);
    } finally {
      setCpSubmitting(false);
    }
  }, [currentUser, authUser, createPostMutation, refetch]);

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
          postId: String(editPost.id),
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

  const handleDeletePost = useCallback(async (postId: number | string) => {
    try {
      const { data: result } = await deletePostMutation({
        variables: { postId: String(postId) },
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

  const handleSharePost = useCallback(async (postId: number | string) => {
    if (!activeUserId) {
      window.alert('Please sign in to share posts.');
      return;
    }
    try {
      const { data: result } = await sharePostMutation({
        variables: {
          postId: String(postId),
          sharedBy: String(activeUserId),
          shareType: 'SHARE',
          visibility: 'PUBLIC',
        },
      });
      if (result?.sharePost?.success) {
        window.alert('Post shared to your activity.');
        await refetch();
      } else {
        window.alert(result?.sharePost?.message || 'Could not share post');
      }
    } catch (err) {
      console.error('Error sharing post:', err);
      window.alert('Could not share post');
    }
  }, [activeUserId, sharePostMutation, refetch]);

  const handleReportPost = useCallback(async (post: any) => {
    if (!activeUserId) {
      window.alert('Please sign in to report posts.');
      return;
    }
    if (String(post.userId) === String(activeUserId)) return;
    const reason = window.prompt('Why are you reporting this post? (spam, abuse, fake, other)', 'spam');
    if (reason == null) return;
    const description = window.prompt('Optional details') || '';
    try {
      const { data: result } = await reportPostMutation({
        variables: {
          postId: String(post.id),
          reportedBy: String(activeUserId),
          reportedUserId: String(post.userId || ''),
          reasonCode: (reason || 'OTHER').trim().toUpperCase().replace(/\s+/g, '_'),
          description: description.trim(),
        },
      });
      if (result?.reportPost?.success) {
        window.alert('Thanks — your report was submitted.');
      } else {
        window.alert(result?.reportPost?.message || 'Could not submit report');
      }
    } catch (err) {
      console.error('Error reporting post:', err);
      window.alert('Could not submit report');
    }
  }, [activeUserId, reportPostMutation]);

  const handlePinPost = useCallback(async (postId: number | string, pin: boolean) => {
    if (!activeUserId) return;
    try {
      const mutation = pin ? pinPostMutation : unpinPostMutation;
      const key = pin ? 'pinPost' : 'unpinPost';
      const { data: result } = await mutation({
        variables: { postId: String(postId), userId: String(activeUserId) },
      });
      if (result?.[key]?.success) {
        await refetch();
      } else {
        window.alert(result?.[key]?.message || `Could not ${pin ? 'pin' : 'unpin'} post`);
      }
    } catch (err) {
      console.error('Error pinning post:', err);
      window.alert(`Could not ${pin ? 'pin' : 'unpin'} post`);
    }
  }, [activeUserId, pinPostMutation, unpinPostMutation, refetch]);

  const handleLikeToggle = useCallback(async (postId: number | string) => {
    if (!currentUser?.id) return;

    const pid = String(postId);
    const uid = String(currentUser.id);
    const isCurrentlyLiked = !!likedPosts[pid] || !!likedPosts[postId as any];
    const currentLikeCount =
      likeCounts[pid] !== undefined
        ? likeCounts[pid]
        : likeCounts[postId as any] !== undefined
          ? likeCounts[postId as any]
          : (data?.searchPosts?.find((p: any) => String(p.id) === pid)?.likeCount || 0);

    try {
      // Optimistic update
      setLikedPosts(prev => ({ ...prev, [pid]: !isCurrentlyLiked }));
      setLikeCounts(prev => ({
        ...prev,
        [pid]: isCurrentlyLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1,
      }));

      if (isCurrentlyLiked) {
        const { data: result } = await unlikePost({
          variables: { postId: pid, userId: uid },
        });

        if (result?.unlikePost?.success) {
          setLikeCounts(prev => ({
            ...prev,
            [pid]: result.unlikePost.post?.likeCount ?? Math.max(0, currentLikeCount - 1),
          }));
        } else {
          setLikedPosts(prev => ({ ...prev, [pid]: isCurrentlyLiked }));
          setLikeCounts(prev => ({ ...prev, [pid]: currentLikeCount }));
        }
      } else {
        const { data: result } = await likePost({
          variables: { postId: pid, userId: uid },
        });

        if (result?.likePost?.success) {
          setLikeCounts(prev => ({
            ...prev,
            [pid]: result.likePost.post?.likeCount ?? currentLikeCount + 1,
          }));
        } else {
          setLikedPosts(prev => ({ ...prev, [pid]: isCurrentlyLiked }));
          setLikeCounts(prev => ({ ...prev, [pid]: currentLikeCount }));
        }
      }
    } catch (error) {
      console.error('Error toggling post like:', error);
      setLikedPosts(prev => ({ ...prev, [pid]: isCurrentlyLiked }));
      setLikeCounts(prev => ({ ...prev, [pid]: currentLikeCount }));
    }
  }, [currentUser, likedPosts, likeCounts, data, likePost, unlikePost]);

  const closeInlineComments = useCallback(() => {
    setExpandedCommentsPostId(null);
    setCommentsError(null);
    setReplyingCommentId(null);
    setReplyText('');
    if (commentsRefreshTimerRef.current) {
      clearInterval(commentsRefreshTimerRef.current);
      commentsRefreshTimerRef.current = null;
    }
  }, []);

  const handleCommentClick = useCallback(async (postId: number | string) => {
    const pid = String(postId);
    // Toggle: same post closes; another post opens that one only
    if (expandedCommentsPostId === pid) {
      closeInlineComments();
      return;
    }

    setExpandedCommentsPostId(pid);
    setCommentsError(null);
    setReplyingCommentId(null);
    setReplyText('');
    setLoadingComments(prev => ({ ...prev, [pid]: true }));

    try {
      const { data: commentsData, error } = await client.query({
        query: GET_POST_COMMENTS,
        variables: { postId: pid, page: 1, limit: 50 },
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      });

      if (error) {
        setCommentsError(error.message || 'Failed to load comments');
      }
      if (commentsData?.postComments) {
        setCommentsByPost(prev => ({ ...prev, [pid]: commentsData.postComments }));
        setCommentCounts(prev => ({ ...prev, [pid]: commentsData.postComments.length }));
        setCommentsError(null);
      } else if (!error) {
        setCommentsByPost(prev => ({ ...prev, [pid]: [] }));
      }
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      setCommentsError(error?.message || 'Failed to load comments. Is the API gateway running?');
    } finally {
      setLoadingComments(prev => ({ ...prev, [pid]: false }));
    }

    if (commentsRefreshTimerRef.current) {
      clearInterval(commentsRefreshTimerRef.current);
    }
    commentsRefreshTimerRef.current = setInterval(async () => {
      try {
        const { data: commentsData } = await client.query({
          query: GET_POST_COMMENTS,
          variables: { postId: pid, page: 1, limit: 50 },
          fetchPolicy: 'network-only',
        });
        if (commentsData?.postComments) {
          setCommentsByPost(prev => ({ ...prev, [pid]: commentsData.postComments }));
          setCommentCounts(prev => ({ ...prev, [pid]: commentsData.postComments.length }));
        }
      } catch (error) {
        console.error('Comments auto-refresh failed:', error);
      }
    }, 5000);
  }, [client, expandedCommentsPostId, closeInlineComments]);

  const handleAddComment = useCallback(async (postId: number | string, commentText: string, parentCommentId?: number | string) => {
    if (!currentUser?.id || !commentText.trim()) return;

    try {
      const { data: result } = await createComment({
        variables: {
          postId: String(postId),
          userId: String(currentUser.id),
          comment: commentText,
          parentCommentId: parentCommentId != null ? String(parentCommentId) : null
        }
      });

      if (result?.createComment?.success) {
        // Refresh comments for this post
        const pid = String(postId);
        const { data: commentsData } = await client.query({
          query: GET_POST_COMMENTS,
          variables: { postId: pid, page: 1, limit: 50 },
          fetchPolicy: 'network-only',
        });

        if (commentsData?.postComments) {
          setCommentsByPost(prev => ({ ...prev, [pid]: commentsData.postComments }));
        }

        // Bump count for top-level comments
        if (!parentCommentId) {
          setCommentCounts(prev => {
            const current = prev[pid] !== undefined
              ? prev[pid]
              : (data?.searchPosts?.find((p: any) => String(p.id) === pid)?.commentCount || 0);
            return { ...prev, [pid]: current + 1 };
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

  const refreshPostComments = useCallback(async (postId: number | string) => {
    const { data: commentsData } = await client.query({
      query: GET_POST_COMMENTS,
      variables: { postId: String(postId), page: 1, limit: 50 },
      fetchPolicy: 'network-only',
    });
    if (commentsData?.postComments) {
      setCommentsByPost(prev => ({ ...prev, [postId]: commentsData.postComments }));
    }
  }, [client]);

  const handleReactComment = useCallback(async (commentId: number | string, emoji: string) => {
    if (!currentUser?.id) return;
    const userId = String(currentUser.id);
    const cid = String(commentId);
    const current = normalizeReactionEmoji(commentReactions[cid] || commentReactions[commentId as any]) || ((likedComments[cid] || likedComments[commentId as any]) ? '❤️' : null);
    const same = current === emoji;

    setLikingComment(true);
    try {
      if (same) {
        const { data: result } = await unlikeComment({ variables: { commentId: cid, userId } });
        if (result?.unlikeComment?.success) {
          setLikedComments(prev => ({ ...prev, [cid]: false }));
          setCommentReactions(prev => {
            const next = { ...prev };
            delete next[cid];
            return next;
          });
          setCommentLikeCounts(prev => ({
            ...prev,
            [cid]: result.unlikeComment.comment?.likeCount ?? Math.max(0, (prev[cid] || 1) - 1),
          }));
        }
      } else {
        const { data: result } = await likeComment({
          variables: { commentId: cid, userId, reactionType: emoji },
        });
        if (result?.likeComment?.success) {
          const wasLiked = Boolean(current);
          setLikedComments(prev => ({ ...prev, [cid]: true }));
          setCommentReactions(prev => ({ ...prev, [cid]: emoji }));
          setCommentLikeCounts(prev => ({
            ...prev,
            [cid]: result.likeComment.comment?.likeCount ?? (prev[cid] || 0) + (wasLiked ? 0 : 1),
          }));
        }
      }
    } catch (error) {
      console.error('Error reacting to comment:', error);
    } finally {
      setLikingComment(false);
    }
  }, [currentUser, commentReactions, likedComments, likeComment, unlikeComment]);

  const handleEditComment = useCallback(async (commentId: number | string, text: string) => {
    try {
      const { data: result } = await updateCommentMutation({
        variables: { commentId: String(commentId), comment: text },
      });
      if (result?.updateComment?.success) {
        const postId = expandedCommentsPostId;
        if (postId) await refreshPostComments(postId);
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  }, [updateCommentMutation, expandedCommentsPostId, refreshPostComments]);

  const handleDeleteComment = useCallback(async (commentId: number | string) => {
    if (!window.confirm('Delete this comment?')) return;
    const postId = expandedCommentsPostId;
    const existing = postId ? commentsByPost[postId] : null;
    const wasTopLevel = Boolean(existing?.some((c: any) => String(c.id) === String(commentId)));
    try {
      const { data: result } = await deleteCommentMutation({
        variables: { commentId: String(commentId) },
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
  }, [deleteCommentMutation, expandedCommentsPostId, commentsByPost, refreshPostComments]);


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

  // Memoized current post for modal (prefer snapshot captured on open)

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
          userId={String(selectedProfileId)}
          currentUserId={authUserId != null ? String(authUserId) : undefined}
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
        position: 'relative',
        minHeight: '100vh',
        ...interFont,
        ...PAGE_ATMOSPHERE,
      }}
    >
      <AdminBackground />
      {/* LinkedIn-style top bar — ZPC cream glass */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          ...MATTE_SURFACE,
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          zIndex: 1201,
          color: '#16302A',
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1320,
            width: '100%',
            mx: 'auto',
            px: { xs: 1, sm: 2 },
            minHeight: { xs: 52, sm: 56 },
            gap: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: { xs: 1, md: '0 0 auto' } }}>
            {isMobile && (
              <IconButton edge="start" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)} size="small" sx={{ color: '#16302A' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box title="ZPC" sx={{ display: 'flex', alignItems: 'center' }}>
              <ZpcLogoMark size={isMobile ? 40 : 46} showTagline={false} animateStroke />
            </Box>
            {!isMobile && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  bgcolor: 'rgba(22,48,42,0.06)',
                  px: 1.25,
                  py: 0.55,
                  borderRadius: 1,
                  width: 280,
                  border: '1px solid rgba(22,48,42,0.1)',
                }}
              >
                <SearchIcon sx={{ color: '#5C675F', fontSize: 18 }} />
                <InputBase
                  placeholder="Search people, properties, posts"
                  fullWidth
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const q = searchDraft.trim();
                      navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
                    }
                  }}
                  sx={{ fontSize: 14, color: '#16302A', ...interFont, '& input': { py: 0.25 } }}
                />
              </Box>
            )}
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 0.15, flex: 1, justifyContent: 'center', maxWidth: 720, minWidth: 0 }}>
              {leftNav.map((item) => {
                const active = item.label === 'Home';
                return (
                  <Box
                    key={item.label}
                    onClick={() => {
                      if (item.label === 'Home') window.scrollTo({ top: 0, behavior: 'smooth' });
                      else if (item.label === 'My Network') {
                        setFindFriendsOpen(true);
                        refetchSuggested();
                      } else if (item.href) window.location.href = item.href;
                    }}
                    title={item.label}
                    sx={{
                      flex: 1,
                      minWidth: 64,
                      maxWidth: 110,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.15,
                      py: 0.55,
                      px: 0.35,
                      cursor: 'pointer',
                      color: active ? '#16302A' : '#5C675F',
                      borderBottom: active ? '2px solid #16302A' : '2px solid transparent',
                      '&:hover': { color: '#16302A', bgcolor: 'rgba(22,48,42,0.04)' },
                      '& .MuiSvgIcon-root': { fontSize: 22 },
                    }}
                  >
                    {item.icon}
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        fontWeight: active ? 700 : 500,
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        px: 0.25,
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
            {!isMobile && (
              <>
                <IconButton
                  size="small"
                  aria-label="Messages"
                  onClick={() => setChatOpen(true)}
                  sx={{ color: '#16302A' }}
                >
                  <MessageIcon sx={{ fontSize: 24 }} />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Notifications"
                  onClick={(e) => setNotifAnchor(e.currentTarget)}
                  sx={{ color: '#16302A' }}
                >
                  <Badge badgeContent={unreadCount} color="error" max={9}>
                    <NotificationsIcon sx={{ fontSize: 24 }} />
                  </Badge>
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Find friends"
                  onClick={() => {
                    setFindFriendsOpen(true);
                    refetchSuggested();
                  }}
                  sx={{ color: '#16302A' }}
                >
                  <PersonAddIcon sx={{ fontSize: 24 }} />
                </IconButton>
              </>
            )}
            {isMobile && (
              <>
                <IconButton size="small" onClick={() => navigate('/chat')} sx={{ color: '#16302A' }}>
                  <MessageIcon />
                </IconButton>
                <IconButton size="small" onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: '#16302A' }}>
                  <Badge badgeContent={unreadCount} color="error" max={9}>
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Find friends"
                  onClick={() => {
                    setFindFriendsOpen(true);
                    refetchSuggested();
                  }}
                  sx={{ color: '#16302A' }}
                >
                  <PersonAddIcon />
                </IconButton>
                <IconButton size="small" onClick={() => setMobileDiscoverOpen(true)} sx={{ color: '#16302A' }}>
                  <WhatshotIcon />
                </IconButton>
              </>
            )}
            <Box
              onClick={handleMenu}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                px: 1,
                py: 0.35,
                borderRadius: 1,
                '&:hover': { bgcolor: 'rgba(22,48,42,0.05)' },
              }}
            >
              <Avatar src={currentUserData?.profileImage || ''} sx={{ width: 28, height: 28 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', color: '#5C675F', mt: 0.15 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>Me</Typography>
                <ArrowDropDownIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={() => setNotifAnchor(null)}
              PaperProps={{
                sx: {
                  width: { xs: 'min(380px, calc(100vw - 20px))', sm: 380 },
                  maxHeight: 460,
                  borderRadius: CARD_RADIUS,
                  overflow: 'hidden',
                  ...MATTE_SURFACE,
                  p: 0.5,
                },
              }}
              MenuListProps={{ sx: { p: 0 } }}
            >
              <Box sx={{ px: 0.5, py: 0.5 }}>
                <NotificationsPanel
                  key={notifAnchor ? 'notif-open' : 'notif-closed'}
                  notifications={notifications}
                  onSelect={async (n) => {
                    if (!n.read && activeUserId) {
                      try {
                        await markNotificationRead({
                          variables: {
                            notificationId: String(n.id),
                            userId: String(activeUserId),
                          },
                        });
                        refetchNotifs();
                      } catch (err) {
                        console.warn('markNotificationRead failed', err);
                      }
                    }
                    setNotifAnchor(null);
                  }}
                />
              </Box>
            </Menu>
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
              {canAccessAdmin() && (
                <MenuItem onClick={() => { handleClose(); window.location.href = '/admin'; }}>
                  Admin
                </MenuItem>
              )}
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

        {isMobile && (
          <Box sx={{ px: 1.5, pb: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'rgba(22,48,42,0.06)',
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
                border: '1px solid rgba(22,48,42,0.1)',
              }}
            >
              <SearchIcon sx={{ color: '#5C675F', fontSize: 18 }} />
              <InputBase
                placeholder="Search people, properties, posts"
                fullWidth
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = searchDraft.trim();
                    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
                  }
                }}
                sx={{ fontSize: 14, ...interFont }}
              />
            </Box>
          </Box>
        )}
      </AppBar>

      {/* LinkedIn-like 3-column shell */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1320,
          mx: 'auto',
          pt: { xs: isMobile ? 14 : 9, sm: 9 },
          px: { xs: 0, sm: 2 },
          pb: 4,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '225px minmax(0, 700px) 300px',
          },
          gap: { xs: 0, md: 1.5 },
          alignItems: 'start',
          justifyContent: 'center',
        }}
      >
        {/* Left: mini profile + ratings / views */}
        {!isMobile && (
          <Box sx={{ position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, overflow: 'hidden', p: 0 }}>
              <Box
                key={currentUserData?.coverImage || 'no-cover'}
                sx={{
                  height: 56,
                  backgroundImage: currentUserData?.coverImage
                    ? `url(${currentUserData.coverImage})`
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  bgcolor: 'rgba(22,48,42,0.35)',
                }}
              />
              <Box sx={{ px: 1.5, pb: 1.5, mt: -3.5 }}>
                <Avatar
                  src={currentUserData?.profileImage || ''}
                  onClick={handleProfileClick}
                  sx={{
                    width: 72,
                    height: 72,
                    border: '3px solid #EBE6D4',
                    cursor: 'pointer',
                    mb: 1,
                    boxShadow: '0 2px 8px rgba(10,18,16,0.15)',
                  }}
                >
                  {nameInitials(currentUserData?.name || 'Z')}
                </Avatar>
                <Typography
                  onClick={handleProfileClick}
                  sx={{
                    fontWeight: 750,
                    fontSize: 15,
                    color: '#16302A',
                    cursor: 'pointer',
                    lineHeight: 1.25,
                    ...displayFont,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {currentUserData?.name || 'ZPC member'}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#5C675F', mt: 0.35, lineHeight: 1.35 }}>
                  {currentUserData?.title || 'Member'}
                </Typography>
                {!!currentUserData?.location && (
                  <Typography sx={{ fontSize: 11.5, color: '#7A847C', mt: 0.5 }}>
                    {currentUserData.location}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.25 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 750, color: '#16302A', mb: 1, ...interFont }}>
                Ratings & profile
              </Typography>

              <Box
                onClick={handleProfileClick}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.85,
                  px: 0.5,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(22,48,42,0.06)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VisibilityOutlinedIcon sx={{ fontSize: 18, color: '#5C675F' }} />
                  <Typography sx={{ fontSize: 13, color: '#3A4540', fontWeight: 500 }}>
                    Profile views
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 750, color: '#16302A' }}>
                  {profileViewsApprox}
                </Typography>
              </Box>

              <Box
                onClick={handleProfileClick}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.85,
                  px: 0.5,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(22,48,42,0.06)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarRoundedIcon sx={{ fontSize: 18, color: '#B8860B' }} />
                  <Typography sx={{ fontSize: 13, color: '#3A4540', fontWeight: 500 }}>
                    Rating
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 750, color: '#16302A' }}>
                  {ownRatings.length > 0 ? `${ownAvgRating.toFixed(1)} ★` : '—'}
                </Typography>
              </Box>

              <Divider sx={{ my: 0.75, borderColor: 'rgba(22,48,42,0.1)' }} />

              <Box
                onClick={handleProfileClick}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 0.65,
                  px: 0.5,
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(22,48,42,0.06)' },
                }}
              >
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>Reviews</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#16302A' }}>
                  {ownRatings.length}
                </Typography>
              </Box>
              <Box
                onClick={handleProfileClick}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 0.65,
                  px: 0.5,
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(22,48,42,0.06)' },
                }}
              >
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>Followers</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#16302A' }}>
                  {ownFollowers}
                </Typography>
              </Box>
              <Box
                onClick={handleProfileClick}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 0.65,
                  px: 0.5,
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(22,48,42,0.06)' },
                }}
              >
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>Following</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#16302A' }}>
                  {ownFollowing}
                </Typography>
              </Box>

              <Button
                fullWidth
                onClick={handleProfileClick}
                sx={{
                  mt: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#16302A',
                  border: '1px solid rgba(22,48,42,0.18)',
                  bgcolor: 'rgba(235,230,212,0.45)',
                  borderRadius: 1,
                  py: 0.7,
                  '&:hover': { bgcolor: 'rgba(235,230,212,0.8)' },
                }}
              >
                View my profile
              </Button>
            </Box>
          </Box>
        )}

        {/* Center feed */}
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Box
            sx={{
              mb: 1.25,
              mx: { xs: 1.25, md: 0 },
              ...MATTE_POST_SX,
              borderRadius: CARD_RADIUS,
              p: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Avatar src={currentUserData?.profileImage || ''} sx={{ width: 48, height: 48 }} />
              <Box
                onClick={() => {
                  setCpError(null);
                  setCreateOpen(true);
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  border: '1px solid rgba(22,48,42,0.18)',
                  bgcolor: 'rgba(235,230,212,0.55)',
                  px: 2,
                  py: 1.15,
                  borderRadius: 999,
                  cursor: 'pointer',
                  color: '#5C675F',
                  transition: 'background 0.15s, border-color 0.15s',
                  '&:hover': {
                    bgcolor: 'rgba(235,230,212,0.85)',
                    borderColor: 'rgba(22,48,42,0.28)',
                    color: '#16302A',
                  },
                }}
              >
                <Typography sx={{ fontSize: 14.5, fontWeight: 500, ...interFont }}>
                  Start a post
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                mt: 1,
                pt: 0.5,
              }}
            >
              {[
                { label: 'Video', icon: <VideocamOutlinedIcon sx={{ color: '#5F8670' }} />, color: '#5F8670' },
                { label: 'Photo', icon: <PhotoCameraOutlinedIcon sx={{ color: '#3A6B8C' }} />, color: '#3A6B8C' },
                { label: 'Write article', icon: <ArticleOutlinedIcon sx={{ color: '#A67C52' }} />, color: '#A67C52' },
              ].map((action) => (
                <Button
                  key={action.label}
                  onClick={() => {
                    setCpError(null);
                    setCreateOpen(true);
                  }}
                  startIcon={action.icon}
                  sx={{
                    textTransform: 'none',
                    color: '#3A4540',
                    fontWeight: 650,
                    fontSize: 13,
                    borderRadius: 1,
                    px: 1.25,
                    py: 0.85,
                    flex: 1,
                    '&:hover': { bgcolor: 'rgba(22,48,42,0.06)' },
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Box>

          {loading && !data ? (
            <Stack spacing={1.25} sx={{ mx: { xs: 1.25, md: 0 } }}>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </Stack>
          ) : error ? (
            <Box sx={{ textAlign: 'center', mt: 4, px: 2 }}>
              <Typography color="error" sx={{ fontWeight: 600, mb: 1 }}>
                Error loading posts
              </Typography>
              <Typography sx={{ color: '#16302A', fontSize: 14, wordBreak: 'break-word' }}>
                {error.message}
              </Typography>
              <Button variant="outlined" size="small" sx={{ mt: 2, textTransform: 'none' }} onClick={() => refetch()}>
                Retry
              </Button>
            </Box>
          ) : (
            <Stack spacing={1.25} sx={{ mx: { xs: 1.25, md: 0 } }}>
              {data?.searchPosts?.map((post: any) => {
                const pid = String(post.id);
                const isOpen = expandedCommentsPostId === pid;
                return (
                <Post
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentClick={handleCommentClick}
                  onOpenProfile={handleOpenProfile}
                  onEditPost={handleEditPost}
                  onDeletePost={handleDeletePost}
                  onSharePost={handleSharePost}
                  onReportPost={handleReportPost}
                  onPinPost={handlePinPost}
                  viewerProfilePhoto={currentUserData?.profileImage || null}
                  currentUserId={activeUserId}
                  likedPosts={likedPosts}
                  likeCounts={likeCounts}
                  commentCounts={commentCounts}
                  commentsOpen={isOpen}
                  comments={commentsByPost[pid] || []}
                  loadingComments={!!loadingComments[pid]}
                  commentsError={isOpen ? commentsError : null}
                  onAddComment={handleAddComment}
                  onReactComment={handleReactComment}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                  likedComments={likedComments}
                  commentReactions={commentReactions}
                  commentLikeCounts={commentLikeCounts}
                  likingComment={likingComment}
                  replyingCommentId={replyingCommentId != null ? String(replyingCommentId) : null}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  setReplyingCommentId={(id) => setReplyingCommentId(id as any)}
                />
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Right rail */}
        {!isMobile && (
          <Box sx={{ position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>
              <Typography sx={{ fontWeight: 750, mb: 1.25, color: '#16302A', fontSize: 15, ...displayFont }}>
                ZPC News
              </Typography>
              {trendingLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
              ) : (
                <Stack spacing={1.1}>
                  {(trendingData?.trendingPosts ?? []).map((trend: any) => (
                    <Box
                      key={trend.id}
                      onClick={() => handleTrendingPostClick(trend.id)}
                      sx={{
                        cursor: 'pointer',
                        py: 0.35,
                        '&:hover .trend-title': { color: '#0F221C', textDecoration: 'underline' },
                      }}
                    >
                      <Typography className="trend-title" sx={{ color: '#16302A', fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>
                        {trend.title}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: '#7A847C', mt: 0.25 }}>
                        {trend.likeCount || 0} likes · Trending
                      </Typography>
                    </Box>
                  ))}
                  {(trendingData?.trendingPosts ?? []).length === 0 && (
                    <Typography sx={{ fontSize: 13, color: '#5C675F' }}>No trending posts yet</Typography>
                  )}
                </Stack>
              )}
            </Box>

            <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>
              <Typography sx={{ fontWeight: 750, mb: 1.25, color: '#16302A', fontSize: 15, ...displayFont }}>
                People you may know
              </Typography>
              {suggestedLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
              ) : (
                <Stack spacing={1.25}>
                  {(suggestedData?.suggestedUsers ?? []).slice(0, 5).map((friend: any) => (
                    <Box key={friend.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.1 }}>
                      <Avatar
                        src={friend.profilePhotoSignedUrl || friend.profilePhoto || undefined}
                        sx={{ width: 40, height: 40, cursor: 'pointer' }}
                        onClick={() => handleOpenProfile(String(friend.id))}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: 13.5, cursor: 'pointer', color: '#16302A' }}
                          onClick={() => handleOpenProfile(String(friend.id))}
                        >
                          {friend.firstName} {friend.lastName}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: '#5C675F', mb: 0.6 }} noWrap>
                          {friend.role || 'User'}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={followedSuggestedIds[String(friend.id)] || followingSuggestedId === String(friend.id)}
                          onClick={() => handleFollowSuggested(String(friend.id))}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 650,
                            borderRadius: 999,
                            borderColor: '#16302A',
                            color: followedSuggestedIds[String(friend.id)] ? '#5C675F' : '#16302A',
                            py: 0.15,
                            px: 1.25,
                            fontSize: 12,
                          }}
                        >
                          {followedSuggestedIds[String(friend.id)] ? 'Following' : followingSuggestedId === String(friend.id) ? '...' : 'Connect'}
                        </Button>
                      </Box>
                    </Box>
                  ))}
                  {(suggestedData?.suggestedUsers ?? []).length === 0 && (
                    <Typography sx={{ fontSize: 13, color: '#5C675F' }}>No suggestions right now</Typography>
                  )}
                </Stack>
              )}
            </Box>

            <Typography sx={{ px: 1, fontSize: 11, color: 'rgba(22,48,42,0.55)', lineHeight: 1.5 }}>
              About · Help · Privacy · Terms
              <br />
              ZPC © {new Date().getFullYear()}
            </Typography>
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
          <Box sx={{ mb: 0.75 }}>
            <ZpcLogoMark size={72} showTagline={false} animateStroke={false} />
          </Box>
          <Typography sx={{ fontSize: 13, color: '#16302A', mb: 2 }}>Menu</Typography>
          <Stack spacing={0.5}>
            {leftNav.map((item, idx) => (
              <Box
                key={idx}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (item.label === 'Home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else if (item.label === 'My Network') {
                    setFindFriendsOpen(true);
                    refetchSuggested();
                  } else if (item.href) {
                    window.location.href = item.href;
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
                  color: '#16302A',
                  fontSize: 15,
                  '&:active': { bgcolor: 'rgba(22,48,42,0.1)' },
                }}
              >
                <Box sx={{ color: '#16302A', display: 'flex' }}>{item.icon}</Box>
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
          <Typography sx={{ fontWeight: 800, color: '#16302A', fontSize: '1.1rem', mb: 2, ...interFont }}>
            Discover
          </Typography>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25, color: '#16302A', ...interFont }}>
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
                      undefined
                    }
                    sx={{ width: 40, height: 40, cursor: 'pointer' }}
                    onClick={() => {
                      setMobileDiscoverOpen(false);
                      handleOpenProfile(String(friend.id));
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                      onClick={() => {
                        setMobileDiscoverOpen(false);
                        handleOpenProfile(String(friend.id));
                      }}
                    >
                      {friend.firstName} {friend.lastName}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 12, color: '#16302A' }}>
                      {friend.role || 'User'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={followedSuggestedIds[String(friend.id)] ? 'outlined' : 'contained'}
                    disabled={followedSuggestedIds[String(friend.id)] || followingSuggestedId === String(friend.id)}
                    onClick={() => handleFollowSuggested(String(friend.id))}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      minWidth: 72,
                      bgcolor: followedSuggestedIds[String(friend.id)] ? 'transparent' : '#16302A',
                    }}
                  >
                    {followedSuggestedIds[String(friend.id)]
                      ? 'Following'
                      : followingSuggestedId === String(friend.id)
                        ? '...'
                        : 'Follow'}
                  </Button>
                </Box>
              ))}
              {(suggestedData?.suggestedUsers ?? []).length === 0 && (
                <Typography sx={{ fontSize: 13, color: '#16302A' }}>No suggestions right now</Typography>
              )}
            </Stack>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25, color: '#16302A', ...interFont }}>
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
                    '&:active': { bgcolor: 'rgba(235,230,212,0.65)' },
                  }}
                  onClick={() => {
                    setMobileDiscoverOpen(false);
                    handleTrendingPostClick(trend.id);
                  }}
                >
                  <Typography sx={{ color: '#16302A', fontWeight: 600, fontSize: 14, pr: 0.5 }}>
                    {trend.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#16302A',
                      fontWeight: 500,
                      bgcolor: 'rgba(95,134,112,0.22)',
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
                <Typography sx={{ fontSize: 13, color: '#16302A' }}>No trending posts yet</Typography>
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
        <DialogTitle sx={{ fontWeight: 700, color: '#16302A', pb: 1, ...interFont }}>
          People you may know
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
          {suggestedLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (suggestedData?.suggestedUsers ?? []).length === 0 ? (
            <Typography sx={{ fontSize: 14, color: '#16302A', textAlign: 'center', py: 3 }}>
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
                      undefined
                    }
                    sx={{ width: 44, height: 44, cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => {
                      setFindFriendsOpen(false);
                      handleOpenProfile(String(friend.id));
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{ fontWeight: 600, fontSize: 15, cursor: 'pointer', ...interFont }}
                      noWrap
                      onClick={() => {
                        setFindFriendsOpen(false);
                        handleOpenProfile(String(friend.id));
                      }}
                    >
                      {friend.firstName} {friend.lastName}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#16302A' }} noWrap>
                      {friend.role || 'User'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={followedSuggestedIds[String(friend.id)] ? 'outlined' : 'contained'}
                    disabled={followedSuggestedIds[String(friend.id)] || followingSuggestedId === String(friend.id)}
                    onClick={() => handleFollowSuggested(String(friend.id))}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      minWidth: 84,
                      flexShrink: 0,
                      bgcolor: followedSuggestedIds[String(friend.id)] ? 'transparent' : '#16302A',
                    }}
                  >
                    {followedSuggestedIds[String(friend.id)]
                      ? 'Following'
                      : followingSuggestedId === String(friend.id)
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

      {/* Create Post Modal */}
      <CreatePost
        open={createOpen}
        onClose={() => {
          if (!cpSubmitting) {
            setCreateOpen(false);
            setCpError(null);
          }
        }}
        onSubmit={handleCreatePost}
        loading={cpSubmitting}
        error={cpError}
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