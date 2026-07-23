import { gql } from '@apollo/client';

export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($roomId: String!, $userId: String!, $limit: Int, $beforeUnixMs: BigInt) {
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

export const GET_USER_ROOMS = gql`
  query GetUserRooms($userId: String!) {
    getUserRooms(userId: $userId) {
      roomId
      roomType
      name
      lastMessage
      lastMessageAt
      hasUnread
      memberIds
      participants {
        userId
        firstName
        lastName
        avatarUrl
      }
    }
  }
`;

export const GET_PRESENCE = gql`
  query GetPresence($userIds: [String!]!) {
    getPresence(userIds: $userIds) {
      userId
      isOnline
      lastSeenUnixMs
    }
  }
`;

/** Presigned PUT URL for chat media (images/files). */
export const REQUEST_CHAT_UPLOAD = gql`
  mutation RequestChatUpload(
    $userId: String!
    $roomId: String!
    $fileName: String!
    $mimeType: String!
    $fileSizeBytes: Int!
  ) {
    requestChatUpload(
      userId: $userId
      roomId: $roomId
      fileName: $fileName
      mimeType: $mimeType
      fileSizeBytes: $fileSizeBytes
    ) {
      mediaKey
      uploadUrl
      expiresAtUnixMs
    }
  }
`;
