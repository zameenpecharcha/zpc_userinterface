import React from 'react';
import { Box } from '@mui/material';

/** User mention: @[123:Rohit]  Property mention: @[p:abc-id:Lake View Villa] */
export const MENTION_PATTERN = /@\[(?:(p):)?([^:\]]+):([^\]]+)\]/g;

export function nameInitials(name?: string | null, fallback = '?'): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return fallback.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function stringToColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},55%,40%)`;
}

export function extractMentionedUserIds(content: string, extraIds: number[] = []): number[] {
  const ids = new Set<number>(extraIds);
  const regex = new RegExp(MENTION_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] === 'p') continue;
    const uid = parseInt(match[2], 10);
    if (!Number.isNaN(uid)) ids.add(uid);
  }
  return Array.from(ids);
}

export function renderMentionContent(
  content: string,
  opts: {
    onOpenProfile?: (userId: number) => void;
    onOpenProperty?: (propertyId: string) => void;
  } = {}
): React.ReactNode {
  if (!content) return content;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_PATTERN);
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const isProperty = match[1] === 'p';
    const id = match[2];
    const label = match[3];
    parts.push(
      <Box
        component="span"
        key={`mention-${match.index}-${id}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isProperty) {
            opts.onOpenProperty?.(id);
          } else {
            const uid = parseInt(id, 10);
            if (!Number.isNaN(uid)) opts.onOpenProfile?.(uid);
          }
        }}
        sx={{
          color: isProperty ? '#0D9488' : '#2563EB',
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        @{label}
      </Box>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts.length > 0 ? parts : content;
}
