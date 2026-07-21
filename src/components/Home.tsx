import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { gql, useQuery, useMutation, useApolloClient } from '@apollo/client';
import { SEARCH_POSTS, CREATE_POST, TRENDING_POSTS } from '../graphql/posts';
import { GET_SUGGESTED_USERS, FOLLOW_USER, CREATE_NOTIFICATION, GET_USER_NOTIFICATIONS, MARK_NOTIFICATION_READ } from '../graphql/user';
import CreatePost from './CreatePost';
import { PostService } from '../services/postService';
import { useAuth } from '../contexts/AuthContext';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import ProfilePage from './ProfilePage';

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

const MENTION_PATTERN = /@\[(\d+):([^\]]+)\]/g;

const renderPostContent = (content: string, onOpenProfile: (userId: number) => void) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_PATTERN);
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const userId = parseInt(match[1], 10);
    const name = match[2];
    parts.push(
      <Box
        component="span"
        key={`mention-${match.index}-${userId}`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenProfile(userId);
        }}
        sx={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
      >
        @{name}
      </Box>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts.length > 0 ? parts : content;
};

const extractMentionedUserIds = (content: string, extraIds: number[] = []) => {
  const ids = new Set<number>(extraIds);
  const regex = new RegExp(MENTION_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    ids.add(parseInt(match[1], 10));
  }
  return Array.from(ids);
};

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
  likedPosts: { [postId: number]: boolean };
  likeCounts: { [postId: number]: number };
}

const PostSkeleton = () => (
  <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 3, mb: 3, boxShadow: '0 2px 12px rgba(37,99,235,0.08)' }}>
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

