import type { ApolloClient } from '@apollo/client';
import { CREATE_NOTIFICATION } from '../graphql/user';
import { extractMentionedUserIds } from './mentions';

function previewText(text: string, max = 80): string {
  const clean = String(text || '')
    .replace(/@\[[^:\]]+:([^\]]+)\]/g, '@$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return 'Sent you a message';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Notify other chat participants that they received a new message. */
export async function notifyChatRecipients(
  apollo: ApolloClient<object>,
  opts: {
    recipientIds: Array<string | number>;
    authorId: string | number;
    authorName: string;
    text?: string;
    roomId: string;
    /** Skip these ids (e.g. already notified via @mention). */
    skipUserIds?: Array<string | number>;
  }
): Promise<void> {
  const authorKey = String(opts.authorId);
  const skip = new Set((opts.skipUserIds || []).map(String));
  skip.add(authorKey);

  const targets = Array.from(
    new Set(
      (opts.recipientIds || [])
        .map((id) => String(id || '').trim())
        .filter((id) => id && !skip.has(id))
    )
  );
  if (targets.length === 0) return;

  const title = 'New message';
  const message = `${opts.authorName}: ${previewText(opts.text || '')}`;
  const metadata = JSON.stringify({
    roomId: opts.roomId,
    kind: 'chat',
    authorId: authorKey,
  });

  await Promise.all(
    targets.map((userId) =>
      apollo
        .mutate({
          mutation: CREATE_NOTIFICATION,
          variables: {
            userId: String(userId),
            title,
            message,
            type: 'message',
            metadata,
          },
        })
        .catch((err) => {
          console.warn('chat message notify failed', { userId, err });
        })
    )
  );
}

/** Recipients for a DM room id like dm:a:b (excludes author). */
export function recipientIdsFromRoom(
  roomId: string,
  authorId: string | number,
  extraIds: Array<string | number> = []
): string[] {
  const authorKey = String(authorId);
  const ids = new Set<string>();
  for (const id of extraIds) {
    const s = String(id || '').trim();
    if (s && s !== authorKey) ids.add(s);
  }
  const normalized = String(roomId || '').trim();
  if (normalized.startsWith('dm:')) {
    const parts = normalized.split(':');
    if (parts.length >= 3) {
      [parts[1], parts.slice(2).join(':')].forEach((id) => {
        if (id && id !== authorKey) ids.add(id);
      });
    }
  }
  // Also collect @mentions in case group chat participants list is incomplete
  return Array.from(ids);
}

export function mentionedIdsInContent(content: string): string[] {
  return extractMentionedUserIds(content || '');
}
