import React, { useState, useEffect, useRef } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    IconButton,
    Button,
    Avatar,
    InputBase,
    Stack,
    CircularProgress,
    Alert,
    Skeleton,
    useMediaQuery,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import Rating from '@mui/material/Rating';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareSymbol from './icons/ShareSymbol';
import SharePostSheet from './SharePostSheet';
import type { ShareablePost } from '../utils/sharePost';
import StarIcon from '@mui/icons-material/Star';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MessageIcon from '@mui/icons-material/Message';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_POSTS_BY_USER, DELETE_POST, UPDATE_POST, PIN_POST, UNPIN_POST } from '../graphql/posts';
import { CREATE_DM_ROOM_MUTATION } from '../graphql/chat';
import { useAuth } from '../contexts/AuthContext';
import { renderMentionContent, nameInitials, stringToColor, avatarPlaceholderIndex, collapseMentionTokens, expandPrettyMentions, mentionMapsFromTokens } from '../utils/mentions';
import { formatDateTime, formatRelativeTime } from '../utils/datetime';
import CommentListItem from './comments/CommentListItem';
import CommentComposer from './comments/CommentComposer';
import { nestComments } from '../utils/nestComments';
import { normalizeReactionEmoji } from './comments/commentReactions';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE, MATTE_INSET } from '../theme/surfaces';
import AdminBackground from './admin/AdminBackground';
import { ZpcNavLogo } from './brand/ZpcNavLogo';
import HeaderLogoutButton from './HeaderLogoutButton';
import PostMediaCarousel from './PostMediaCarousel';
import PostLikeCount from './PostLikeCount';

const isActiveFollowStatus = (status?: string | null) =>
    (status || '').toUpperCase() === 'ACTIVE';
const isPendingFollowStatus = (status?: string | null) =>
    (status || '').toUpperCase() === 'PENDING';

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8080/api/v1/graphql';

const interFont = {
    fontFamily: "'DM Sans', 'Source Sans 3', system-ui, sans-serif",
};

const displayFont = {
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
};

const CARD_RADIUS = 2; // LinkedIn-like modest corners

/** Soft matte card surface (not flat white). */
const MATTE_POST_SX = MATTE_SURFACE;

const PostSkeleton = () => (
  <Box sx={{ ...MATTE_POST_SX, borderRadius: { xs: 2, sm: 3 }, p: { xs: 1.5, sm: 3 }, mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Skeleton variant="circular" width={44} height={44} sx={{ mr: 2 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="30%" height={24} />
        <Skeleton variant="text" width="20%" height={16} />
      </Box>
    </Box>
    <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1 }} />
    <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, mb: 2 }} />
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
    </Box>
  </Box>
);

const parseTimestamp = (dateValue: any): Date | null => {
    if (dateValue == null || dateValue === '') return null;

    if (typeof dateValue === 'number') {
        return new Date(dateValue > 1e10 ? dateValue : dateValue * 1000);
    }

    if (typeof dateValue === 'string') {
        const trimmed = dateValue.trim();
        if (/^\d+$/.test(trimmed)) {
            const n = Number(trimmed);
            return new Date(n > 1e10 ? n : n * 1000);
        }
        const parsed = new Date(trimmed);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    if (dateValue instanceof Date) {
        return isNaN(dateValue.getTime()) ? null : dateValue;
    }

    return null;
};

// Utility function to safely format dates (Unix seconds/ms, numeric strings, ISO)
const formatDate = (dateValue: any): string => {
    const date = parseTimestamp(dateValue);
    if (!date) return 'Unknown date';
    return date.toLocaleString();
};

const formatDateShort = (dateValue: any): string => {
    const date = parseTimestamp(dateValue);
    if (!date) return 'Unknown date';
    return date.toLocaleDateString();
};

// Comments UI uses shared CommentListItem + CommentComposer

interface User {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
}

interface PostMedia {
    id: string;
    mediaType: string;
    mediaUrl: string;
    signedUrl?: string;
    mediaOrder: number;
    caption?: string;
}

interface Post {
    id: string;
    content: string;
    createdAt: string;
    user?: User;
    likesCount?: number;
    commentCount?: number;
    commentsCount?: number;
    commentsList?: Comment[];
    isLiked?: boolean;
    media?: PostMedia[];
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user?: User;
}

interface UserRating {
    id: string;
    ratedUserId: string;
    ratedByUserId: string;
    ratingValue: number;
    review?: string;
    ratingType?: string;
    createdAt: string;
    updatedAt: string;
    raterInfo?: {
        firstName: string;
        lastName: string;
        profilePhoto?: string;
    };
}

interface UserFollower {
    id: string;
    followerId: string;
    followingId: string;
    status: string;
    followedAt: string;
    userFirstName?: string | null;
    userLastName?: string | null;
    userRole?: string | null;
    userProfilePhoto?: string | null;
    userProfilePhotoSignedUrl?: string | null;
}

const FOLLOW_PROFILE_FIELDS = `
                userFirstName
                userLastName
                userRole
                userProfilePhoto
                userProfilePhotoSignedUrl`;

const followToDetail = (f: UserFollower, uid: string) => ({
    id: f.id,
    uid,
    status: f.status,
    info: f.userFirstName || f.userLastName ? {
        id: uid,
        firstName: f.userFirstName || '',
        lastName: f.userLastName || '',
        role: f.userRole || undefined,
        photo: f.userProfilePhotoSignedUrl || f.userProfilePhoto || undefined,
    } : null,
});

interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profilePhoto?: string;
    profilePhotoSignedUrl?: string;
    coverPhotoSignedUrl?: string;
    role?: string;
    address?: string;
    bio?: string;
    isActive: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    createdAt: string;
    followersCount: number;
    followingCount: number;
    ratings: UserRating[];
    averageRating: number;
}

const sortPostsPinnedFirst = (list: any[]): any[] =>
    [...list].sort((a, b) => {
        const ap = a?.isPinned ? 1 : 0;
        const bp = b?.isPinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        const aPinAt = a?.pinnedAt != null ? Number(a.pinnedAt) : 0;
        const bPinAt = b?.pinnedAt != null ? Number(b.pinnedAt) : 0;
        if (ap && bp && aPinAt !== bPinAt) return bPinAt - aPinAt;
        const aCreated = parseTimestamp(a?.createdAt)?.getTime() ?? 0;
        const bCreated = parseTimestamp(b?.createdAt)?.getTime() ?? 0;
        return bCreated - aCreated;
    });

interface ProfilePageProps {
    onGoBack: () => void;
    userId: string;
    currentUserId?: string;
    onOpenProfile?: (userId: string) => void;
    /** Preferred when embedded in Home — opens chat dock without a brittle /home navigate */
    onOpenChat?: (roomId: string) => void;
    /** Scroll/highlight this post after Activity loads (e.g. from Home “Pinned” badge). */
    focusPostId?: string | null;
    onFocusPostConsumed?: () => void;
}

const GRAPHQL_QUERIES = {
    GET_USER_PROFILE: `
        query GetUserProfile($id: String!) {
            user(id: $id) {
                id
                firstName
                lastName
                email
                phone
                profilePhoto
                profilePhotoId
                coverPhotoId
                profilePhotoSignedUrl
                coverPhotoSignedUrl
                role
                address
                bio
                isactive
                emailVerified
                phoneVerified
                createdAt
                followersCount
                followingCount
                ratings {
                    id
                    ratedUserId
                    ratedByUserId
                    ratingValue
                    review
                    ratingType
                    createdAt
                    updatedAt
                    raterFirstName
                    raterLastName
                    raterProfilePhoto
                    raterProfilePhotoSignedUrl
                }
            }
        }
    `,

    PRESIGN_USER_PHOTO_UPLOAD: `
        mutation PresignUserPhotoUpload($fileName: String!, $contentType: String) {
            presignUserPhotoUpload(fileName: $fileName, contentType: $contentType) {
                uploadUrl
                publicUrl
                key
            }
        }
    `,

    UPDATE_PROFILE_PHOTO: `
        mutation UpdateProfilePhoto($userId: String!, $filePath: String!, $fileName: String, $contentType: String) {
            updateProfilePhoto(userId: $userId, filePath: $filePath, fileName: $fileName, contentType: $contentType) {
                id
                profilePhotoId
                profilePhotoUrl
                profilePhotoSignedUrl
            }
        }
    `,

    UPDATE_COVER_PHOTO: `
        mutation UpdateCoverPhoto($userId: String!, $filePath: String!, $fileName: String, $contentType: String) {
            updateCoverPhoto(userId: $userId, filePath: $filePath, fileName: $fileName, contentType: $contentType) {
                id
                coverPhotoId
                coverPhotoUrl
                coverPhotoSignedUrl
            }
        }
    `,

    UPDATE_FOLLOW_STATUS: `
        mutation UpdateFollowStatus($followerId: String!, $followingId: String!, $status: String!) {
            updateFollowStatus(followerId: $followerId, followingId: $followingId, status: $status) {
                id
                followerId
                followingId
                status
                followedAt
            }
        }
    `,

    PENDING_FOLLOW_REQUESTS: `
        query PendingFollowRequests($userId: String!) {
            pendingFollowRequests(userId: $userId) {
                id
                followerId
                followingId
                status
                followedAt
                ${FOLLOW_PROFILE_FIELDS}
            }
        }
    `,

    GET_USER_RATINGS: `
        query GetUserRatings($userId: String!) {
            userRatings(userId: $userId) {
                id
                ratedUserId
                ratedByUserId
                ratingValue
                review
                ratingType
                createdAt
                updatedAt
                raterFirstName
                raterLastName
                raterProfilePhoto
                raterProfilePhotoSignedUrl
            }
        }
    `,

    GET_USER_FOLLOWERS: `
        query GetUserFollowers($userId: String!) {
            userFollowers(userId: $userId) {
                id
                followerId
                followingId
                status
                followedAt
                ${FOLLOW_PROFILE_FIELDS}
            }
        }
    `,

    GET_USER_FOLLOWING: `
        query GetUserFollowing($userId: String!) {
            userFollowing(userId: $userId) {
                id
                followerId
                followingId
                status
                followedAt
                ${FOLLOW_PROFILE_FIELDS}
            }
        }
    `,

    CHECK_FOLLOWING_STATUS: `
        query CheckFollowingStatus($userId: String!, $followingId: String!) {
            checkFollowingStatus(userId: $userId, followingId: $followingId) {
                id
                followerId
                followingId
                status
                followedAt
            }
        }
    `,

    CREATE_USER_RATING: `
        mutation CreateUserRating($ratedUserId: String!, $ratedByUserId: String!, $ratingValue: Int!, $review: String, $ratingType: String) {
            createUserRating(
                ratedUserId: $ratedUserId, 
                ratedByUserId: $ratedByUserId, 
                ratingValue: $ratingValue, 
                review: $review, 
                ratingType: $ratingType
            ) {
                id
                ratedUserId
                ratedByUserId
                ratingValue
                review
                ratingType
                createdAt
                updatedAt
                raterFirstName
                raterLastName
                raterProfilePhoto
                raterProfilePhotoSignedUrl
            }
        }
    `,

    FOLLOW_USER: `
        mutation FollowUser($userId: String!, $followingId: String!) {
            followUser(userId: $userId, followingId: $followingId) {
                id
                followerId
                followingId
                status
                followedAt
            }
        }
    `,

    GET_USER_POSTS: `
        query UserPosts($userId: String!, $page: Int, $limit: Int) {
            postsByUser(userId: $userId, page: $page, limit: $limit) {
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
                    signedUrl
                    mediaOrder
                    mediaSize
                    caption
                    uploadedAt
                }
                likeCount
                commentCount
                isLiked
            }
        }
    `,

    // GET_POST_LIKES: `
    //     query PostLikes($postId: ID!) {
    //         postLikes(postId: $postId) {
    //             id
    //             userId
    //             reactionType
    //             likedAt
    //         }
    //     }
    // `,

    GET_POST_COMMENTS: `
        query PostComments($postId: String!, $limit: Int) {
            postComments(postId: $postId, limit: $limit) {
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
    `,

    LIKE_POST: `
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
    `,

    UNLIKE_POST: `
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
    `,

    LIKE_COMMENT: `
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
    `,

    UNLIKE_COMMENT: `
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
    `,

    UPDATE_COMMENT: `
        mutation UpdateComment($commentId: String!, $comment: String) {
            updateComment(commentId: $commentId, comment: $comment) {
                success
                message
                comment {
                    id
                    comment
                    editedAt
                }
            }
        }
    `,

    DELETE_COMMENT: `
        mutation DeleteComment($commentId: String!) {
            deleteComment(commentId: $commentId) {
                success
                message
            }
        }
    `,

    CREATE_COMMENT: `
        mutation CreateComment($postId: String!, $userId: String!, $comment: String!, $parentCommentId: String) {
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
                    editedAt
                    likeCount
                }
            }
        }
    `,
};
// Remove these imports as they're not being used yet

