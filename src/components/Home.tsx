import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const Home = () => {
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography
          component="h1"
          variant="h3"
          sx={{ color: '#6366F1', mb: 2, fontWeight: 500 }}
        >
          Welcome to Zameen pe charcha
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ color: '#6B7280', mb: 6, textAlign: 'center' }}
        >
          A single platform for all your real needs
        </Typography>
      </Box>
    </Container>
  );
};

export default Home; 