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

export const CREATE_DM_ROOM_MUTATION = gql`
  mutation CreateDmRoom($createdBy: String!, $userA: String!, $userB: String!) {
    createDmRoom(createdBy: $createdBy, userA: $userA, userB: $userB) {
      roomId
      name
    }
  }
`;

export const CREATE_GROUP_ROOM_MUTATION = gql`
  mutation CreateGroupRoom($createdBy: String!, $name: String!, $memberIds: [String!]!) {
    createGroupRoom(createdBy: $createdBy, name: $name, memberIds: $memberIds) {
      roomId
      name
    }
  }
`;
