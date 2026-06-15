import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8000/api/v1/graphql',
  cache: new InMemoryCache(),
});

export const WS_CHAT_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/api/v1/ws/chat';

export default client;
