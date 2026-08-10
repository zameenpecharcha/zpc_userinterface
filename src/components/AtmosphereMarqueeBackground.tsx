import React from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import { Marquee } from './Marquee';

const reviews = [
  {
    name: 'Rohit',
    username: '@rohit',
    body: 'Found my flat in Hyderabad through Zameen pe charcha. Smooth chats with the owner.',
    img: 'https://avatar.vercel.sh/rohit',
  },
  {
    name: 'Ananya',
    username: '@ananya',
    body: 'Listing my villa took minutes. Mentions and comments keep buyers engaged.',
    img: 'https://avatar.vercel.sh/ananya',
  },
  {
    name: 'Vikram',
    username: '@vikram',
    body: 'Best place to discuss plots and neighbourhood vibes before visiting.',
    img: 'https://avatar.vercel.sh/vikram',
  },
  {
    name: 'Meera',
    username: '@meera',
    body: 'Loved the map pins and real conversations — not just another listing site.',
    img: 'https://avatar.vercel.sh/meera',
  },
  {
    name: 'Arjun',
    username: '@arjun',
    body: 'DM’d a seller, closed the deal. Feels like a real community for property.',
    img: 'https://avatar.vercel.sh/arjun',
  },
  {
    name: 'Priya',
    username: '@priya',
    body: 'Clean UI, fast suggestions, and honest charcha from people nearby.',
    img: 'https://avatar.vercel.sh/priya',
  },
];

const firstRow = reviews.slice(0, Math.ceil(reviews.length / 2));
const secondRow = reviews.slice(Math.ceil(reviews.length / 2));

const ReviewCard: React.FC<(typeof reviews)[number]> = ({ img, name, username, body }) => (
  <Box
    component="figure"
    sx={{
      position: 'relative',
      width: 260,
      m: 0,
      p: 1.75,
      borderRadius: '14px',
      border: '1px solid rgba(22, 48, 42, 0.18)',
      bgcolor: 'rgba(255, 252, 248, 0.55)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 6px 18px rgba(60, 45, 30, 0.08)',
      cursor: 'default',
      transition: 'background 0.2s ease, transform 0.2s ease',
      '&:hover': {
        bgcolor: 'rgba(255, 252, 248, 0.78)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Avatar src={img} alt="" sx={{ width: 32, height: 32 }} />
      <Box>
        <Typography
          component="figcaption"
          sx={{
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
            fontSize: 13,
            fontWeight: 700,
            color: '#0A1210',
            lineHeight: 1.2,
          }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(26, 42, 50, 0.45)',
          }}
        >
          {username}
        </Typography>
      </Box>
    </Box>
    <Typography
      component="blockquote"
      sx={{
        mt: 1.25,
        mb: 0,
        fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
        fontSize: 13,
        fontWeight: 500,
        color: '#0A1210',
        lineHeight: 1.45,
      }}
    >
      {body}
    </Typography>
  </Box>
);

/** Soft review marquee used as Atmosphere login ambient background. */
const AtmosphereMarqueeBackground: React.FC = () => {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: { xs: 2, sm: 2.5 },
        py: 4,
        opacity: { xs: 0.45, sm: 0.7 },
        overflow: 'hidden',
      }}
    >
      <Marquee pauseOnHover={false} durationSec={32}>
        {firstRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover={false} durationSec={36}>
        {secondRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <Marquee pauseOnHover={false} durationSec={40}>
        {reviews.map((review) => (
          <ReviewCard key={`row3-${review.username}`} {...review} />
        ))}
      </Marquee>

      {/* Edge fades into PAGE_ATMOSPHERE tones */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, #5F8670 0%, transparent 18%, transparent 82%, #5F8670 100%), linear-gradient(180deg, rgba(158,182,201,0.55) 0%, transparent 22%, transparent 78%, rgba(232,220,200,0.65) 100%)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
};

export default AtmosphereMarqueeBackground;
