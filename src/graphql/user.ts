import { gql } from '@apollo/client';

export const GET_USERS = gql`
  query GetUsers($search: String, $page: Int, $limit: Int) {
    users(search: $search, page: $page, limit: $limit) {
      id
      firstName
      lastName
      email
      role
      profilePhotoSignedUrl
      profilePhoto
    }
  }
`;

/** Fast mention / picker search — no signed photo work on the server. */
export const SEARCH_USERS_LIGHT = gql`
  query SearchUsersLight($search: String, $page: Int, $limit: Int) {
    users(search: $search, page: $page, limit: $limit) {
      id
      firstName
      lastName
      email
      role
    }
  }
`;

export const GET_USER_PROFILE = gql`
  query GetUserProfile($id: Int!) {
    user(id: $id) {
      id
      firstName
      lastName
      email
      phone
      profilePhoto
      role
      address
      bio
      isactive
      emailVerified
      phoneVerified
      createdAt
      followersCount
      followingCount
      ratings {
        id
        ratedUserId
        ratedByUserId
        ratingValue
        review
        ratingType
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_USER_FOLLOWERS = gql`
  query GetUserFollowers($userId: Int!) {
    userFollowers(userId: $userId) {
      id
      followerId
      followingId
      status
      followedAt
    }
  }
`;

export const GET_USER_FOLLOWING = gql`
  query GetUserFollowing($userId: Int!) {
    userFollowing(userId: $userId) {
      id
      followerId
      followingId
      status
      followedAt
    }
  }
`;

export const CHECK_FOLLOWING_STATUS = gql`
  query CheckFollowingStatus($userId: Int!, $followingId: Int!) {
    checkFollowingStatus(userId: $userId, followingId: $followingId) {
      id
      followerId
      followingId
      status
      followedAt
    }
  }
`;

export const FOLLOW_USER = gql`
  mutation FollowUser($userId: Int!, $followingId: Int!) {
    followUser(userId: $userId, followingId: $followingId) {
      id
      followerId
      followingId
      status
      followedAt
    }
  }
`;

export const UPDATE_FOLLOW_STATUS = gql`
  mutation UpdateFollowStatus($userId: Int!, $followingId: Int!, $status: String!) {
    updateFollowStatus(userId: $userId, followingId: $followingId, status: $status) {
      id
      followerId
      followingId
      status
      followedAt
    }
  }
`;

export const GET_SUGGESTED_USERS = gql`
  query GetSuggestedUsers($userId: Int!, $limit: Int = 5) {
    suggestedUsers(userId: $userId, limit: $limit) {
      id
      firstName
      lastName
      role
      profilePhotoSignedUrl
      profilePhoto
    }
  }
`;

export const GET_USER_NOTIFICATIONS = gql`
  query GetUserNotifications($userId: Int!, $page: Int = 1, $limit: Int = 20) {
    userNotifications(userId: $userId, page: $page, limit: $limit) {
      total
      notifications {
        id
        userId
        title
        message
        type
        read
        createdAt
        metadata
      }
    }
  }
`;

export const CREATE_NOTIFICATION = gql`
  mutation CreateNotification(
    $userId: Int!
    $title: String!
    $message: String!
    $type: String!
    $metadata: String
  ) {
    createNotification(
      userId: $userId
      title: $title
      message: $message
      type: $type
      metadata: $metadata
    ) {
      id
      userId
      title
      message
      type
      read
      createdAt
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: Int!, $userId: Int!) {
    markNotificationRead(notificationId: $notificationId, userId: $userId) {
      id
      read
    }
  }
`;

// This empty export makes the file a module
export {};