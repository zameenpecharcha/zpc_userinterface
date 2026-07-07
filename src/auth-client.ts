import { ApolloClient, InMemoryCache } from '@apollo/client';
import { GRAPHQL_URL } from './config/api';

const authClient = new ApolloClient({
  uri: GRAPHQL_URL,
  cache: new InMemoryCache(),
});

export default authClient; 