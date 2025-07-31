import React from 'react';
import { Box, Typography, Avatar, Button, Stack, Divider, LinearProgress, InputBase } from '@mui/material';

const profileData = {
  name: 'Sarah Johnson',
  role: 'UX Designer at TechCorp',
  location: 'San Francisco, CA',
  avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
  cover: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80',
  friends: 1234,
  posts: 567,
  rating: 4.8,
  reviews: 127,
  ratings: [75, 20, 3, 1, 1], // 5*, 4*, 3*, 2*, 1*
  comments: [
    {
      name: 'Mike Chen',
      text: 'Excellent collaboration skills and always delivers high-quality work. Great team player!',
      date: '2 days ago',
      rating: 5,
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      likes: 12,
    },
    {
      name: 'Emma Wilson',
      text: 'Sarah’s design insights are incredible. She helped transform our entire user experience!',
      date: '1 week ago',
      rating: 5,
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      likes: 8,
    },
    {
      name: 'Alex Rodriguez',
      text: 'Professional and reliable. Always meets deadlines.',
      date: '3 weeks ago',
      rating: 4,
      avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
      likes: 4,
    },
  ],
};

const Profile = () => {
  return (
    <Box sx={{ bgcolor: '#F6F8FB', minHeight: '100vh', fontFamily: 'Inter, Roboto, Arial, sans-serif' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#fff', boxShadow: 1, mb: 3 }}>
        <Box sx={{ maxWidth: 900, mx: 'auto', position: 'relative' }}>
          <img src={profileData.cover} alt="Cover" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: '16px 16px 0 0' }} />
          <Button variant="contained" sx={{ position: 'absolute', right: 24, top: 16, bgcolor: '#374151', color: '#fff', fontWeight: 600, borderRadius: 2, px: 2, py: 0.5 }}>Edit Cover</Button>
          <Box sx={{ position: 'absolute', left: 32, top: 120 }}>
            <Avatar src={profileData.avatar} sx={{ width: 96, height: 96, border: '4px solid #fff', boxShadow: 2 }} />
          </Box>
        </Box>
      </Box>
      <Box sx={{ maxWidth: 900, mx: 'auto', display: 'flex', gap: 3 }}>
        {/* Left/Main Section */}
        <Box sx={{ flex: 2 }}>
          <Box sx={{ bgcolor: '#fff', borderRadius: 4, boxShadow: 1, p: 4, pt: 6, position: 'relative', mb: 3 }}>
            <Box sx={{ position: 'absolute', left: 32, top: -48 }}>
              {/* Avatar already rendered above */}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563EB', mb: 0.5 }}>{profileData.name}</Typography>
            <Typography sx={{ color: '#374151', fontWeight: 500, fontSize: 17 }}>{profileData.role}</Typography>
            <Typography sx={{ color: '#6B7280', fontSize: 15, mb: 2 }}>{profileData.location}</Typography>
            <Stack direction="row" spacing={6} sx={{ mb: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 22, color: '#2563EB' }}>{profileData.friends.toLocaleString()}</Typography>
                <Typography sx={{ color: '#6B7280', fontWeight: 500, fontSize: 15 }}>Friends</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 22, color: '#2563EB' }}>{profileData.posts.toLocaleString()}</Typography>
                <Typography sx={{ color: '#6B7280', fontWeight: 500, fontSize: 15 }}>Posts</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 22, color: '#2563EB' }}>{profileData.rating}</Typography>
                <Typography sx={{ color: '#6B7280', fontWeight: 500, fontSize: 15 }}>Rating</Typography>
              </Box>
            </Stack>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button variant="contained" sx={{ bgcolor: '#6366F1', fontWeight: 600, borderRadius: 2, px: 3 }}>Add Friend</Button>
              <Button variant="outlined" sx={{ color: '#374151', borderColor: '#374151', fontWeight: 600, borderRadius: 2, px: 3 }}>Message</Button>
            </Box>
          </Box>
          {/* Create Post Card */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 4, boxShadow: 1, p: 3, mb: 3 }}>
            <InputBase
              placeholder={`What's on your mind, Sarah?`}
              sx={{ bgcolor: '#F3F4F6', px: 3, py: 1.5, borderRadius: 3, fontSize: 17, boxShadow: 1, mb: 2 }}
              readOnly
            />
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Button size="medium" sx={{ color: '#374151', textTransform: 'none', fontWeight: 600, fontSize: 15 }}>Photo</Button>
              <Button size="medium" sx={{ color: '#6366F1', textTransform: 'none', fontWeight: 600, fontSize: 15 }}>Video</Button>
              <Button size="medium" sx={{ color: '#F59E42', textTransform: 'none', fontWeight: 600, fontSize: 15 }}>Feeling</Button>
              <Button variant="contained" sx={{ bgcolor: '#2563EB', fontWeight: 600, ml: 'auto', px: 4 }}>Post</Button>
            </Box>
          </Box>
          {/* Posts Feed */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 4, boxShadow: 1, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar src={profileData.avatar} sx={{ width: 38, height: 38 }} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#2563EB' }}>Sarah Johnson</Typography>
                <Typography sx={{ fontSize: 13, color: '#6B7280' }}>2 hours ago</Typography>
              </Box>
            </Box>
            <Typography sx={{ color: '#374151', fontSize: 16, mb: 2 }}>Just finished an amazing UX workshop! Learning never stops in this field. Excited to apply these new techniques to my upcoming projects.</Typography>
            <Box sx={{ mb: 2 }}>
              <img src="https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80" alt="Post" style={{ width: '100%', borderRadius: 12, maxHeight: 340, objectFit: 'cover', boxShadow: '0 2px 8px rgba(37,99,235,0.08)' }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 4, mt: 1 }}>
              <Typography sx={{ fontSize: 15, color: '#374151' }}>24</Typography>
              <Typography sx={{ fontSize: 15, color: '#374151' }}>8</Typography>
              <Typography sx={{ fontSize: 15, color: '#374151' }}>Share</Typography>
            </Box>
          </Box>
        </Box>
        {/* Right Sidebar */}
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Box sx={{ bgcolor: '#fff', borderRadius: 4, boxShadow: 1, p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2563EB' }}>Ratings & Reviews</Typography>
              <Button variant="outlined" sx={{ color: '#6366F1', borderColor: '#6366F1', fontWeight: 600, borderRadius: 2, px: 2 }}>Rate User</Button>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 38, color: '#2563EB', mb: 0.5 }}>{profileData.rating}</Typography>
            <Typography sx={{ color: '#6B7280', fontSize: 15, mb: 2 }}>Based on {profileData.reviews} reviews</Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {['5★', '4★', '3★', '2★', '1★'].map((star, idx) => (
                <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 15, color: '#374151', width: 32 }}>{star}</Typography>
                  <LinearProgress variant="determinate" value={profileData.ratings[idx]} sx={{ flex: 1, height: 8, borderRadius: 2, bgcolor: '#EEF2FB', '& .MuiLinearProgress-bar': { bgcolor: '#2563EB' } }} />
                  <Typography sx={{ fontSize: 13, color: '#6B7280', width: 32 }}>{profileData.ratings[idx]}%</Typography>
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              {profileData.comments.map((review, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar src={review.avatar} sx={{ width: 32, height: 32 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#2563EB' }}>{review.name} <span style={{ color: '#F59E42', fontWeight: 700 }}>★</span></Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mb: 0.5 }}>{review.date}</Typography>
                    <Typography sx={{ fontSize: 14, color: '#374151', mb: 0.5 }}>{review.text}</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6366F1' }}>👍 {review.likes}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;
