import { gql } from '@apollo/client';

/** Admin console — users with operational fields. */
export const ADMIN_USERS = gql`
  query AdminUsers($search: String, $page: Int, $limit: Int) {
    users(search: $search, page: $page, limit: $limit) {
      id
      firstName
      lastName
      email
      phone
      role
      address
      latitude
      longitude
      isactive
      emailVerified
      phoneVerified
      createdAt
      profilePhotoSignedUrl
      profilePhoto
    }
  }
`;

/** Admin console — published inventory. */
export const ADMIN_PROPERTIES = gql`
  query AdminProperties($page: Int, $limit: Int) {
    publicProperties(page: $page, limit: $limit) {
      total
      page
      limit
      properties {
        id
        propertyCode
        title
        description
        createdBy
        creatorFirstName
        creatorLastName
        creatorEmail
        price
        currency
        city
        state
        country
        propertyType
        listingType
        status
        verificationStatus
        viewCount
        createdAt
        updatedAt
      }
    }
  }
`;

/** Admin console — pending verification queue. */
export const ADMIN_PENDING_PROPERTIES = gql`
  query AdminPendingProperties($page: Int, $limit: Int) {
    pendingProperties(page: $page, limit: $limit) {
      total
      page
      limit
      properties {
        id
        propertyCode
        title
        description
        createdBy
        creatorFirstName
        creatorLastName
        creatorEmail
        price
        currency
        city
        state
        country
        propertyType
        listingType
        status
        verificationStatus
        viewCount
        createdAt
        updatedAt
      }
    }
  }
`;

/** Admin console — recent posts across the platform. */
export const ADMIN_POSTS = gql`
  query AdminPosts($page: Int, $limit: Int) {
    searchPosts(page: $page, limit: $limit) {
      id
      userId
      userFirstName
      userLastName
      title
      content
      propertyType
      location
      status
      likeCount
      commentCount
      reportCount
      createdAt
    }
  }
`;

export const ADMIN_REPORTS = gql`
  query AdminReports($status: String, $page: Int, $limit: Int) {
    reports(status: $status, page: $page, limit: $limit) {
      totalCount
      page
      totalPages
      reports {
        id
        reportCode
        entityType
        entityId
        reportedBy
        reportedUserId
        reasonCode
        description
        status
        priority
        createdAt
        entityLabel
        entityPreview
        reporterName
        reporterEmail
      }
    }
  }
`;

export const ADMIN_REPORT_STATS = gql`
  query AdminReportStats {
    reportStats {
      pendingCount
      underReviewCount
      resolvedCount
      rejectedCount
      highPriorityCount
      totalCount
    }
  }
`;

export const ADMIN_DELETE_POST = gql`
  mutation AdminDeletePost($postId: String!) {
    deletePost(postId: $postId) {
      success
      message
    }
  }
`;

export const ADMIN_DELETE_PROPERTY = gql`
  mutation AdminDeleteProperty($propertyId: String!) {
    deleteProperty(propertyId: $propertyId) {
      success
      message
    }
  }
`;

export const ADMIN_UPDATE_USER_ROLE = gql`
  mutation AdminUpdateUserRole($userId: String!, $role: String!) {
    updateUserRole(userId: $userId, role: $role) {
      id
      role
      firstName
      lastName
      email
    }
  }
`;

export const ADMIN_APPROVE_PROPERTY = gql`
  mutation AdminApproveProperty($propertyId: String!) {
    approveProperty(propertyId: $propertyId) {
      id
      status
      verificationStatus
      title
    }
  }
`;

export const ADMIN_REJECT_PROPERTY = gql`
  mutation AdminRejectProperty($propertyId: String!, $reason: String!) {
    rejectProperty(propertyId: $propertyId, reason: $reason) {
      id
      status
      verificationStatus
      title
    }
  }
`;

export const ADMIN_UPDATE_REPORT_STATUS = gql`
  mutation AdminUpdateReportStatus(
    $reportId: String!
    $status: String!
    $reviewedBy: String
    $actionTaken: String
    $actionNote: String
  ) {
    updateReportStatus(
      reportId: $reportId
      status: $status
      reviewedBy: $reviewedBy
      actionTaken: $actionTaken
      actionNote: $actionNote
    ) {
      success
      message
    }
  }
`;
