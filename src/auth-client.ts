import { ApolloClient, InMemoryCache } from '@apollo/client';

const authClient = new ApolloClient({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8080/api/v1/graphql',
  cache: new InMemoryCache(),
});

export default authClient; 