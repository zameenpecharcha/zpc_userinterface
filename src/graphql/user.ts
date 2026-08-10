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
  query GetUserProfile($id: String!) {
    user(id: $id) {
      id
      firstName
      lastName
      email
      phone
      profilePhoto
      profilePhotoSignedUrl
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
        raterFirstName
        raterLastName
        raterProfilePhoto
        raterProfilePhotoSignedUrl
      }
    }
  }
`;

const FOLLOW_USER_PROFILE_FIELDS = `
      userFirstName
      userLastName
      userRole
      userProfilePhoto
      userProfilePhotoSignedUrl
`;

export const GET_USER_FOLLOWERS = gql`
  query GetUserFollowers($userId: String!) {
    userFollowers(userId: $userId) {
      id
      followerId
      followingId
      status
      followedAt
      ${FOLLOW_USER_PROFILE_FIELDS}
    }
  }
`;

export const GET_USER_FOLLOWING = gql`
  query GetUserFollowing($userId: String!) {
    userFollowing(userId: $userId) {
      id
      followerId
      followingId
      status
      followedAt
      ${FOLLOW_USER_PROFILE_FIELDS}
    }
  }
`;

export const CHECK_FOLLOWING_STATUS = gql`
  query CheckFollowingStatus($userId: String!, $followingId: String!) {
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
  mutation FollowUser($userId: String!, $followingId: String!) {
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
  mutation UpdateFollowStatus($followerId: String!, $followingId: String!, $status: String!) {
    updateFollowStatus(followerId: $followerId, followingId: $followingId, status: $status) {
      id
      followerId
      followingId
      status
      followedAt
    }
  }
`;

export const GET_SUGGESTED_USERS = gql`
  query GetSuggestedUsers($userId: String!, $limit: Int = 5) {
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
  query GetUserNotifications($userId: String!, $page: Int = 1, $limit: Int = 20) {
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
    $userId: String!
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
  mutation MarkNotificationRead($notificationId: String!, $userId: String!) {
    markNotificationRead(notificationId: $notificationId, userId: $userId) {
      id
      read
    }
  }
`;

export const UPDATE_PROFILE_PHOTO = gql`
  mutation UpdateProfilePhoto(
    $userId: String!
    $filePath: String!
    $fileName: String
    $contentType: String
  ) {
    updateProfilePhoto(
      userId: $userId
      filePath: $filePath
      fileName: $fileName
      contentType: $contentType
    ) {
      id
      profilePhotoId
      profilePhotoSignedUrl
    }
  }
`;

export const UPDATE_COVER_PHOTO = gql`
  mutation UpdateCoverPhoto(
    $userId: String!
    $filePath: String!
    $fileName: String
    $contentType: String
  ) {
    updateCoverPhoto(
      userId: $userId
      filePath: $filePath
      fileName: $fileName
      contentType: $contentType
    ) {
      id
      coverPhotoId
      coverPhotoSignedUrl
    }
  }
`;

export const PENDING_FOLLOW_REQUESTS = gql`
  query PendingFollowRequests($userId: String!) {
    pendingFollowRequests(userId: $userId) {
      id
      followerId
      followingId
      status
      followedAt
      userFirstName
      userLastName
      userRole
      userProfilePhoto
      userProfilePhotoSignedUrl
    }
  }
`;

export const GET_USER_RATINGS = gql`
  query GetUserRatings($userId: String!) {
    userRatings(userId: $userId) {
      id
      ratedUserId
      ratedByUserId
      ratingValue
      review
      ratingType
      createdAt
      raterFirstName
      raterLastName
    }
  }
`;

export {};
