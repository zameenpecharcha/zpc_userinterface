import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Register from './components/Register';
import Home from './components/Home';
import Landing from './components/Landing';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import Profile from './components/Profile';
import client from './apollo-client';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366F1',
    },
    secondary: {
      main: '#4F46E5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;
