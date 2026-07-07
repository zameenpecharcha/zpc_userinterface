const trimTrailingSlash = (url: string) => url.replace(/\/$/, '');

const toWebSocketUrl = (httpUrl: string) =>
  httpUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');

/** Base API gateway URL (no trailing slash). */
export const API_GATEWAY_URL = trimTrailingSlash(
  process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8000'
);

export const GRAPHQL_URL =
  process.env.REACT_APP_GRAPHQL_URL || `${API_GATEWAY_URL}/api/v1/graphql`;

export const WS_CHAT_URL =
  process.env.REACT_APP_WS_URL ||
  `${toWebSocketUrl(API_GATEWAY_URL)}/api/v1/ws/chat`;

export const UPLOAD_PRESIGN_URL =
  process.env.REACT_APP_UPLOAD_PRESIGN_URL ||
  `${API_GATEWAY_URL}/api/v1/uploads/presign-post-media`;
