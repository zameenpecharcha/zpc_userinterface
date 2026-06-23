import { gql } from '@apollo/client';

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

// This empty export makes the file a module
export {};