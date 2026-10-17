// Server-only. One definition of the auth cookies' flags, shared by login,
// token refresh and logout so a rotated token is stored exactly like the
// original (HttpOnly; Secure in production; SameSite=Lax; Path=/).

const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
};

/** Browser-session cookie; the access token itself expires after 15 minutes. */
export const ACCESS_TOKEN_COOKIE = base;

/** 7 days, renewed every time the backend rotates the refresh token. */
export const REFRESH_TOKEN_COOKIE = { ...base, maxAge: 7 * 24 * 60 * 60 };

/** Deletes either cookie. */
export const EXPIRED_COOKIE = { ...base, maxAge: 0 };
