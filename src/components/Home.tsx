import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { gql, useQuery, useMutation } from '@apollo/client';
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
  TextField,
} from '@mui/material';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EventIcon from '@mui/icons-material/Event';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ProfilePage from './ProfilePage';
import LocationAutocomplete from './LocationAutocomplete';
import { PostService } from '../services/postService';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const SEARCH_POSTS_QUERY = gql`
query SearchPosts($page: Int, $limit: Int) {
  searchPosts(page: $page, limit: $limit) {
    id
    userId
    userFirstName
    userLastName
    userRole
    title
    content
    visibility
    propertyType
    location
    latitude
    longitude
    price
    status
    createdAt
    likeCount
    commentCount
    media {
      id
      mediaType
      mediaUrl
      mediaOrder
      mediaSize
      caption
      uploadedAt
    }
  }
}
`;

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
      likeCount
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
      likeCount
    }
  }
}
`;

const LIKE_COMMENT_MUTATION = gql`
mutation LikeComment($commentId: Int!, $userId: Int!) {
  likeComment(commentId: $commentId, userId: $userId) {
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

// Get user data dynamically to handle login state changes
const getUserData = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const storedUser = getUserData();
const userId = storedUser?.id;
const interFont = {
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

const leftNav = [
  { icon: <HomeIcon />, label: 'Home' },
  { icon: <PeopleIcon />, label: 'Friends' },
  { icon: <GroupIcon />, label: 'Groups' },
  { icon: <StorefrontIcon />, label: 'Marketplace' },
  { icon: <EventIcon />, label: 'Events' },
];

const friendSuggestions = [
  { name: 'Mike Wilson', info: '3 mutual friends', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { name: 'Emma Davis', info: '1 mutual friend', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
];

const trendingTopics = [
  { topic: '#TechTrends2024', posts: '15.2K posts' },
  { topic: '#Photography', posts: '8.7K posts' },
  { topic: '#Travel', posts: '12.1K posts' },
];

// Memoized Post component to prevent unnecessary re-renders
const Post = memo(({ post, onLikeToggle, onCommentClick, likedPosts, likeCounts, likingPost, unlikingPost }: any) => {
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  return (
    <Box sx={{
      bgcolor: '#fff',
      borderRadius: 4,
      boxShadow: '0 2px 16px rgba(37,99,235,0.10)',
      p: 3,
      transition: 'box-shadow 0.2s, transform 0.2s',
      '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Avatar src={post.profilePhoto || `https://randomuser.me/api/portraits/lego/${post.userId % 10}.jpg`} sx={{ mr: 2, width: 44, height: 44, boxShadow: 1 }} />
        <Box>
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
      </Box>
      <Typography sx={{ color: '#2563EB', fontWeight: 700, fontSize: 17, mb: 1 }}>{post.title}</Typography>
      <Typography sx={{ color: '#374151', fontSize: 16, mb: 2 }}>{post.content}</Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 1 }}>
        <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(37,99,235,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Location: {post.location}</Typography>
        <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(99,102,241,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Type: {post.propertyType}</Typography>
        <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(239,68,68,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Price: ₹{post.price}</Typography>
      </Box>
      {post.media?.length > 0 && post.media[0].mediaType === 'image' && (
        <Box sx={{ mb: 2 }}>
          <img
            src={post.media[0].mediaUrl}
            alt={post.media[0].caption || 'Post media'}
            style={{ width: '100%', borderRadius: 12, maxHeight: 340, objectFit: 'cover', boxShadow: '0 2px 8px rgba(37,99,235,0.08)' }}
          />
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={likedPosts[post.id] ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            sx={{
              bgcolor: likedPosts[post.id] ? '#EF4444' : 'transparent',
              color: likedPosts[post.id] ? '#fff' : '#374151',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 15,
              transition: 'background 0.2s, color 0.2s',
              '&:hover': {
                bgcolor: likedPosts[post.id] ? '#EF4444' : '#EEF2FB',
                color: likedPosts[post.id] ? '#fff' : '#2563EB'
              },
              borderRadius: 2,
              px: 2,
            }}
            onClick={() => onLikeToggle(post.id)}
            disabled={likingPost || unlikingPost}
          >
            <span style={{ color: '#222', fontWeight: 600 }}>
              {likeCounts[post.id] !== undefined ? likeCounts[post.id] : post.likeCount || 0}
            </span>
          </Button>
          <Button
            startIcon={<ChatBubbleOutlineIcon />}
            sx={{ color: '#374151', textTransform: 'none', fontWeight: 600, fontSize: 15, transition: 'color 0.2s', '&:hover': { color: '#2563EB' } }}
            onClick={() => onCommentClick(post.id)}
          >
            {post.commentCount || 0}
          </Button>
        </Box>
        <Button startIcon={<ShareIcon />} sx={{ color: '#374151', textTransform: 'none', fontWeight: 600, fontSize: 15, transition: 'color 0.2s', '&:hover': { color: '#2563EB' } }}>Share</Button>
      </Box>
    </Box>
  );
});

// Optimized Comments Modal with actual comments functionality
const CommentsModal = memo(({
  open,
  post,
  onClose,
  comments,
  loadingComments,
  onAddComment,
  onLikeComment,
  likedComments,
  commentLikeCounts,
  likingComment,
  replyingCommentId,
  replyText,
  setReplyText,
  setReplyingCommentId,
  replying
}: any) => {
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !post) return;

    setAddingComment(true);
    try {
      await onAddComment(post.id, newComment);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setAddingComment(false);
    }
  }, [newComment, post, onAddComment]);

  if (!open || !post) {
    console.log('CommentsModal not rendering:', { open, post: !!post });
    return null;
  }

  console.log('CommentsModal rendering for post:', post.id);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: 'rgba(30,41,59,0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.3s',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          bgcolor: '#fff',
          borderRadius: 6,
          p: 7,
          width: { xs: '95vw', sm: '80vw', md: '60vw' },
          height: { xs: '90vh', sm: '80vh', md: '60vh' },
          maxWidth: '900px',
          maxHeight: '900px',
          overflowY: 'auto',
          boxShadow: '0 16px 48px 0 rgba(30,41,59,0.18)',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Icon */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'sticky',
            top: 16,
            right: 16,
            alignSelf: 'flex-end',
            color: '#6B7280',
            bgcolor: '#F3F4F6',
            zIndex: 10,
            mb: -6, // Negative margin to overlap content
            '&:hover': {
              bgcolor: '#E5E7EB',
              color: '#374151'
            }
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Post Details */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar src={post.profilePhoto || `https://randomuser.me/api/portraits/lego/${post.userId % 10}.jpg`} sx={{ mr: 2, width: 44, height: 44, boxShadow: 1 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#2563EB', ...interFont }}>
                {post.userFirstName} {post.userLastName}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                {post.userRole}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#6B7280' }}>
                {new Date(post.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#2563EB', fontWeight: 700, fontSize: 17, mb: 1 }}>{post.title}</Typography>
          <Typography sx={{ color: '#374151', fontSize: 16, mb: 2 }}>{post.content}</Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 1 }}>
            <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(37,99,235,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Location: {post.location}</Typography>
            <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(99,102,241,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Type: {post.propertyType}</Typography>
            <Typography sx={{ fontSize: 14, color: '#6B7280', bgcolor: 'rgba(239,68,68,0.06)', px: 1.5, py: 0.5, borderRadius: 2 }}>Price: ₹{post.price}</Typography>
          </Box>
        </Box>

        {/* Add Comment Section */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#F6F8FB', borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2563EB' }}>Add a Comment</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <InputBase
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              sx={{
                bgcolor: '#fff',
                px: 2,
                py: 1.5,
                borderRadius: 2,
                fontSize: 15,
                flex: 1,
                boxShadow: 1,
                border: '1px solid #E5E7EB',
              }}
              multiline
              minRows={2}
              maxRows={4}
            />
            <Button
              variant="contained"
              sx={{ bgcolor: '#2563EB', fontWeight: 600, borderRadius: 2, px: 3, py: 1.5, minWidth: 0, '&:hover': { bgcolor: '#1D4ED8' } }}
              onClick={handleSubmitComment}
              disabled={addingComment || !newComment.trim()}
            >
              {addingComment ? 'Posting...' : 'Post'}
            </Button>
          </Box>
        </Box>

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2563EB' }}>Comments</Typography>

        {loadingComments ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : comments && comments.length > 0 ? (
          <Stack spacing={2}>
            {comments.map((comment: any) => (
              <Box key={comment.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, bgcolor: '#F6F8FB', borderRadius: 3, p: 1.5, boxShadow: 1 }}>
                <Avatar src={comment.profilePhoto || `https://randomuser.me/api/portraits/lego/${comment.userId % 10}.jpg`} sx={{ width: 32, height: 32, mr: 1 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#2563EB' }}>{comment.userFirstName} {comment.userLastName}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#6366F1', fontWeight: 500 }}>{comment.userRole}</Typography>
                  <Typography sx={{ fontSize: 14, color: '#374151', mt: 0.5 }}>{comment.comment}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.5 }}>{new Date(comment.addedAt).toLocaleString()}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Button
                      startIcon={<FavoriteBorderIcon />}
                      sx={{
                        color: likedComments[comment.id] ? '#fff' : '#EF4444',
                        bgcolor: likedComments[comment.id] ? '#EF4444' : 'rgba(239,68,68,0.06)',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: 14,
                        px: 1.5,
                        borderRadius: 2,
                        '&:hover': { bgcolor: 'rgba(239,68,68,0.18)' }
                      }}
                      onClick={() => onLikeComment(comment.id)}
                      disabled={likingComment}
                    >
                      {commentLikeCounts[comment.id] !== undefined ? commentLikeCounts[comment.id] : comment.likeCount || 0}
                    </Button>
                    <Button
                      sx={{ color: '#2563EB', textTransform: 'none', fontWeight: 600, fontSize: 14, px: 1.5, borderRadius: 2, bgcolor: 'rgba(37,99,235,0.06)', '&:hover': { bgcolor: 'rgba(37,99,235,0.18)' } }}
                      onClick={() => setReplyingCommentId(comment.id)}
                    >
                      Reply
                    </Button>
                  </Box>

                  {/* Display Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <Box sx={{ mt: 2, ml: 2, borderLeft: '2px solid #E5E7EB', pl: 2 }}>
                      {comment.replies.map((reply: any) => (
                        <Box key={reply.id} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Avatar src={reply.profilePhoto || `https://randomuser.me/api/portraits/lego/${reply.userId % 10}.jpg`} sx={{ width: 28, height: 28 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#2563EB' }}>
                              {reply.userFirstName} {reply.userLastName}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#6366F1', fontWeight: 500 }}>{reply.userRole}</Typography>
                            <Typography sx={{ fontSize: 13, color: '#374151', mt: 0.5 }}>{reply.comment}</Typography>
                            <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 0.5 }}>
                              {new Date(reply.addedAt).toLocaleString()}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Button
                                startIcon={<FavoriteBorderIcon />}
                                sx={{
                                  color: likedComments[reply.id] ? '#fff' : '#EF4444',
                                  bgcolor: likedComments[reply.id] ? '#EF4444' : 'rgba(239,68,68,0.06)',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  fontSize: 12,
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  minHeight: 24,
                                  '&:hover': { bgcolor: 'rgba(239,68,68,0.18)' }
                                }}
                                onClick={() => onLikeComment(reply.id)}
                                disabled={likingComment}
                              >
                                {commentLikeCounts[reply.id] !== undefined ? commentLikeCounts[reply.id] : reply.likeCount || 0}
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Reply input/modal */}
                  {replyingCommentId === comment.id && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                      <InputBase
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        sx={{
                          bgcolor: '#F3F4F6',
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          fontSize: 15,
                          flex: 1,
                          boxShadow: 1,
                        }}
                        multiline
                        minRows={1}
                        maxRows={4}
                      />
                      <Button
                        variant="contained"
                        sx={{ bgcolor: '#2563EB', fontWeight: 600, borderRadius: 2, px: 2, py: 1, minWidth: 0, '&:hover': { bgcolor: '#1D4ED8' } }}
                        onClick={() => onAddComment(post.id, replyText, comment.id)}
                        disabled={replying}
                      >
                        Send
                      </Button>
                      <Button
                        sx={{ color: '#6B7280', fontWeight: 500, borderRadius: 2, px: 2, py: 1, minWidth: 0 }}
                        onClick={() => { setReplyingCommentId(null); setReplyText(''); }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: 13, color: '#6B7280', mb: 1 }}>No comments yet. Be the first to comment!</Typography>
        )}

      </Box>
    </Box>
  );
});

const Home = () => {
  const { data, loading, error, refetch } = useQuery(SEARCH_POSTS_QUERY, {
    variables: { page: 1, limit: 10 },
    fetchPolicy: 'network-only',
  });

  // Optimized state management
  const [commentsModalOpen, setCommentsModalOpen] = useState<{ open: boolean; postId: number | null }>({ open: false, postId: null });
  const [likedPosts, setLikedPosts] = useState<{ [postId: number]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [postId: number]: number }>({});
  const [likingPost, setLikingPost] = useState(false);
  const [unlikingPost, setUnlikingPost] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'profile'>('home');

  // Comments state
  const [commentsByPost, setCommentsByPost] = useState<{ [postId: number]: any[] }>({});
  const [loadingComments, setLoadingComments] = useState<{ [postId: number]: boolean }>({});
  const [likedComments, setLikedComments] = useState<{ [commentId: number]: boolean }>({});
  const [commentLikeCounts, setCommentLikeCounts] = useState<{ [commentId: number]: number }>({});
  const [likingComment, setLikingComment] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Auto-refresh state (simplified - always enabled)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const commentsRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentUser, setCurrentUser] = useState(getUserData());

  const isMobile = useMediaQuery('(max-width:900px)');

  // GraphQL mutations
  const [createComment] = useMutation(CREATE_COMMENT_MUTATION);
  const [likeComment] = useMutation(LIKE_COMMENT_MUTATION);
  const [likePost] = useMutation(LIKE_POST_MUTATION);
  const [unlikePost] = useMutation(UNLIKE_POST_MUTATION);
  const client = useApolloClient();
  const postService = new PostService(client);

  // Create Post form state
  const [cpTitle, setCpTitle] = useState('');
  const [cpContent, setCpContent] = useState('');
  const [cpPropertyType, setCpPropertyType] = useState('listing');
  const [cpVisibility, setCpVisibility] = useState('public');
  const [cpStatus, setCpStatus] = useState('active');
  const [cpPrice, setCpPrice] = useState<string>('');
  const [cpLocationText, setCpLocationText] = useState('');
  const [cpLat, setCpLat] = useState<number | undefined>(undefined);
  const [cpLng, setCpLng] = useState<number | undefined>(undefined);
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpFiles, setCpFiles] = useState<File[]>([]);
  const [cpUploaded, setCpUploaded] = useState<{ name: string; url: string; contentType: string }[]>([]);

  // Check for user data updates
  useEffect(() => {
    const checkUserData = () => {
      const userData = getUserData();
      if (JSON.stringify(userData) !== JSON.stringify(currentUser)) {
        setCurrentUser(userData);
      }
    };

    // Check user data on focus (when user comes back to the tab)
    window.addEventListener('focus', checkUserData);

    // Also check periodically
    const userCheckInterval = setInterval(checkUserData, 1000);

    return () => {
      window.removeEventListener('focus', checkUserData);
      clearInterval(userCheckInterval);
    };
  }, [currentUser]);

  // Auto-refresh functionality (always enabled, simplified)
  useEffect(() => {
    if (!loading) {
      refreshTimerRef.current = setInterval(async () => {
        try {
          setIsRefreshing(true);
          await refetch();
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        } finally {
          setIsRefreshing(false);
        }
      }, 1000); // 1 second

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
      profileImage: currentUser.profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg',
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
    setCurrentPage('profile');
    handleClose();
  }, [handleClose]);

  const handleGoHome = useCallback(() => {
    setCurrentPage('home');
  }, []);

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
          variables: { postId, page: 1, limit: 50 }
        });

        if (commentsData?.postComments) {
          setCommentsByPost(prev => ({ ...prev, [postId]: commentsData.postComments }));
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
          variables: { postId, page: 1, limit: 50 }
        });

        if (commentsData?.postComments) {
          setCommentsByPost(prev => ({ ...prev, [postId]: commentsData.postComments }));
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
  }, [currentUser, createComment, client]);

  const handleLikeComment = useCallback(async (commentId: number) => {
    if (!currentUser?.id) return;

    setLikingComment(true);
    try {
      const { data: result } = await likeComment({
        variables: {
          commentId,
          userId: parseInt(currentUser.id.toString())
        }
      });

      if (result?.likeComment?.success) {
        setLikedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }));
        setCommentLikeCounts(prev => ({
          ...prev,
          [commentId]: (prev[commentId] || 0) + (prev[commentId] ? -1 : 1)
        }));
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    } finally {
      setLikingComment(false);
    }
  }, [currentUser, likeComment]);

  // Manual refresh handler
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
    const currentUserId = currentUser?.id;
    if (!currentUserId) {
      return <Typography sx={{ m: 4, color: 'red' }}>User not logged in. Please log in again.</Typography>;
    }

    return <ProfilePage
      onGoBack={handleGoHome}
      userId={currentUserId}
      currentUserId={currentUserId}
    />;
  }

  // Render Home Page
  return (
    <Box sx={{ bgcolor: '#F6F8FB', minHeight: '100vh', ...interFont }}>
      {/* Header */}
      <AppBar position="fixed" elevation={1} sx={{ bgcolor: '#fff', color: '#2563EB', zIndex: 1201 }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: isMobile ? 1 : 4 }}>
          {/* Logo */}
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#2563EB', letterSpacing: 1, ...interFont }}>
            Zameen pe charcha
          </Typography>
          {/* Search Bar */}
          <Box sx={{ flex: 1, mx: 2, display: 'flex', justifyContent: 'center' }}>
            <InputBase
              placeholder="Search zameen pe charcha"
              sx={{
                bgcolor: '#F3F4F6',
                px: 2,
                py: 1.2,
                borderRadius: 3,
                width: isMobile ? '100%' : 420,
                boxShadow: 1,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 3, bgcolor: '#EEF2FB' },
                fontSize: 16,
              }}
            />
          </Box>
          {/* Notification & Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton title="Messages" sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}>
              <MessageIcon sx={{ color: '#2563EB' }} />
            </IconButton>
            <IconButton title="Notifications" sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}>
              <NotificationsIcon sx={{ color: '#2563EB' }} />
            </IconButton>
            <IconButton title="Add Friend" sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}>
              <PersonAddIcon sx={{ color: '#2563EB' }} />
            </IconButton>
            <IconButton onClick={handleMenu} title="Profile" sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}>
              <Avatar src={currentUserData?.profileImage || ''} sx={{ width: 36, height: 36, boxShadow: 1 }} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={handleProfileClick}>Profile</MenuItem>
              <MenuItem onClick={handleClose}>Settings</MenuItem>
              <MenuItem
                onClick={() => {
                  localStorage.removeItem('userInfo');
                  window.location.href = '/';
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Layout */}
      <Box sx={{ display: 'flex', pt: 9, px: isMobile ? 0 : 3 }}>
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
          <Box sx={{ mb: 4, p: 3, bgcolor: '#fff', borderRadius: 4, boxShadow: '0 2px 12px rgba(37,99,235,0.08)', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={currentUserData?.profileImage} sx={{ width: 44, height: 44 }} />
              <InputBase
                placeholder="What's on your mind?"
                sx={{
                  bgcolor: '#F3F4F6',
                  px: 3,
                  py: 1.5,
                  borderRadius: 3,
                  flex: 1,
                  fontSize: 17,
                  boxShadow: 1,
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 3, bgcolor: '#EEF2FB' },
                }}
                readOnly
                onClick={() => setCreateOpen(true)}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
              <Button size="medium" startIcon={<AddIcon />} sx={{ color: '#2563EB', textTransform: 'none', fontWeight: 600, fontSize: 15, bgcolor: 'rgba(37,99,235,0.08)', borderRadius: 2, '&:hover': { bgcolor: 'rgba(37,99,235,0.18)' } }}>Photo</Button>
              <Button size="medium" startIcon={<AddIcon />} sx={{ color: '#EF4444', textTransform: 'none', fontWeight: 600, fontSize: 15, bgcolor: 'rgba(239,68,68,0.08)', borderRadius: 2, '&:hover': { bgcolor: 'rgba(239,68,68,0.18)' } }}>Video</Button>
              <Button size="medium" startIcon={<AddIcon />} sx={{ color: '#6366F1', textTransform: 'none', fontWeight: 600, fontSize: 15, bgcolor: 'rgba(99,102,241,0.08)', borderRadius: 2, '&:hover': { bgcolor: 'rgba(99,102,241,0.18)' } }}>Tag</Button>
            </Box>
            {/* Floating Action Button for mobile */}
            {isMobile && (
              <IconButton sx={{ position: 'absolute', right: 18, bottom: -28, bgcolor: '#2563EB', color: '#fff', boxShadow: 3, width: 56, height: 56, '&:hover': { bgcolor: '#1D4ED8' } }} onClick={() => setCreateOpen(true)}>
                <AddIcon sx={{ fontSize: 32 }} />
              </IconButton>
            )}
          </Box>



          {/* Posts Feed */}
          {loading && !data ? (
            <Typography sx={{ textAlign: 'center', mt: 6 }}>Loading posts...</Typography>
          ) : error ? (
            <Typography color="error" sx={{ textAlign: 'center', mt: 6 }}>Error loading posts</Typography>
          ) : (
            <Stack spacing={4}>
              {data?.searchPosts?.map((post: any) => (
                <Post
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentClick={handleCommentClick}
                  likedPosts={likedPosts}
                  likeCounts={likeCounts}
                  likingPost={likingPost}
                  unlikingPost={unlikingPost}
                />
              ))}
            </Stack>
          )}
        </Box>

        {/* Right Sidebar */}
        {!isMobile && (
          <Box sx={{ width: 280, ml: 3, display: 'flex', flexDirection: 'column', gap: 3, position: 'sticky', top: 88, alignSelf: 'flex-start', height: 'fit-content', zIndex: 2 }}>
            {/* People You May Know */}
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 4, boxShadow: '0 2px 12px rgba(37,99,235,0.08)', p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#2563EB', ...interFont }}>People You May Know</Typography>
              <Stack spacing={2}>
                {friendSuggestions.map((friend, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#F6F8FB', borderRadius: 3, p: 1.2, boxShadow: 1 }}>
                    <Avatar src={friend.avatar} sx={{ width: 38, height: 38, mr: 1 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{friend.name}</Typography>
                      <Typography sx={{ fontSize: 13, color: '#6B7280' }}>{friend.info}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
            {/* Trending Topics */}
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 4, boxShadow: '0 2px 12px rgba(37,99,235,0.08)', p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#2563EB', ...interFont }}>Trending</Typography>
              <Stack spacing={1.5}>
                {trendingTopics.map((trend, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#F6F8FB', borderRadius: 3, p: 1, boxShadow: 1 }}>
                    <Typography sx={{ color: '#2563EB', fontWeight: 600, fontSize: 15 }}>{trend.topic}</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6366F1', fontWeight: 500, bgcolor: 'rgba(99,102,241,0.08)', px: 1.2, borderRadius: 2 }}>{trend.posts}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        )}
      </Box>

      {/* Comments Modal */}
      <CommentsModal
        open={commentsModalOpen.open}
        post={currentPost}
        onClose={handleCommentsModalClose}
        comments={commentsByPost[commentsModalOpen.postId!]}
        loadingComments={loadingComments[commentsModalOpen.postId!]}
        onAddComment={handleAddComment}
        onLikeComment={handleLikeComment}
        likedComments={likedComments}
        commentLikeCounts={commentLikeCounts}
        likingComment={likingComment}
        replyingCommentId={replyingCommentId}
        replyText={replyText}
        setReplyText={setReplyText}
        setReplyingCommentId={setReplyingCommentId}
        replying={replying}
      />

      {/* Create Post Modal */}
      {createOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(37,99,235,0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
          onClick={() => !cpSubmitting && setCreateOpen(false)}
        >
          <Box
            sx={{
              bgcolor: '#fff',
              borderRadius: 4,
              p: 4,
              width: { xs: '100%', sm: 560 },
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
              textAlign: 'left',
            }}
            onClick={e => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2563EB' }}>Create Post</Typography>
            <Stack spacing={2}>
              <InputBase
                placeholder="Title"
                value={cpTitle}
                onChange={(e) => setCpTitle(e.target.value)}
                sx={{
                  bgcolor: '#F3F4F6', px: 2, py: 1.2, borderRadius: 2, boxShadow: 1,
                  border: '1px solid #E5E7EB'
                }}
              />
              <InputBase
                placeholder="What's on your mind?"
                value={cpContent}
                onChange={(e) => setCpContent(e.target.value)}
                multiline minRows={3}
                sx={{
                  bgcolor: '#F3F4F6', px: 2, py: 1.2, borderRadius: 2, boxShadow: 1,
                  border: '1px solid #E5E7EB'
                }}
              />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
                  {['listing','building','land','commercial','industrial'].map(opt => (
                    <Button key={opt}
                      variant={cpPropertyType === opt ? 'contained' : 'outlined'}
                      onClick={() => setCpPropertyType(opt)}
                      sx={{ textTransform: 'none' }}
                    >{opt}</Button>
                  ))}
                </Box>
                <TextField
                  select
                  label="Visibility"
                  value={cpVisibility}
                  onChange={(e) => setCpVisibility(e.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="public">Public</MenuItem>
                  <MenuItem value="private">Private</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ p: 2, border: '1px dashed #CBD5E1', borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
                    Select media
                    <input type="file" hidden multiple accept="image/*,video/*" onChange={(e) => {
                      if (!e.target.files) return;
                      setCpFiles(Array.from(e.target.files));
                    }} />
                  </Button>
                  <Typography variant="body2" color="text.secondary">Images or videos. They will be uploaded directly to S3.</Typography>
                </Stack>
                {cpFiles.length > 0 && (
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {cpFiles.map(f => (
                      <Typography key={f.name} variant="body2">
                        {f.name} {cpUploaded.find(u => u.name === f.name) && <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16, ml: 1 }} />}
                      </Typography>
                    ))}
                  </Stack>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <InputBase
                  placeholder="Price"
                  value={cpPrice}
                  onChange={(e) => setCpPrice(e.target.value)}
                  type="number"
                  sx={{ flex: 1, minWidth: 180, bgcolor: '#F3F4F6', px: 2, py: 1.2, borderRadius: 2, boxShadow: 1, border: '1px solid #E5E7EB' }}
                />
                <InputBase
                  placeholder="Status (active/inactive)"
                  value={cpStatus}
                  onChange={(e) => setCpStatus(e.target.value)}
                  sx={{ flex: 1, minWidth: 180, bgcolor: '#F3F4F6', px: 2, py: 1.2, borderRadius: 2, boxShadow: 1, border: '1px solid #E5E7EB' }}
                />
              </Box>
              <LocationAutocomplete
                value={cpLocationText}
                onChange={setCpLocationText}
                onLocationSelect={({ address, latitude, longitude }) => {
                  setCpLocationText(address);
                  setCpLat(latitude);
                  setCpLng(longitude);
                }}
              />
              {cpError && (
                <Typography color="error" variant="body2">{cpError}</Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                <Button onClick={() => setCreateOpen(false)} disabled={cpSubmitting}>Cancel</Button>
                <Button
                  variant="contained"
                  sx={{ bgcolor: '#2563EB', fontWeight: 600, '&:hover': { bgcolor: '#1D4ED8' } }}
                  disabled={cpSubmitting || !cpTitle.trim() || !cpContent.trim() || !cpLocationText.trim() || !cpPrice}
                  onClick={async () => {
                    try {
                      setCpError(null);
                      setCpSubmitting(true);
                      // Upload selected files to S3 using presigned URLs from gateway
                      const uploaded: { name: string; url: string; contentType: string }[] = [];
                      for (const file of cpFiles) {
                        const qs = new URLSearchParams({ fileName: file.name, contentType: file.type }).toString();
                        const presignRes = await fetch(`http://localhost:8000/api/v1/uploads/presign-post-media?${qs}`);
                        if (!presignRes.ok) throw new Error('Failed to get upload URL');
                        const { url, publicUrl } = await presignRes.json();
                        const putRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
                        if (!putRes.ok) throw new Error('Failed to upload media');
                        uploaded.push({ name: file.name, url: publicUrl, contentType: file.type });
                      }
                      setCpUploaded(uploaded);
                      if (!currentUser || !currentUser.id) {
                        setCpError('User not logged in');
                        setCpSubmitting(false);
                        return;
                      }
                      const priceNum = parseFloat(cpPrice);
                      const resp = await postService.createPost({
                        userId: parseInt(currentUser.id.toString()),
                        title: cpTitle.trim(),
                        content: cpContent.trim(),
                        visibility: cpVisibility.trim(),
                        propertyType: cpPropertyType.trim(),
                        location: cpLocationText.trim(),
                        price: priceNum,
                        status: cpStatus.trim(),
                        latitude: cpLat,
                        longitude: cpLng,
                        media: uploaded.map(u => ({ mediaType: u.contentType.startsWith('video/') ? 'video' : 'image', mediaOrder: 1, filePath: u.url, fileName: u.name, contentType: u.contentType })),
                      });
                      if (!resp.success) {
                        setCpError(resp.message || 'Failed to create post');
                      } else {
                        // Reset and close
                        setCpTitle(''); setCpContent(''); setCpPropertyType('listing'); setCpVisibility('public'); setCpStatus('active'); setCpPrice(''); setCpLocationText(''); setCpLat(undefined); setCpLng(undefined); setCpFiles([]); setCpUploaded([]);
                        setCreateOpen(false);
                        // Refresh list
                        await refetch();
                      }
                    } catch (e: any) {
                      setCpError(e.message || 'Error creating post');
                    } finally {
                      setCpSubmitting(false);
                    }
                  }}
                >
                  {cpSubmitting ? 'Posting...' : 'Post'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Home;