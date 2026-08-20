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
    userProfilePhoto
    userProfilePhotoSignedUrl
    media {
      id
      mediaType
      mediaUrl
      signedUrl
      mediaOrder
      mediaSize
      caption
      uploadedAt
    }
    likeCount
    commentCount
    shareCount
    viewCount
    reportCount
    isLiked
    isPinned
    pinnedAt
    allowComments
    allowShare
    allowReactions
    propertyId
    postCode
    isAnonymous
  }
`;

// Queries
export const GET_POST = gql`
  query GetPost($postId: String!) {
    post(postId: $postId) {
      ...PostFields
    }
  }
  ${POST_FIELDS}
`;

export const GET_POSTS_BY_USER = gql`
  query GetPostsByUser($userId: String!, $page: Int = 1, $limit: Int = 10) {
    postsByUser(userId: $userId, page: $page, limit: $limit) {
      ...PostFields
    }
  }
  ${POST_FIELDS}
`;

export const GET_PROPERTY_POSTS = gql`
  query GetPropertyPosts($propertyId: String!, $page: Int = 1, $limit: Int = 8) {
    propertyPosts(propertyId: $propertyId, page: $page, limit: $limit) {
      posts {
        ...PostFields
      }
      totalCount
      page
      totalPages
    }
  }
  ${POST_FIELDS}
`;

export const SEARCH_POSTS = gql`
  query SearchPosts(
    $page: Int = 1
    $limit: Int = 10
    $query: String
    $location: String
    $propertyType: String
    $minPrice: Float
    $maxPrice: Float
    $status: String
    $hashtag: String
  ) {
    searchPosts(
      page: $page
      limit: $limit
      query: $query
      location: $location
      propertyType: $propertyType
      minPrice: $minPrice
      maxPrice: $maxPrice
      status: $status
      hashtag: $hashtag
    ) {
      id
      userId
      userFirstName
      userLastName
      userRole
      userProfilePhoto
      userProfilePhotoSignedUrl
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
      likeCount
      commentCount
      isLiked
      isPinned
      pinnedAt
      media {
        id
        mediaType
        mediaUrl
        signedUrl
        mediaOrder
        mediaSize
        caption
        uploadedAt
      }
    }
  }
`;

/** Lightweight search cards — no media / geo to avoid S3 presign cost */
export const SEARCH_POSTS_LIGHT = gql`
  query SearchPostsLight(
    $page: Int = 1
    $limit: Int = 10
    $query: String
    $location: String
    $propertyType: String
  ) {
    searchPosts(
      page: $page
      limit: $limit
      query: $query
      location: $location
      propertyType: $propertyType
    ) {
      id
      userId
      userFirstName
      userLastName
      title
      content
      location
      propertyType
      createdAt
      likeCount
      commentCount
    }
  }
`;

export const TRENDING_POSTS = gql`
  query TrendingPosts($limit: Int = 5) {
    trendingPosts(limit: $limit) {
      id
      title
      likeCount
      commentCount
    }
  }
`;

export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: String!, $page: Int = 1, $limit: Int = 10) {
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
      editedAt
      likeCount
      profilePhoto
      profilePhotoSignedUrl
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
        editedAt
        likeCount
        profilePhoto
        profilePhotoSignedUrl
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
          editedAt
          likeCount
          profilePhoto
          profilePhotoSignedUrl
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
            editedAt
            likeCount
            profilePhoto
            profilePhotoSignedUrl
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
              editedAt
              likeCount
              profilePhoto
              profilePhotoSignedUrl
            }
          }
        }
      }
    }
  }
`;

// Mutations
export const CREATE_POST = gql`
  mutation CreatePost(
    $userId: String!
    $title: String!
    $content: String!
    $visibility: String!
    $propertyType: String!
    $location: String!
    $price: Float!
    $status: String!
    $latitude: Float
    $longitude: Float
    $propertyId: String
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
      propertyId: $propertyId
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
    $postId: String!
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
  mutation DeletePost($postId: String!) {
    deletePost(postId: $postId) {
      success
      message
    }
  }
`;

export const LIKE_POST = gql`
  mutation LikePost($postId: String!, $userId: String!) {
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
  mutation UnlikePost($postId: String!, $userId: String!) {
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
    $postId: String!
    $userId: String!
    $comment: String!
    $parentCommentId: String
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
    $commentId: String!
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
        editedAt
      }
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($commentId: String!) {
    deleteComment(commentId: $commentId) {
      success
      message
    }
  }
`;

export const LIKE_COMMENT = gql`
  mutation LikeComment($commentId: String!, $userId: String!, $reactionType: String) {
    likeComment(commentId: $commentId, userId: $userId, reactionType: $reactionType) {
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
  mutation UnlikeComment($commentId: String!, $userId: String!) {
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
  mutation AddPostMedia($postId: String!, $media: [PostMediaInput!]!) {
    addPostMedia(postId: $postId, media: $media) {
      success
      message
      post {
        id
        media {
          id
          mediaType
          mediaUrl
          signedUrl
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
  mutation DeletePostMedia($mediaId: String!) {
    deletePostMedia(mediaId: $mediaId) {
      success
      message
    }
  }
`;

export const SHARE_POST = gql`
  mutation SharePost($postId: String!, $sharedBy: String!, $shareType: String, $caption: String, $visibility: String) {
    sharePost(
      postId: $postId
      sharedBy: $sharedBy
      shareType: $shareType
      caption: $caption
      visibility: $visibility
    ) {
      success
      message
      share {
        id
        shareCode
        postId
        shareType
      }
    }
  }
`;

export const REPORT_POST = gql`
  mutation ReportPost(
    $postId: String!
    $reportedBy: String!
    $reportedUserId: String
    $reasonCode: String
    $description: String
  ) {
    reportPost(
      postId: $postId
      reportedBy: $reportedBy
      reportedUserId: $reportedUserId
      reasonCode: $reasonCode
      description: $description
    ) {
      success
      message
      report {
        id
        reportCode
        status
      }
    }
  }
`;

export const GET_POST_LIKES = gql`
  query PostLikes($postId: String!, $page: Int, $limit: Int) {
    postLikes(postId: $postId, page: $page, limit: $limit) {
      totalCount
      page
      totalPages
      likes {
        userId
        firstName
        lastName
        userRole
        reactionType
        likedAt
        profilePhoto
        profilePhotoSignedUrl
      }
    }
  }
`;

export const PIN_POST = gql`
  mutation PinPost($postId: String!, $userId: String!) {
    pinPost(postId: $postId, userId: $userId) {
      success
      message
      post {
        id
        isPinned
        pinnedAt
      }
    }
  }
`;

export const UNPIN_POST = gql`
  mutation UnpinPost($postId: String!, $userId: String!) {
    unpinPost(postId: $postId, userId: $userId) {
      success
      message
      post {
        id
        isPinned
        pinnedAt
      }
    }
  }
`;
