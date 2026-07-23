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
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareSymbol from './icons/ShareSymbol';
import StarIcon from '@mui/icons-material/Star';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MessageIcon from '@mui/icons-material/Message';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_POSTS_BY_USER, DELETE_POST, UPDATE_POST } from '../graphql/posts';
import { CREATE_DM_ROOM_MUTATION } from '../graphql/chat';
import { renderMentionContent, nameInitials, stringToColor } from '../utils/mentions';
import CommentListItem from './comments/CommentListItem';
import CommentComposer from './comments/CommentComposer';
import { normalizeReactionEmoji } from './comments/commentReactions';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE, MATTE_INSET } from '../theme/surfaces';

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8080/api/v1/graphql';

const interFont = {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

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

// Utility function to safely format dates
const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'Unknown date';

    try {
        let date: Date;

        // Handle different date formats
        if (typeof dateValue === 'number') {
            // Handle both Unix timestamp (seconds) and milliseconds
            date = dateValue > 1e10 ? new Date(dateValue) : new Date(dateValue * 1000);
        } else if (typeof dateValue === 'string') {
            // Handle ISO string format from GraphQL
            date = new Date(dateValue);
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            console.warn('Unknown date format:', dateValue);
            return 'Unknown date format';
        }

        if (isNaN(date.getTime())) {
            console.warn('Invalid date value:', dateValue);
            return 'Invalid date';
        }

        return date.toLocaleString();
    } catch (error) {
        console.error('Error formatting date:', dateValue, error);
        return 'Date format error';
    }
};

// Comments UI uses shared CommentListItem + CommentComposer

interface User {
    id: number;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
}

interface PostMedia {
    id: number;
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
    id: number;
    ratedUserId: number;
    ratedByUserId: number;
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
    id: number;
    userId: number;
    followingId: number;
    status: string;
    followedAt: string;
}

