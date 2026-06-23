import { ApolloClient } from '@apollo/client';
import {
  GET_POST,
  GET_POSTS_BY_USER,
  SEARCH_POSTS,
  GET_POST_COMMENTS,
  CREATE_POST,
  UPDATE_POST,
  DELETE_POST,
  LIKE_POST,
  UNLIKE_POST,
  CREATE_COMMENT,
  UPDATE_COMMENT,
  DELETE_COMMENT,
  LIKE_COMMENT,
  UNLIKE_COMMENT,
  ADD_POST_MEDIA,
  DELETE_POST_MEDIA,
} from '../graphql/posts';
import {
  Post,
  Comment,
  PostResponse,
  CommentResponse,
  MediaResponse,
  PostsQueryVariables,
  PostsByUserQueryVariables,
  PostCommentsQueryVariables,
  CreatePostMutationVariables,
  UpdatePostMutationVariables,
  CreateCommentMutationVariables,
  UpdateCommentMutationVariables,
  AddPostMediaMutationVariables,
} from '../types/posts';

export class PostService {
  private client: ApolloClient<any>;

  constructor(client: ApolloClient<any>) {
    this.client = client;
  }

  async getPost(postId: number): Promise<Post | null> {
    try {
      const { data } = await this.client.query({
        query: GET_POST,
        variables: { postId },
      });
      return data.post;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async getPostsByUser({ userId, page = 1, limit = 10 }: PostsByUserQueryVariables): Promise<Post[]> {
    try {
      const { data } = await this.client.query({
        query: GET_POSTS_BY_USER,
        variables: { userId, page, limit },
      });
      return data.postsByUser;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async searchPosts(variables: PostsQueryVariables): Promise<Post[]> {
    try {
      const { data } = await this.client.query({
        query: SEARCH_POSTS,
        variables,
      });
      return data.searchPosts;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async getPostComments({ postId, page = 1, limit = 10 }: PostCommentsQueryVariables): Promise<Comment[]> {
    try {
      const { data } = await this.client.query({
        query: GET_POST_COMMENTS,
        variables: { postId, page, limit },
      });
      return data.postComments;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async createPost(variables: CreatePostMutationVariables): Promise<PostResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: CREATE_POST,
        variables,
      });
      return data.createPost;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async updatePost(variables: UpdatePostMutationVariables): Promise<PostResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: UPDATE_POST,
        variables,
      });
      return data.updatePost;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async deletePost(postId: number): Promise<PostResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: DELETE_POST,
        variables: { postId },
      });
      return data.deletePost;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async likePost(postId: number, userId: number): Promise<PostResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: LIKE_POST,
        variables: { postId, userId },
      });
      return data.likePost;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async unlikePost(postId: number, userId: number): Promise<PostResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: UNLIKE_POST,
        variables: { postId, userId },
      });
      return data.unlikePost;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async createComment(variables: CreateCommentMutationVariables): Promise<CommentResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: CREATE_COMMENT,
        variables,
      });
      return data.createComment;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async updateComment(variables: UpdateCommentMutationVariables): Promise<CommentResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: UPDATE_COMMENT,
        variables,
      });
      return data.updateComment;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async deleteComment(commentId: number): Promise<CommentResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: DELETE_COMMENT,
        variables: { commentId },
      });
      return data.deleteComment;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async likeComment(commentId: number, userId: number): Promise<CommentResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: LIKE_COMMENT,
        variables: { commentId, userId },
      });
      return data.likeComment;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async unlikeComment(commentId: number, userId: number): Promise<CommentResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: UNLIKE_COMMENT,
        variables: { commentId, userId },
      });
      return data.unlikeComment;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async addPostMedia(variables: AddPostMediaMutationVariables): Promise<PostResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: ADD_POST_MEDIA,
        variables,
      });
      return data.addPostMedia;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }

  async deletePostMedia(mediaId: number): Promise<MediaResponse> {
    try {
      const { data } = await this.client.mutate({
        mutation: DELETE_POST_MEDIA,
        variables: { mediaId },
      });
      return data.deletePostMedia;
    } catch (error: any) {
      throw new Error(error.graphQLErrors?.[0]?.message || error.message);
    }
  }
}
