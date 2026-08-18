/**
 * Optional gate that blocks account access until the email is verified.
 *
 * Verification tokens and mail have always existed; this flag decides whether
 * an unverified user may actually use the account. Default off, because turning
 * it on requires SMTP that reliably delivers (see docs/DEPLOYMENT.md) and
 * invalidates any existing unverified accounts' access.
 */

function isEmailVerificationRequired(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === "1";
}

/** True when the gate is on and this user has not verified yet. */
export function blocksForEmailVerification(user: {
  emailVerifiedAt: Date | null;
}): boolean {
  return isEmailVerificationRequired() && user.emailVerifiedAt == null;
}
