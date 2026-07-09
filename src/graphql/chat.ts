import { gql } from '@apollo/client';

export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($roomId: String!, $userId: String!, $limit: Int, $beforeUnixMs: Int) {
    getMessages(roomId: $roomId, userId: $userId, limit: $limit, beforeUnixMs: $beforeUnixMs) {
      hasMore
      messages {
        roomId
        userId
        messageId
        text
        sentAt
        deliveredAt
        type
        mediaKey
        mediaName
        mediaSizeBytes
        mediaMimeType
        mediaUrl
        replyToMessageId
        isDeleted
        eventType
        status
      }
    }
  }
`;
