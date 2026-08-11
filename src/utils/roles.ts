import { UserInfo } from '../types/auth';

export function normalizeRole(role?: string | null): string {
  const r = (role || '').trim().toLowerCase();
  if (r === 'user' || r === 'general' || r === 'general_user') return 'general';
  return r;
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === 'admin';
}

/** Agent & Builder may list properties; Admin/General cannot create. */
export function canCreateProperty(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'agent' || r === 'builder';
}

/** Alias for nav / “My Properties” entry points. */
export function canManageProperties(role?: string | null): boolean {
  return canCreateProperty(role);
}

/** Previously builders auto-published; all listings now await admin review. */
export function canPublishPropertyImmediately(_role?: string | null): boolean {
  return false;
}

/** Where to send the user after a successful login. */
export function postLoginPath(user?: Pick<UserInfo, 'role'> | null): string {
  return isAdminRole(user?.role) ? '/admin' : '/home';
}
