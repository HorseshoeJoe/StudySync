/*
 * Session state for the whole application.
 *
 * PB-01 US-01, PB-02 US-02, PB-03 US-03.
 *
 * One provider owns the signed-in student, so no
 * component has to pass the session down by hand and
 * there is a single place where sign-in, sign-out,
 * registration, profile updates, and session
 * restoration happen.
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback
} from 'react';

import client, {
    setAuthToken,
    getAuthToken,
    setSessionExpiredHandler
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    // True until the stored token has been checked, so
    // the shell can avoid flashing the signed-out view
    // to a student who is in fact signed in.
    const [restoring, setRestoring] = useState(true);

    const [sessionNotice, setSessionNotice] = useState(null);

    const clearSession = useCallback(() => {
        setAuthToken(null);
        setUser(null);
    }, []);

    /*
     * A 401 on any request ends the session here as well
     * as in the client, so the interface returns to the
     * public view instead of showing a signed-in shell
     * whose every request fails.
     */
    useEffect(() => {
        setSessionExpiredHandler(message => {
            clearSession();
            setSessionNotice(message);
        });

        return () => setSessionExpiredHandler(null);
    }, [clearSession]);

    /*
     * T-02.4 — restore the session on page load. The
     * stored token is presented to /api/auth/me; if the
     * server refuses it the token is discarded.
     */
    useEffect(() => {
        let cancelled = false;

        async function restore() {
            const token = getAuthToken();

            if (!token) {
                if (!cancelled) {
                    setRestoring(false);
                }

                return;
            }

            try {
                const response = await client.get('/api/auth/me');

                if (!cancelled) {
                    setUser(response.data.data);
                }
            } catch (error) {
                if (!cancelled) {
                    clearSession();
                }
            } finally {
                if (!cancelled) {
                    setRestoring(false);
                }
            }
        }

        restore();

        return () => {
            cancelled = true;
        };
    }, [clearSession]);

    /*
     * PB-01 — register. No session is created; the
     * caller sends the student to the sign-in view, which
     * is the acceptance criterion.
     *
     * Field errors are rethrown untouched so the form can
     * put each message next to its input.
     */
    const register = useCallback(async details => {
        const response = await client.post('/api/auth/register', details);

        return response.data.data;
    }, []);

    // PB-02 — sign in.
    const signIn = useCallback(async (email, password) => {
        const response = await client.post('/api/auth/login', {
            email,
            password
        });

        const { token, user: profile } = response.data.data;

        setAuthToken(token);
        setUser(profile);
        setSessionNotice(null);

        return profile;
    }, []);

    /*
     * PB-02 — sign out.
     *
     * The local session is cleared whatever the server
     * says. If the request fails because the token had
     * already expired, the student still expects to be
     * signed out.
     */
    const signOut = useCallback(async () => {
        try {
            await client.post('/api/auth/logout');
        } catch (error) {
            // Already invalid server-side; nothing to do.
        } finally {
            clearSession();
            setSessionNotice(null);
        }
    }, [clearSession]);

    // PB-03 — update the profile and keep the shell's
    // copy of the student in step.
    const updateProfile = useCallback(async updates => {
        const response = await client.put('/api/users/me', updates);

        setUser(response.data.data);

        return response.data.data;
    }, []);

    const value = {
        user,
        isSignedIn: Boolean(user),
        restoring,
        sessionNotice,
        dismissSessionNotice: () => setSessionNotice(null),
        register,
        signIn,
        signOut,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside an AuthProvider');
    }

    return context;
}

export default AuthContext;
