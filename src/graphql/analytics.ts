import { gql } from '@apollo/client';

const RANGE = `
  $request: UserAnalyticsRequest!
`;

export const USER_ANALYTICS = gql`
  query UserAnalytics(${RANGE}) {
    userAnalytics(request: $request) {
      totalUsers
      dailyActiveUsers
      monthlyActiveUsers
      newRegistrations
      loginCount
      engagedUsers
      platformEngagedUsers
      follows
      sessions
      logouts
      deletions
      unfollows
      loginTrends { date count uniqueUsers }
      loginsByMethod { name count uniqueUsers }
      loginsByDevice { name count uniqueUsers }
    }
  }
`;

export const POST_ANALYTICS = gql`
  query PostAnalytics(${RANGE}) {
    postAnalytics(request: $request) {
      totalViews
      uniqueViewers
      uniquePosts
      likes
      unlikes
      shares
      saves
      comments
      reports
      avgViewDurationSeconds
      created
      updated
      deleted
      viewsByDay { date count uniqueUsers }
      topPosts { id code name city views saves likes }
    }
  }
`;

export const PROPERTY_ANALYTICS = gql`
  query PropertyAnalytics(${RANGE}) {
    propertyAnalytics(request: $request) {
      totalViews
      uniqueViewers
      uniqueProperties
      saves
      shares
      ratings
      reports
      avgViewDurationSeconds
      created
      updated
      deleted
      unsaves
      viewsByDay { date count uniqueUsers }
      topProperties { id code name city views saves likes }
    }
  }
`;

export const COMMENT_ANALYTICS = gql`
  query CommentAnalytics(${RANGE}) {
    commentAnalytics(request: $request) {
      commentsCreated
      uniqueCommenters
      likes
      reports
      replies
      deleted
      unlikes
      updated
      commentsByDay { date count uniqueUsers }
    }
  }
`;
