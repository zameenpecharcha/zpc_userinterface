import React, { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { GET_POST_LIKES } from '../graphql/posts';
import { nameInitials, stringToColor } from '../utils/mentions';
import { MATTE_SURFACE } from '../theme/surfaces';

type Liker = {
  userId: string;
  firstName?: string;
  lastName?: string;
  userRole?: string;
  profilePhotoSignedUrl?: string;
  profilePhoto?: string;
};

type Props = {
  postId: string | number;
  postUserId?: string | number | null;
  likeCount: number;
  liked?: boolean;
  currentUserId?: string | number | null;
  onOpenProfile?: (userId: string) => void;
};

/**
 * Like count label. Only the post owner can hover (desktop) / tap (mobile)
 * to see who liked the post. Everyone else sees a static count.
 */
const PostLikeCount: React.FC<Props> = ({
  postId,
  postUserId,
  likeCount,
  liked = false,
  currentUserId,
  onOpenProfile,
}) => {
  const client = useApolloClient();
  const isNarrow = useMediaQuery('(max-width:900px)');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [likersTotal, setLikersTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const isOwner =
    currentUserId != null &&
    postUserId != null &&
    String(currentUserId) === String(postUserId);

  const canViewLikers = isOwner && likeCount > 0;

  const loadLikers = useCallback(async () => {
    if (!postId || !isOwner) return;
    setLoading(true);
    try {
      const { data } = await client.query({
        query: GET_POST_LIKES,
        variables: { postId: String(postId), page: 1, limit: 50 },
        fetchPolicy: 'network-only',
      });
      const raw: Liker[] = data?.postLikes?.likes || [];
      const total = Number(data?.postLikes?.totalCount || 0);
      setLikers(raw);
      setLikersTotal(total);
    } catch (err) {
      console.warn('postLikes failed', err);
      setLikers([]);
      setLikersTotal(0);
    } finally {
      setLoading(false);
    }
  }, [client, postId, isOwner]);

  const openDesktop = (el: HTMLElement) => {
    if (!canViewLikers || isNarrow) return;
    setAnchor(el);
    void loadLikers();
  };

  const openMobile = () => {
    if (!canViewLikers || !isNarrow) return;
    setDialogOpen(true);
    void loadLikers();
  };

  const closeAll = () => {
    setAnchor(null);
    setDialogOpen(false);
  };

  const listContent = (
    <Box sx={{ minWidth: 260, maxWidth: 320 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5 }}>
          <CircularProgress size={22} />
        </Box>
      ) : likers.length === 0 ? (
        <Typography sx={{ px: 2, py: 2, fontSize: 13, color: '#5C675F' }}>
          No likes yet
        </Typography>
      ) : (
        <List dense disablePadding className="zpc-overlay-scroll" sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {likers.map((u) => {
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'ZPC member';
            const avatar = u.profilePhotoSignedUrl || u.profilePhoto || '';
            return (
              <ListItemButton
                key={u.userId}
                onClick={() => {
                  closeAll();
                  onOpenProfile?.(String(u.userId));
                }}
                sx={{ py: 1, px: 1.5 }}
              >
                <ListItemAvatar sx={{ minWidth: 44 }}>
                  <Avatar
                    src={avatar || undefined}
                    sx={{ width: 34, height: 34, bgcolor: stringToColor(name), fontSize: 13 }}
                  >
                    {nameInitials(name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={name}
                  secondary={u.userRole ? String(u.userRole).replace(/_/g, ' ') : undefined}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 600, color: '#0A1210' }}
                  secondaryTypographyProps={{ fontSize: 12, color: '#5C675F' }}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
      {!loading && likersTotal > likers.length ? (
        <Typography sx={{ px: 2, pb: 1.25, fontSize: 11.5, color: '#5C675F' }}>
          Showing {likers.length} of {likersTotal}
        </Typography>
      ) : null}
    </Box>
  );

  if (likeCount <= 0) {
    return <Typography sx={{ fontSize: 12.5, color: '#5C675F', fontWeight: 500 }}> </Typography>;
  }

  const label = (
    <>
      <Box component="span" sx={{ mr: 0.5 }} aria-hidden>
        {liked ? '❤️' : '🤍'}
      </Box>
      {likeCount} {likeCount === 1 ? 'like' : 'likes'}
    </>
  );

  // Non-owners: static count only (no hover / tap list)
  if (!canViewLikers) {
    return (
      <Typography
        sx={{
          fontSize: 12.5,
          color: '#5C675F',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'default',
        }}
      >
        {label}
      </Typography>
    );
  }

  return (
    <>
      <Typography
        component="button"
        type="button"
        onMouseEnter={(e) => openDesktop(e.currentTarget)}
        onMouseLeave={() => {
          window.setTimeout(() => {
            if (!document.querySelector('[data-likers-popover]:hover')) {
              setAnchor(null);
            }
          }, 120);
        }}
        onClick={openMobile}
        sx={{
          fontSize: 12.5,
          color: '#5C675F',
          fontWeight: 500,
          cursor: 'pointer',
          border: 'none',
          background: 'none',
          p: 0,
          m: 0,
          font: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          '&:hover': { color: '#16302A', textDecoration: 'underline' },
        }}
        aria-label={`${likeCount} likes — view who liked`}
      >
        {label}
      </Typography>

      <Popover
        open={Boolean(anchor) && !isNarrow}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={
          {
            'data-likers-popover': true,
            onMouseLeave: () => setAnchor(null),
            sx: {
              mt: 0.5,
              borderRadius: 2,
              ...MATTE_SURFACE,
              boxShadow: '0 8px 28px rgba(10,18,16,0.14)',
            },
          } as any
        }
      >
        <Typography sx={{ px: 1.75, pt: 1.35, pb: 0.5, fontSize: 12.5, fontWeight: 700, color: '#16302A' }}>
          Liked by
        </Typography>
        {listContent}
      </Popover>

      <Dialog
        open={dialogOpen && isNarrow}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 2, ...MATTE_SURFACE } }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: '#16302A', pb: 0.5 }}>
          Liked by
        </DialogTitle>
        <DialogContent sx={{ px: 0.5, pt: 0.5 }}>{listContent}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PostLikeCount;
