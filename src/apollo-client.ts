import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:8000/api/v1/users/graphql',
  cache: new InMemoryCache(),
});

export default client; 