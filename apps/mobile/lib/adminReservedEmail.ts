const ADMIN_RESERVED_EMAIL = 'forcapstone222@gmail.com';

export function isAdminReservedEmail(email = ''): boolean {
  const reserved = ADMIN_RESERVED_EMAIL.trim().toLowerCase();
  if (!reserved) return false;
  return email.trim().toLowerCase() === reserved;
}

export function getAdminReservedEmailMessage(): string {
  return 'This email is reserved for the admin app only.';
}
