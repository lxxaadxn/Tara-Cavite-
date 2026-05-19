const ADMIN_RESERVED_EMAIL = 'forcapstone111@gmail.com';

export function isAdminReservedEmail(email = ''): boolean {
  return email.trim().toLowerCase() === ADMIN_RESERVED_EMAIL;
}

export function getAdminReservedEmailMessage(): string {
  return 'This email is reserved for the admin app only.';
}
