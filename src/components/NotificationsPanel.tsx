import React, { useMemo } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { formatRelativeTime } from '../utils/datetime';
import { collapseMentionTokens } from '../utils/mentions';

export type AppNotification = {
  id: number | string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string | number | Date;
  metadata?: string | null;
};

type Props = {
  notifications: AppNotification[];
  onSelect: (n: AppNotification) => void;
  onClear?: () => void | Promise<void>;
  clearing?: boolean;
};

function styleForType(type?: string): { icon: string; color: string } {
  const t = (type || '').toLowerCase();
  if (t.includes('mention')) return { icon: '@', color: '#16302A' };
  if (t.includes('like') || t.includes('react')) return { icon: '♥', color: '#8B2E2E' };
  if (t.includes('follower_post') || t === 'new_post') return { icon: '✎', color: '#5F8670' };
  if (t.includes('follow')) return { icon: '👤', color: '#6B7280' };
  if (t.includes('comment') || t.includes('reply')) return { icon: '💬', color: '#5F8670' };
  if (t.includes('message') || t.includes('chat')) return { icon: '✉', color: '#5F8670' };
  if (t.includes('property') || t.includes('post')) return { icon: '⌂', color: '#5F8670' };
  return { icon: '•', color: '#3A4540' };
}

const NotificationRow: React.FC<{
  item: AppNotification;
  onClick: () => void;
  isLast: boolean;
}> = ({ item, onClick, isLast }) => {
  const { icon, color } = styleForType(item.type);
  const time = formatRelativeTime(item.createdAt);

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        px: 1.5,
        py: 1.15,
        cursor: 'pointer',
        bgcolor: item.read ? 'transparent' : 'rgba(22,48,42,0.06)',
        borderBottom: isLast ? 'none' : '1px solid rgba(22,48,42,0.08)',
        transition: 'background-color 140ms ease',
        '&:hover': { bgcolor: 'rgba(22,48,42,0.09)' },
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1.25,
          bgcolor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 14,
          color: '#EBE6D4',
          fontWeight: 800,
          mt: 0.15,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
              fontWeight: 700,
              fontSize: 13.5,
              color: '#0A1210',
              lineHeight: 1.25,
            }}
          >
            {item.title || 'Notification'}
          </Typography>
          {time && (
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#6B7280', flexShrink: 0 }}>
              {time}
            </Typography>
          )}
        </Box>
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
            fontSize: 12.5,
            fontWeight: 500,
            color: '#3A4540',
            mt: 0.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
          }}
        >
          {collapseMentionTokens(item.message || '')}
        </Typography>
      </Box>
      {!item.read && (
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: '#5F8670',
            flexShrink: 0,
            mt: 0.85,
          }}
        />
      )}
    </Box>
  );
};

/** Compact notifications dropdown anchored to the header bell. */
const NotificationsPanel: React.FC<Props> = ({ notifications, onSelect, onClear, clearing }) => {
  const items = useMemo(() => notifications.slice(0, 20), [notifications]);

  return (
    <Box className="zpc-overlay-host" sx={{ width: '100%', display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          pt: 1.25,
          pb: 1,
          borderBottom: '1px solid rgba(22,48,42,0.1)',
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#3A4540',
          }}
        >
          Notifications
        </Typography>
        {items.length > 0 && onClear && (
          <Button
            size="small"
            disabled={clearing}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12,
              minWidth: 0,
              px: 1,
              py: 0.25,
              color: '#16302A',
              '&:hover': { bgcolor: 'rgba(22,48,42,0.08)' },
            }}
          >
            {clearing ? <CircularProgress size={14} color="inherit" /> : 'Clear'}
          </Button>
        )}
      </Box>

      {items.length === 0 ? (
        <Box sx={{ px: 2, py: 3.5, textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
              fontWeight: 700,
              fontSize: 14,
              color: '#0A1210',
              mb: 0.5,
            }}
          >
            You&apos;re all caught up
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#3A4540', fontWeight: 500 }}>
            Mentions, likes, and follows will show up here.
          </Typography>
        </Box>
      ) : (
        <Box
          className="zpc-overlay-scroll"
          sx={{
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: 1,
            minHeight: 0,
          }}
        >
          {items.map((n, idx) => (
            <NotificationRow
              key={n.id}
              item={n}
              isLast={idx === items.length - 1}
              onClick={() => onSelect(n)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default NotificationsPanel;
