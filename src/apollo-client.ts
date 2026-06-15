import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8000/api/v1/graphql';

const httpLink = new HttpLink({ uri: GRAPHQL_URL });

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

export const WS_CHAT_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/api/v1/ws/chat';

export default client;