interface UserProfile {
    id: number;
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

interface ProfilePageProps {
    onGoBack: () => void;
    userId: number;
    currentUserId?: number;
    onOpenProfile?: (userId: number) => void;
}

const GRAPHQL_QUERIES = {
    GET_USER_PROFILE: `
        query GetUserProfile($id: Int!) {
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
        mutation UpdateProfilePhoto($userId: Int!, $filePath: String!, $fileName: String, $contentType: String) {
            updateProfilePhoto(userId: $userId, filePath: $filePath, fileName: $fileName, contentType: $contentType) {
                id
                profilePhotoId
                profilePhotoUrl
                profilePhotoSignedUrl
            }
        }
    `,

    UPDATE_COVER_PHOTO: `
        mutation UpdateCoverPhoto($userId: Int!, $filePath: String!, $fileName: String, $contentType: String) {
            updateCoverPhoto(userId: $userId, filePath: $filePath, fileName: $fileName, contentType: $contentType) {
                id
                coverPhotoId
                coverPhotoUrl
                coverPhotoSignedUrl
            }
        }
    `,

    UPDATE_FOLLOW_STATUS: `
        mutation UpdateFollowStatus($followerId: Int!, $followingId: Int!, $status: String!) {
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
        query PendingFollowRequests($userId: Int!) {
            pendingFollowRequests(userId: $userId) {
                id
                followerId
                followingId
                status
                followedAt
            }
        }
    `,

    GET_USER_RATINGS: `
        query GetUserRatings($userId: Int!) {
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
        query GetUserFollowers($userId: Int!) {
            userFollowers(userId: $userId) {
                id
                followerId
                followingId
                status
                followedAt
            }
        }
    `,

    GET_USER_FOLLOWING: `
        query GetUserFollowing($userId: Int!) {
            userFollowing(userId: $userId) {
                id
                followerId
                followingId
                status
                followedAt
            }
        }
    `,

    CHECK_FOLLOWING_STATUS: `
        query CheckFollowingStatus($userId: Int!, $followingId: Int!) {
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
        mutation CreateUserRating($ratedUserId: Int!, $ratedByUserId: Int!, $ratingValue: Int!, $review: String, $ratingType: String) {
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
        mutation FollowUser($userId: Int!, $followingId: Int!) {
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
        query UserPosts($userId: Int!, $page: Int, $limit: Int) {
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
        query PostComments($postId: Int!, $limit: Int) {
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
                likeCount
            }
        }
    `,

    LIKE_POST: `
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
    `,

    UNLIKE_POST: `
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
    `,

    LIKE_COMMENT: `
        mutation LikeComment($commentId: Int!, $userId: Int!, $reactionType: String) {
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
    `,

    UPDATE_COMMENT: `
        mutation UpdateComment($commentId: Int!, $comment: String) {
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
        mutation DeleteComment($commentId: Int!) {
            deleteComment(commentId: $commentId) {
                success
                message
            }
        }
    `,

    CREATE_COMMENT: `
        mutation CreateComment($postId: Int!, $userId: Int!, $comment: String!, $parentCommentId: Int) {
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

    async fetchUserProfile(userId: number): Promise<UserProfile> {
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

    async fetchUserPosts(userId: number): Promise<Post[]> {
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
                postId: parseInt(postId, 10),
                limit
            });

            console.log('Raw comments data:', data.postComments?.[0]); // Debug first comment

            return (data.postComments || []).map((comment: any) => ({
                id: comment.id,
                postId: comment.postId,
                userId: comment.userId,
                userFirstName: comment.userFirstName,
                userLastName: comment.userLastName,
                userRole: comment.userRole,
                comment: comment.comment,
                parentCommentId: comment.parentCommentId,
                status: comment.status,
                addedAt: comment.addedAt, // Keep as string, will be converted in component
                commentedAt: comment.commentedAt, // Keep as string, will be converted in component
                likeCount: comment.likeCount || 0,
                profilePhoto: comment.profilePhoto,
                profilePhotoSignedUrl: comment.profilePhotoSignedUrl,
                replies: (comment.replies || []).map((reply: any) => ({
                    id: reply.id,
                    postId: reply.postId,
                    userId: reply.userId,
                    userFirstName: reply.userFirstName,
                    userLastName: reply.userLastName,
                    userRole: reply.userRole,
                    comment: reply.comment,
                    parentCommentId: reply.parentCommentId,
                    status: reply.status,
                    addedAt: reply.addedAt, // Keep as string
                    commentedAt: reply.commentedAt, // Keep as string
                    likeCount: reply.likeCount || 0,
                    profilePhoto: reply.profilePhoto,
                    profilePhotoSignedUrl: reply.profilePhotoSignedUrl,
                }))
            }));
        } catch (error) {
            console.error('Error fetching post comments:', error);
            return [];
        }
    },

    async fetchUserReviews(userId: number): Promise<UserRating[]> {
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

    async fetchUserFollowers(userId: number): Promise<UserFollower[]> {
        try {
            const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_USER_FOLLOWERS, { userId });
            return (data.userFollowers || []).map((follower: any) => ({
                id: follower.id,
                userId: follower.userId,
                followingId: follower.followingId,
                status: follower.status,
                followedAt: follower.followedAt
            }));
        } catch (error) {
            console.error('Error fetching user followers:', error);
            return [];
        }
    },

    async fetchUserFollowing(userId: number): Promise<UserFollower[]> {
        try {
            const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_USER_FOLLOWING, { userId });
            return (data.userFollowing || []).map((following: any) => ({
                id: following.id,
                userId: following.userId,
                followingId: following.followingId,
                status: following.status,
                followedAt: following.followedAt
            }));
        } catch (error) {
            console.error('Error fetching user following:', error);
            return [];
        }
    },

    async checkFollowingStatus(userId: number, followingId: number): Promise<UserFollower | null> {
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

    async followUser(userId: number, followingId: number): Promise<UserFollower> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.FOLLOW_USER, {
            userId,
            followingId
        });
        return data.followUser;
    },

    async createRating(
        ratedUserId: number,
        ratedByUserId: number,
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

    async likePost(postId: number, userId: number): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.LIKE_POST, {
            postId,
            userId
        });
        return data.likePost;
    },

    async unlikePost(postId: number, userId: number): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.UNLIKE_POST, {
            postId,
            userId
        });
        return data.unlikePost;
    },

    async likeComment(commentId: number, userId: number, reactionType?: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.LIKE_COMMENT, {
            commentId,
            userId,
            reactionType: reactionType || 'like',
        });
        return data.likeComment;
    },

    async unlikeComment(commentId: number, userId: number): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.UNLIKE_COMMENT, {
            commentId,
            userId,
        });
        return data.unlikeComment;
    },

    async updateComment(commentId: number, comment: string): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.UPDATE_COMMENT, {
            commentId,
            comment,
        });
        return data.updateComment;
    },

    async deleteComment(commentId: number): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.DELETE_COMMENT, {
            commentId,
        });
        return data.deleteComment;
    },

    async createComment(postId: number, userId: number, comment: string, parentCommentId?: number): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.CREATE_COMMENT, {
            postId,
            userId,
            comment,
            parentCommentId
        });
        return data.createComment;
    },
};
const ProfilePage: React.FC<ProfilePageProps> = ({ onGoBack, userId, currentUserId, onOpenProfile }) => {
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width:900px)');
    const [createDmRoom] = useMutation(CREATE_DM_ROOM_MUTATION);
    const [deletePostMutation] = useMutation(DELETE_POST);
    const [updatePostMutation] = useMutation(UPDATE_POST);
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

    // Post likes and comments state
    const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
    const [postLikeCounts, setPostLikeCounts] = useState<{ [postId: string]: number }>({});
    const [likedComments, setLikedComments] = useState<{ [commentId: number]: boolean }>({});
    const [commentReactions, setCommentReactions] = useState<{ [commentId: number]: string }>({});
    const [commentLikeCounts, setCommentLikeCounts] = useState<{ [commentId: number]: number }>({});
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
    const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null);
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

    const enrichUsers = async (userIds: number[]) => {
        const unique = Array.from(new Set(userIds.filter((x) => Number.isFinite(x))));
        const entries = await Promise.all(unique.map(async (uid) => {
            try {
                const res = await apiService.graphqlRequest(GRAPHQL_QUERIES.GET_USER_PROFILE, { id: uid });
                const u = res.user;
                return [uid, {
                    id: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    role: u.role,
                    photo: u.profilePhotoSignedUrl || u.profilePhoto,
                }];
            } catch {
                return [uid, null];
            }
        }));
        return Object.fromEntries(entries);
    };
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
                        setIsFollowing(followStatus?.status === 'active');
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
                const postsWithDetails = data.postsByUser.map((post: any) => ({
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
                }));
                setPosts(postsWithDetails);

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

    const handleFollow = async () => {
        if (!currentUserId || !user) return;

        try {
            setFollowingInProgress(true);

            // Only allow action when not already following or pending
            if (isFollowing || followingStatus?.status === 'pending') {
                return;
            }

            const followResult = await apiService.followUser(currentUserId, userId);
            setFollowingStatus(followResult);
            const isActive = followResult?.status === 'active';
            setIsFollowing(isActive);
            // Followers count only increases if accepted immediately (shouldn't for users)
            if (isActive) {
                setUser(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
            }
            setSnack({ open: true, message: followResult?.status === 'pending' ? 'Follow request sent' : 'Following', severity: 'success' });
        } catch (err) {
            console.error('Error sending follow request:', err);
            setSnack({ open: true, message: 'Failed to send follow request', severity: 'error' });
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
        if (followingStatus?.status !== 'pending') return;

        const interval = setInterval(async () => {
            try {
                const latest = await apiService.checkFollowingStatus(currentUserId, userId);
                if (latest?.status && latest.status !== followingStatus.status) {
                    setFollowingStatus(latest);
                    setIsFollowing(latest.status === 'active');
                    if (prevStatusRef.current === 'pending' && latest.status === 'active') {
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
            setUser(prev => prev ? {
                ...prev,
                profilePhoto: !isCover ? (updated.profilePhotoSignedUrl || prev.profilePhoto) : prev.profilePhoto,
                // Pass along signed URLs by attaching them on the user object cast
                ...(isCover ? { coverPhotoSignedUrl: updated.coverPhotoSignedUrl } : { profilePhotoSignedUrl: updated.profilePhotoSignedUrl })
            } as any : prev);

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
                const result = await apiService.unlikePost(parseInt(postId), currentUserId);
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
                const result = await apiService.likePost(parseInt(postId), currentUserId);
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

    const handleAddComment = async (postId: string, commentText: string, parentCommentId?: number) => {
        if (!currentUserId || !commentText.trim()) return;

        try {
            const result = await apiService.createComment(
                parseInt(postId),
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

    const handleReactComment = async (commentId: number, emoji: string) => {
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

    const handleEditComment = async (commentId: number, text: string) => {
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

    const handleDeleteComment = async (commentId: number) => {
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
                    <CircularProgress size={48} sx={{ color: '#2563EB', mb: 2 }} />
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
                        zIndex: 1201,
                        bgcolor: '#F3EFE8 !important',
                        backgroundColor: '#F3EFE8 !important',
                        backgroundImage: 'linear-gradient(180deg, #F6F2EB 0%, #EFEAE2 100%) !important',
                    }}
                >
                    <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 }, gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 }, minWidth: 0 }}>
                            <IconButton onClick={onGoBack} size={isMobile ? 'small' : 'medium'} sx={{ color: '#2563EB' }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563EB', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                Profile
                            </Typography>
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 900,
                                color: '#2563EB',
                                letterSpacing: 1,
                                fontSize: { xs: 'clamp(0.85rem, 3.5vw, 1.1rem)', sm: '1.5rem' },
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minWidth: 0,
                                maxWidth: { xs: '48%', sm: 'none' },
                            }}
                        >
                            Zameen pe charcha
                        </Typography>
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

    const isOwnProfile = currentUserId === userId;

    return (
        <>
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
                    zIndex: 1201,
                    bgcolor: '#F3EFE8 !important',
                    backgroundColor: '#F3EFE8 !important',
                    backgroundImage: 'linear-gradient(180deg, #F6F2EB 0%, #EFEAE2 100%) !important',
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 }, gap: 1, bgcolor: 'transparent' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 }, minWidth: 0 }}>
                        <IconButton onClick={onGoBack} size={isMobile ? 'small' : 'medium'} sx={{ color: '#2563EB' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563EB', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            Profile
                        </Typography>
                    </Box>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 900,
                            color: '#2563EB',
                            letterSpacing: 1,
                            fontSize: { xs: 'clamp(0.85rem, 3.5vw, 1.1rem)', sm: '1.5rem' },
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                            maxWidth: { xs: '48%', sm: 'none' },
                        }}
                    >
                        Zameen pe charcha
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{ pt: { xs: 9, sm: 10 }, px: { xs: 1.25, sm: 2 }, pb: { xs: 3, sm: 4 } }}>
                <Box sx={{ position: 'relative', borderRadius: { xs: 1.5, sm: 2 }, overflow: 'hidden', mb: { xs: 2, sm: 3 } }}>
                    <Box
                        component="img"
                        src={(user as any).coverPhotoSignedUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop'}
                        alt="Cover"
                        sx={{
                            width: '100%',
                            height: { xs: 140, sm: 200, md: 250 },
                            objectFit: 'cover',
                            display: 'block',
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop';
                        }}
                    />
                    {isOwnProfile && (
                        <Button
                            startIcon={<CameraAltIcon />}
                            size={isMobile ? 'small' : 'medium'}
                            sx={{
                                position: 'absolute',
                                top: { xs: 8, sm: 16 },
                                right: { xs: 8, sm: 16 },
                                bgcolor: 'rgba(255,255,255,0.9)',
                                color: '#2563EB',
                                textTransform: 'none',
                                fontWeight: 600,
                                minWidth: { xs: 0, sm: 'auto' },
                                px: { xs: 1.25, sm: 2 },
                            }}
                            onClick={handleChooseCoverPhoto}
                        >
                            {isMobile ? 'Edit' : 'Edit Cover'}
                        </Button>
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
                        ...MATTE_SURFACE,
                        borderRadius: { xs: 2, sm: 3 },
                        p: { xs: 1.5, sm: 3 },
                        mb: { xs: 2, sm: 3 },
                        bgcolor: '#F3EFE8',
                        backgroundColor: '#F3EFE8',
                        backgroundImage: 'linear-gradient(165deg, #F6F2EB 0%, #EFEAE2 55%, #EAE4DB 100%)',
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'flex-start' },
                        justifyContent: 'space-between',
                        gap: 2,
                        mb: { xs: 2, sm: 3 },
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                <Avatar
                                    src={(user as any).profilePhotoSignedUrl || user.profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                                    sx={{ width: { xs: 72, sm: 100 }, height: { xs: 72, sm: 100 }, border: '4px solid white', boxShadow: 2 }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://randomuser.me/api/portraits/lego/1.jpg';
                                    }}
                                />
                                {user.isActive && (
                                    <Box sx={{
                                        position: 'absolute',
                                        bottom: { xs: 4, sm: 8 },
                                        right: { xs: 4, sm: 8 },
                                        width: { xs: 12, sm: 16 },
                                        height: { xs: 12, sm: 16 },
                                        bgcolor: '#4CAF50',
                                        borderRadius: '50%',
                                        border: '2px solid white'
                                    }} />
                                )}
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{
                                    fontWeight: 700,
                                    color: '#2563EB',
                                    mb: 0.5,
                                    fontSize: { xs: '1.25rem', sm: '2.125rem' },
                                    lineHeight: 1.2,
                                    wordBreak: 'break-word',
                                }}>
                                    {user.firstName} {user.lastName}
                                </Typography>
                                <Typography sx={{ color: '#6B7280', mb: 0.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}>{user.role || 'User'}</Typography>
                                <Typography sx={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{user.address || 'No location provided'}</Typography>
                                {user.bio && (
                                    <Typography sx={{ color: '#6B7280', fontSize: '0.875rem', mt: 1, maxWidth: { xs: '100%', sm: 300 } }}>
                                        {user.bio}
                                    </Typography>
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
                            }}>
                                {incomingFollowStatus?.status === 'pending' ? (
                                    <>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? 'small' : 'medium'}
                                            sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
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
                                            sx={{ borderColor: '#EF4444', color: '#EF4444', flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
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
                                                bgcolor: isFollowing ? 'transparent' : '#2563EB',
                                                borderColor: '#2563EB',
                                                color: isFollowing ? '#2563EB' : 'white',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                flex: { xs: '1 1 auto', sm: '0 0 auto' },
                                                '&:hover': {
                                                    bgcolor: isFollowing ? 'rgba(37, 99, 235, 0.1)' : '#1D4ED8'
                                                }
                                            }}
                                        >
                                            {followingInProgress ? 'Loading...' : (
                                                followingStatus?.status === 'pending' ? 'Requested' : (
                                                isFollowing ? 'Following' : 'Follow')
                                            )}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<MessageIcon />}
                                            size={isMobile ? 'small' : 'medium'}
                                            onClick={async () => {
                                                if (!currentUserId || !user) return;
                                                try {
                                                    const result = await createDmRoom({
                                                        variables: {
                                                            createdBy: String(currentUserId),
                                                            userA: String(currentUserId),
                                                            userB: String(userId),
                                                        },
                                                    });
                                                    const roomId = result.data?.createDmRoom?.roomId;
                                                    if (!roomId) {
                                                        setSnack({ open: true, message: 'Failed to start conversation', severity: 'error' });
                                                        return;
                                                    }
                                                    navigate('/home', { state: { openChat: true, autoSelectRoomId: roomId } });
                                                } catch (err) {
                                                    console.error('Failed to create DM room', err);
                                                    setSnack({ open: true, message: 'Failed to start conversation', severity: 'error' });
                                                }
                                            }}
                                            sx={{
                                                borderColor: '#2563EB',
                                                color: '#2563EB',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                flex: { xs: '1 1 auto', sm: '0 0 auto' },
                                            }}
                                        >
                                            Message
                                        </Button>
                                    </>
                                )}
                            </Box>
                        )}
                        {isOwnProfile && followingStatus?.status === 'pending' && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                                <Button
                                    variant="contained"
                                    size={isMobile ? 'small' : 'medium'}
                                    sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
                                    onClick={async () => {
                                        try {
                                            const data = await apiService.graphqlRequest(GRAPHQL_QUERIES.UPDATE_FOLLOW_STATUS, {
                                                followerId: (followingStatus as any)?.followerId || (followingStatus as any)?.userId || 0,
                                                followingId: userId,
                                                status: 'active'
                                            });
                                            const updated = data.updateFollowStatus;
                                            setFollowingStatus(updated);
                                            setIsFollowing(true);
                                            setUser(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : prev);
                                            setSnack({ open: true, message: 'Request accepted', severity: 'success' });
                                        } catch (e) {
                                            setSnack({ open: true, message: 'Failed to accept request', severity: 'error' });
                                        }
                                    }}
                                >Accept</Button>
                                <Button
                                    variant="outlined"
                                    size={isMobile ? 'small' : 'medium'}
                                    sx={{ borderColor: '#EF4444', color: '#EF4444', flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
                                    onClick={async () => {
                                        try {
                                            const data = await apiService.graphqlRequest(GRAPHQL_QUERIES.UPDATE_FOLLOW_STATUS, {
                                                followerId: (followingStatus as any)?.followerId || (followingStatus as any)?.userId || 0,
                                                followingId: userId,
                                                status: 'rejected'
                                            });
                                            const updated = data.updateFollowStatus;
                                            setFollowingStatus(updated);
                                            setIsFollowing(false);
                                            setSnack({ open: true, message: 'Request declined', severity: 'success' });
                                        } catch (e) {
                                            setSnack({ open: true, message: 'Failed to decline request', severity: 'error' });
                                        }
                                    }}
                                >Decline</Button>
                            </Box>
                        )}
                        {isOwnProfile && (
                            <Box sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                                width: { xs: '100%', sm: 'auto' },
                                flexShrink: 0,
                            }}>
                                <Button
                                    variant="outlined"
                                    size={isMobile ? 'small' : 'medium'}
                                    sx={{ flex: { xs: '1 1 auto', sm: '0 0 auto' }, textTransform: 'none' }}
                                    onClick={handleChooseProfilePhoto}
                                >
                                    {isMobile ? 'Change Photo' : 'Change Profile Photo'}
                                </Button>
                                <Button
                                    variant="contained"
                                    size={isMobile ? 'small' : 'medium'}
                                    sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, flex: { xs: '1 1 auto', sm: '0 0 auto' }, textTransform: 'none' }}
                                    onClick={async () => {
                                        try {
                                            setLoadingFF(true);
                                            const data = await apiService.graphqlRequest(GRAPHQL_QUERIES.PENDING_FOLLOW_REQUESTS, { userId });
                                            const list = (data?.pendingFollowRequests || []);
                                            const map = await enrichUsers(list.map((p: any) => p.followerId));
                                            setFollowersDetails(list.map((p: any) => ({ id: p.id, uid: p.followerId, status: p.status, info: map[p.followerId] || null })));
                                            setFollowersOpen(true);
                                        } finally { setLoadingFF(false); }
                                    }}
                                >
                                    {isMobile ? 'Pending' : 'Pending requests'}
                                </Button>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'nowrap',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: { xs: 0.5, sm: 4 },
                        pt: 2,
                        borderTop: '1px solid #E5E7EB',
                    }}>
                        <Box sx={{ textAlign: 'center', cursor: 'pointer', flex: 1, minWidth: 0 }} onClick={async () => {
                            try {
                                setLoadingFF(true);
                                const list = await apiService.fetchUserFollowers(userId);
                                setFollowersList(list);
                                const map = await enrichUsers(list.map((f: any) => f.followerId || f.userId));
                                setFollowersDetails(list.map((f: any) => ({
                                    id: f.id,
                                    uid: f.followerId || f.userId,
                                    status: f.status,
                                    info: map[f.followerId || f.userId] || null,
                                })));
                                setFollowersOpen(true);
                            } finally { setLoadingFF(false); }
                        }}>
                            <Typography sx={{ fontWeight: 700, color: '#2563EB', fontSize: { xs: '1.05rem', sm: '1.5rem' }, lineHeight: 1.2 }}>
                                {user.followersCount.toLocaleString()}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: { xs: '0.7rem', sm: '0.875rem' }, whiteSpace: 'nowrap' }}>Followers</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', cursor: 'pointer', flex: 1, minWidth: 0 }} onClick={async () => {
                            try {
                                setLoadingFF(true);
                                const list = await apiService.fetchUserFollowing(userId);
                                setFollowingList(list);
                                const map = await enrichUsers(list.map((f: any) => f.followingId));
                                setFollowingDetails(list.map((f: any) => ({
                                    id: f.id,
                                    uid: f.followingId,
                                    status: f.status,
                                    info: map[f.followingId] || null,
                                })));
                                setFollowingOpen(true);
                            } finally { setLoadingFF(false); }
                        }}>
                            <Typography sx={{ fontWeight: 700, color: '#2563EB', fontSize: { xs: '1.05rem', sm: '1.5rem' }, lineHeight: 1.2 }}>
                                {user.followingCount}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: { xs: '0.7rem', sm: '0.875rem' }, whiteSpace: 'nowrap' }}>Following</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, color: '#2563EB', fontSize: { xs: '1.05rem', sm: '1.5rem' }, lineHeight: 1.2 }}>
                                {user.averageRating.toFixed(1)}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: { xs: '0.7rem', sm: '0.875rem' }, whiteSpace: 'nowrap' }}>Rating</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, color: '#2563EB', fontSize: { xs: '1.05rem', sm: '1.5rem' }, lineHeight: 1.2 }}>
                                {user.ratings.length}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: { xs: '0.7rem', sm: '0.875rem' }, whiteSpace: 'nowrap' }}>Reviews</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* User Posts Section */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: { xs: 2, sm: 3 } }}>
                    <Box sx={{ minWidth: 0 }}>
                        {postsLoading ? (
                            <Stack spacing={4}>
                                <PostSkeleton />
                                <PostSkeleton />
                                <PostSkeleton />
                            </Stack>
                        ) : posts.length === 0 ? (
                            <Box sx={{ ...MATTE_POST_SX, borderRadius: { xs: 2, sm: 3 }, p: { xs: 2.5, sm: 4 }, textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ color: '#6B7280', mb: 1 }}>
                                    No Posts Yet
                                </Typography>
                                <Typography sx={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                                    {isOwnProfile
                                        ? "You haven't created any posts yet."
                                        : `${user.firstName} hasn't posted anything yet.`
                                    }
                                </Typography>
                            </Box>
                        ) : (
                            posts.map((post) => {
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
                                return (
                                <Box key={post.id} sx={{ ...MATTE_POST_SX, borderRadius: { xs: 2, sm: 3 }, p: { xs: 1.5, sm: 3 }, mb: { xs: 2, sm: 3 }, minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, minWidth: 0 }}>
                                        <Avatar
                                            src={photoUrl}
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                mr: 2,
                                                boxShadow: 1,
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                bgcolor: stringToColor(authorName || String((post as any).userId)),
                                                fontWeight: 700,
                                            }}
                                            onClick={() => onOpenProfile && onOpenProfile((post as any).userId)}
                                        >
                                            {nameInitials(authorName, String((post as any).userId))}
                                        </Avatar>
                                        <Box
                                            onClick={() => onOpenProfile && onOpenProfile((post as any).userId)}
                                            sx={{ cursor: 'pointer', minWidth: 0, flex: 1 }}
                                            role="button"
                                            aria-label={`Open profile of ${(post as any).userFirstName} ${(post as any).userLastName}`}
                                        >
                                            <Typography sx={{ fontWeight: 700, fontSize: { xs: 16, sm: 18 }, color: '#2563EB', ...interFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {(post as any).userFirstName} {(post as any).userLastName}
                                            </Typography>
                                            <Typography sx={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                                                {(post as any).userRole}
                                            </Typography>
                                            <Typography sx={{ fontSize: 13, color: '#6B7280' }}>
                                                {new Date(post.createdAt).toLocaleString()}
                                            </Typography>
                                        </Box>
                                        {canManage && (
                                            <IconButton
                                                size="small"
                                                onClick={(e) => setPostMenu({ anchor: e.currentTarget, post })}
                                                aria-label="Post options"
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        )}
                                    </Box>

                                    <Typography sx={{ color: '#2563EB', fontWeight: 700, fontSize: { xs: 15, sm: 17 }, mb: 1, wordBreak: 'break-word' }}>{(post as any).title}</Typography>
                                    <Typography sx={{ color: '#374151', lineHeight: 1.6, mb: 2, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                        {renderMentionContent((post as any).content || '', {
                                            onOpenProfile: onOpenProfile || undefined,
                                        })}
                                    </Typography>
                                    
                                    {(post as any).location && (
                                        <Typography sx={{ color: '#6B7280', fontSize: 14, mb: 2 }}>
                                            📍 {(post as any).location}
                                        </Typography>
                                    )}

                                    {post.media && post.media.length > 0 && (
                                        <Box sx={{
                                            mb: 2,
                                            display: 'grid',
                                            gridTemplateColumns: post.media.length > 1
                                                ? { xs: '1fr 1fr', sm: '1fr 1fr' }
                                                : '1fr',
                                            gap: 1,
                                        }}>
                                            {post.media.slice(0, 4).map((media) => {
                                                const imageUrl = media.signedUrl || media.mediaUrl;
                                                return (
                                                    <Box
                                                        key={media.id}
                                                        component="img"
                                                        src={imageUrl}
                                                        alt={media.caption || 'Post media'}
                                                        sx={{
                                                            width: '100%',
                                                            borderRadius: 2,
                                                            maxHeight: { xs: 180, sm: 340 },
                                                            objectFit: 'cover',
                                                            display: 'block',
                                                        }}
                                                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                            if (media.signedUrl && e.currentTarget.src === media.signedUrl) {
                                                                e.currentTarget.src = media.mediaUrl;
                                                            } else {
                                                                e.currentTarget.style.display = 'none';
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                            {post.media && post.media.length > 4 && (
                                                <Box sx={{
                                                    display: 'flex',
                                                    width: '100%',
                                                    minHeight: { xs: 120, sm: 200 },
                                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                                    borderRadius: 2,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Typography sx={{ color: 'white', fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 'bold' }}>
                                                        +{(post.media?.length || 0) - 4}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            mt: 1.75,
                                            pt: 1.25,
                                            borderTop: '1.5px solid #E8EDF5',
                                            gap: 0.25,
                                        }}
                                    >
                                        <Button
                                            startIcon={
                                                likedPosts[String(post.id)] ? (
                                                    <FavoriteIcon
                                                        className={`liked-heart-icon ${animatingPosts[String(post.id)] ? 'liked-heart-icon-clicked' : ''}`}
                                                        sx={{ fontSize: 22 }}
                                                    />
                                                ) : (
                                                    <FavoriteBorderIcon
                                                        className={animatingPosts[String(post.id)] ? 'liked-heart-icon-clicked' : ''}
                                                        sx={{ color: '#64748B', fontSize: 22 }}
                                                    />
                                                )
                                            }
                                            onClick={() => handleLikePostWithAnimation(String(post.id))}
                                            disabled={likingPost}
                                            sx={{
                                                minWidth: 0,
                                                bgcolor: 'transparent',
                                                color: likedPosts[String(post.id)] ? '#EF4444' : '#64748B',
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                fontSize: 14,
                                                borderRadius: 2,
                                                py: 0.5,
                                                px: 0.75,
                                                '& .MuiButton-startIcon': { mr: 0.35 },
                                                '&:hover': {
                                                    bgcolor: 'transparent',
                                                    color: likedPosts[String(post.id)] ? '#DC2626' : '#334155',
                                                },
                                            }}
                                        >
                                            {postLikeCounts[String(post.id)] !== undefined ? postLikeCounts[String(post.id)] : post.likesCount || 0}
                                        </Button>
                                        <Button
                                            startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 21, color: 'inherit' }} />}
                                            onClick={() => handleCommentClick(post.id)}
                                            sx={{
                                                minWidth: 0,
                                                bgcolor: 'transparent',
                                                color: '#64748B',
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                fontSize: 14,
                                                borderRadius: 2,
                                                py: 0.5,
                                                px: 0.75,
                                                '& .MuiButton-startIcon': { mr: 0.35 },
                                                '&:hover': { bgcolor: 'transparent', color: '#2563EB' },
                                            }}
                                        >
                                            {post.commentCount ?? post.commentsCount ?? 0}
                                        </Button>
                                        <IconButton
                                            aria-label="Share"
                                            sx={{
                                                color: '#64748B',
                                                borderRadius: 2,
                                                p: 0.65,
                                                bgcolor: 'transparent',
                                                '&:hover': { bgcolor: 'transparent', color: '#2563EB' },
                                            }}
                                        >
                                            <ShareSymbol sx={{ fontSize: 21 }} />
                                        </IconButton>
                                    </Box>

                                    {post.commentsList && post.commentsList.length > 0 && (
                                        <Box sx={{ mt: 2, borderTop: '1px solid #eee', pt: 2 }}>
                                            {post.commentsList.map(comment => (
                                                <Box key={comment.id} sx={{ display: 'flex', mb: 2 }}>
                                                    <Avatar
                                                        src={comment.user?.profilePhoto}
                                                        sx={{ width: 32, height: 32, mr: 1.5 }}
                                                    />
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                            {comment.user?.firstName} {comment.user?.lastName}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '0.875rem' }}>{comment.content}</Typography>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                                );
                            })
                        )}
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                ...MATTE_SURFACE,
                                borderRadius: { xs: 2, sm: 3 },
                                p: { xs: 1.5, sm: 3 },
                                bgcolor: '#F3EFE8',
                                backgroundColor: '#F3EFE8',
                                backgroundImage: 'linear-gradient(165deg, #F6F2EB 0%, #EFEAE2 55%, #EAE4DB 100%)',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563EB', fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                                    Ratings & Reviews
                                </Typography>
                                {!isOwnProfile && currentUserId && (
                                    <Button size={isMobile ? 'small' : 'medium'} onClick={() => setRatingOpen(v => !v)} sx={{ color: '#2563EB', textTransform: 'none', fontWeight: 600 }}>
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
                                            sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}
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

                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <Typography sx={{ fontWeight: 700, color: '#2563EB', mb: 1, fontSize: { xs: '2rem', sm: '3.75rem' }, lineHeight: 1.1 }}>
                                    {user.averageRating > 0 ? user.averageRating.toFixed(1) : 'N/A'}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                    {renderStars(user.averageRating)}
                                </Box>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
                                    Based on {user.ratings.length} reviews
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                {[5, 4, 3, 2, 1].map((rating) => {
                                    const count = reviews.filter(r => r.ratingValue === rating).length;
                                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;

                                    return (
                                        <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>{rating}</Typography>
                                            <StarIcon sx={{ fontSize: 16, color: '#FFC107' }} />
                                            <Box sx={{ flex: 1, bgcolor: '#E5E7EB', borderRadius: 1, height: 8 }}>
                                                <Box
                                                    sx={{
                                                        bgcolor: '#FFC107',
                                                        height: 8,
                                                        borderRadius: 1,
                                                        width: `${percentage}%`
                                                    }}
                                                />
                                            </Box>
                                            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', minWidth: 32 }}>
                                                {Math.round(percentage)}%
                                            </Typography>
                                        </Box>
                                    );
                                })}
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
                                                    src={review.raterInfo?.profilePhoto || `https://randomuser.me/api/portraits/lego/${review.ratedByUserId % 10}.jpg`}
                                                    sx={{ width: 32, height: 32 }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://randomuser.me/api/portraits/lego/${review.ratedByUserId % 10}.jpg`;
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
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </Typography>
                                                        {review.ratingType && (
                                                            <Typography sx={{ color: '#2563EB', fontSize: '0.75rem', fontWeight: 600 }}>
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
                                                sx={{ width: 44, height: 44, flexShrink: 0, fontWeight: 800, bgcolor: '#2563EB' }}
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
                                            {currentPost.content || (currentPost as any).content}
                                        </Typography>
                                    </Box>
                                )}

                                <Typography sx={{ fontWeight: 900, color: '#0F172A', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1.5 }}>
                                    All comments
                                </Typography>

                                {isLoadingComments ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                        <CircularProgress size={28} sx={{ color: '#2563EB' }} />
                                    </Box>
                                ) : comments && comments.length > 0 ? (
                                    <Stack spacing={1.75}>
                                        {comments.map((comment: any) => (
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
                                                onReply={(text: string) => handleAddComment(commentsModalOpen.postId!, text, comment.id)}
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
                        <Typography sx={{ fontWeight: 700, color: '#2563EB', mb: 1 }}>Followers</Typography>
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
                                        {isOwnProfile && f.status === 'pending' && (
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
                        <Typography sx={{ fontWeight: 700, color: '#2563EB', mb: 1 }}>Following</Typography>
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
        >
            <MenuItem
                onClick={() => {
                    if (!postMenu) return;
                    setEditPost(postMenu.post);
                    setEditTitle((postMenu.post as any).title || '');
                    setEditContent((postMenu.post as any).content || '');
                    setPostMenu(null);
                }}
            >
                Edit
            </MenuItem>
            <MenuItem
                sx={{ color: '#DC2626' }}
                onClick={async () => {
                    if (!postMenu) return;
                    const postId = Number(postMenu.post.id);
                    setPostMenu(null);
                    if (!window.confirm('Delete this post?')) return;
                    try {
                        const { data: result } = await deletePostMutation({ variables: { postId } });
                        if (result?.deletePost?.success) {
                            setPosts((prev) => prev.filter((p) => Number(p.id) !== postId));
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
                            const postId = Number(editPost.id);
                            const { data: result } = await updatePostMutation({
                                variables: {
                                    postId,
                                    title: editTitle.trim(),
                                    content: editContent.trim(),
                                },
                            });
                            if (result?.updatePost?.success) {
                                setPosts((prev) =>
                                    prev.map((p) =>
                                        Number(p.id) === postId
                                            ? ({ ...p, title: editTitle.trim(), content: editContent.trim() } as any)
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
    </>
    );
};

export default ProfilePage;