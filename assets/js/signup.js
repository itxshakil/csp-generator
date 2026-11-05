// Signup validation. Pure, so it can be tested without a page.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(value) {
  const email = String(value).trim();
  if (!email) return 'Enter your email address.';
  return EMAIL.test(email) ? '' : 'That does not look like an email address.';
}
