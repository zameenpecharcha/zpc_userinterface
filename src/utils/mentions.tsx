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

export function avatarPlaceholderIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 10;
}

export function extractMentionedUserIds(content: string, extraIds: string[] = []): string[] {
  const ids = new Set<string>(extraIds);
  const regex = new RegExp(MENTION_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] === 'p') continue;
    const uid = match[2];
    if (uid) ids.add(uid);
  }
  return Array.from(ids);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Expand pretty "@Name" mentions back to `@[id:Name]` / `@[p:id:Name]`
 * using maps collected when the user picked suggestions.
 */
export function expandPrettyMentions(
  content: string,
  userNameToId: Map<string, string> | Record<string, string>,
  propertyNameToId: Map<string, string> | Record<string, string> = {},
): string {
  let out = content || '';
  const users =
    userNameToId instanceof Map
      ? Array.from(userNameToId.entries())
      : Object.entries(userNameToId);
  const props =
    propertyNameToId instanceof Map
      ? Array.from(propertyNameToId.entries())
      : Object.entries(propertyNameToId);

  const apply = (entries: [string, string][], asProperty: boolean) => {
    entries
      .filter(([name, id]) => name && id)
      .sort((a, b) => b[0].length - a[0].length)
      .forEach(([name, id]) => {
        const safe = escapeRegExp(name);
        const re = new RegExp(`@${safe}(?![\\w])`, 'g');
        const token = asProperty ? `@[p:${id}:${name}]` : `@[${id}:${name}]`;
        out = out.replace(re, token);
      });
  };

  apply(users, false);
  apply(props, true);
  return out;
}

/** Show `@Name` in composers; keep ids only in the stored/sent token form. */
export function collapseMentionTokens(content: string): string {
  return String(content || '').replace(MENTION_PATTERN, (_full, _p, _id, name) => `@${name}`);
}

/** Rebuild name→id maps from stored `@[id:Name]` tokens (e.g. when editing). */
export function mentionMapsFromTokens(content: string): {
  userNameToId: Map<string, string>;
  propertyNameToId: Map<string, string>;
} {
  const userNameToId = new Map<string, string>();
  const propertyNameToId = new Map<string, string>();
  const regex = new RegExp(MENTION_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content || '')) !== null) {
    if (match[1] === 'p') propertyNameToId.set(match[3], match[2]);
    else userNameToId.set(match[3], match[2]);
  }
  return { userNameToId, propertyNameToId };
}

/** Approximate caret (x,y) inside a textarea relative to the textarea itself. */
export function getTextareaCaretOffset(
  element: HTMLTextAreaElement | HTMLInputElement,
  position: number,
): { top: number; left: number; height: number } {
  if (!(element instanceof HTMLTextAreaElement)) {
    return { top: element.offsetHeight, left: 12, height: 20 };
  }

  const div = document.createElement('div');
  const style = window.getComputedStyle(element);
  const props = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'whiteSpace',
    'wordBreak',
    'wordWrap',
  ] as const;

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  props.forEach((prop) => {
    (div.style as any)[prop] = (style as any)[prop];
  });
  div.style.overflow = 'hidden';

  div.textContent = element.value.slice(0, position);
  const span = document.createElement('span');
  span.textContent = element.value.slice(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);
  const top = span.offsetTop - element.scrollTop;
  const left = span.offsetLeft - element.scrollLeft;
  const height = span.offsetHeight || parseInt(style.lineHeight, 10) || 20;
  document.body.removeChild(div);

  return { top, left, height };
}

export function renderMentionContent(
  content: string,
  opts: {
    onOpenProfile?: (userId: string) => void;
    onOpenProperty?: (propertyId: string) => void;
    /** Teams-like filled chip (chat); default is underlined link style. */
    variant?: 'link' | 'chip';
    /** Chip colors for dark (outgoing) bubbles */
    ink?: 'dark' | 'light';
  } = {}
): React.ReactNode {
  if (!content) return content;
  const variant = opts.variant || 'link';
  const ink = opts.ink || 'dark';
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
    const chipLight = ink === 'light';
    parts.push(
      <Box
        component="span"
        key={`mention-${match.index}-${id}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isProperty) {
            opts.onOpenProperty?.(id);
          } else {
            opts.onOpenProfile?.(id);
          }
        }}
        sx={
          variant === 'chip'
            ? {
                display: 'inline',
                fontWeight: 700,
                cursor: 'pointer',
                px: 0.6,
                py: 0.1,
                mx: 0.1,
                borderRadius: 1,
                bgcolor: chipLight
                  ? 'rgba(235,230,212,0.22)'
                  : isProperty
                    ? 'rgba(95,134,112,0.18)'
                    : 'rgba(22,48,42,0.12)',
                color: chipLight
                  ? '#EBE6D4'
                  : isProperty
                    ? '#5F8670'
                    : '#16302A',
                '&:hover': {
                  bgcolor: chipLight
                    ? 'rgba(235,230,212,0.32)'
                    : isProperty
                      ? 'rgba(95,134,112,0.28)'
                      : 'rgba(22,48,42,0.2)',
                },
              }
            : {
                color: isProperty ? '#5F8670' : '#16302A',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }
        }
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

/** Match trailing @query for autocomplete (Teams-style). */
export function getActiveMentionQuery(text: string, cursorPos: number): { start: number; query: string } | null {
  const before = text.slice(0, cursorPos);
  const m = before.match(/@([\w.\s-]{0,40})$/);
  if (!m) return null;
  // Don't trigger inside an existing completed token
  if (/@\[[^\]]*$/.test(before)) return null;
  return { start: cursorPos - m[0].length, query: m[1] };
}

export function insertMentionToken(
  text: string,
  cursorPos: number,
  start: number,
  token: string
): { text: string; cursor: number } {
  const before = text.slice(0, start);
  const after = text.slice(cursorPos);
  const next = `${before}${token} ${after}`;
  const cursor = before.length + token.length + 1;
  return { text: next, cursor };
}
