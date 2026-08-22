/*
 * Session middleware.
 *
 * PB-02 US-02, T-02.2 — FR-1.4.
 *
 * requireAuth is mounted on the route, ahead of the
 * controller, so a protected endpoint cannot be left
 * unguarded by forgetting a check inside a handler.
 *
 * The reason a token was refused is reported to the
 * caller (missing, malformed, expired, revoked) because
 * the client behaves differently in each case — an
 * expired token means sign in again, a malformed one
 * means the stored value is corrupt and should be
 * discarded. None of these messages reveal anything
 * about another account.
 */

const { verifyToken } = require('../utils/tokens');

const REFUSAL_MESSAGES = {
    missing: 'Sign in to continue.',
    malformed: 'Your session is not valid. Please sign in again.',
    expired: 'Your session has expired. Please sign in again.',
    revoked: 'You have been signed out. Please sign in again.'
};

// Pull the bearer token out of the Authorization header.
function readBearerToken(req) {
    const header = req.headers.authorization;

    if (typeof header !== 'string') {
        return null;
    }

    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return null;
    }

    const token = match[1].trim();

    return token === '' ? null : token;
}

/*
 * Refuse the request unless a valid session is presented.
 * On success req.user is { id, email } and req.tokenId
 * is the jti, which sign-out needs in order to revoke
 * this one session.
 */
function requireAuth(req, res, next) {
    const token = readBearerToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: REFUSAL_MESSAGES.missing,
            reason: 'missing'
        });
    }

    const result = verifyToken(token);

    if (!result.valid) {
        return res.status(401).json({
            success: false,
            message:
                REFUSAL_MESSAGES[result.reason] ||
                REFUSAL_MESSAGES.malformed,
            reason: result.reason
        });
    }

    req.user = {
        id: result.payload.sub,
        email: result.payload.email
    };

    req.tokenId = result.payload.jti;

    return next();
}

/*
 * Identify the caller when a token is present, but let
 * the request through when it is not.
 *
 * Used by endpoints that work anonymously and return
 * more to a signed-in caller — the search results mark
 * the caller's own memberships, for example. A bad token
 * is treated as no token here rather than as an error,
 * so a stale token cannot make the public search view
 * stop working.
 */
function attachUserIfPresent(req, res, next) {
    const token = readBearerToken(req);

    if (!token) {
        return next();
    }

    const result = verifyToken(token);

    if (result.valid) {
        req.user = {
            id: result.payload.sub,
            email: result.payload.email
        };

        req.tokenId = result.payload.jti;
    }

    return next();
}

module.exports = {
    requireAuth,
    attachUserIfPresent
};
