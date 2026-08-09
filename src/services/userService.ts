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
  id: string;
  followerId: string;
  followingId: string;
  status: string;
  followedAt: string;
}

export interface UserRating {
  id: string;
  ratedUserId: string;
  ratedByUserId: string;
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

  async getUserProfile(id: string): Promise<UserInfo> {
    const { data } = await this.client.query({
      query: GET_USER_PROFILE,
      variables: { id },
      fetchPolicy: 'network-only'
    });
    return data.user;
  }

  async getUserFollowers(userId: string): Promise<UserFollower[]> {
    const { data } = await this.client.query({
      query: GET_USER_FOLLOWERS,
      variables: { userId },
      fetchPolicy: 'network-only'
    });
    return data.userFollowers;
  }

  async getUserFollowing(userId: string): Promise<UserFollower[]> {
    const { data } = await this.client.query({
      query: GET_USER_FOLLOWING,
      variables: { userId },
      fetchPolicy: 'network-only'
    });
    return data.userFollowing;
  }

  async checkFollowingStatus(userId: string, followingId: string): Promise<UserFollower | null> {
    const { data } = await this.client.query({
      query: CHECK_FOLLOWING_STATUS,
      variables: { userId, followingId },
      fetchPolicy: 'network-only'
    });
    return data.checkFollowingStatus;
  }

  async followUser(userId: string, followingId: string): Promise<UserFollower> {
    const { data } = await this.client.mutate({
      mutation: FOLLOW_USER,
      variables: { userId, followingId }
    });
    return data.followUser;
  }

  async updateFollowStatus(followerId: string, followingId: string, status: string): Promise<UserFollower> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_FOLLOW_STATUS,
      variables: { followerId, followingId, status }
    });
    return data.updateFollowStatus;
  }
}

export {};
