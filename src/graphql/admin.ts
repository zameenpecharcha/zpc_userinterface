import { gql } from '@apollo/client';

/** Admin console — users with operational fields. */
export const ADMIN_USERS = gql`
  query AdminUsers($search: String, $page: Int, $limit: Int) {
    users(search: $search, page: $page, limit: $limit) {
      id
      firstName
      lastName
      email
      phone
      role
      address
      latitude
      longitude
      isactive
      lastLoginAt
      emailVerified
      phoneVerified
      createdAt
      profilePhotoSignedUrl
      profilePhoto
    }
  }
`;

/** Admin console — property inventory. */
export const ADMIN_PROPERTIES = gql`
  query AdminProperties($query: String) {
    searchProperties(query: $query) {
      propertyId
      userId
      title
      description
      price
      location
      city
      state
      propertyType
      status
      isActive
      bedrooms
      bathrooms
      area
      viewCount
      createdAt
      updatedAt
    }
  }
`;

/** Admin console — recent posts across the platform. */
export const ADMIN_POSTS = gql`
  query AdminPosts($page: Int, $limit: Int) {
    searchPosts(page: $page, limit: $limit) {
      id
      userId
      userFirstName
      userLastName
      title
      content
      propertyType
      location
      status
      likeCount
      commentCount
      createdAt
    }
  }
`;

export const ADMIN_DELETE_POST = gql`
  mutation AdminDeletePost($postId: Int!) {
    deletePost(postId: $postId) {
      success
      message
    }
  }
`;

export const ADMIN_DELETE_PROPERTY = gql`
  mutation AdminDeleteProperty($propertyId: String!) {
    deleteProperty(propertyId: $propertyId)
  }
`;

export const ADMIN_UPDATE_USER_ROLE = gql`
  mutation AdminUpdateUserRole($userId: Int!, $role: String!) {
    updateUserRole(userId: $userId, role: $role) {
      id
      role
      firstName
      lastName
      email
    }
  }
`;