const apiService = {
  async graphqlRequest(query: string, variables: Record<string, any> = {}) {
    try {
      console.log('Making GraphQL request:', { query, variables });
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          query,
          variables
        }),
      });

            console.log('GraphQL response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('GraphQL HTTP error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();
            console.log('GraphQL response:', result);

            if (result.errors) {
                console.error('GraphQL errors:', result.errors);
                throw new Error(result.errors[0].message || 'GraphQL error');
            }

            return result.data;
        } catch (error) {
            console.error('GraphQL request failed:', error);
            throw error;
        }
    },

    async fetchUserProfile(userId: string): Promise<UserProfile> {
        try {
            console.log('Fetching user profile for ID:', userId);
            const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_USER_PROFILE, { id: userId });
            console.log('User profile data received:', data);

            const user = data.user;

            if (!user) {
                throw new Error('User not found');
            }

            const averageRating = user.ratings.length > 0
                ? user.ratings.reduce((sum: number, rating: any) => sum + rating.ratingValue, 0) / user.ratings.length
                : 0;

            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                profilePhoto: user.profilePhoto,
                profilePhotoSignedUrl: user.profilePhotoSignedUrl,
                coverPhotoSignedUrl: user.coverPhotoSignedUrl,
                role: user.role,
                address: user.address,
                bio: user.bio,
                isActive: user.isactive,
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                createdAt: user.createdAt,
                followersCount: user.followersCount,
                followingCount: user.followingCount,
                ratings: user.ratings.map((rating: any) => ({
                    id: rating.id,
                    ratedUserId: rating.ratedUserId,
                    ratedByUserId: rating.ratedByUserId,
                    ratingValue: rating.ratingValue,
                    review: rating.review,
                    ratingType: rating.ratingType,
                    createdAt: rating.createdAt,
                    updatedAt: rating.updatedAt,
                    raterInfo: (rating.raterFirstName || rating.raterLastName || rating.raterProfilePhotoSignedUrl || rating.raterProfilePhoto)
                        ? {
                            id: rating.ratedByUserId,
                            firstName: rating.raterFirstName || '',
                            lastName: rating.raterLastName || '',
                            profilePhoto: rating.raterProfilePhotoSignedUrl || rating.raterProfilePhoto || undefined,
                        }
                        : undefined,
                })),
                averageRating: parseFloat(averageRating.toFixed(1))
            };
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    },

    async fetchUserPosts(userId: string): Promise<Post[]> {
        try {
            console.log('Fetching user posts for ID:', userId);
            const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_USER_POSTS, {
                userId,
                page: 1,
                limit: 100
            });
            console.log('User posts data received:', data);

            if (!data.postsByUser) {
                console.warn('No postsByUser field in response');
                return [];
            }

            return data.postsByUser.map((post: any) => ({
                id: post.id,
                content: post.content,
                createdAt: post.createdAt,
                user: {
                    id: post.userId,
                    firstName: post.userFirstName || '',
                    lastName: post.userLastName || '',
                    profilePhoto: undefined
                },
                media: (post.media || []).map((m: any) => ({
                    id: m.id,
                    mediaType: m.mediaType,
                    mediaUrl: m.mediaUrl,
                    mediaOrder: m.mediaOrder,
                    caption: m.caption,
                })),
                likesCount: post.likeCount || 0,
                commentsCount: post.commentCount || 0
            }));
        } catch (error) {
            console.error('Error fetching user posts:', error);
            return [];
        }
    },

    async fetchPostLikes(postId: string): Promise<any[]> {
        // This functionality doesn't exist in the backend yet
        // For now, return empty array
        return [];
    },

    async fetchPostComments(postId: string, limit = 50): Promise<any[]> {
        try {
            const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_POST_COMMENTS, {
                postId: postId,
                limit
            });

            console.log('Raw comments data:', data.postComments?.[0]); // Debug first comment

            const mapComment = (comment: any): any => ({
                id: comment.id,
                postId: comment.postId,
                userId: comment.userId,
                userFirstName: comment.userFirstName,
                userLastName: comment.userLastName,
                userRole: comment.userRole,
                comment: comment.comment,
                parentCommentId: comment.parentCommentId,
                status: comment.status,
                addedAt: comment.addedAt,
                commentedAt: comment.commentedAt,
                editedAt: comment.editedAt,
                likeCount: comment.likeCount || 0,
                profilePhoto: comment.profilePhoto,
                profilePhotoSignedUrl: comment.profilePhotoSignedUrl,
                replies: (comment.replies || []).map(mapComment),
            });

            return (data.postComments || []).map(mapComment);
        } catch (error) {
            console.error('Error fetching post comments:', error);
            return [];
        }
    },

    async fetchUserReviews(userId: string): Promise<UserRating[]> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_USER_RATINGS, { userId });
        const list = (data.userRatings || []);

        return list.map((rating: any) => ({
            id: rating.id,
            ratedUserId: rating.ratedUserId,
            ratedByUserId: rating.ratedByUserId,
            ratingValue: rating.ratingValue,
            review: rating.review,
            ratingType: rating.ratingType,
            createdAt: rating.createdAt,
            updatedAt: rating.updatedAt,
            raterInfo: (rating.raterFirstName || rating.raterLastName || rating.raterProfilePhotoSignedUrl || rating.raterProfilePhoto)
                ? {
                    id: rating.ratedByUserId,
                    firstName: rating.raterFirstName || '',
                    lastName: rating.raterLastName || '',
                    profilePhoto: rating.raterProfilePhotoSignedUrl || rating.raterProfilePhoto || undefined,
                }
                : undefined,
        }));
    },

    async fetchUserFollowers(userId: string): Promise<UserFollower[]> {
        try {
            const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_USER_FOLLOWERS, { userId });
            return (data.userFollowers || []).map((follower: any) => ({
                id: follower.id,
                followerId: follower.followerId,
                followingId: follower.followingId,
                status: follower.status,
                followedAt: follower.followedAt,
                userFirstName: follower.userFirstName,
                userLastName: follower.userLastName,
                userRole: follower.userRole,
                userProfilePhoto: follower.userProfilePhoto,
                userProfilePhotoSignedUrl: follower.userProfilePhotoSignedUrl,
            }));
        } catch (error) {
            console.error('Error fetching user followers:', error);
            return [];
        }
    },

    async fetchUserFollowing(userId: string): Promise<UserFollower[]> {
        try {
            const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_USER_FOLLOWING, { userId });
            return (data.userFollowing || []).map((following: any) => ({
                id: following.id,
                followerId: following.followerId,
                followingId: following.followingId,
                status: following.status,
                followedAt: following.followedAt,
                userFirstName: following.userFirstName,
                userLastName: following.userLastName,
                userRole: following.userRole,
                userProfilePhoto: following.userProfilePhoto,
                userProfilePhotoSignedUrl: following.userProfilePhotoSignedUrl,
            }));
        } catch (error) {
            console.error('Error fetching user following:', error);
            return [];
        }
    },

    async checkFollowingStatus(userId: string, followingId: string): Promise<UserFollower | null> {
        try {
            const data = await this.graphqlRequest(GRAPHQL_QUERIES.CHECK_FOLLOWING_STATUS, {
                userId,
                followingId
            });
            return data.checkFollowingStatus;
        } catch (error) {
            return null;
        }
    },

    async followUser(userId: string, followingId: string): Promise<UserFollower> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.FOLLOW_USER, {
            userId,
            followingId
        });
        return data.followUser;
    },

    async createRating(
        ratedUserId: string,
        ratedByUserId: string,
        ratingValue: number,
        review?: string,
        ratingType?: string
    ): Promise<UserRating> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.CREATE_USER_RATING, {
            ratedUserId,
            ratedByUserId,
            ratingValue,
            review,
            ratingType
        });
        return data.createUserRating;
    },

    async likePost(postId: string, userId: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.LIKE_POST, {
            postId,
            userId
        });
        return data.likePost;
    },

    async unlikePost(postId: string, userId: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.UNLIKE_POST, {
            postId,
            userId
        });
        return data.unlikePost;
    },

    async likeComment(commentId: string, userId: string, reactionType?: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.LIKE_COMMENT, {
            commentId,
            userId,
            reactionType: reactionType || 'like',
        });
        return data.likeComment;
    },

    async unlikeComment(commentId: string, userId: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.UNLIKE_COMMENT, {
            commentId,
            userId,
        });
        return data.unlikeComment;
    },

    async updateComment(commentId: string, comment: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.UPDATE_COMMENT, {
            commentId,
            comment,
        });
        return data.updateComment;
    },

    async deleteComment(commentId: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.DELETE_COMMENT, {
            commentId,
        });
        return data.deleteComment;
    },

    async createComment(postId: string, userId: string, comment: string, parentCommentId?: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.CREATE_COMMENT, {
            postId,
            userId,
            comment,
            parentCommentId
        });
        return data.createComment;
    },
};
const ProfilePage: React.FC<ProfilePageProps> = ({
    onGoBack,
    userId,
    currentUserId,
    onOpenProfile,
    onOpenChat,
    focusPostId = null,
    onFocusPostConsumed,
}) => {
    const navigate = useNavigate();
    const { updateUser, user: authUser } = useAuth();
    const isMobile = useMediaQuery('(max-width:900px)');
    const [createDmRoom] = useMutation(CREATE_DM_ROOM_MUTATION);
    const [messagingInProgress, setMessagingInProgress] = useState(false);
    const effectiveCurrentUserId = currentUserId || (authUser?.id != null ? String(authUser.id) : undefined);
    const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
    const [deletePostMutation] = useMutation(DELETE_POST);
    const [updatePostMutation] = useMutation(UPDATE_POST);
    const [pinPostMutation] = useMutation(PIN_POST);
    const [unpinPostMutation] = useMutation(UNPIN_POST);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [reviews, setReviews] = useState<UserRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followingStatus, setFollowingStatus] = useState<UserFollower | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
    const [isFollowing, setIsFollowing] = useState(false);
    const [followingInProgress, setFollowingInProgress] = useState(false);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postMenu, setPostMenu] = useState<{ anchor: HTMLElement; post: any } | null>(null);
    const [editPost, setEditPost] = useState<any | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [photoLightbox, setPhotoLightbox] = useState<null | { kind: 'profile' | 'cover'; src: string }>(null);
    const [sharePostTarget, setSharePostTarget] = useState<ShareablePost | null>(null);

    // Post likes and comments state
    const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
    const [postLikeCounts, setPostLikeCounts] = useState<{ [postId: string]: number }>({});
    const [likedComments, setLikedComments] = useState<{ [commentId: string]: boolean }>({});
    const [commentReactions, setCommentReactions] = useState<{ [commentId: string]: string }>({});
    const [commentLikeCounts, setCommentLikeCounts] = useState<{ [commentId: string]: number }>({});
    const [commentsModalOpen, setCommentsModalOpen] = useState<{ open: boolean; postId: string | null }>({ open: false, postId: null });
    const [likingPost, setLikingPost] = useState(false);
    const [likingComment, setLikingComment] = useState(false);
    const [animatingPosts, setAnimatingPosts] = useState<{ [postId: string]: boolean }>({});

    const handleLikePostWithAnimation = async (postId: string) => {
        setAnimatingPosts(prev => ({ ...prev, [postId]: true }));
        setTimeout(() => {
            setAnimatingPosts(prev => ({ ...prev, [postId]: false }));
        }, 600);
        await toggleLike(postId);
    };

    // Comments state
    const [commentsByPost, setCommentsByPost] = useState<{ [postId: string]: any[] }>({});
    const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({});
    const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);
    // Followers/Following modal state
    const [followersOpen, setFollowersOpen] = useState(false);
    const [followersList, setFollowersList] = useState<UserFollower[]>([]);
    const [followersDetails, setFollowersDetails] = useState<any[]>([]);
    const [followingOpen, setFollowingOpen] = useState(false);
    const [followingList, setFollowingList] = useState<UserFollower[]>([]);
    const [followingDetails, setFollowingDetails] = useState<any[]>([]);
    const [loadingFF, setLoadingFF] = useState(false);

    // Pending request from profile user -> current user
    const [incomingFollowStatus, setIncomingFollowStatus] = useState<UserFollower | null>(null);
    // Rating state
    const [ratingOpen, setRatingOpen] = useState(false);
    const [ratingValue, setRatingValue] = useState<number>(5);
    const [ratingText, setRatingText] = useState('');
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    // Snackbar state
    const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
    const handleSnackClose = () => setSnack(prev => ({ ...prev, open: false }));

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // One profile call already includes counts + ratings — don't waterfall extra lists
                const userProfile = await apiService.fetchUserProfile(userId);
                if (cancelled) return;

                setUser(userProfile);
                setReviews(userProfile.ratings || []);
                setLoading(false);

                // Non-blocking: posts + follow status
                loadUserPosts();

                if (currentUserId && currentUserId !== userId) {
                    Promise.all([
                        apiService.checkFollowingStatus(currentUserId, userId),
                        apiService.checkFollowingStatus(userId, currentUserId),
                    ]).then(([followStatus, incoming]) => {
                        if (cancelled) return;
                        setFollowingStatus(followStatus);
                        setIsFollowing(
                            isActiveFollowStatus(followStatus?.status) ||
                            isPendingFollowStatus(followStatus?.status)
                        );
                        setIncomingFollowStatus(incoming);
                    }).catch((err) => {
                        console.warn('Error checking following status:', err);
                        if (!cancelled) {
                            setIsFollowing(false);
                            setIncomingFollowStatus(null);
                        }
                    });
                }
            } catch (err) {
                console.error('Error fetching profile data:', err);
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load profile data');
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [userId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

    const client = useApolloClient();

    const loadUserPosts = async () => {
        setPostsLoading(true);
        try {
            console.log('Loading user posts for ID:', userId);
            
            const { data } = await client.query({
                query: GET_POSTS_BY_USER,
                variables: { userId, page: 1, limit: 20 },
                fetchPolicy: 'network-only'
            });
            
            console.log('User posts loaded from GraphQL:', data);
            
            if (data?.postsByUser) {
                // Do not fetch comments for every post here — that was N+1 and made profile very slow.
                // Comments load on demand when the user opens the comments UI.
                const postsWithDetails = sortPostsPinnedFirst(
                    data.postsByUser.map((post: any) => ({
                        ...post,
                        id: String(post.id),
                        likesCount: post.likeCount || 0,
                        commentCount: post.commentCount ?? 0,
                        commentsCount: post.commentCount ?? 0,
                        commentsList: [] as any[],
                        userProfilePhotoSignedUrl: post.userProfilePhotoSignedUrl || post.userProfilePhoto,
                        user: {
                            id: post.userId,
                            firstName: post.userFirstName || '',
                            lastName: post.userLastName || '',
                            profilePhoto: post.userProfilePhotoSignedUrl || post.userProfilePhoto || undefined,
                        },
                    }))
                );
                setPosts(postsWithDetails as Post[]);

                const nextLiked: { [postId: string]: boolean } = {};
                const nextCounts: { [postId: string]: number } = {};
                postsWithDetails.forEach((post: any) => {
                    const id = String(post.id);
                    if (post.isLiked) nextLiked[id] = true;
                    nextCounts[id] = post.likeCount || post.likesCount || 0;
                });
                setLikedPosts(nextLiked);
                setPostLikeCounts(prev => ({ ...prev, ...nextCounts }));
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    };

    const scrollToPost = (postId: string | number) => {
        const id = String(postId);
        const el = document.getElementById(`post-${id}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedPostId(id);
        window.setTimeout(() => {
            setHighlightedPostId((prev) => (prev === id ? null : prev));
        }, 2200);
    };

    // Deep-link / Home “Pinned” badge → land on the post in Activity
    useEffect(() => {
        if (!focusPostId || postsLoading || posts.length === 0) return;
        const exists = posts.some((p) => String(p.id) === String(focusPostId));
        if (!exists) {
            onFocusPostConsumed?.();
            return;
        }
        const t = window.setTimeout(() => {
            scrollToPost(focusPostId);
            onFocusPostConsumed?.();
        }, 280);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusPostId, postsLoading, posts]);

    const handleFollow = async () => {
        if (!currentUserId || !user) return;

        try {
            setFollowingInProgress(true);

            // Only allow action when not already following or pending
            if (isFollowing || isPendingFollowStatus(followingStatus?.status)) {
                return;
            }

            const followResult = await apiService.followUser(currentUserId, userId);
            setFollowingStatus(followResult);
            const isActive = isActiveFollowStatus(followResult?.status);
            const treatedAsFollowing = isActive || isPendingFollowStatus(followResult?.status);
            setIsFollowing(treatedAsFollowing);
            if (isActive) {
                try {
                    const refreshed = await apiService.fetchUserProfile(userId);
                    setUser(refreshed);
                } catch {
                    setUser(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
                }
            }
            setSnack({ open: true, message: 'Following', severity: 'success' });
        } catch (err) {
            console.error('Error sending follow request:', err);
            setSnack({ open: true, message: 'Failed to follow', severity: 'error' });
        } finally {
            setFollowingInProgress(false);
        }
    };

    // Poll follow status while pending and update followers count upon acceptance
    const prevStatusRef = useRef<string | null>(null);
    useEffect(() => {
        prevStatusRef.current = followingStatus?.status || null;
    }, [followingStatus]);

    useEffect(() => {
        if (!currentUserId || currentUserId === userId) return;
        if (!isPendingFollowStatus(followingStatus?.status)) return;

        const interval = setInterval(async () => {
            try {
                const latest = await apiService.checkFollowingStatus(currentUserId, userId);
                if (latest?.status && latest.status !== followingStatus?.status) {
                    setFollowingStatus(latest);
                    setIsFollowing(isActiveFollowStatus(latest.status));
                    if (prevStatusRef.current && isPendingFollowStatus(prevStatusRef.current) && isActiveFollowStatus(latest.status)) {
                        setUser(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
                        setSnack({ open: true, message: 'Follow request accepted', severity: 'success' });
                    }
                }
            } catch (e) {
                // Ignore polling errors
            }
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, [followingStatus, currentUserId, userId]);

    // Photo upload handlers (profile/cover)
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const coverFileInputRef = useRef<HTMLInputElement | null>(null);

    const handleChooseProfilePhoto = () => fileInputRef.current?.click();
    const handleChooseCoverPhoto = () => coverFileInputRef.current?.click();

    const uploadWithPresign = async (file: File, isCover: boolean) => {
        try {
            // Step 1: presign
            const presignRes = await apiService.graphqlRequest(GRAPHQL_QUERIES.PRESIGN_USER_PHOTO_UPLOAD, {
                fileName: file.name,
                contentType: file.type
            });
            const { uploadUrl, publicUrl } = presignRes.presignUserPhotoUpload;

            // Step 2: upload to S3
            const putResp = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });
            if (!putResp.ok) throw new Error('Upload failed');

            // Step 3: update profile/cover via GraphQL
            const mutation = isCover ? GRAPHQL_QUERIES.UPDATE_COVER_PHOTO : GRAPHQL_QUERIES.UPDATE_PROFILE_PHOTO;
            const updateRes = await apiService.graphqlRequest(mutation, {
                userId: userId,
                filePath: publicUrl,
                fileName: file.name,
                contentType: file.type,
            });

            // Update UI with signed URL from response
            const updated = isCover ? updateRes.updateCoverPhoto : updateRes.updateProfilePhoto;
            const nextPhoto = !isCover
              ? (updated.profilePhotoSignedUrl || updated.profilePhotoUrl || updated.profilePhoto)
              : undefined;
            const nextCover = isCover
              ? (updated.coverPhotoSignedUrl || updated.coverPhotoUrl || updated.coverPhoto)
              : undefined;

            setUser(prev => prev ? {
                ...prev,
                profilePhoto: nextPhoto || prev.profilePhoto,
                ...(isCover
                  ? { coverPhotoSignedUrl: nextCover }
                  : { profilePhotoSignedUrl: nextPhoto }),
            } as any : prev);

            // Persist so Home left rail / feed pick up the new photos without a full re-login
            if (String(userId) === String(currentUserId)) {
              updateUser(
                isCover
                  ? {
                      coverPhotoSignedUrl: nextCover,
                      coverPhoto: nextCover,
                    }
                  : {
                      profilePhoto: nextPhoto,
                      profilePhotoSignedUrl: nextPhoto,
                    }
              );
            }

            const refreshedSrc = isCover ? nextCover : nextPhoto;
            if (refreshedSrc) {
                setPhotoLightbox((prev) =>
                    prev && prev.kind === (isCover ? 'cover' : 'profile')
                        ? { ...prev, src: refreshedSrc }
                        : prev
                );
            }

            setSnack({ open: true, message: isCover ? 'Cover photo updated' : 'Profile photo updated', severity: 'success' });

        } catch (e) {
            console.error('Photo upload failed:', e);
            const msg = e instanceof Error ? e.message : 'Photo upload failed';
            setSnack({ open: true, message: msg, severity: 'error' });
        }
    };

    const toggleLike = async (postId: string) => {
        if (!currentUserId) return;

        const isCurrentlyLiked = likedPosts[postId];
        const currentLikeCount = postLikeCounts[postId] !== undefined ? postLikeCounts[postId] : (posts.find(p => p.id === postId)?.likesCount || 0);

        try {
            setLikingPost(true);

            // Optimistic update
            setLikedPosts(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
            setPostLikeCounts(prev => ({
                ...prev,
                [postId]: isCurrentlyLiked ? currentLikeCount - 1 : currentLikeCount + 1
            }));

            if (isCurrentlyLiked) {
                // Unlike the post
                const result = await apiService.unlikePost(postId, currentUserId);
                if (result?.success) {
                    setPostLikeCounts(prev => ({
                        ...prev,
                        [postId]: result.post.likeCount
                    }));
                } else {
                    // Revert optimistic update on failure
                    setLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
                    setPostLikeCounts(prev => ({ ...prev, [postId]: currentLikeCount }));
                }
            } else {
                // Like the post
                const result = await apiService.likePost(postId, currentUserId);
                if (result?.success) {
                    setPostLikeCounts(prev => ({
                        ...prev,
                        [postId]: result.post.likeCount
                    }));
                } else {
                    // Revert optimistic update on failure
                    setLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
                    setPostLikeCounts(prev => ({ ...prev, [postId]: currentLikeCount }));
                }
            }
        } catch (error) {
            console.error('Error toggling post like:', error);
            // Revert optimistic update on error
            setLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
            setPostLikeCounts(prev => ({ ...prev, [postId]: currentLikeCount }));
        } finally {
            setLikingPost(false);
        }
    };

    const handleCommentClick = async (postId: string) => {
        console.log('ProfilePage: Opening comments modal for post:', postId);
        setCommentsModalOpen({ open: true, postId });

        // Fetch comments if not already loaded
        if (!commentsByPost[postId] && !loadingComments[postId]) {
            setLoadingComments(prev => ({ ...prev, [postId]: true }));
            try {
                const commentsData = await apiService.fetchPostComments(postId, 50);
                setCommentsByPost(prev => ({ ...prev, [postId]: commentsData }));
                setPosts(prev => prev.map(p => {
                    if (String(p.id) !== String(postId)) return p;
                    const count = commentsData.length;
                    return { ...p, commentCount: count, commentsCount: count };
                }));
            } catch (error) {
                console.error('Error fetching comments:', error);
            } finally {
                setLoadingComments(prev => ({ ...prev, [postId]: false }));
            }
        }
    };

    const handleCommentsModalClose = () => {
        setCommentsModalOpen({ open: false, postId: null });
    };

    const handleAddComment = async (postId: string, commentText: string, parentCommentId?: string) => {
        if (!currentUserId || !commentText.trim()) return;

        try {
            const result = await apiService.createComment(
                postId,
                currentUserId,
                commentText,
                parentCommentId || undefined
            );

            if (result?.success) {
                // Refresh comments for this post
                const commentsData = await apiService.fetchPostComments(postId, 50);
                setCommentsByPost(prev => ({ ...prev, [postId]: commentsData }));

                // Bump visible count for top-level comments only
                if (!parentCommentId) {
                    setPosts(prev => prev.map(p => {
                        if (String(p.id) !== String(postId)) return p;
                        const next = (p.commentCount ?? p.commentsCount ?? 0) + 1;
                        return { ...p, commentCount: next, commentsCount: next };
                    }));
                }

                // Clear reply text if it was a reply
                if (parentCommentId) {
                    setReplyText('');
                    setReplyingCommentId(null);
                }
            }
        } catch (error) {
            console.error('Error creating comment:', error);
        }
    };

    const handleReactComment = async (commentId: string, emoji: string) => {
        if (!currentUserId) return;

        const current = normalizeReactionEmoji(commentReactions[commentId]) || (likedComments[commentId] ? '❤️' : null);
        const same = current === emoji;

        setLikingComment(true);
        try {
            if (same) {
                const result = await apiService.unlikeComment(commentId, currentUserId);
                if (result?.success) {
                    setLikedComments(prev => ({ ...prev, [commentId]: false }));
                    setCommentReactions(prev => {
                        const next = { ...prev };
                        delete next[commentId];
                        return next;
                    });
                    setCommentLikeCounts(prev => ({
                        ...prev,
                        [commentId]: result.comment?.likeCount ?? Math.max(0, (prev[commentId] || 1) - 1),
                    }));
                }
            } else {
                const result = await apiService.likeComment(commentId, currentUserId, emoji);
                if (result?.success) {
                    const wasLiked = Boolean(current);
                    setLikedComments(prev => ({ ...prev, [commentId]: true }));
                    setCommentReactions(prev => ({ ...prev, [commentId]: emoji }));
                    setCommentLikeCounts(prev => ({
                        ...prev,
                        [commentId]: result.comment?.likeCount ?? (prev[commentId] || 0) + (wasLiked ? 0 : 1),
                    }));
                }
            }
        } catch (error) {
            console.error('Error reacting to comment:', error);
        } finally {
            setLikingComment(false);
        }
    };

    const handleEditComment = async (commentId: string, text: string) => {
        try {
            const result = await apiService.updateComment(commentId, text);
            if (result?.success && commentsModalOpen.postId) {
                const commentsData = await apiService.fetchPostComments(commentsModalOpen.postId, 50);
                setCommentsByPost(prev => ({ ...prev, [commentsModalOpen.postId!]: commentsData }));
            }
        } catch (error) {
            console.error('Error editing comment:', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('Delete this comment?')) return;
        const postId = commentsModalOpen.postId;
        if (!postId) return;
        const existing = commentsByPost[postId];
        const wasTopLevel = Boolean(existing?.some((c: any) => c.id === commentId));
        try {
            const result = await apiService.deleteComment(commentId);
            if (result?.success) {
                const commentsData = await apiService.fetchPostComments(postId, 50);
                setCommentsByPost(prev => ({ ...prev, [postId]: commentsData }));
                if (wasTopLevel) {
                    setPosts(prev => prev.map(p => {
                        if (String(p.id) !== String(postId)) return p;
                        const next = Math.max(0, (p.commentCount ?? p.commentsCount ?? 1) - 1);
                        return { ...p, commentCount: next, commentsCount: next };
                    }));
                }
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <StarIcon
                key={i}
                sx={{
                    fontSize: 16,
                    color: i < Math.floor(rating) ? '#FFC107' : '#E0E0E0'
                }}
            />
        ));
    };

    if (loading) {
        return (
            <Box sx={{
                ...PAGE_ATMOSPHERE,
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...interFont
            }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={48} sx={{ color: '#16302A', mb: 2 }} />
                    <Typography sx={{ color: '#6B7280' }}>Loading profile...</Typography>
                </Box>
            </Box>
        );
    }

    if (error || !user) {
        return (
            <Box sx={{
                ...PAGE_ATMOSPHERE,
                minHeight: '100vh',
                ...interFont,
            }}>
                <AppBar
                    position="fixed"
                    elevation={0}
                    sx={{
                        ...MATTE_HEADER,
                        borderRadius: 0,
                        zIndex: 1201,
                    }}
                >
                    <Toolbar sx={{ justifyContent: 'flex-start', px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 }, gap: 1, bgcolor: 'transparent' }}>
                        <ZpcNavLogo size={isMobile ? 32 : 36} animateStroke={false} onNavigate={onGoBack} />
                        <IconButton onClick={onGoBack} size={isMobile ? 'small' : 'medium'} sx={{ color: '#EBE6D4' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#EBE6D4', fontSize: { xs: '1rem', sm: '1.25rem' }, flex: 1 }}>
                            Profile
                        </Typography>
                        <HeaderLogoutButton ink="light" size={isMobile ? 'small' : 'medium'} />
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: { xs: 9, sm: 10 }, px: { xs: 1.25, sm: 2 }, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
                    <Alert severity="error" sx={{ maxWidth: 400, width: '100%' }}>
                        {error || 'User profile not found'}
                    </Alert>
                </Box>
            </Box>
        );
    }

    const isOwnProfile =
        effectiveCurrentUserId != null &&
        userId != null &&
        String(effectiveCurrentUserId) === String(userId);

    return (
        <>
        <Box sx={{
            ...PAGE_ATMOSPHERE,
            minHeight: '100vh',
            position: 'relative',
            ...interFont,
        }}>
            <AdminBackground />
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    ...MATTE_HEADER,
                    borderRadius: 0,
                    zIndex: 1201,
                }}
            >
                <Toolbar sx={{ justifyContent: 'flex-start', px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 }, gap: 1, bgcolor: 'transparent' }}>
                    <ZpcNavLogo size={isMobile ? 32 : 36} animateStroke={false} onNavigate={onGoBack} />
                    <IconButton onClick={onGoBack} size={isMobile ? 'small' : 'medium'} sx={{ color: '#EBE6D4' }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#EBE6D4', fontSize: { xs: '1rem', sm: '1.25rem' }, flex: 1 }}>
                        Profile
                    </Typography>
                    <HeaderLogoutButton ink="light" size={isMobile ? 'small' : 'medium'} />
                </Toolbar>
            </AppBar>

            <Box sx={{ position: 'relative', zIndex: 1, pt: { xs: 9, sm: 10 }, px: { xs: 1.25, sm: 2 }, pb: { xs: 3, sm: 4 } }}>
                <Box sx={{ maxWidth: 1128, mx: 'auto' }}>
                {/* LinkedIn-style identity card: cover + overlapping avatar */}
                <Box
                    sx={{
                        ...MATTE_SURFACE,
                        borderRadius: CARD_RADIUS,
                        overflow: 'hidden',
                        mb: 1.5,
                    }}
                >
                <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                    <Box
                        component="img"
                        src={(user as any).coverPhotoSignedUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop'}
                        alt="Cover"
                        onClick={() => {
                            const src =
                                (user as any).coverPhotoSignedUrl ||
                                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop';
                            setPhotoLightbox({ kind: 'cover', src });
                        }}
                        sx={{
                            width: '100%',
                            height: { xs: 120, sm: 160, md: 200 },
                            objectFit: 'cover',
                            display: 'block',
                            cursor: 'pointer',
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop';
                        }}
                    />
                    {isOwnProfile && (
                        <IconButton
                            aria-label="Change cover photo"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleChooseCoverPhoto();
                            }}
                            sx={{
                                position: 'absolute',
                                top: { xs: 8, sm: 12 },
                                right: { xs: 8, sm: 12 },
                                width: { xs: 36, sm: 40 },
                                height: { xs: 36, sm: 40 },
                                bgcolor: 'rgba(235,230,212,0.94)',
                                color: '#16302A',
                                border: '1px solid rgba(22,48,42,0.16)',
                                boxShadow: '0 2px 8px rgba(10,18,16,0.18)',
                                '&:hover': { bgcolor: '#EBE6D4' },
                            }}
                        >
                            <CameraAltIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                        </IconButton>
                    )}
                </Box>

                {/* hidden file inputs */}
                <input ref={coverFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadWithPresign(f, true);
                }} />
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadWithPresign(f, false);
                }} />

                <Box
                    sx={{
                        px: { xs: 1.5, sm: 2.5 },
                        pb: { xs: 1.5, sm: 2 },
                        pt: 0,
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'flex-start' },
                        justifyContent: 'space-between',
                        gap: 1.5,
                        mb: 1.25,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 1.5, sm: 2 }, minWidth: 0, mt: { xs: -5, sm: -7 } }}>
                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                <Avatar
                                    src={(user as any).profilePhotoSignedUrl || user.profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                                    onClick={() => {
                                        const src =
                                            (user as any).profilePhotoSignedUrl ||
                                            user.profilePhoto ||
                                            'https://randomuser.me/api/portraits/lego/1.jpg';
                                        setPhotoLightbox({ kind: 'profile', src });
                                    }}
                                    sx={{
                                        width: { xs: 96, sm: 132 },
                                        height: { xs: 96, sm: 132 },
                                        border: '4px solid #EBE6D4',
                                        boxShadow: '0 2px 10px rgba(10,18,16,0.18)',
                                        bgcolor: stringToColor(`${user.firstName} ${user.lastName}`),
                                        fontWeight: 800,
                                        fontSize: { xs: 32, sm: 40 },
                                        cursor: 'pointer',
                                    }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://randomuser.me/api/portraits/lego/1.jpg';
                                    }}
                                >
                                    {nameInitials(`${user.firstName || ''} ${user.lastName || ''}`)}
                                </Avatar>
                                {user.isActive && (
                                    <Box sx={{
                                        position: 'absolute',
                                        bottom: { xs: 6, sm: 10 },
                                        left: { xs: 6, sm: 10 },
                                        width: { xs: 14, sm: 18 },
                                        height: { xs: 14, sm: 18 },
                                        bgcolor: '#4CAF50',
                                        borderRadius: '50%',
                                        border: '2px solid #EBE6D4',
                                        zIndex: 1,
                                    }} />
                                )}
                                {isOwnProfile && (
                                    <IconButton
                                        aria-label="Change profile photo"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleChooseProfilePhoto();
                                        }}
                                        sx={{
                                            position: 'absolute',
                                            bottom: { xs: 2, sm: 4 },
                                            right: { xs: 2, sm: 4 },
                                            width: { xs: 32, sm: 36 },
                                            height: { xs: 32, sm: 36 },
                                            bgcolor: '#16302A',
                                            color: '#EBE6D4',
                                            border: '2px solid #EBE6D4',
                                            boxShadow: '0 2px 8px rgba(10,18,16,0.25)',
                                            zIndex: 2,
                                            '&:hover': { bgcolor: '#0A1C18' },
                                        }}
                                    >
                                        <CameraAltIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                        {!isOwnProfile && (
                        <Box sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            width: { xs: '100%', sm: 'auto' },
                            flexShrink: 0,
                            justifyContent: { xs: 'stretch', sm: 'flex-end' },
                            mt: { xs: 0.5, sm: 1.5 },
                        }}>
                        <>
                                {incomingFollowStatus && isPendingFollowStatus(incomingFollowStatus?.status) ? (
                                    <>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? 'small' : 'medium'}
                                            sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, flex: { xs: '1 1 auto', sm: '0 0 auto' }, textTransform: 'none', fontWeight: 700, borderRadius: 999 }}
                                            onClick={async () => {
                                                try {
                                                    const data = await apiService.graphqlRequest(GRAPHQL_QUERIES.UPDATE_FOLLOW_STATUS, {
                                                        followerId: userId,
                                                        followingId: currentUserId,
                                                        status: 'active'
                                                    });
                                                    setIncomingFollowStatus(data.updateFollowStatus);
                                                    setSnack({ open: true, message: 'Request accepted', severity: 'success' });
                                                } catch (e) {
                                                    setSnack({ open: true, message: 'Failed to accept request', severity: 'error' });
                                                }
                                            }}
                                        >Accept</Button>
                                        <Button
                                            variant="outlined"
                                            size={isMobile ? 'small' : 'medium'}
                                            sx={{ borderColor: '#EF4444', color: '#EF4444', flex: { xs: '1 1 auto', sm: '0 0 auto' }, textTransform: 'none', fontWeight: 700, borderRadius: 999 }}
                                            onClick={async () => {
                                                try {
                                                    const data = await apiService.graphqlRequest(GRAPHQL_QUERIES.UPDATE_FOLLOW_STATUS, {
                                                        followerId: userId,
                                                        followingId: currentUserId,
                                                        status: 'rejected'
                                                    });
                                                    setIncomingFollowStatus(data.updateFollowStatus);
                                                    setSnack({ open: true, message: 'Request declined', severity: 'success' });
                                                } catch (e) {
                                                    setSnack({ open: true, message: 'Failed to decline request', severity: 'error' });
                                                }
                                            }}
                                        >Decline</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant={isFollowing ? "outlined" : "contained"}
                                            startIcon={<PersonAddIcon />}
                                            size={isMobile ? 'small' : 'medium'}
                                            onClick={handleFollow}
                                            disabled={followingInProgress}
                                            sx={{
                                                bgcolor: isFollowing ? 'transparent' : '#16302A',
                                                borderColor: '#16302A',
                                                color: isFollowing ? '#16302A' : 'white',
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                borderRadius: 999,
                                                flex: { xs: '1 1 auto', sm: '0 0 auto' },
                                                '&:hover': {
                                                    bgcolor: isFollowing ? 'rgba(22, 48, 42, 0.08)' : '#0A1C18'
                                                }
                                            }}
                                        >
                                            {followingInProgress
                                                ? 'Loading...'
                                                : (isFollowing || isPendingFollowStatus(followingStatus?.status)
                                                    ? 'Following'
                                                    : 'Follow')}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<MessageIcon />}
                                            size={isMobile ? 'small' : 'medium'}
                                            disabled={messagingInProgress}
                                            onClick={async () => {
                                                const meId = effectiveCurrentUserId;
                                                if (!meId) {
                                                    setSnack({ open: true, message: 'Please log in again to send a message', severity: 'error' });
                                                    return;
                                                }
                                                if (!userId) return;
                                                setMessagingInProgress(true);
                                                try {
                                                    const result = await createDmRoom({
                                                        variables: {
                                                            createdBy: String(meId),
                                                            userA: String(meId),
                                                            userB: String(userId),
                                                        },
                                                    });
                                                    const roomId =
                                                        result.data?.createDmRoom?.roomId ||
                                                        (result.data?.createDmRoom as any)?.room_id;
                                                    if (!roomId) {
                                                        setSnack({ open: true, message: 'Failed to start conversation', severity: 'error' });
                                                        return;
                                                    }
                                                    if (onOpenChat && !isMobile) {
                                                        onOpenChat(String(roomId));
                                                        return;
                                                    }
                                                    if (isMobile) {
                                                        navigate('/chat', { state: { autoSelectRoomId: String(roomId) } });
                                                        return;
                                                    }
                                                    navigate('/home', { state: { openChat: true, autoSelectRoomId: String(roomId) } });
                                                } catch (err) {
                                                    console.error('Failed to create DM room', err);
                                                    setSnack({ open: true, message: 'Failed to start conversation', severity: 'error' });
                                                } finally {
                                                    setMessagingInProgress(false);
                                                }
                                            }}
                                            sx={{
                                                borderColor: '#16302A',
                                                color: '#16302A',
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                borderRadius: 999,
                                                flex: { xs: '1 1 auto', sm: '0 0 auto' },
                                            }}
                                        >
                                            {messagingInProgress ? 'Opening…' : 'Message'}
                                        </Button>
                                    </>
                                )}
                            </>
                        </Box>
                        )}
                    </Box>

                    <Box sx={{ minWidth: 0, mt: { xs: 0.5, sm: 0 } }}>
                        <Typography sx={{
                            fontWeight: 750,
                            color: '#16302A',
                            mb: 0.35,
                            fontSize: { xs: '1.35rem', sm: '1.65rem' },
                            lineHeight: 1.2,
                            wordBreak: 'break-word',
                            ...displayFont,
                        }}>
                            {user.firstName} {user.lastName}
                        </Typography>
                        <Typography sx={{ color: '#3A4540', mb: 0.35, fontSize: { xs: '0.95rem', sm: '1.05rem' }, fontWeight: 600, textTransform: 'capitalize' }}>
                            {user.role ? String(user.role).replace(/_/g, ' ') : 'Member'}
                        </Typography>
                        {user.address ? (
                            <Typography sx={{ color: '#5C675F', fontSize: '0.875rem', mb: user.bio ? 0.75 : 0 }}>
                                {user.address}
                            </Typography>
                        ) : null}
                        {user.bio && (
                            <Typography sx={{ color: '#3A4540', fontSize: '0.9rem', mt: 0.25, maxWidth: 560, lineHeight: 1.45 }}>
                                {user.bio}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: { xs: 1.25, sm: 2 },
                        pt: 1.5,
                        mt: 1.25,
                        borderTop: '1px solid rgba(22,48,42,0.1)',
                    }}>
                        <Typography
                            component="button"
                            onClick={async () => {
                                try {
                                    setLoadingFF(true);
                                    const list = await apiService.fetchUserFollowers(userId);
                                    setFollowersList(list);
                                    setFollowersDetails(list.map((f: UserFollower) => followToDetail(f, f.followerId)));
                                    setFollowersOpen(true);
                                } finally { setLoadingFF(false); }
                            }}
                            sx={{
                                all: 'unset',
                                cursor: 'pointer',
                                fontSize: 14,
                                color: '#5C675F',
                                '& strong': { color: '#16302A', fontWeight: 750 },
                                '&:hover': { textDecoration: 'underline' },
                            }}
                        >
                            <strong>{user.followersCount.toLocaleString()}</strong> followers
                        </Typography>
                        <Typography
                            component="button"
                            onClick={async () => {
                                try {
                                    setLoadingFF(true);
                                    const list = await apiService.fetchUserFollowing(userId);
                                    setFollowingList(list);
                                    setFollowingDetails(list.map((f: UserFollower) => followToDetail(f, f.followingId)));
                                    setFollowingOpen(true);
                                } finally { setLoadingFF(false); }
                            }}
                            sx={{
                                all: 'unset',
                                cursor: 'pointer',
                                fontSize: 14,
                                color: '#5C675F',
                                '& strong': { color: '#16302A', fontWeight: 750 },
                                '&:hover': { textDecoration: 'underline' },
                            }}
                        >
                            <strong>{user.followingCount}</strong> following
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: '#5C675F' }}>
                            <Box component="span" sx={{ color: '#16302A', fontWeight: 750 }}>{user.averageRating.toFixed(1)}</Box> rating
                            <Box component="span" sx={{ mx: 0.75, color: 'rgba(22,48,42,0.35)' }}>·</Box>
                            <Box component="span" sx={{ color: '#16302A', fontWeight: 750 }}>{user.ratings.length}</Box> reviews
                        </Typography>
                    </Box>
                </Box>
                </Box>

                {/* Activity + ratings */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px' }, gap: 1.5, alignItems: 'start' }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ ...MATTE_SURFACE, borderRadius: CARD_RADIUS, px: { xs: 1.5, sm: 2 }, py: 1.5, mb: 1.25 }}>
                            <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 18, ...displayFont }}>
                                Activity
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: '#5C675F', mt: 0.25 }}>
                                Posts by {isOwnProfile ? 'you' : user.firstName}
                            </Typography>
                        </Box>
                        {postsLoading ? (
                            <Stack spacing={1.25}>
                                <PostSkeleton />
                                <PostSkeleton />
                                <PostSkeleton />
                            </Stack>
                        ) : posts.length === 0 ? (
                            <Box sx={{ ...MATTE_POST_SX, borderRadius: CARD_RADIUS, p: { xs: 2.5, sm: 3.5 }, textAlign: 'center' }}>
                                <Typography sx={{ color: '#16302A', fontWeight: 750, mb: 0.5, fontSize: 16, ...displayFont }}>
                                    No posts yet
                                </Typography>
                                <Typography sx={{ color: '#5C675F', fontSize: 13.5 }}>
                                    {isOwnProfile
                                        ? "When you share a post, it will show up here."
                                        : `${user.firstName} hasn't posted anything yet.`
                                    }
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={1.25}>
                            {(() => {
                                const pinnedPost = posts.find((p) => !!(p as any).isPinned);
                                if (!pinnedPost) return null;
                                const pinTitle = String((pinnedPost as any).title || '').trim();
                                const pinBody = String((pinnedPost as any).content || '').trim();
                                const pinPreview = pinTitle || pinBody || 'Pinned post';
                                return (
                                    <Box
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => scrollToPost(pinnedPost.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                scrollToPost(pinnedPost.id);
                                            }
                                        }}
                                        sx={{
                                            ...MATTE_POST_SX,
                                            borderRadius: CARD_RADIUS,
                                            px: 1.75,
                                            py: 1.35,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.1,
                                            border: '1px solid rgba(15,118,110,0.28)',
                                            bgcolor: 'rgba(15,118,110,0.06)',
                                            '&:hover': {
                                                bgcolor: 'rgba(15,118,110,0.1)',
                                            },
                                        }}
                                        aria-label="Open pinned post"
                                    >
                                        <PushPinOutlinedIcon sx={{ fontSize: 18, color: '#0F766E', mt: 0.2, flexShrink: 0 }} />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 750, color: '#0F766E', letterSpacing: 0.2 }}>
                                                Pinned post
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: '#16302A',
                                                    mt: 0.2,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {pinPreview}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: '#5C675F', mt: 0.15 }}>
                                                Tap to view
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            })()}
                            {posts.map((post) => {
                                const authorName = `${(post as any).userFirstName || ''} ${(post as any).userLastName || ''}`.trim()
                                    || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
                                const photoUrl =
                                    (post as any).userProfilePhotoSignedUrl ||
                                    (post as any).userProfilePhoto ||
                                    post.user?.profilePhoto ||
                                    (user as any)?.profilePhotoSignedUrl ||
                                    user?.profilePhoto ||
                                    undefined;
                                const canManage = currentUserId != null && String(currentUserId) === String((post as any).userId);
                                const title = String((post as any).title || '').trim();
                                const body = String((post as any).content || '').trim();
                                const titleRedundant =
                                    !!title &&
                                    (body.toLowerCase().startsWith(title.toLowerCase()) ||
                                        title.toLowerCase() === body.toLowerCase());
                                const POST_CONTENT_TYPES = new Set(['TEXT', 'IMAGE', 'VIDEO', 'POLL', 'REVIEW', 'PROPERTY']);
                                const rawPropertyType = String((post as any).propertyType || '').trim();
                                const listingLabel =
                                    rawPropertyType && !POST_CONTENT_TYPES.has(rawPropertyType.toUpperCase())
                                        ? rawPropertyType
                                        : '';
                                const metaBits = [
                                    (post as any).location ? String((post as any).location) : '',
                                    listingLabel,
                                    (post as any).price != null && Number((post as any).price) > 0
                                        ? `₹${(post as any).price}`
                                        : '',
                                ].filter(Boolean);
                                const relativeWhen =
                                    formatRelativeTime(post.createdAt) ||
                                    formatDateTime(post.createdAt, {
                                        latitude: (post as any).latitude,
                                        longitude: (post as any).longitude,
                                    });
                                const likeCount =
                                    postLikeCounts[String(post.id)] !== undefined
                                        ? postLikeCounts[String(post.id)]
                                        : post.likesCount || 0;
                                const commentCount = post.commentCount ?? post.commentsCount ?? 0;
                                const liked = !!likedPosts[String(post.id)];
                                const actionBtnSx = {
                                    flex: 1,
                                    minWidth: 0,
                                    color: '#3A4540',
                                    textTransform: 'none' as const,
                                    fontWeight: 650,
                                    fontSize: 13.5,
                                    borderRadius: 1.5,
                                    py: 1,
                                    px: 1,
                                    gap: 0.75,
                                    boxShadow: 'none',
                                    '& .MuiButton-startIcon': { mr: 0 },
                                    '&:hover': {
                                        bgcolor: 'rgba(22,48,42,0.06)',
                                        color: '#16302A',
                                    },
                                };
                                return (
                                <Box
                                    key={post.id}
                                    id={`post-${post.id}`}
                                    sx={{
                                        ...MATTE_POST_SX,
                                        borderRadius: CARD_RADIUS,
                                        overflow: 'hidden',
                                        p: 0,
                                        minWidth: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        outline: highlightedPostId === String(post.id)
                                            ? '2px solid #0F766E'
                                            : 'none',
                                        outlineOffset: 2,
                                        transition: 'outline-color 0.3s ease',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, px: 2, pt: 1.75, pb: 1 }}>
                                        <Avatar
                                            src={photoUrl}
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                bgcolor: stringToColor(authorName || String((post as any).userId)),
                                                fontWeight: 700,
                                                fontSize: 16,
                                            }}
                                            onClick={() => onOpenProfile && onOpenProfile((post as any).userId)}
                                        >
                                            {nameInitials(authorName, String((post as any).userId))}
                                        </Avatar>
                                        <Box
                                            onClick={() => onOpenProfile && onOpenProfile((post as any).userId)}
                                            sx={{ cursor: 'pointer', minWidth: 0, flex: 1, pt: 0.15 }}
                                            role="button"
                                            aria-label={`Open profile of ${authorName || 'user'}`}
                                        >
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                    color: '#16302A',
                                                    lineHeight: 1.25,
                                                    ...interFont,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    '&:hover': { textDecoration: 'underline', textDecorationThickness: 1.5 },
                                                }}
                                            >
                                                {authorName || 'ZPC member'}
                                            </Typography>
                                            {((post as any).userRole || user?.role || '').trim() ? (
                                                <Typography sx={{ fontSize: 12.5, color: '#5C675F', fontWeight: 500, lineHeight: 1.3, mt: 0.15 }}>
                                                    {String((post as any).userRole || user?.role || '').replace(/_/g, ' ')}
                                                </Typography>
                                            ) : null}
                                            <Typography sx={{ fontSize: 12, color: '#7A847C', fontWeight: 500, mt: 0.15, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                <Box component="span">{relativeWhen}</Box>
                                                <Box component="span" sx={{ opacity: 0.7 }}>·</Box>
                                                <Box component="span" sx={{ fontSize: 13 }} aria-hidden>🌐</Box>
                                                {(post as any).isPinned && (
                                                    <>
                                                        <Box component="span" sx={{ opacity: 0.7 }}>·</Box>
                                                        <Box
                                                            component="button"
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                scrollToPost(post.id);
                                                            }}
                                                            sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 0.35,
                                                                color: '#0F766E',
                                                                fontWeight: 700,
                                                                fontSize: 11.5,
                                                                border: 'none',
                                                                background: 'none',
                                                                p: 0,
                                                                m: 0,
                                                                cursor: 'pointer',
                                                                font: 'inherit',
                                                                '&:hover': { textDecoration: 'underline' },
                                                            }}
                                                            aria-label="Go to pinned post"
                                                        >
                                                            <PushPinOutlinedIcon sx={{ fontSize: 13 }} />
                                                            Pinned
                                                        </Box>
                                                    </>
                                                )}
                                            </Typography>
                                        </Box>
                                        {canManage && (
                                            <IconButton
                                                size="small"
                                                onClick={(e) => setPostMenu({ anchor: e.currentTarget, post })}
                                                aria-label="Post options"
                                                sx={{ color: '#3A4540' }}
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        )}
                                    </Box>

                                    <Box sx={{ px: 2, pb: metaBits.length || (post.media?.length ?? 0) > 0 ? 1 : 0.5 }}>
                                        {title && !titleRedundant ? (
                                            <Typography
                                                component="div"
                                                sx={{
                                                    color: '#16302A',
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                    lineHeight: 1.4,
                                                    mb: body ? 0.5 : 0,
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                {title}
                                            </Typography>
                                        ) : null}
                                        {body ? (
                                            <Typography
                                                component="div"
                                                sx={{
                                                    color: '#16302A',
                                                    fontSize: 14.5,
                                                    lineHeight: 1.5,
                                                    fontWeight: 450,
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                {renderMentionContent(body, {
                                                    onOpenProfile: onOpenProfile || undefined,
                                                    variant: 'chip',
                                                })}
                                            </Typography>
                                        ) : null}
                                        {metaBits.length > 0 ? (
                                            <Typography sx={{ mt: 0.85, fontSize: 12.5, color: '#5C675F', fontWeight: 500 }}>
                                                {metaBits.join(' · ')}
                                            </Typography>
                                        ) : null}
                                    </Box>

                                    {post.media && post.media.length > 0 && (
                                        <Box sx={{ width: '100%', bgcolor: 'rgba(10,18,16,0.04)' }}>
                                            <PostMediaCarousel media={post.media} maxHeight={{ xs: 360, sm: 480 }} edgeToEdge />
                                        </Box>
                                    )}

                                    {(likeCount > 0 || commentCount > 0) && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                px: 2,
                                                pt: 1.1,
                                                pb: 0.35,
                                            }}
                                        >
                                            {likeCount > 0 ? (
                                                <PostLikeCount
                                                    postId={post.id}
                                                    postUserId={(post as any).userId || userId}
                                                    likeCount={likeCount}
                                                    liked={liked}
                                                    currentUserId={currentUserId}
                                                    onOpenProfile={onOpenProfile || undefined}
                                                />
                                            ) : (
                                                <Typography sx={{ fontSize: 12.5, color: '#5C675F', fontWeight: 500 }}> </Typography>
                                            )}
                                            {commentCount > 0 ? (
                                                <Typography
                                                    onClick={() => handleCommentClick(post.id)}
                                                    sx={{
                                                        fontSize: 12.5,
                                                        color: '#5C675F',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        '&:hover': { color: '#16302A', textDecoration: 'underline' },
                                                    }}
                                                >
                                                    {commentCount} comment{commentCount === 1 ? '' : 's'}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                    )}

                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'stretch',
                                            mx: 1,
                                            mb: 0.75,
                                            mt: 0.35,
                                            pt: 0.35,
                                            borderTop: '1px solid rgba(90,70,50,0.12)',
                                            gap: 0.25,
                                        }}
                                    >
                                        <Button
                                            startIcon={
                                                liked ? (
                                                    <Box
                                                        component="span"
                                                        className={`liked-heart-emoji ${animatingPosts[String(post.id)] ? 'liked-heart-icon-clicked' : ''}`}
                                                        aria-hidden
                                                        sx={{ fontSize: 18, lineHeight: 1 }}
                                                    >
                                                        ❤️
                                                    </Box>
                                                ) : (
                                                    <FavoriteBorderIcon
                                                        className={animatingPosts[String(post.id)] ? 'liked-heart-icon-clicked' : ''}
                                                        sx={{ color: 'inherit', fontSize: 20 }}
                                                    />
                                                )
                                            }
                                            onClick={() => handleLikePostWithAnimation(String(post.id))}
                                            disabled={likingPost}
                                            sx={{
                                                ...actionBtnSx,
                                                color: liked ? '#E11D48' : '#3A4540',
                                                '&:hover': {
                                                    bgcolor: 'rgba(22,48,42,0.06)',
                                                    color: liked ? '#E11D48' : '#16302A',
                                                },
                                            }}
                                        >
                                            Like
                                        </Button>
                                        <Button
                                            startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 20, color: 'inherit' }} />}
                                            onClick={() => handleCommentClick(post.id)}
                                            sx={actionBtnSx}
                                        >
                                            Comment
                                        </Button>
                                        <Button
                                            startIcon={<ShareSymbol sx={{ fontSize: 19 }} />}
                                            aria-label="Share"
                                            disabled={(post as any).allowShare === false}
                                            onClick={() =>
                                                setSharePostTarget({
                                                    id: post.id,
                                                    title: (post as any).title,
                                                    content: (post as any).content,
                                                })
                                            }
                                            sx={actionBtnSx}
                                        >
                                            Share
                                        </Button>
                                    </Box>
                                </Box>
                                );
                            })}
                            </Stack>
                        )}
                    </Box>

                    <Box sx={{ minWidth: 0, position: { lg: 'sticky' }, top: { lg: 80 } }}>
                        <Box
                            sx={{
                                ...MATTE_SURFACE,
                                borderRadius: CARD_RADIUS,
                                p: { xs: 1.5, sm: 2 },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 16, ...displayFont }}>
                                    Ratings & Reviews
                                </Typography>
                                {!isOwnProfile && currentUserId && (
                                    <Button size={isMobile ? 'small' : 'medium'} onClick={() => setRatingOpen(v => !v)} sx={{ color: '#16302A', textTransform: 'none', fontWeight: 600 }}>
                                        {ratingOpen ? 'Close' : 'Rate User'}
                                    </Button>
                                )}
                            </Box>

                            {!isOwnProfile && currentUserId && ratingOpen && (
                                <Box sx={{ mb: 3, p: 2, ...MATTE_INSET, borderRadius: 2 }}>
                                    <Typography sx={{ fontWeight: 600, mb: 1 }}>Your rating</Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 1 }}>
                                        <Rating value={ratingValue} onChange={(_, v) => setRatingValue(v || 5)} />
                                        <Typography sx={{ color: '#6B7280' }}>{ratingValue} / 5</Typography>
                                    </Stack>
                                    <InputBase
                                        placeholder="Write a short review (optional)"
                                        value={ratingText}
                                        onChange={(e) => setRatingText(e.target.value)}
                                        sx={{
                                            bgcolor: 'rgba(255,255,255,0.55)',
                                            px: 2,
                                            py: 1.2,
                                            borderRadius: 2,
                                            fontSize: 15,
                                            flex: 1,
                                            border: '1px solid rgba(90, 70, 50, 0.12)',
                                            mb: 1
                                        }}
                                        multiline minRows={2} maxRows={4}
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        <Button disabled={ratingSubmitting} onClick={() => setRatingOpen(false)}>Cancel</Button>
                                        <Button
                                            variant="contained"
                                            disabled={ratingSubmitting}
                                            sx={{ bgcolor: '#16302A', '&:hover': { bgcolor: '#0A1C18' } }}
                                            onClick={async () => {
                                                if (!currentUserId) return;
                                                try {
                                                    setRatingSubmitting(true);
                                                    const created = await apiService.createRating(userId, currentUserId, ratingValue, ratingText || undefined, undefined);
                                                    let meInfo: { firstName: string; lastName: string; profilePhoto?: string } | undefined;
                                                    try {
                                                        const raw = localStorage.getItem('userInfo');
                                                        if (raw) {
                                                            const u = JSON.parse(raw);
                                                            meInfo = {
                                                                firstName: u.firstName || u.first_name || '',
                                                                lastName: u.lastName || u.last_name || '',
                                                                profilePhoto: u.profilePhotoSignedUrl || u.profilePhoto || u.profile_photo || undefined,
                                                            };
                                                        }
                                                    } catch { /* ignore */ }
                                                    const raterInfo = (created as any).raterFirstName || (created as any).raterLastName || meInfo
                                                        ? {
                                                            id: currentUserId,
                                                            firstName: (created as any).raterFirstName || meInfo?.firstName || '',
                                                            lastName: (created as any).raterLastName || meInfo?.lastName || '',
                                                            profilePhoto: (created as any).raterProfilePhotoSignedUrl || (created as any).raterProfilePhoto || meInfo?.profilePhoto,
                                                        }
                                                        : undefined;
                                                    // Update local reviews and averages
                                                    setReviews(prev => [{
                                                        id: created.id,
                                                        ratedUserId: userId,
                                                        ratedByUserId: currentUserId,
                                                        ratingValue,
                                                        review: ratingText || undefined,
                                                        ratingType: undefined,
                                                        createdAt: created.createdAt || new Date().toISOString(),
                                                        updatedAt: created.updatedAt || new Date().toISOString(),
                                                        raterInfo,
                                                    }, ...prev]);
                                                    setUser(prev => prev ? { ...prev, averageRating: Number(((prev.averageRating * prev.ratings.length + ratingValue) / (prev.ratings.length + 1)).toFixed(1)), ratings: [{ id: created.id, ratedUserId: userId, ratedByUserId: currentUserId, ratingValue, review: ratingText || undefined, ratingType: undefined, createdAt: created.createdAt || new Date().toISOString(), updatedAt: created.updatedAt || new Date().toISOString(), raterInfo }, ...prev.ratings] } : prev);
                                                    setSnack({ open: true, message: 'Rating submitted', severity: 'success' });
                                                    setRatingText('');
                                                    setRatingValue(5);
                                                    setRatingOpen(false);
                                                } catch (e) {
                                                    console.error('Create rating failed', e);
                                                    setSnack({ open: true, message: 'Failed to submit rating', severity: 'error' });
                                                } finally {
                                                    setRatingSubmitting(false);
                                                }
                                            }}
                                        >
                                            {ratingSubmitting ? 'Submitting...' : 'Submit'}
                                        </Button>
                                    </Box>
                                </Box>
                            )}

                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        color: '#16302A',
                                        mb: 1,
                                        fontSize: user.averageRating > 0
                                            ? { xs: '2rem', sm: '3.75rem' }
                                            : { xs: '1.35rem', sm: '1.75rem' },
                                        lineHeight: 1.15,
                                    }}
                                >
                                    {user.averageRating > 0 ? user.averageRating.toFixed(1) : 'No Ratings'}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                    {renderStars(user.averageRating)}
                                </Box>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
                                    Based on {user.ratings.length} reviews
                                </Typography>
                            </Box>

                            <Stack spacing={2}>
                                {reviews.length === 0 ? (
                                    <Typography sx={{ color: '#6B7280', textAlign: 'center', py: 2 }}>
                                        No reviews yet
                                    </Typography>
                                ) : (
                                    reviews.slice(0, 5).map((review) => (
                                        <Box key={review.id} sx={{ pb: 2, borderBottom: '1px solid #E5E7EB' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                <Avatar
                                                    src={review.raterInfo?.profilePhoto || `https://randomuser.me/api/portraits/lego/${avatarPlaceholderIndex(review.ratedByUserId)}.jpg`}
                                                    sx={{ width: 32, height: 32 }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://randomuser.me/api/portraits/lego/${avatarPlaceholderIndex(review.ratedByUserId)}.jpg`;
                                                    }}
                                                />
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {review.raterInfo
                                                                ? (`${review.raterInfo.firstName || ''} ${review.raterInfo.lastName || ''}`.trim() || `User ${review.ratedByUserId}`)
                                                                : `User ${review.ratedByUserId}`}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', flexShrink: 0 }}>
                                                            {renderStars(review.ratingValue)}
                                                        </Box>
                                                    </Box>
                                                    {review.review && (
                                                        <Typography sx={{ color: '#374151', fontSize: '0.875rem', mb: 1 }}>
                                                            {review.review}
                                                        </Typography>
                                                    )}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Typography sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                                                            {formatDateShort(review.createdAt)}
                                                        </Typography>
                                                        {review.ratingType && (
                                                            <Typography sx={{ color: '#16302A', fontSize: '0.75rem', fontWeight: 600 }}>
                                                                {review.ratingType}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))
                                )}
                            </Stack>
                        </Box>
                    </Box>
                </Box>
                </Box>
            </Box>

            {/* Comments Modal */}
            {commentsModalOpen.open && commentsModalOpen.postId && (() => {
                const currentPost = posts.find(p => String(p.id) === String(commentsModalOpen.postId));
                const comments = commentsByPost[commentsModalOpen.postId!] || [];
                const isLoadingComments = loadingComments[commentsModalOpen.postId!];

                return (
                    <Box
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            bgcolor: 'rgba(15, 23, 42, 0.55)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: { xs: 'flex-end', sm: 'center' },
                            justifyContent: 'center',
                            p: { xs: 0, sm: 2 },
                        }}
                        onClick={handleCommentsModalClose}
                    >
                        <Box
                            sx={{
                                ...MATTE_SURFACE,
                                borderRadius: { xs: '20px 20px 0 0', sm: '20px' },
                                width: { xs: '100%', sm: 'min(560px, 92vw)' },
                                height: { xs: 'min(90dvh, 90vh)', sm: 'min(720px, 86vh)' },
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0,
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: { xs: 2, sm: 2.5 },
                                    py: 1.75,
                                    flexShrink: 0,
                                    ...MATTE_HEADER,
                                    boxShadow: 'none',
                                    color: 'inherit',
                                }}
                            >
                                <Box>
                                    <Typography sx={{ fontWeight: 900, color: '#0F172A', fontSize: { xs: '1.15rem', sm: '1.3rem' }, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                                        Comments
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B', mt: 0.25 }}>
                                        {comments.length} {comments.length === 1 ? 'reply' : 'replies'}
                                    </Typography>
                                </Box>
                                <IconButton
                                    onClick={handleCommentsModalClose}
                                    size="small"
                                    sx={{
                                        color: '#0F172A',
                                        bgcolor: '#F1F5F9',
                                        width: 36,
                                        height: 36,
                                        '&:hover': { bgcolor: '#E2E8F0' },
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                            </Box>

                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2, sm: 2.5 }, py: 2 }}>
                                {currentPost && (
                                    <Box sx={{ mb: 2.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25, minWidth: 0 }}>
                                            <Avatar
                                                src={(currentPost as any).userProfilePhotoSignedUrl || currentPost.user?.profilePhoto || (currentPost as any).profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                                                sx={{ width: 44, height: 44, flexShrink: 0, fontWeight: 800, bgcolor: '#16302A' }}
                                            />
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0F172A', ...interFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {currentPost.user?.firstName || (currentPost as any).userFirstName}{' '}
                                                    {currentPost.user?.lastName || (currentPost as any).userLastName}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                                                    {formatDate(currentPost.createdAt)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {(currentPost as any).title && (
                                            <Typography sx={{ color: '#0F172A', fontWeight: 900, fontSize: 17, mb: 0.5, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
                                                {(currentPost as any).title}
                                            </Typography>
                                        )}
                                        <Typography sx={{ color: '#334155', fontSize: 15, fontWeight: 500, lineHeight: 1.55, wordBreak: 'break-word' }}>
                                            {renderMentionContent(
                                                currentPost.content || (currentPost as any).content || '',
                                                { variant: 'chip' },
                                            )}
                                        </Typography>
                                    </Box>
                                )}

                                <Typography sx={{ fontWeight: 900, color: '#0F172A', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1.5 }}>
                                    All comments
                                </Typography>

                                {isLoadingComments ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                        <CircularProgress size={28} sx={{ color: '#16302A' }} />
                                    </Box>
                                ) : comments && comments.length > 0 ? (
                                    <Stack spacing={1.75}>
                                        {nestComments(comments).map((comment: any) => (
                                            <CommentListItem
                                                key={comment.id}
                                                comment={comment}
                                                currentUserId={currentUserId}
                                                formatTime={formatDate}
                                                likedComments={likedComments}
                                                commentReactions={commentReactions}
                                                commentLikeCounts={commentLikeCounts}
                                                likingComment={likingComment}
                                                replyingCommentId={replyingCommentId}
                                                setReplyingCommentId={setReplyingCommentId}
                                                replyText={replyText}
                                                setReplyText={setReplyText}
                                                replying={replying}
                                                onReply={(text: string, parentId: string) => handleAddComment(commentsModalOpen.postId!, text, parentId)}
                                                onReactComment={handleReactComment}
                                                onEditComment={handleEditComment}
                                                onDeleteComment={handleDeleteComment}
                                            />
                                        ))}
                                    </Stack>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 5 }}>
                                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A', mb: 0.5 }}>No comments yet</Typography>
                                        <Typography sx={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Be the first to start the thread.</Typography>
                                    </Box>
                                )}
                            </Box>

                            <Box
                                sx={{
                                    flexShrink: 0,
                                    px: { xs: 2, sm: 2.5 },
                                    pt: 1.5,
                                    pb: { xs: 'max(14px, env(safe-area-inset-bottom))', sm: 2 },
                                    ...MATTE_HEADER,
                                    borderBottom: 'none',
                                    borderTop: '1px solid rgba(90, 70, 50, 0.1)',
                                    boxShadow: 'none',
                                    color: 'inherit',
                                }}
                            >
                                <CommentComposer
                                    onSubmit={(text: string) => handleAddComment(commentsModalOpen.postId!, text)}
                                />
                            </Box>
                        </Box>
                    </Box>
                );
            })()}

            {/* Followers modal */}
            {followersOpen && (
                <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setFollowersOpen(false)}>
                    <Box sx={{ ...MATTE_SURFACE, borderRadius: 3, width: { xs: '94vw', sm: 420 }, maxWidth: '94vw', maxHeight: { xs: '80vh', sm: '70vh' }, overflowY: 'auto', p: { xs: 1.5, sm: 2 } }} onClick={e => e.stopPropagation()}>
                        <Typography sx={{ fontWeight: 700, color: '#16302A', mb: 1 }}>Followers</Typography>
                        {loadingFF ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
                        ) : followersDetails.length === 0 ? (
                            <Typography sx={{ color: '#6B7280' }}>No followers</Typography>
                        ) : (
                            <Stack spacing={1.2}>
                                {followersDetails.map((f) => (
                                    <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.2, p: 1, borderRadius: 2, '&:hover': { bgcolor: '#F3F4F6' }, cursor: onOpenProfile ? 'pointer' : 'default' }}
                                         onClick={() => onOpenProfile && onOpenProfile(f.uid)}>
                                        <Avatar src={f.info?.photo || ''} sx={{ width: 32, height: 32, flexShrink: 0 }}>{(f.info?.firstName || '').charAt(0)}</Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.info ? `${f.info.firstName} ${f.info.lastName}` : `User ${f.uid}`}</Typography>
                                            <Typography sx={{ fontSize: 12, color: '#6B7280' }}>{f.info?.role || f.status}</Typography>
                                        </Box>
                                        {isOwnProfile && isPendingFollowStatus(f.status) && (
                                            <Box sx={{ display: 'flex', gap: 0.5, width: { xs: '100%', sm: 'auto' }, ml: { xs: 5, sm: 0 } }} onClick={(e) => e.stopPropagation()}>
                                                <Button size="small" variant="contained" sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, flex: { xs: 1, sm: 'none' } }}
                                                    onClick={async () => {
                                                        try {
                                                            const data = await apiService.graphqlRequest(GRAPHQL_QUERIES.UPDATE_FOLLOW_STATUS, {
                                                                followerId: f.uid,
                                                                followingId: userId,
                                                                status: 'active'
                                                            });
                                                            setFollowersDetails(prev => prev.map(x => x.id === f.id ? { ...x, status: 'active' } : x));
                                                            setUser(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : prev);
                                                            setSnack({ open: true, message: 'Request accepted', severity: 'success' });
                                                        } catch (e) {
                                                            setSnack({ open: true, message: 'Failed to accept request', severity: 'error' });
                                                        }
                                                    }}>Accept</Button>
                                                <Button size="small" variant="outlined" sx={{ borderColor: '#EF4444', color: '#EF4444', flex: { xs: 1, sm: 'none' } }}
                                                    onClick={async () => {
                                                        try {
                                                            const data = await apiService.graphqlRequest(GRAPHQL_QUERIES.UPDATE_FOLLOW_STATUS, {
                                                                followerId: f.uid,
                                                                followingId: userId,
                                                                status: 'rejected'
                                                            });
                                                            setFollowersDetails(prev => prev.map(x => x.id === f.id ? { ...x, status: 'rejected' } : x));
                                                            setSnack({ open: true, message: 'Request declined', severity: 'success' });
                                                        } catch (e) {
                                                            setSnack({ open: true, message: 'Failed to decline request', severity: 'error' });
                                                        }
                                                    }}>Decline</Button>
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Box>
            )}

            {/* Following modal */}
            {followingOpen && (
                <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setFollowingOpen(false)}>
                    <Box sx={{ ...MATTE_SURFACE, borderRadius: 3, width: { xs: '94vw', sm: 420 }, maxWidth: '94vw', maxHeight: { xs: '80vh', sm: '70vh' }, overflowY: 'auto', p: { xs: 1.5, sm: 2 } }} onClick={e => e.stopPropagation()}>
                        <Typography sx={{ fontWeight: 700, color: '#16302A', mb: 1 }}>Following</Typography>
                        {loadingFF ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
                        ) : followingDetails.length === 0 ? (
                            <Typography sx={{ color: '#6B7280' }}>No following</Typography>
                        ) : (
                            <Stack spacing={1.2}>
                                {followingDetails.map((f) => (
                                    <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1, borderRadius: 2, '&:hover': { bgcolor: '#F3F4F6' }, cursor: onOpenProfile ? 'pointer' : 'default' }}
                                         onClick={() => onOpenProfile && onOpenProfile(f.uid)}>
                                        <Avatar src={f.info?.photo || ''} sx={{ width: 32, height: 32, flexShrink: 0 }}>{(f.info?.firstName || '').charAt(0)}</Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.info ? `${f.info.firstName} ${f.info.lastName}` : `User ${f.uid}`}</Typography>
                                            <Typography sx={{ fontSize: 12, color: '#6B7280' }}>{f.info?.role || f.status}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Box>
            )}
        </Box>

        <Menu
            anchorEl={postMenu?.anchor}
            open={Boolean(postMenu)}
            onClose={() => setPostMenu(null)}
            disableScrollLock
        >
            <MenuItem
                onClick={() => {
                    if (!postMenu) return;
                    setEditPost(postMenu.post);
                    setEditTitle((postMenu.post as any).title || '');
                    setEditContent(collapseMentionTokens((postMenu.post as any).content || ''));
                    setPostMenu(null);
                }}
            >
                Edit
            </MenuItem>
            <MenuItem
                onClick={async () => {
                    if (!postMenu || !effectiveCurrentUserId) return;
                    const postId = String(postMenu.post.id);
                    const currentlyPinned = !!(postMenu.post as any).isPinned;
                    setPostMenu(null);
                    try {
                        const mutation = currentlyPinned ? unpinPostMutation : pinPostMutation;
                        const key = currentlyPinned ? 'unpinPost' : 'pinPost';
                        const { data: result } = await mutation({
                            variables: { postId, userId: String(effectiveCurrentUserId) },
                        });
                        if (result?.[key]?.success) {
                            setPosts((prev) =>
                                sortPostsPinnedFirst(
                                    prev.map((p) => {
                                        if (String(p.id) === postId) {
                                            return { ...p, isPinned: !currentlyPinned } as any;
                                        }
                                        // Only one pinned post per profile
                                        if (!currentlyPinned && (p as any).isPinned) {
                                            return { ...p, isPinned: false } as any;
                                        }
                                        return p;
                                    })
                                )
                            );
                        } else {
                            window.alert(result?.[key]?.message || `Could not ${currentlyPinned ? 'unpin' : 'pin'} post`);
                        }
                    } catch (err) {
                        console.error(err);
                        window.alert(`Could not ${currentlyPinned ? 'unpin' : 'pin'} post`);
                    }
                }}
            >
                {postMenu && (postMenu.post as any).isPinned ? 'Unpin from profile' : 'Pin to profile'}
            </MenuItem>
            <MenuItem
                sx={{ color: '#DC2626' }}
                onClick={async () => {
                    if (!postMenu) return;
                    const postId = String(postMenu.post.id);
                    setPostMenu(null);
                    if (!window.confirm('Delete this post?')) return;
                    try {
                        const { data: result } = await deletePostMutation({ variables: { postId } });
                        if (result?.deletePost?.success) {
                            setPosts((prev) => prev.filter((p) => String(p.id) !== postId));
                        } else {
                            window.alert(result?.deletePost?.message || 'Failed to delete post');
                        }
                    } catch (err) {
                        console.error(err);
                        window.alert('Failed to delete post');
                    }
                }}
            >
                Delete
            </MenuItem>
        </Menu>

        <Dialog open={Boolean(editPost)} onClose={() => !editSaving && setEditPost(null)} fullWidth maxWidth="sm">
            <DialogTitle>Edit post</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                    label="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    fullWidth
                    disabled={editSaving}
                />
                <TextField
                    label="Content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    fullWidth
                    multiline
                    minRows={4}
                    disabled={editSaving}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setEditPost(null)} disabled={editSaving} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button
                    variant="contained"
                    disabled={editSaving || !editTitle.trim() || !editContent.trim()}
                    sx={{ textTransform: 'none' }}
                    onClick={async () => {
                        if (!editPost) return;
                        setEditSaving(true);
                        try {
                            const postId = String(editPost.id);
                            const maps = mentionMapsFromTokens((editPost as any).content || '');
                            const expandedContent = expandPrettyMentions(
                                editContent.trim(),
                                maps.userNameToId,
                                maps.propertyNameToId,
                            );
                            const { data: result } = await updatePostMutation({
                                variables: {
                                    postId,
                                    title: editTitle.trim(),
                                    content: expandedContent,
                                },
                            });
                            if (result?.updatePost?.success) {
                                setPosts((prev) =>
                                    prev.map((p) =>
                                        String(p.id) === postId
                                            ? ({ ...p, title: editTitle.trim(), content: expandedContent } as any)
                                            : p
                                    )
                                );
                                setEditPost(null);
                            } else {
                                window.alert(result?.updatePost?.message || 'Failed to update post');
                            }
                        } catch (err) {
                            console.error(err);
                            window.alert('Failed to update post');
                        } finally {
                            setEditSaving(false);
                        }
                    }}
                >
                    {editSaving ? 'Saving…' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>

        <SharePostSheet
            open={!!sharePostTarget}
            post={sharePostTarget}
            onClose={() => setSharePostTarget(null)}
        />

        <Dialog
            open={Boolean(photoLightbox)}
            onClose={() => setPhotoLightbox(null)}
            fullScreen={isMobile}
            maxWidth="md"
            PaperProps={{
                sx: {
                    bgcolor: isMobile ? '#0A1C18' : 'transparent',
                    boxShadow: 'none',
                    m: isMobile ? 0 : 2,
                    overflow: 'visible',
                },
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: isMobile ? '100%' : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isMobile ? '#0A1C18' : 'transparent',
                    p: isMobile ? 0 : 0,
                }}
            >
                <IconButton
                    aria-label="Close"
                    onClick={() => setPhotoLightbox(null)}
                    sx={{
                        position: 'absolute',
                        top: { xs: 12, sm: 8 },
                        left: { xs: 12, sm: 8 },
                        zIndex: 2,
                        bgcolor: 'rgba(235,230,212,0.92)',
                        color: '#16302A',
                        '&:hover': { bgcolor: '#EBE6D4' },
                    }}
                >
                    <CloseIcon />
                </IconButton>
                {isOwnProfile && photoLightbox && (
                    <IconButton
                        aria-label={photoLightbox.kind === 'cover' ? 'Change cover photo' : 'Change profile photo'}
                        onClick={() => {
                            if (photoLightbox.kind === 'cover') handleChooseCoverPhoto();
                            else handleChooseProfilePhoto();
                        }}
                        sx={{
                            position: 'absolute',
                            top: { xs: 12, sm: 8 },
                            right: { xs: 12, sm: 8 },
                            zIndex: 2,
                            bgcolor: '#16302A',
                            color: '#EBE6D4',
                            border: '1px solid rgba(235,230,212,0.35)',
                            '&:hover': { bgcolor: '#0A1C18' },
                        }}
                    >
                        <CameraAltIcon />
                    </IconButton>
                )}
                {photoLightbox && (
                    <Box
                        component="img"
                        src={photoLightbox.src}
                        alt={photoLightbox.kind === 'cover' ? 'Cover photo' : 'Profile photo'}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: isMobile ? '100vh' : '85vh',
                            width: photoLightbox.kind === 'cover' ? '100%' : 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            borderRadius: photoLightbox.kind === 'profile' && !isMobile ? '50%' : (isMobile ? 0 : 2),
                            boxShadow: isMobile ? 'none' : '0 8px 32px rgba(0,0,0,0.45)',
                        }}
                    />
                )}
            </Box>
        </Dialog>
    </>
    );
};

export default ProfilePage;