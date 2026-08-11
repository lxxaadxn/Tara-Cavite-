export const ADMIN_ALLOWED_EMAIL = 'forcapstone222@gmail.com';

export function isAllowedAdminEmail(email: string): boolean {
  const allowed = ADMIN_ALLOWED_EMAIL.trim().toLowerCase();
  if (!allowed) return false;
  return email.trim().toLowerCase() === allowed;
}
