import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { AnimatedList } from './AnimatedList';
import { formatRelativeTime } from '../utils/datetime';

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
};

function styleForType(type?: string): { icon: string; color: string } {
  const t = (type || '').toLowerCase();
  if (t.includes('mention')) return { icon: '@', color: '#16302A' };
  if (t.includes('like') || t.includes('react')) return { icon: '❤️', color: '#16302A' };
  if (t.includes('follower_post') || t === 'new_post') return { icon: '📝', color: '#5F8670' };
  if (t.includes('follow')) return { icon: '👤', color: '#A89F84' };
  if (t.includes('comment') || t.includes('reply')) return { icon: '💬', color: '#5F8670' };
  if (t.includes('message') || t.includes('chat')) return { icon: '✉️', color: '#5F8670' };
  if (t.includes('property') || t.includes('post')) return { icon: '🏠', color: '#5F8670' };
  return { icon: '🔔', color: '#3A4540' };
}

const NotificationCard: React.FC<{
  item: AppNotification;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const { icon, color } = styleForType(item.type);
  const time = formatRelativeTime(item.createdAt);

  return (
    <Box
      component="figure"
      onClick={onClick}
      sx={{
        position: 'relative',
        m: 0,
        width: '100%',
        p: 1.5,
        borderRadius: '16px',
        cursor: 'pointer',
        bgcolor: item.read ? 'rgba(255,252,248,0.92)' : 'rgba(239,246,255,0.95)',
        border: item.read
          ? '1px solid rgba(90, 70, 50, 0.1)'
          : '1px solid rgba(22, 48, 42, 0.18)',
        boxShadow:
          '0 1px 2px rgba(60,45,30,0.04), 0 8px 20px rgba(60,45,30,0.06)',
        transition: 'transform 0.2s ease, background 0.2s ease',
        '&:hover': {
          transform: 'scale(1.02)',
          bgcolor: item.read ? '#EBE6D4' : 'rgba(219,234,254,0.95)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '14px',
            bgcolor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 18,
            color: '#EBE6D4',
            fontWeight: 800,
            boxShadow: `0 6px 14px ${color}55`,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography
              component="span"
              sx={{
                fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                fontWeight: 700,
                fontSize: { xs: 13, sm: 14 },
                color: '#0A1210',
              }}
            >
              {item.title || 'Notification'}
            </Typography>
            {time && (
              <>
                <Typography component="span" sx={{ color: '#A89F84', fontSize: 12 }}>
                  ·
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#3A4540',
                  }}
                >
                  {time}
                </Typography>
              </>
            )}
          </Box>
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
              fontSize: 13,
              fontWeight: 500,
              color: '#3A4540',
              mt: 0.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.message || ''}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

/** Post-login notifications dropdown — Magic UI AnimatedList style. */
const NotificationsPanel: React.FC<Props> = ({ notifications, onSelect }) => {
  const items = useMemo(() => notifications.slice(0, 20), [notifications]);

  if (items.length === 0) {
    return (
      <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
            fontWeight: 700,
            fontSize: 14,
            color: '#0A1210',
            mb: 0.5,
          }}
        >
          No notifications yet
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#3A4540', fontWeight: 500 }}>
          Mentions, likes, and follows will show up here.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', pt: 0.5, pb: 0.5 }}>
      <Typography
        sx={{
          fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#3A4540',
          px: 1.5,
          pb: 1,
        }}
      >
        Notifications
      </Typography>
      <AnimatedList delay={90} maxHeight={340}>
        {items.map((n) => (
          <NotificationCard key={n.id} item={n} onClick={() => onSelect(n)} />
        ))}
      </AnimatedList>
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 48,
          background: 'linear-gradient(180deg, transparent 0%, rgba(243,239,232,0.95) 100%)',
        }}
      />
    </Box>
  );
};

export default NotificationsPanel;
