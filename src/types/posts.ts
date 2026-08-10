export interface PostMedia {
  id: string;
  mediaType: string;
  mediaUrl: string;
  signedUrl?: string;
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
  id: string;
  userId: string;
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
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userRole: string;
  comment: string;
  parentCommentId?: string;
  status: string;
  addedAt: string;
  commentedAt: string;
  editedAt?: string;
  replies: Comment[];
  likeCount: number;
  profilePhoto?: string;
  profilePhotoSignedUrl?: string;
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
  query?: string;
  page?: number;
  limit?: number;
}

export interface PostsByUserQueryVariables {
  userId: string;
  page?: number;
  limit?: number;
}

export interface PostCommentsQueryVariables {
  postId: string;
  page?: number;
  limit?: number;
}

export interface CreatePostMutationVariables {
  userId: string;
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
  postId: string;
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
  postId: string;
  userId: string;
  comment: string;
  parentCommentId?: string;
}

export interface UpdateCommentMutationVariables {
  commentId: string;
  comment?: string;
  status?: string;
}

export interface AddPostMediaMutationVariables {
  postId: string;
  media: PostMediaInput[];
}

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FOLLOWERS = 'FOLLOWERS'
}

export enum PostStatus {
  PUBLISHED = 'PUBLISHED',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
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
