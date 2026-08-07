// Exact, case-insensitive domain match only -- deliberately does NOT treat
// a subdomain of the allowed domain as trusted. See the Google Sign-In
// design spec, "Architecture" (domain restriction).
export function isAuthorizedDomain(email: string | null | undefined, allowedDomain: string): boolean {
  if (!email) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  return domain === allowedDomain.toLowerCase();
}