const Post = memo(({ post, onLikeToggle, onCommentClick, onOpenProfile, likedPosts, likeCounts }: PostProps) => {
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  const [isAnimating, setIsAnimating] = useState(false);

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
        <Avatar
          src={(post as any).userProfilePhotoSignedUrl || post.profilePhoto || `https://randomuser.me/api/portraits/lego/${post.userId % 10}.jpg`}
          sx={{ mr: 2, width: 44, height: 44, boxShadow: 1, cursor: 'pointer' }}
          onClick={() => onOpenProfile(post.userId)}
        />
        <Box
          onClick={() => onOpenProfile(post.userId)}
          sx={{ cursor: 'pointer' }}
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
      </Box>
      <Typography sx={{ color: '#2563EB', fontWeight: 700, fontSize: 17, mb: 1 }}>{post.title}</Typography>
      <Typography sx={{ color: '#374151', fontSize: 16, mb: 2, whiteSpace: 'pre-wrap' }}>
        {renderPostContent(post.content, onOpenProfile)}
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={
              likedPosts[post.id] ? (
                <FavoriteIcon
                  className={`liked-heart-icon ${isAnimating ? 'liked-heart-icon-clicked' : ''}`}
                />
              ) : (
                <FavoriteBorderIcon
                  className={isAnimating ? 'liked-heart-icon-clicked' : ''}
                  sx={{ color: '#6B7280' }}
                />
              )
            }
            sx={{
              bgcolor: 'transparent',
              color: '#374151',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 15,
              transition: 'background 0.2s, color 0.2s',
              '&:hover': {
                bgcolor: '#EEF2FB',
                color: '#2563EB'
              },
              borderRadius: 2,
              px: 2,
            }}
            onClick={handleLikeClick}
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
  const [animatingComments, setAnimatingComments] = useState<{ [commentId: number]: boolean }>({});

  const handleLikeCommentClick = useCallback((commentId: number) => {
    setAnimatingComments(prev => ({ ...prev, [commentId]: true }));
    setTimeout(() => {
      setAnimatingComments(prev => ({ ...prev, [commentId]: false }));
    }, 600);
    onLikeComment(commentId);
  }, [onLikeComment]);

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
                      startIcon={
                        likedComments[comment.id] ? (
                          <FavoriteIcon
                            className={`liked-heart-icon ${animatingComments[comment.id] ? 'liked-heart-icon-clicked' : ''}`}
                          />
                        ) : (
                          <FavoriteBorderIcon
                            className={animatingComments[comment.id] ? 'liked-heart-icon-clicked' : ''}
                            sx={{ color: '#6B7280' }}
                          />
                        )
                      }
                      sx={{
                        color: '#374151',
                        bgcolor: 'transparent',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: 14,
                        px: 1.5,
                        borderRadius: 2,
                        '&:hover': { bgcolor: '#EEF2FB', color: '#EF4444' }
                      }}
                      onClick={() => handleLikeCommentClick(comment.id)}
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
                                startIcon={
                                  likedComments[reply.id] ? (
                                    <FavoriteIcon
                                      className={`liked-heart-icon ${animatingComments[reply.id] ? 'liked-heart-icon-clicked' : ''}`}
                                    />
                                  ) : (
                                    <FavoriteBorderIcon
                                      className={animatingComments[reply.id] ? 'liked-heart-icon-clicked' : ''}
                                      sx={{ color: '#6B7280' }}
                                    />
                                  )
                                }
                                sx={{
                                  color: '#374151',
                                  bgcolor: 'transparent',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  fontSize: 12,
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  minHeight: 24,
                                  '&:hover': { bgcolor: '#EEF2FB', color: '#EF4444' }
                                }}
                                onClick={() => handleLikeCommentClick(reply.id)}
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
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuth();
  const { data, loading, error, refetch } = useQuery(SEARCH_POSTS, {
    variables: { page: 1, limit: 10 },
    fetchPolicy: 'network-only',
  });

  const { data: trendingData, loading: trendingLoading } = useQuery(TRENDING_POSTS, {
    variables: { limit: 5 },
    fetchPolicy: 'network-only',
  });

  const client = useApolloClient();



  // Optimized state management
  const [commentsModalOpen, setCommentsModalOpen] = useState<{ open: boolean; postId: number | null }>({ open: false, postId: null });
  const [likedPosts, setLikedPosts] = useState<{ [postId: number]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [postId: number]: number }>({});

  // Hydrate liked state from server (persists across refresh)
  useEffect(() => {
    if (!data?.searchPosts) return;
    const nextLiked: { [postId: number]: boolean } = {};
    const nextCounts: { [postId: number]: number } = {};
    data.searchPosts.forEach((p: any) => {
      if (p.isLiked) nextLiked[p.id] = true;
      nextCounts[p.id] = p.likeCount || 0;
    });
    setLikedPosts(prev => ({ ...nextLiked, ...prev }));
    setLikeCounts(prev => ({ ...nextCounts, ...prev }));
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
    variables: { userId: parseInt(String(activeUserId || 0)), limit: 12 },
    skip: !activeUserId,
    fetchPolicy: 'network-only',
  });

  const { data: notifData, refetch: refetchNotifs } = useQuery(GET_USER_NOTIFICATIONS, {
    variables: { userId: parseInt(String(activeUserId || 0)), page: 1, limit: 20 },
    skip: !activeUserId,
    fetchPolicy: 'network-only',
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

  // GraphQL mutations
  const [createComment] = useMutation(CREATE_COMMENT_MUTATION);
  const [likeComment] = useMutation(LIKE_COMMENT_MUTATION);
  const [likePost] = useMutation(LIKE_POST_MUTATION);
  const [unlikePost] = useMutation(UNLIKE_POST_MUTATION);
  const [createPostMutation] = useMutation(CREATE_POST);
  const [followUserMutation] = useMutation(FOLLOW_USER);
  const [createNotificationMutation] = useMutation(CREATE_NOTIFICATION);

  // Create Post form state (simplified for new component)
  const [cpSubmitting, setCpSubmitting] = useState(false);

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

    // Fetch fresh user data once on mount
    fetchAndUpdateUserData();

    // Check user data on focus (when user comes back to the tab)
    window.addEventListener('focus', checkUserData);

    // Also check periodically
    const userCheckInterval = setInterval(checkUserData, 1000);

    return () => {
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

        const mentionedIds = extractMentionedUserIds(
          postData.content,
          postData.mentionedUserIds || []
        ).filter((id) => id !== parseInt(String(currentUser.id)));

        for (const mentionedId of mentionedIds) {
          try {
            await createNotificationMutation({
              variables: {
                userId: mentionedId,
                title: 'You were mentioned',
                message: `${currentUser.firstName || 'Someone'} mentioned you in a post: ${postData.title}`,
                type: 'mention',
                metadata: JSON.stringify({ postTitle: postData.title }),
              },
            });
          } catch (notifyError) {
            console.error('Failed to create mention notification:', notifyError);
          }
        }

        // Refresh posts
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
  }, [currentUser, createPostMutation, createNotificationMutation, refetch]);

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
      <ProfilePage
      onGoBack={handleGoHome}
        userId={selectedProfileId}
        currentUserId={authUserId}
        onOpenProfile={handleOpenProfile}
      />
    );
  }

  // Render Home Page
  return (
    <Box sx={{ bgcolor: '#F6F8FB', minHeight: '100vh', ...interFont }}>
      {/* Header */}
      <AppBar position="fixed" elevation={1} sx={{ bgcolor: '#fff', color: '#2563EB', zIndex: 1201 }}>
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            px: { xs: 1, sm: 2, md: 4 },
            minHeight: { xs: 56, sm: 64 },
            gap: { xs: 0.5, sm: 2 },
          }}
        >
          {isMobile && (
            <IconButton
              edge="start"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
              size="small"
              sx={{ mr: 0.25, color: '#2563EB' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo — single line; never stacks on mobile */}
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
              flex: '1 1 auto',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pr: 0.5,
            }}
          >
            Zameen pe charcha
          </Typography>

          {/* Search — desktop only in this row */}
          {!isMobile && (
            <Box sx={{ flex: 1, mx: 2, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
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
                  maxWidth: 420,
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
              ml: 'auto',
            }}
          >
            <IconButton
              title="Messages"
              onClick={() => navigate('/chat')}
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
              bgcolor: '#fff',
              borderRadius: { xs: 3, sm: 4 },
              boxShadow: '0 2px 12px rgba(37,99,235,0.08)',
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
                  likedPosts={likedPosts}
                  likeCounts={likeCounts}
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
              {suggestedLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
              ) : (
                <Stack spacing={2}>
                  {(suggestedData?.suggestedUsers ?? []).map((friend: any) => (
                    <Box key={friend.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#F6F8FB', borderRadius: 3, p: 1.2, boxShadow: 1 }}>
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
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 4, boxShadow: '0 2px 12px rgba(37,99,235,0.08)', p: 2.5 }}>
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
                        bgcolor: '#F6F8FB',
                        borderRadius: 3,
                        p: 1,
                        boxShadow: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#EEF2FB' },
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
                    bgcolor: '#F6F8FB',
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
                    bgcolor: '#F6F8FB',
                    borderRadius: 2,
                    p: 1.1,
                    cursor: 'pointer',
                    '&:active': { bgcolor: '#EEF2FB' },
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
                    bgcolor: '#F6F8FB',
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
        onLikeComment={handleLikeComment}
        likedComments={likedComments}
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
    </Box>
  );
};

export default Home;