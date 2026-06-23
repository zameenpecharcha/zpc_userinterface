import { ApolloClient } from '@apollo/client';
import {
  GET_USER_PROFILE,
  GET_USER_FOLLOWERS,
  GET_USER_FOLLOWING,
  CHECK_FOLLOWING_STATUS,
  FOLLOW_USER,
  UPDATE_FOLLOW_STATUS
} from '../graphql/user';
import { UserInfo } from '../types/auth';

export interface UserFollower {
  id: number;
  followerId: number;
  followingId: number;
  status: string;
  followedAt: string;
}

export interface UserRating {
  id: number;
  ratedUserId: number;
  ratedByUserId: number;
  ratingValue: number;
  review?: string;
  ratingType?: string;
  createdAt: string;
  updatedAt: string;
}

export class UserService {
  private client: ApolloClient<any>;

  constructor(client: ApolloClient<any>) {
    this.client = client;
  }

  async getUserProfile(id: number): Promise<UserInfo> {
    const { data } = await this.client.query({
      query: GET_USER_PROFILE,
      variables: { id },
      fetchPolicy: 'network-only'
    });
    return data.user;
  }

  async getUserFollowers(userId: number): Promise<UserFollower[]> {
    const { data } = await this.client.query({
      query: GET_USER_FOLLOWERS,
      variables: { userId },
      fetchPolicy: 'network-only'
    });
    return data.userFollowers;
  }

  async getUserFollowing(userId: number): Promise<UserFollower[]> {
    const { data } = await this.client.query({
      query: GET_USER_FOLLOWING,
      variables: { userId },
      fetchPolicy: 'network-only'
    });
    return data.userFollowing;
  }

  async checkFollowingStatus(userId: number, followingId: number): Promise<UserFollower | null> {
    const { data } = await this.client.query({
      query: CHECK_FOLLOWING_STATUS,
      variables: { userId, followingId },
      fetchPolicy: 'network-only'
    });
    return data.checkFollowingStatus;
  }

  async followUser(userId: number, followingId: number): Promise<UserFollower> {
    const { data } = await this.client.mutate({
      mutation: FOLLOW_USER,
      variables: { userId, followingId }
    });
    return data.followUser;
  }

  async updateFollowStatus(userId: number, followingId: number, status: string): Promise<UserFollower> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_FOLLOW_STATUS,
      variables: { userId, followingId, status }
    });
    return data.updateFollowStatus;
  }
}

// This empty export makes the file a module
export {};