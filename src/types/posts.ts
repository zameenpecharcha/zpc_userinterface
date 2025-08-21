export interface PostMedia {
  id: number;
  mediaType: string;
  mediaUrl: string;
  mediaOrder: number;
  mediaSize?: number;
  caption?: string;
  uploadedAt: string;
}

export interface PostMediaInput {
  mediaType?: string;
  mediaOrder: number;
  caption?: string;
  filePath?: string;
  fileName?: string;
  contentType?: string;
}

export interface Post {
  id: number;
  userId: number;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userPhone: string;
  userRole: string;
  title: string;
  content: string;
  visibility: string;
  propertyType: string;
  location: string;
  latitude?: number;
  longitude?: number;
  price: number;
  status: string;
  createdAt: string;
  media: PostMedia[];
  likeCount: number;
  commentCount: number;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  userFirstName: string;
  userLastName: string;
  userRole: string;
  comment: string;
  parentCommentId?: number;
  status: string;
  addedAt: string;
  commentedAt: string;
  replies: Comment[];
  likeCount: number;
}

export interface PostResponse {
  success: boolean;
  message: string;
  post?: Post;
}

export interface CommentResponse {
  success: boolean;
  message: string;
  comment?: Comment;
}

export interface MediaResponse {
  success: boolean;
  message: string;
}

export interface PostsQueryVariables {
  propertyType?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PostsByUserQueryVariables {
  userId: number;
  page?: number;
  limit?: number;
}

export interface PostCommentsQueryVariables {
  postId: number;
  page?: number;
  limit?: number;
}

export interface CreatePostMutationVariables {
  userId: number;
  title: string;
  content: string;
  visibility: string;
  propertyType: string;
  location: string;
  price: number;
  status: string;
  latitude?: number;
  longitude?: number;
  media?: PostMediaInput[];
}

export interface UpdatePostMutationVariables {
  postId: number;
  title?: string;
  content?: string;
  visibility?: string;
  propertyType?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  status?: string;
}

export interface CreateCommentMutationVariables {
  postId: number;
  userId: number;
  comment: string;
  parentCommentId?: number;
}

export interface UpdateCommentMutationVariables {
  commentId: number;
  comment?: string;
  status?: string;
}

export interface AddPostMediaMutationVariables {
  postId: number;
  media: PostMediaInput[];
}

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FOLLOWERS = 'FOLLOWERS'
}

export enum PostStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
  REPORTED = 'REPORTED'
}

export enum PropertyType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  LAND = 'LAND',
  AGRICULTURAL = 'AGRICULTURAL'
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT'
}
