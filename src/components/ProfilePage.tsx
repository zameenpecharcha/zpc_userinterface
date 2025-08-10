import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import StarIcon from '@mui/icons-material/Star';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MessageIcon from '@mui/icons-material/Message';
import CloseIcon from '@mui/icons-material/Close';

const interFont = {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

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

// Comments Form Component
const CommentsForm: React.FC<{ onSubmit: (text: string) => void }> = ({ onSubmit }) => {
    const [newComment, setNewComment] = useState('');
    const [addingComment, setAddingComment] = useState(false);

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;

        setAddingComment(true);
        try {
            await onSubmit(newComment);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setAddingComment(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <InputBase
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                sx={{
                    bgcolor: '#fff',
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: 15,
                    flex: 1,
                    boxShadow: 1,
                    border: '1px solid #E5E7EB',
                }}
                multiline
                minRows={2}
                maxRows={4}
            />
            <Button
                variant="contained"
                sx={{ bgcolor: '#2563EB', fontWeight: 600, borderRadius: 2, px: 3, py: 1.5, '&:hover': { bgcolor: '#1D4ED8' } }}
                onClick={handleSubmitComment}
                disabled={addingComment || !newComment.trim()}
            >
                {addingComment ? 'Posting...' : 'Post'}
            </Button>
        </Box>
    );
};

// Comment Item Component
const CommentItem: React.FC<{
    comment: any;
    onLikeComment: (commentId: number) => void;
    onReply: (text: string) => void;
    likedComments: { [commentId: number]: boolean };
    commentLikeCounts: { [commentId: number]: number };
    likingComment: boolean;
    replyingCommentId: number | null;
    setReplyingCommentId: (id: number | null) => void;
    replyText: string;
    setReplyText: (text: string) => void;
    replying: boolean;
}> = ({
    comment,
    onLikeComment,
    onReply,
    likedComments,
    commentLikeCounts,
    likingComment,
    replyingCommentId,
    setReplyingCommentId,
    replyText,
    setReplyText,
    replying
}) => {
        return (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, bgcolor: '#F6F8FB', borderRadius: 3, p: 1.5, boxShadow: 1 }}>
                <Avatar src={`https://randomuser.me/api/portraits/lego/${comment.userId % 10}.jpg`} sx={{ width: 32, height: 32 }} />
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#2563EB' }}>
                        {comment.userFirstName} {comment.userLastName}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#6366F1', fontWeight: 500 }}>{comment.userRole}</Typography>
                    <Typography sx={{ fontSize: 14, color: '#374151', mt: 0.5 }}>{comment.comment}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.5 }}>
                        {(() => {
                            console.log('Comment date debug:', { addedAt: comment.addedAt, type: typeof comment.addedAt });
                            return formatDate(comment.addedAt);
                        })()}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Button
                            startIcon={<FavoriteBorderIcon />}
                            sx={{
                                color: likedComments[comment.id] ? '#fff' : '#EF4444',
                                bgcolor: likedComments[comment.id] ? '#EF4444' : 'rgba(239,68,68,0.06)',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: 14,
                                px: 1.5,
                                borderRadius: 2,
                                '&:hover': { bgcolor: 'rgba(239,68,68,0.18)' }
                            }}
                            onClick={() => onLikeComment(comment.id)}
                            disabled={likingComment}
                        >
                            {commentLikeCounts[comment.id] !== undefined ? commentLikeCounts[comment.id] : comment.likeCount || 0}
                        </Button>
                        <Button
                            sx={{ color: '#2563EB', textTransform: 'none', fontWeight: 600, fontSize: 14, px: 1.5, borderRadius: 2, bgcolor: 'rgba(37,99,235,0.06)', '&:hover': { bgcolor: 'rgba(37,99,235,0.18)' } }}
                            onClick={() => setReplyingCommentId(comment.id)}
                        >
                            Reply
                        </Button>
                    </Box>

                    {/* Display Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <Box sx={{ mt: 2, ml: 2, borderLeft: '2px solid #E5E7EB', pl: 2 }}>
                            {comment.replies.map((reply: any) => (
                                <Box key={reply.id} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Avatar src={`https://randomuser.me/api/portraits/lego/${reply.userId % 10}.jpg`} sx={{ width: 28, height: 28 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#2563EB' }}>
                                            {reply.userFirstName} {reply.userLastName}
                                        </Typography>
                                        <Typography sx={{ fontSize: 11, color: '#6366F1', fontWeight: 500 }}>{reply.userRole}</Typography>
                                        <Typography sx={{ fontSize: 13, color: '#374151', mt: 0.5 }}>{reply.comment}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 0.5 }}>
                                            {formatDate(reply.addedAt)}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                            <Button
                                                startIcon={<FavoriteBorderIcon />}
                                                sx={{
                                                    color: likedComments[reply.id] ? '#fff' : '#EF4444',
                                                    bgcolor: likedComments[reply.id] ? '#EF4444' : 'rgba(239,68,68,0.06)',
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    fontSize: 12,
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    minHeight: 24,
                                                    '&:hover': { bgcolor: 'rgba(239,68,68,0.18)' }
                                                }}
                                                onClick={() => onLikeComment(reply.id)}
                                                disabled={likingComment}
                                            >
                                                {commentLikeCounts[reply.id] !== undefined ? commentLikeCounts[reply.id] : reply.likeCount || 0}
                                            </Button>
                                        </Box>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* Reply input */}
                    {replyingCommentId === comment.id && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <InputBase
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                sx={{
                                    bgcolor: '#F3F4F6',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    fontSize: 15,
                                    flex: 1,
                                    boxShadow: 1,
                                }}
                                multiline
                                minRows={1}
                                maxRows={4}
                            />
                            <Button
                                variant="contained"
                                sx={{ bgcolor: '#2563EB', fontWeight: 600, borderRadius: 2, px: 2, py: 1, '&:hover': { bgcolor: '#1D4ED8' } }}
                                onClick={() => onReply(replyText)}
                                disabled={replying || !replyText.trim()}
                            >
                                Send
                            </Button>
                            <Button
                                sx={{ color: '#6B7280', fontWeight: 500, borderRadius: 2, px: 2, py: 1 }}
                                onClick={() => { setReplyingCommentId(null); setReplyText(''); }}
                            >
                                Cancel
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

interface User {
    id: number;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
}

interface Post {
    id: string;
    content: string;
    createdAt: string;
    user?: User;
    likesCount?: number;
    commentsCount?: number;
    commentsList?: Comment[];
    isLiked?: boolean;
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
                }
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
            }
        }
    `,

    GET_USER_FOLLOWERS: `
        query GetUserFollowers($userId: Int!) {
            userFollowers(userId: $userId) {
                id
                userId
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
                userId
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
                userId
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
            }
        }
    `,

    FOLLOW_USER: `
        mutation FollowUser($userId: Int!, $followingId: Int!) {
            followUser(userId: $userId, followingId: $followingId) {
                id
                userId
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
                mapLocation
                price
                status
                createdAt
                media {
                    id
                    mediaType
                    mediaUrl
                    mediaOrder
                    caption
                }
                likeCount
                commentCount
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
                    likeCount
                }
            }
        }
    `,
};

const apiService = {
    async graphqlRequest(query: string, variables: Record<string, any> = {}) {
        try {
            console.log('Making GraphQL request:', { query, variables });
            const response = await fetch('http://localhost:8000/api/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
                    updatedAt: rating.updatedAt
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
                    likeCount: reply.likeCount || 0
                }))
            }));
        } catch (error) {
            console.error('Error fetching post comments:', error);
            return [];
        }
    },

    async fetchUserReviews(userId: number): Promise<UserRating[]> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.GET_USER_RATINGS, { userId });
        return (data.userRatings || []).map((rating: any) => ({
            id: rating.id,
            ratedUserId: rating.ratedUserId,
            ratedByUserId: rating.ratedByUserId,
            ratingValue: rating.ratingValue,
            review: rating.review,
            ratingType: rating.ratingType,
            createdAt: rating.createdAt,
            updatedAt: rating.updatedAt
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

    async likeComment(commentId: number, userId: number): Promise<any> {
        const data = await this.graphqlRequest(GRAPHQL_QUERIES.LIKE_COMMENT, {
            commentId,
            userId
        });
        return data.likeComment;
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

const ProfilePage: React.FC<ProfilePageProps> = ({ onGoBack, userId, currentUserId }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [reviews, setReviews] = useState<UserRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followingStatus, setFollowingStatus] = useState<UserFollower | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followingInProgress, setFollowingInProgress] = useState(false);
    const [postsLoading, setPostsLoading] = useState(false);

    // Post likes and comments state
    const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
    const [postLikeCounts, setPostLikeCounts] = useState<{ [postId: string]: number }>({});
    const [likedComments, setLikedComments] = useState<{ [commentId: number]: boolean }>({});
    const [commentLikeCounts, setCommentLikeCounts] = useState<{ [commentId: number]: number }>({});
    const [commentsModalOpen, setCommentsModalOpen] = useState<{ open: boolean; postId: string | null }>({ open: false, postId: null });
    const [likingPost, setLikingPost] = useState(false);
    const [likingComment, setLikingComment] = useState(false);

    // Comments state
    const [commentsByPost, setCommentsByPost] = useState<{ [postId: string]: any[] }>({});
    const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({});
    const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('Starting to fetch profile data for user ID:', userId);

                const userProfile = await apiService.fetchUserProfile(userId);
                console.log('User profile fetched successfully:', userProfile);

                const followers = await apiService.fetchUserFollowers(userId);
                console.log('Followers data:', followers);

                const following = await apiService.fetchUserFollowing(userId);
                console.log('Following data:', following);

                const ratings = await apiService.fetchUserReviews(userId);
                console.log('Ratings data:', ratings);

                const averageRating = ratings.length > 0
                    ? ratings.reduce((sum: number, rating: any) => sum + rating.ratingValue, 0) / ratings.length
                    : 0;

                setUser({
                    ...userProfile,
                    followersCount: followers.length,
                    followingCount: following.length,
                    ratings,
                    averageRating: parseFloat(averageRating.toFixed(1)),
                });
                setReviews(ratings);

                if (currentUserId && currentUserId !== userId) {
                    try {
                        const followStatus = await apiService.checkFollowingStatus(currentUserId, userId);
                        setFollowingStatus(followStatus);
                        setIsFollowing(followStatus?.status === 'active');
                    } catch (err) {
                        console.warn('Error checking following status:', err);
                        setIsFollowing(false);
                    }
                }

                loadUserPosts();
            } catch (err) {
                console.error('Error fetching profile data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, currentUserId]);

    const loadUserPosts = async () => {
        setPostsLoading(true);
        try {
            console.log('Loading user posts for ID:', userId);
            const userPosts = await apiService.fetchUserPosts(userId);
            console.log('User posts loaded:', userPosts);

            const postsWithDetails = await Promise.all(
                userPosts.map(async post => {
                    try {
                        const comments = await apiService.fetchPostComments(post.id);
                        return {
                            ...post,
                            commentsList: comments
                        };
                    } catch (commentError) {
                        console.warn('Error fetching comments for post:', post.id, commentError);
                        return {
                            ...post,
                            commentsList: []
                        };
                    }
                })
            );

            setPosts(postsWithDetails);
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

            if (isFollowing) {
                setIsFollowing(false);
                setUser(prev => prev ? { ...prev, followersCount: prev.followersCount - 1 } : null);
            } else {
                const followResult = await apiService.followUser(currentUserId, userId);
                setFollowingStatus(followResult);
                setIsFollowing(true);
                setUser(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
            }
        } catch (err) {
            console.error('Error following/unfollowing user:', err);
        } finally {
            setFollowingInProgress(false);
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

    const handleLikeComment = async (commentId: number) => {
        if (!currentUserId) return;

        setLikingComment(true);
        try {
            const result = await apiService.likeComment(commentId, currentUserId);

            if (result?.success) {
                setLikedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }));
                setCommentLikeCounts(prev => ({
                    ...prev,
                    [commentId]: result.comment.likeCount
                }));
            }
        } catch (error) {
            console.error('Error liking comment:', error);
        } finally {
            setLikingComment(false);
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
                bgcolor: '#F6F8FB',
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
            <Box sx={{ bgcolor: '#F6F8FB', minHeight: '100vh', ...interFont }}>
                <AppBar position="fixed" elevation={1} sx={{ bgcolor: '#fff', color: '#2563EB', zIndex: 1201 }}>
                    <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={onGoBack} sx={{ color: '#2563EB' }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563EB' }}>
                                Profile
                            </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#2563EB', letterSpacing: 1 }}>
                            Zameen pe charcha
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: 10, px: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
                    <Alert severity="error" sx={{ maxWidth: 400 }}>
                        {error || 'User profile not found'}
                    </Alert>
                </Box>
            </Box>
        );
    }

    const isOwnProfile = currentUserId === userId;

    return (
        <Box sx={{ bgcolor: '#F6F8FB', minHeight: '100vh', ...interFont }}>
            <AppBar position="fixed" elevation={1} sx={{ bgcolor: '#fff', color: '#2563EB', zIndex: 1201 }}>
                <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={onGoBack} sx={{ color: '#2563EB' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563EB' }}>
                            Profile
                        </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#2563EB', letterSpacing: 1 }}>
                        Zameen pe charcha
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{ pt: 10, px: 2 }}>
                <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                    <img
                        src={user.profilePhoto || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop'}
                        alt="Cover"
                        style={{ width: '100%', height: 250, objectFit: 'cover' }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop';
                        }}
                    />
                    {isOwnProfile && (
                        <Button
                            startIcon={<CameraAltIcon />}
                            sx={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                bgcolor: 'rgba(255,255,255,0.9)',
                                color: '#2563EB',
                                textTransform: 'none',
                                fontWeight: 600
                            }}
                        >
                            Edit Cover
                        </Button>
                    )}
                </Box>

                <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 3, mb: 3, boxShadow: '0 2px 12px rgba(37,99,235,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    src={user.profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                                    sx={{ width: 100, height: 100, border: '4px solid white', boxShadow: 2 }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://randomuser.me/api/portraits/lego/1.jpg';
                                    }}
                                />
                                {user.isActive && (
                                    <Box sx={{
                                        position: 'absolute',
                                        bottom: 8,
                                        right: 8,
                                        width: 16,
                                        height: 16,
                                        bgcolor: '#4CAF50',
                                        borderRadius: '50%',
                                        border: '2px solid white'
                                    }} />
                                )}
                            </Box>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2563EB', mb: 0.5 }}>
                                    {user.firstName} {user.lastName}
                                </Typography>
                                <Typography sx={{ color: '#6B7280', mb: 0.5 }}>{user.role || 'User'}</Typography>
                                <Typography sx={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{user.address || 'No location provided'}</Typography>
                                {user.bio && (
                                    <Typography sx={{ color: '#6B7280', fontSize: '0.875rem', mt: 1, maxWidth: 300 }}>
                                        {user.bio}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                        {!isOwnProfile && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant={isFollowing ? "outlined" : "contained"}
                                    startIcon={<PersonAddIcon />}
                                    onClick={handleFollow}
                                    disabled={followingInProgress}
                                    sx={{
                                        bgcolor: isFollowing ? 'transparent' : '#2563EB',
                                        borderColor: '#2563EB',
                                        color: isFollowing ? '#2563EB' : 'white',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        '&:hover': {
                                            bgcolor: isFollowing ? 'rgba(37, 99, 235, 0.1)' : '#1D4ED8'
                                        }
                                    }}
                                >
                                    {followingInProgress ? 'Loading...' : (isFollowing ? 'Following' : 'Follow')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<MessageIcon />}
                                    sx={{
                                        borderColor: '#2563EB',
                                        color: '#2563EB',
                                        textTransform: 'none',
                                        fontWeight: 600
                                    }}
                                >
                                    Message
                                </Button>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 4, pt: 2, borderTop: '1px solid #E5E7EB' }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2563EB' }}>
                                {user.followersCount.toLocaleString()}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>Followers</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2563EB' }}>
                                {user.followingCount}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>Following</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2563EB' }}>
                                {user.averageRating.toFixed(1)}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>Rating</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2563EB' }}>
                                {user.ratings.length}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>Reviews</Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
                    <Box>
                        {postsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : posts.length === 0 ? (
                            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 4, textAlign: 'center', boxShadow: '0 2px 12px rgba(37,99,235,0.08)' }}>
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
                            posts.map((post) => (
                                <Box key={post.id} sx={{ bgcolor: '#fff', borderRadius: 3, p: 3, mb: 3, boxShadow: '0 2px 12px rgba(37,99,235,0.08)' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Avatar
                                            src={post.user?.profilePhoto}
                                            sx={{ width: 40, height: 40, mr: 2 }}
                                        />
                                        <Box>
                                            <Typography sx={{ fontWeight: 600 }}>
                                                {post.user?.firstName} {post.user?.lastName}
                                            </Typography>
                                            <Typography sx={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                                                {new Date(post.createdAt).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Typography sx={{ mb: 2 }}>{post.content}</Typography>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                        <Button
                                            startIcon={likedPosts[post.id] ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                            size="small"
                                            onClick={() => toggleLike(post.id)}
                                            disabled={likingPost}
                                            sx={{
                                                bgcolor: likedPosts[post.id] ? '#EF4444' : 'transparent',
                                                color: likedPosts[post.id] ? '#fff' : '#374151',
                                                '&:hover': {
                                                    bgcolor: likedPosts[post.id] ? '#EF4444' : '#EEF2FB',
                                                    color: likedPosts[post.id] ? '#fff' : '#2563EB'
                                                }
                                            }}
                                        >
                                            {postLikeCounts[post.id] !== undefined ? postLikeCounts[post.id] : post.likesCount || 0}
                                        </Button>
                                        <Button
                                            startIcon={<ChatBubbleOutlineIcon />}
                                            size="small"
                                            onClick={() => handleCommentClick(post.id)}
                                            sx={{
                                                '&:hover': { color: '#2563EB' }
                                            }}
                                        >
                                            {post.commentsCount || 0}
                                        </Button>
                                        <Button
                                            startIcon={<ShareIcon />}
                                            size="small"
                                            sx={{
                                                '&:hover': { color: '#2563EB' }
                                            }}
                                        >
                                            Share
                                        </Button>
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
                            ))
                        )}
                    </Box>

                    <Box>
                        <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 3, boxShadow: '0 2px 12px rgba(37,99,235,0.08)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563EB' }}>
                                    Ratings & Reviews
                                </Typography>
                                {!isOwnProfile && (
                                    <Button sx={{ color: '#2563EB', textTransform: 'none', fontWeight: 600 }}>
                                        Rate User
                                    </Button>
                                )}
                            </Box>

                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <Typography variant="h2" sx={{ fontWeight: 700, color: '#2563EB', mb: 1 }}>
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
                                                    src={review.raterInfo?.profilePhoto || 'https://randomuser.me/api/portraits/lego/3.jpg'}
                                                    sx={{ width: 32, height: 32 }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://randomuser.me/api/portraits/lego/3.jpg';
                                                    }}
                                                />
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                                            {review.raterInfo ? `${review.raterInfo.firstName} ${review.raterInfo.lastName}` : `User ${review.ratedByUserId}`}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex' }}>
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
                console.log('ProfilePage modal rendering:', {
                    open: commentsModalOpen.open,
                    postId: commentsModalOpen.postId,
                    postsCount: posts.length
                });
                const currentPost = posts.find(p => p.id === commentsModalOpen.postId);
                console.log('Current post found:', !!currentPost);
                const comments = commentsByPost[commentsModalOpen.postId!] || [];
                const isLoadingComments = loadingComments[commentsModalOpen.postId!];

                return (
                    <Box
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            bgcolor: 'rgba(30,41,59,0.8)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onClick={handleCommentsModalClose}
                    >
                        <Box
                            sx={{
                                bgcolor: '#fff',
                                borderRadius: 6,
                                p: 4,
                                width: { xs: '95vw', sm: '80vw', md: '60vw' },
                                height: { xs: '90vh', sm: '80vh', md: '70vh' },
                                maxWidth: '900px',
                                overflowY: 'auto',
                                boxShadow: '0 16px 48px 0 rgba(30,41,59,0.18)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                position: 'relative',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close Icon */}
                            <IconButton
                                onClick={handleCommentsModalClose}
                                sx={{
                                    position: 'sticky',
                                    top: 12,
                                    right: 12,
                                    alignSelf: 'flex-end',
                                    color: '#6B7280',
                                    bgcolor: '#F3F4F6',
                                    zIndex: 10,
                                    mb: -6, // Negative margin to overlap content
                                    '&:hover': {
                                        bgcolor: '#E5E7EB',
                                        color: '#374151'
                                    }
                                }}
                            >
                                <CloseIcon />
                            </IconButton>

                            {/* Post Details */}
                            {currentPost && (
                                <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #E5E7EB' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Avatar
                                            src={currentPost.user?.profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                                            sx={{ mr: 2, width: 44, height: 44, boxShadow: 1 }}
                                        />
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#2563EB', ...interFont }}>
                                                {currentPost.user?.firstName} {currentPost.user?.lastName}
                                            </Typography>
                                            <Typography sx={{ fontSize: 13, color: '#6B7280' }}>
                                                {formatDate(currentPost.createdAt)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Typography sx={{ color: '#374151', fontSize: 16 }}>{currentPost.content}</Typography>
                                </Box>
                            )}

                            {/* Add Comment Section */}
                            <Box sx={{ mb: 3, p: 2, bgcolor: '#F6F8FB', borderRadius: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2563EB' }}>Add a Comment</Typography>
                                <CommentsForm
                                    onSubmit={(text: string) => handleAddComment(commentsModalOpen.postId!, text)}
                                />
                            </Box>

                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#2563EB' }}>Comments</Typography>

                            {isLoadingComments ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : comments && comments.length > 0 ? (
                                <Stack spacing={2} sx={{ flex: 1, overflow: 'auto' }}>
                                    {comments.map((comment: any) => (
                                        <CommentItem
                                            key={comment.id}
                                            comment={comment}
                                            onLikeComment={handleLikeComment}
                                            onReply={(text: string) => handleAddComment(commentsModalOpen.postId!, text, comment.id)}
                                            likedComments={likedComments}
                                            commentLikeCounts={commentLikeCounts}
                                            likingComment={likingComment}
                                            replyingCommentId={replyingCommentId}
                                            setReplyingCommentId={setReplyingCommentId}
                                            replyText={replyText}
                                            setReplyText={setReplyText}
                                            replying={replying}
                                        />
                                    ))}
                                </Stack>
                            ) : (
                                <Typography sx={{ fontSize: 14, color: '#6B7280', textAlign: 'center', py: 4 }}>
                                    No comments yet. Be the first to comment!
                                </Typography>
                            )}


                        </Box>
                    </Box>
                );
            })()}
        </Box>
    );
};

export default ProfilePage;