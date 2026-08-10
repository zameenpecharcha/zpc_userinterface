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

  async getPost(postId: string): Promise<Post | null> {
    const { data } = await this.client.query({
      query: GET_POST,
      variables: { postId },
    });
    return data.post;
  }

  async getPostsByUser({ userId, page = 1, limit = 10 }: PostsByUserQueryVariables): Promise<Post[]> {
    const { data } = await this.client.query({
      query: GET_POSTS_BY_USER,
      variables: { userId, page, limit },
    });
    return data.postsByUser;
  }

  async searchPosts(variables: PostsQueryVariables): Promise<Post[]> {
    const { data } = await this.client.query({
      query: SEARCH_POSTS,
      variables,
    });
    return data.searchPosts;
  }

  async getPostComments({ postId, page = 1, limit = 10 }: PostCommentsQueryVariables): Promise<Comment[]> {
    const { data } = await this.client.query({
      query: GET_POST_COMMENTS,
      variables: { postId, page, limit },
    });
    return data.postComments;
  }

  async createPost(variables: CreatePostMutationVariables): Promise<PostResponse> {
    const { data } = await this.client.mutate({
      mutation: CREATE_POST,
      variables,
    });
    return data.createPost;
  }

  async updatePost(variables: UpdatePostMutationVariables): Promise<PostResponse> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_POST,
      variables,
    });
    return data.updatePost;
  }

  async deletePost(postId: string): Promise<PostResponse> {
    const { data } = await this.client.mutate({
      mutation: DELETE_POST,
      variables: { postId },
    });
    return data.deletePost;
  }

  async likePost(postId: string, userId: string): Promise<PostResponse> {
    const { data } = await this.client.mutate({
      mutation: LIKE_POST,
      variables: { postId, userId },
    });
    return data.likePost;
  }

  async unlikePost(postId: string, userId: string): Promise<PostResponse> {
    const { data } = await this.client.mutate({
      mutation: UNLIKE_POST,
      variables: { postId, userId },
    });
    return data.unlikePost;
  }

  async createComment(variables: CreateCommentMutationVariables): Promise<CommentResponse> {
    const { data } = await this.client.mutate({
      mutation: CREATE_COMMENT,
      variables,
    });
    return data.createComment;
  }

  async updateComment(variables: UpdateCommentMutationVariables): Promise<CommentResponse> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_COMMENT,
      variables,
    });
    return data.updateComment;
  }

  async deleteComment(commentId: string): Promise<CommentResponse> {
    const { data } = await this.client.mutate({
      mutation: DELETE_COMMENT,
      variables: { commentId },
    });
    return data.deleteComment;
  }

  async likeComment(commentId: string, userId: string, reactionType?: string): Promise<CommentResponse> {
    const { data } = await this.client.mutate({
      mutation: LIKE_COMMENT,
      variables: { commentId, userId, reactionType: reactionType || 'LIKE' },
    });
    return data.likeComment;
  }

  async unlikeComment(commentId: string, userId: string): Promise<CommentResponse> {
    const { data } = await this.client.mutate({
      mutation: UNLIKE_COMMENT,
      variables: { commentId, userId },
    });
    return data.unlikeComment;
  }

  async addPostMedia(variables: AddPostMediaMutationVariables): Promise<PostResponse> {
    const { data } = await this.client.mutate({
      mutation: ADD_POST_MEDIA,
      variables,
    });
    return data.addPostMedia;
  }

  async deletePostMedia(mediaId: string): Promise<MediaResponse> {
    const { data } = await this.client.mutate({
      mutation: DELETE_POST_MEDIA,
      variables: { mediaId },
    });
    return data.deletePostMedia;
  }
}
