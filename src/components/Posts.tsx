import React, { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { PostService } from '../services/postService';
import { Post, PostsQueryVariables } from '../types/posts';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Button,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';
 
import {
  Favorite,
  FavoriteBorder,
  Comment as CommentIcon,
  LocationOn,
} from '@mui/icons-material';
import ShareSymbol from './icons/ShareSymbol';
import { PropertyType, PostStatus } from '../types/posts';

const Posts: React.FC = () => {
  const client = useApolloClient();
  const { user } = useAuth();
  const postService = new PostService(client);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatingPosts, setAnimatingPosts] = useState<{ [postId: number]: boolean }>({});

  // Filter states
  const [filters, setFilters] = useState<PostsQueryVariables>({
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedPosts = await postService.searchPosts(filters);
      setPosts(fetchedPosts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: number) => {
    if (!user) return;
    try {
      await postService.likePost(postId, user.id);
      // Refetch posts to update like count
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLikePostWithAnimation = async (postId: number) => {
    setAnimatingPosts(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      setAnimatingPosts(prev => ({ ...prev, [postId]: false }));
    }, 600);
    await handleLikePost(postId);
  };

  const handleFilterChange = (field: keyof PostsQueryVariables, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset page when filters change
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={fetchPosts} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          label="Property Type"
          value={filters.propertyType || ''}
          onChange={(e) => handleFilterChange('propertyType', e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 200 } }}
        >
          <MenuItem value="">All Types</MenuItem>
          {Object.values(PropertyType).map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Location"
          value={filters.location || ''}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 200 } }}
        />

        <TextField
          type="number"
          label="Min Price"
          value={filters.minPrice || ''}
          onChange={(e) => handleFilterChange('minPrice', parseFloat(e.target.value))}
          sx={{ minWidth: { xs: '100%', sm: 150 } }}
        />

        <TextField
          type="number"
          label="Max Price"
          value={filters.maxPrice || ''}
          onChange={(e) => handleFilterChange('maxPrice', parseFloat(e.target.value))}
          sx={{ minWidth: { xs: '100%', sm: 150 } }}
        />

        <TextField
          select
          label="Status"
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 150 } }}
        >
          <MenuItem value="">All Status</MenuItem>
          {Object.values(PostStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* Posts Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        {posts.map((post) => (
          <Box key={post.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {post.media.length > 0 && (
                <CardMedia
                  component="img"
                  height="200"
                  image={post.media[0].mediaUrl}
                  alt={post.title}
                  sx={{ objectFit: 'cover' }}
                />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" noWrap>
                  {post.title}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOn sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {post.location}
                  </Typography>
                </Box>

                <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                  ₹{post.price.toLocaleString()}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={post.propertyType}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={post.status}
                    size="small"
                    color={post.status === PostStatus.ACTIVE ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    mb: 2,
                  }}
                >
                  {post.content}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleLikePostWithAnimation(post.id)}
                      sx={{
                        color: post.likeCount > 0 ? '#EF4444' : '#6B7280',
                        transition: 'color 0.2s',
                        '&:hover': {
                          color: '#EF4444',
                        }
                      }}
                    >
                      {post.likeCount > 0 ? (
                        <Favorite
                          className={`liked-heart-icon ${animatingPosts[post.id] ? 'liked-heart-icon-clicked' : ''}`}
                        />
                      ) : (
                        <FavoriteBorder
                          className={animatingPosts[post.id] ? 'liked-heart-icon-clicked' : ''}
                        />
                      )}
                    </IconButton>
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {post.likeCount}
                    </Typography>

                    <IconButton size="small" sx={{ ml: 1 }}>
                      <CommentIcon />
                    </IconButton>
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {post.commentCount}
                    </Typography>

                    <IconButton size="small" sx={{ ml: 1 }}>
                      <ShareSymbol />
                    </IconButton>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {posts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No posts found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Posts;