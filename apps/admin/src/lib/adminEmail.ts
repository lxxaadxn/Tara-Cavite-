export const ADMIN_ALLOWED_EMAIL = 'forcapstone111@gmail.com';

export function isAllowedAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_ALLOWED_EMAIL;
}
