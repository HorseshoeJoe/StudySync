/*
 * Shared Axios client.
 *
 * PB-02 T-02.4.
 *
 * Every request in the application goes through this
 * instance so that three concerns are handled in one
 * place rather than repeated in each component:
 *
 *   1. the base URL comes from the environment, so the
 *      client can be pointed at a shared instance for
 *      the sprint review instead of localhost;
 *   2. the session token is attached automatically;
 *   3. server errors are normalised into one shape, so
 *      a component never has to unpick an Axios error.
 */

import axios from 'axios';

const API_BASE =
    process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TOKEN_STORAGE_KEY = 'studysync.token';

/*
 * The token lives in localStorage so the session
 * survives a page reload, which is what T-02.4 asks
 * for. Every access is wrapped because a browser in
 * private mode can refuse storage entirely, and a
 * session that cannot be remembered should still be
 * usable for the current page.
 */
export function getStoredToken() {
    try {
        return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
        return null;
    }
}

export function setStoredToken(token) {
    try {
        if (token) {
            window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    } catch (error) {
        // Storage unavailable; the in-memory token below
        // still carries the session for this page.
    }
}

// Held separately so the client keeps working when
// localStorage is unavailable.
let inMemoryToken = getStoredToken();

export function setAuthToken(token) {
    inMemoryToken = token || null;
    setStoredToken(token);
}

export function getAuthToken() {
    return inMemoryToken;
}

const client = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' }
});

// Attach the session token to every outgoing request.
client.interceptors.request.use(config => {
    const token = getAuthToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

/*
 * Called by AuthContext so that a 401 can clear the
 * session state, not just the stored token. Registered
 * as a callback rather than imported directly to keep
 * this module free of React.
 */
let onSessionExpired = null;

export function setSessionExpiredHandler(handler) {
    onSessionExpired = handler;
}

/*
 * Normalise every failure into { message, errors,
 * status }, so a component can show err.message and,
 * where the server supplied them, err.errors.<field>.
 */
client.interceptors.response.use(
    response => response,
    error => {
        const status = error.response ? error.response.status : 0;

        const payload =
            error.response && error.response.data
                ? error.response.data
                : {};

        /*
         * A 401 means the token is gone, expired, or
         * revoked. The session is cleared here so a
         * stale token cannot sit in storage producing
         * failures on every later request.
         *
         * A failed sign-in also returns 401, but the
         * caller is not signed in at that point, so the
         * handler is skipped for the auth routes.
         */
        const isSignInAttempt =
            error.config &&
            typeof error.config.url === 'string' &&
            error.config.url.includes('/api/auth/login');

        if (status === 401 && !isSignInAttempt && onSessionExpired) {
            onSessionExpired(
                payload.message ||
                    'Your session has ended. Please sign in again.'
            );
        }

        let message;

        if (payload.message) {
            message = payload.message;
        } else if (status === 0) {
            message =
                'Cannot connect to the StudySync server. Make sure the backend is running on port 5000.';
        } else {
            message = 'Something went wrong. Please try again.';
        }

        return Promise.reject({
            message,
            errors: payload.errors || {},
            status
        });
    }
);

export { API_BASE };
export default client;
