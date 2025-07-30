import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { gql, useQuery } from '@apollo/client';
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
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EventIcon from '@mui/icons-material/Event';
// Modern font style for the whole page
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';

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
    mapLocation
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
const interFont = {
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

const leftNav: { icon: React.ReactNode; label: string }[] = [
  { icon: <HomeIcon />, label: 'Home' },
  { icon: <PeopleIcon />, label: 'Friends' },
  { icon: <GroupIcon />, label: 'Groups' },
  { icon: <StorefrontIcon />, label: 'Marketplace' },
  { icon: <EventIcon />, label: 'Events' },
];

const friendSuggestions = [
  { name: 'Mike Wilson', info: '3 mutual friends', avatar: '' },
  { name: 'Emma Davis', info: '1 mutual friend', avatar: '' },
];

const trendingTopics = [
  { topic: '#TechTrends2024', posts: '15.2K posts' },
  { topic: '#Photography', posts: '8.7K posts' },
  { topic: '#Travel', posts: '12.1K posts' },
];

const Home = () => {
  const { data, loading, error } = useQuery(SEARCH_POSTS_QUERY, {
    variables: { page: 1, limit: 10 },
    fetchPolicy: 'network-only',
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:900px)');

  // Profile menu
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

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
            <IconButton title="Messages" sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}><MessageIcon sx={{ color: '#2563EB' }} /></IconButton>
            <IconButton title="Notifications" sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}><NotificationsIcon sx={{ color: '#2563EB' }} /></IconButton>
            <IconButton title="Add Friend" sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}><PersonAddIcon sx={{ color: '#2563EB' }} /></IconButton>
            <IconButton onClick={handleMenu} title="Profile" sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: '#EEF2FB' } }}>
              <Avatar src="" sx={{ width: 36, height: 36, boxShadow: 1 }} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem>Profile</MenuItem>
              <MenuItem>Settings</MenuItem>
              <MenuItem>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Layout */}
      <Box sx={{ display: 'flex', pt: 9, px: isMobile ? 0 : 3 }}>
        {/* Left Sidebar */}
        {!isMobile && (
          <Box sx={{ width: 240, mr: 3 }}>
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
        <Box sx={{ flex: 1, maxWidth: 600, mx: 'auto', mt: isMobile ? 0 : 2 }}>
          {/* Create Post Card */}
          <Box sx={{ mb: 4, p: 3, bgcolor: '#fff', borderRadius: 4, boxShadow: '0 2px 12px rgba(37,99,235,0.08)', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src="" sx={{ width: 44, height: 44 }} />
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
          {loading ? (
            <Typography sx={{ textAlign: 'center', mt: 6 }}>Loading posts...</Typography>
          ) : error ? (
            <Typography color="error" sx={{ textAlign: 'center', mt: 6 }}>Error loading posts</Typography>
          ) : (
            <Stack spacing={4}>
              {data?.searchPosts?.map((post: any) => (
                <Box key={post.id} sx={{
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
                    <Avatar sx={{ mr: 2, width: 44, height: 44, boxShadow: 1 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#2563EB', ...interFont }}>
                        {post.userFirstName} {post.userLastName}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                        Role: {post.userRole}
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
                    <Button startIcon={<FavoriteBorderIcon />} sx={{ color: '#374151', textTransform: 'none', fontWeight: 600, fontSize: 15, transition: 'color 0.2s', '&:hover': { color: '#2563EB' } }}>Like</Button>
                    <Button startIcon={<ChatBubbleOutlineIcon />} sx={{ color: '#374151', textTransform: 'none', fontWeight: 600, fontSize: 15, transition: 'color 0.2s', '&:hover': { color: '#2563EB' } }}>Comment</Button>
                    <Button startIcon={<ShareIcon />} sx={{ color: '#374151', textTransform: 'none', fontWeight: 600, fontSize: 15, transition: 'color 0.2s', '&:hover': { color: '#2563EB' } }}>Share</Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Right Sidebar */}
        {!isMobile && (
          <Box sx={{ width: 280, ml: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
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

      {/* Create Post Modal (placeholder) */}
      {createOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(37,99,235,0.10)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setCreateOpen(false)}
        >
          <Box
            sx={{
              bgcolor: '#fff',
              borderRadius: 4,
              p: 5,
              minWidth: 360,
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2563EB' }}>Create Post</Typography>
            <Typography sx={{ mb: 2, color: '#374151' }}>Post creation form coming soon.</Typography>
            <Button variant="contained" sx={{ bgcolor: '#2563EB', fontWeight: 600, '&:hover': { bgcolor: '#1D4ED8' } }} onClick={() => setCreateOpen(false)}>
              Close
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Home;