import { gql } from '@apollo/client';

export const GLOBAL_SEARCH = gql`
  query GlobalSearch($request: GlobalSearchRequest!) {
    globalSearch(request: $request) {
      totalHits
      page
      size
      results {
        id
        entityType
        title
        bio
        description
        imageUrl
        location
      }
    }
  }
`;
