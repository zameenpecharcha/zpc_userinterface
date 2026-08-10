import type { ApolloClient } from '@apollo/client';
import { CREATE_NOTIFICATION } from '../graphql/user';
import { extractMentionedUserIds } from './mentions';

/** Best-effort: notify each @mentioned user (skips author). Failures are logged, not thrown. */
export async function notifyMentionedUsers(
  apollo: ApolloClient<object>,
  opts: {
    content: string;
    authorId: number | string;
    authorName: string;
    title?: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const authorKey = String(opts.authorId);
  const mentioned = extractMentionedUserIds(opts.content)
    .filter((id) => id !== authorKey)
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));
  if (mentioned.length === 0) return;

  const title = opts.title || 'You were mentioned';
  const message = opts.message || `${opts.authorName} mentioned you`;
  const metadata = JSON.stringify(opts.metadata || {});

  await Promise.all(
    mentioned.map((userId) =>
      apollo
        .mutate({
          mutation: CREATE_NOTIFICATION,
          variables: { userId, title, message, type: 'mention', metadata },
        })
        .catch((err) => {
          console.warn('mention notify failed', { userId, err });
        })
    )
  );
}
