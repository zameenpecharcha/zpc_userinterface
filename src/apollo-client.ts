import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8000/api/v1/graphql';

// Create HTTP link
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: 'include', // This enables sending cookies
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      
      // If we get an authentication error, clear the tokens and redirect to login
      if (message.includes('not logged in') || message.includes('not authenticated') || message.toLowerCase().includes('expired') || message.toLowerCase().includes('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Avoid runtime crashes: soft-redirect
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.replace('/');
        }
        return;
      }
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    const msg = String((networkError as any)?.message || networkError);
    const status = (networkError as any)?.statusCode || (networkError as any)?.response?.status;
    if (status === 401 || status === 403 || msg.includes('Failed to fetch')) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } catch {}
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.replace('/');
      }
    }
  }
  return forward ? forward(operation) : undefined;
});

// Auth link to add headers
const authLink = setContext((_, { headers }) => {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// Create Apollo Client
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
});

export const WS_CHAT_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/api/v1/ws/chat';

export default client;
