import { ApolloClient, InMemoryCache } from '@apollo/client';

const authClient = new ApolloClient({
  uri: 'http://localhost:8000/api/v1/auth/graphql',
  cache: new InMemoryCache(),
});

export default authClient; 