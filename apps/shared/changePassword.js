/** Shared validation + Supabase password change (re-auth with current password). */

export const CHANGE_PASSWORD_MIN_LENGTH = 8;

/**
 * @param {{ currentPassword?: string, newPassword?: string, confirmPassword?: string }} input
 * @returns {string | null} Error message, or null if valid
 */
export function validateChangePasswordInput({ currentPassword, newPassword, confirmPassword }) {
  const current = String(currentPassword ?? '');
  const next = String(newPassword ?? '');
  const confirm = String(confirmPassword ?? '');

  if (!current.trim()) return 'Enter your current password.';
  if (!next) return `New password must be at least ${CHANGE_PASSWORD_MIN_LENGTH} characters.`;
  if (next.length < CHANGE_PASSWORD_MIN_LENGTH) {
    return `New password must be at least ${CHANGE_PASSWORD_MIN_LENGTH} characters.`;
  }
  if (next !== confirm) return 'New password and confirmation do not match.';
  if (current === next) return 'New password must be different from your current password.';
  return null;
}

/**
 * Verify current password, then set a new password via Supabase Auth.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ email: string, currentPassword: string, newPassword: string, confirmPassword: string }} params
 */
export async function changePasswordWithSupabase(
  supabase,
  { email, currentPassword, newPassword, confirmPassword }
) {
  const validationError = validateChangePasswordInput({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  const emailTrim = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!emailTrim) {
    throw new Error('Your account has no email address, so a password cannot be changed here.');
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: emailTrim,
    password: currentPassword,
  });
  if (reauthError) {
    const msg = (reauthError.message || '').toLowerCase();
    if (
      msg.includes('invalid login') ||
      msg.includes('invalid credentials') ||
      msg.includes('email not confirmed')
    ) {
      throw new Error(
        'Current password is incorrect. If you signed up with Google and never set a password, use Forgot password on the login page first.'
      );
    }
    throw reauthError;
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw updateError;
}

export const CHANGE_PASSWORD_SUCCESS_TITLE = 'Password updated';
export const CHANGE_PASSWORD_SUCCESS_MESSAGE = 'Your password was successfully changed.';
