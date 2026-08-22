/*
 * Session tokens.
 *
 * PB-02 US-02, T-02.1 and T-02.3.
 *
 * A session is a signed JWT carrying the student's
 * identifier (sub) and a unique token identifier (jti).
 * The jti is what makes sign-out meaningful: revoking a
 * single jti invalidates exactly one session and leaves
 * any other session the same student has open untouched
 * (NFR-03).
 *
 * The revocation list is held in memory. That is enough
 * for the single-process development and demonstration
 * setup this sprint targets: a restart clears the list,
 * but a restart also ends every session anyway. A
 * deployment with more than one process would move this
 * list into the database or a shared cache; that is
 * recorded as a known limitation in the Sprint 3 report.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '8h';

/*
 * The signing secret must come from the environment.
 * Falling back to a hard-coded default would mean every
 * checkout of the repository shares one secret, so in
 * production a missing key is a startup failure rather
 * than a silent downgrade (NFR-01, NFR-02).
 */
function getSecret() {
    const secret = process.env.JWT_SECRET;

    if (secret && secret.length >= 16) {
        return secret;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'JWT_SECRET is missing or too short. Set it in the environment before starting the server.'
        );
    }

    // Development convenience only: a per-process random
    // secret. Restarting the server ends every session,
    // which is the correct behaviour for a key that was
    // never persisted.
    if (!getSecret.ephemeral) {
        getSecret.ephemeral =
            crypto.randomBytes(32).toString('hex');

        console.warn(
            '⚠️  JWT_SECRET is not set. Using a temporary key; all sessions end when the server restarts.'
        );
    }

    return getSecret.ephemeral;
}

// jti values revoked by sign-out.
const revokedTokenIds = new Set();

// PB-02 T-02.1 — issue a session token.
function issueToken(user) {
    const tokenId = crypto.randomUUID();

    const token = jwt.sign(
        {
            sub: user.id,
            jti: tokenId,
            email: user.email
        },
        getSecret(),
        {
            expiresIn: TOKEN_TTL
        }
    );

    return {
        token,
        tokenId
    };
}

/*
 * Verify a token.
 *
 * Returns { valid: true, payload } or
 * { valid: false, reason } where reason is one of
 * 'malformed', 'expired', or 'revoked'. The caller
 * turns the reason into a message; this function does
 * not decide HTTP status codes.
 */
function verifyToken(token) {
    if (typeof token !== 'string' || token.trim() === '') {
        return {
            valid: false,
            reason: 'malformed'
        };
    }

    let payload;

    try {
        payload = jwt.verify(token, getSecret());
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return {
                valid: false,
                reason: 'expired'
            };
        }

        return {
            valid: false,
            reason: 'malformed'
        };
    }

    // A token signed before sign-out is still
    // cryptographically valid, so the revocation list is
    // checked separately.
    if (payload.jti && revokedTokenIds.has(payload.jti)) {
        return {
            valid: false,
            reason: 'revoked'
        };
    }

    return {
        valid: true,
        payload
    };
}

// PB-02 T-02.3 — revoke one session at sign-out.
function revokeToken(tokenId) {
    if (!tokenId) {
        return false;
    }

    revokedTokenIds.add(tokenId);

    return true;
}

function isRevoked(tokenId) {
    return revokedTokenIds.has(tokenId);
}

// Used by the test suite to start from a clean state.
function clearRevokedTokens() {
    revokedTokenIds.clear();
}

module.exports = {
    issueToken,
    verifyToken,
    revokeToken,
    isRevoked,
    clearRevokedTokens,
    TOKEN_TTL
};
