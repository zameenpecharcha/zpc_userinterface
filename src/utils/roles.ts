import { UserInfo } from '../types/auth';

export function normalizeRole(role?: string | null): string {
  return (role || '').trim().toLowerCase();
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === 'admin';
}

/** Where to send the user after a successful login. */
export function postLoginPath(user?: Pick<UserInfo, 'role'> | null): string {
  return isAdminRole(user?.role) ? '/admin' : '/home';
}
