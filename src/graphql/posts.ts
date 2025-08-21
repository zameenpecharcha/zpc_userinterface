import { gql } from '@apollo/client';

// Fragment for common post fields
export const POST_FIELDS = gql`
  fragment PostFields on Post {
    id
    userId
    userFirstName
    userLastName
    userEmail
    userPhone
    userRole
    title
    content
    visibility
    propertyType
    location
    latitude
    longitude
    price
    status
    createdAt
    media {
      id
      mediaType
      mediaUrl
      mediaOrder
      mediaSize
      caption
      uploadedAt
    }
    likeCount
    commentCount
  }
`;

// Queries
export const GET_POST = gql`
  query GetPost($postId: Int!) {
    post(postId: $postId) {
      ...PostFields
    }
  }
  ${POST_FIELDS}
`;

export const GET_POSTS_BY_USER = gql`
  query GetPostsByUser($userId: Int!, $page: Int = 1, $limit: Int = 10) {
    postsByUser(userId: $userId, page: $page, limit: $limit) {
      ...PostFields
    }
  }
  ${POST_FIELDS}
`;

export const SEARCH_POSTS = gql`
  query SearchPosts(
    $propertyType: String
    $location: String
    $minPrice: Float
    $maxPrice: Float
    $status: String
    $page: Int = 1
    $limit: Int = 10
  ) {
    searchPosts(
      propertyType: $propertyType
      location: $location
      minPrice: $minPrice
      maxPrice: $maxPrice
      status: $status
      page: $page
      limit: $limit
    ) {
      ...PostFields
    }
  }
  ${POST_FIELDS}
`;

export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: Int!, $page: Int = 1, $limit: Int = 10) {
    postComments(postId: $postId, page: $page, limit: $limit) {
      id
      postId
      userId
      userFirstName
      userLastName
      userRole
      comment
      parentCommentId
      status
      addedAt
      commentedAt
      replies {
        id
        postId
        userId
        userFirstName
        userLastName
        userRole
        comment
        parentCommentId
        status
        addedAt
        commentedAt
        likeCount
      }
      likeCount
    }
  }
`;

// Mutations
export const CREATE_POST = gql`
  mutation CreatePost(
    $userId: Int!
    $title: String!
    $content: String!
    $visibility: String!
    $propertyType: String!
    $location: String!
    $price: Float!
    $status: String!
    $latitude: Float
    $longitude: Float
    $media: [PostMediaInput!]
  ) {
    createPost(
      userId: $userId
      title: $title
      content: $content
      visibility: $visibility
      propertyType: $propertyType
      location: $location
      price: $price
      status: $status
      latitude: $latitude
      longitude: $longitude
      media: $media
    ) {
      success
      message
      post {
        ...PostFields
      }
    }
  }
  ${POST_FIELDS}
`;

export const UPDATE_POST = gql`
  mutation UpdatePost(
    $postId: Int!
    $title: String
    $content: String
    $visibility: String
    $propertyType: String
    $location: String
    $latitude: Float
    $longitude: Float
    $price: Float
    $status: String
  ) {
    updatePost(
      postId: $postId
      title: $title
      content: $content
      visibility: $visibility
      propertyType: $propertyType
      location: $location
      latitude: $latitude
      longitude: $longitude
      price: $price
      status: $status
    ) {
      success
      message
      post {
        ...PostFields
      }
    }
  }
  ${POST_FIELDS}
`;

export const DELETE_POST = gql`
  mutation DeletePost($postId: Int!) {
    deletePost(postId: $postId) {
      success
      message
    }
  }
`;

export const LIKE_POST = gql`
  mutation LikePost($postId: Int!, $userId: Int!) {
    likePost(postId: $postId, userId: $userId) {
      success
      message
      post {
        id
        likeCount
      }
    }
  }
`;

export const UNLIKE_POST = gql`
  mutation UnlikePost($postId: Int!, $userId: Int!) {
    unlikePost(postId: $postId, userId: $userId) {
      success
      message
      post {
        id
        likeCount
      }
    }
  }
`;

export const CREATE_COMMENT = gql`
  mutation CreateComment(
    $postId: Int!
    $userId: Int!
    $comment: String!
    $parentCommentId: Int
  ) {
    createComment(
      postId: $postId
      userId: $userId
      comment: $comment
      parentCommentId: $parentCommentId
    ) {
      success
      message
      comment {
        id
        postId
        userId
        userFirstName
        userLastName
        userRole
        comment
        parentCommentId
        status
        addedAt
        commentedAt
        replies {
          id
          postId
          userId
          userFirstName
          userLastName
          userRole
          comment
          parentCommentId
          status
          addedAt
          commentedAt
          likeCount
        }
        likeCount
      }
    }
  }
`;

export const UPDATE_COMMENT = gql`
  mutation UpdateComment(
    $commentId: Int!
    $comment: String
    $status: String
  ) {
    updateComment(
      commentId: $commentId
      comment: $comment
      status: $status
    ) {
      success
      message
      comment {
        id
        comment
        status
      }
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($commentId: Int!) {
    deleteComment(commentId: $commentId) {
      success
      message
    }
  }
`;

export const LIKE_COMMENT = gql`
  mutation LikeComment($commentId: Int!, $userId: Int!) {
    likeComment(commentId: $commentId, userId: $userId) {
      success
      message
      comment {
        id
        likeCount
      }
    }
  }
`;

export const UNLIKE_COMMENT = gql`
  mutation UnlikeComment($commentId: Int!, $userId: Int!) {
    unlikeComment(commentId: $commentId, userId: $userId) {
      success
      message
      comment {
        id
        likeCount
      }
    }
  }
`;

export const ADD_POST_MEDIA = gql`
  mutation AddPostMedia($postId: Int!, $media: [PostMediaInput!]!) {
    addPostMedia(postId: $postId, media: $media) {
      success
      message
      post {
        id
        media {
          id
          mediaType
          mediaUrl
          mediaOrder
          mediaSize
          caption
          uploadedAt
        }
      }
    }
  }
`;

export const DELETE_POST_MEDIA = gql`
  mutation DeletePostMedia($mediaId: Int!) {
    deletePostMedia(mediaId: $mediaId) {
      success
      message
    }
  }
`;
