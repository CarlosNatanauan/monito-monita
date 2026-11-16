/**
 * Referrer-Policy for pages that carry or show secret links (/g/*, /new).
 *
 * "same-origin": requests to other sites get no Referer at all, so a
 * personal or organizer link never leaves the site. Same-site requests
 * keep their Origin, which Next's Server Actions CSRF check needs: with
 * "no-referrer", Chrome sends `Origin: null` on a form posted before the
 * page hydrates, the action is rejected, and the phone shows a blank page.
 */
export const REFERRER_POLICY = "same-origin";
