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
        editedAt
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
        lastLoginAt
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

export const GET_CONVERSATION = gql`
  query GetConversation($conversationId: String!, $userId: String) {
    getConversation(conversationId: $conversationId, userId: $userId) {
      conversation {
        conversationId
        type
        participants
        groupName
        groupPhoto
        description
        memberCount
        lastMessage
        lastMessageId
        lastMessageAt
        createdBy
        createdAt
      }
      members {
        id
        conversationId
        userId
        role
        joinedAt
        status
      }
    }
  }
`;

export const SEARCH_MESSAGES = gql`
  query SearchMessages($conversationId: String!, $query: String!, $limit: Int) {
    searchMessages(conversationId: $conversationId, query: $query, limit: $limit) {
      roomId
      userId
      messageId
      text
      sentAt
      type
      mediaKey
      mediaName
      mediaUrl
      isDeleted
    }
  }
`;

export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount($userId: String!, $conversationId: String) {
    getUnreadCount(userId: $userId, conversationId: $conversationId)
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage(
    $conversationId: String!
    $senderId: String!
    $content: String
    $messageType: Int
    $mediaKey: String
    $mediaName: String
    $mediaSizeBytes: Int
    $mediaMimeType: String
    $replyToMessageId: String
  ) {
    sendMessage(
      conversationId: $conversationId
      senderId: $senderId
      content: $content
      messageType: $messageType
      mediaKey: $mediaKey
      mediaName: $mediaName
      mediaSizeBytes: $mediaSizeBytes
      mediaMimeType: $mediaMimeType
      replyToMessageId: $replyToMessageId
    ) {
      messageId
      roomId
      userId
      text
      sentAt
      type
      status
    }
  }
`;

export const DELETE_MESSAGE_MUTATION = gql`
  mutation DeleteMessage($messageId: String!, $userId: String!, $conversationId: String) {
    deleteMessage(messageId: $messageId, userId: $userId, conversationId: $conversationId)
  }
`;

export const EDIT_MESSAGE_MUTATION = gql`
  mutation EditMessage($messageId: String!, $userId: String!, $newContent: String!, $conversationId: String) {
    editMessage(messageId: $messageId, userId: $userId, newContent: $newContent, conversationId: $conversationId) {
      messageId
      text
      editedAt
    }
  }
`;

export const MARK_MESSAGE_READ_MUTATION = gql`
  mutation MarkMessageRead($conversationId: String!, $userId: String!, $messageId: String) {
    markMessageRead(conversationId: $conversationId, userId: $userId, messageId: $messageId)
  }
`;

export const ADD_GROUP_MEMBER_MUTATION = gql`
  mutation AddGroupMember($conversationId: String!, $userId: String!, $operatorId: String, $role: String) {
    addGroupMember(conversationId: $conversationId, userId: $userId, operatorId: $operatorId, role: $role)
  }
`;

export const REMOVE_GROUP_MEMBER_MUTATION = gql`
  mutation RemoveGroupMember($conversationId: String!, $userId: String!, $operatorId: String) {
    removeGroupMember(conversationId: $conversationId, userId: $userId, operatorId: $operatorId)
  }
`;

export const LEAVE_GROUP_MUTATION = gql`
  mutation LeaveGroup($conversationId: String!, $userId: String!) {
    leaveGroup(conversationId: $conversationId, userId: $userId)
  }
`;

export const PROMOTE_ADMIN_MUTATION = gql`
  mutation PromoteAdmin($conversationId: String!, $userId: String!, $operatorId: String) {
    promoteAdmin(conversationId: $conversationId, userId: $userId, operatorId: $operatorId)
  }
`;

export const TRANSFER_OWNERSHIP_MUTATION = gql`
  mutation TransferOwnership($conversationId: String!, $newOwnerId: String!, $currentOwnerId: String) {
    transferOwnership(conversationId: $conversationId, newOwnerId: $newOwnerId, currentOwnerId: $currentOwnerId)
  }
`;

export const DELETE_GROUP_MUTATION = gql`
  mutation DeleteGroup($conversationId: String!, $ownerId: String!) {
    deleteGroup(conversationId: $conversationId, ownerId: $ownerId)
  }
`;

