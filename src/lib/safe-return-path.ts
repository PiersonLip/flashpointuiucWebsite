/** Safe internal path for post-login redirects (blocks open redirects). */
export function safeReturnPath(next: string | null | undefined, fallback = "/gear") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return fallback;
  }
  return next;
}
