/*
 * Authentication controller.
 *
 * PB-01 US-01 — registration
 * PB-02 US-02 — sign-in, sign-out, session restore
 *
 * Every failure returns a plain message the interface
 * can show. Stack traces and driver errors go to the
 * server log only (NFR-08).
 */

const User = require('../models/User');

const {
    validateRegistration
} = require('../utils/validators');

const {
    issueToken,
    revokeToken
} = require('../utils/tokens');

/*
 * POST /api/auth/register — PB-01, FR-1.1, FR-1.2
 *
 * Rejects a malformed e-mail, a duplicate e-mail, and a
 * weak password with a message attached to the offending
 * field. Nothing is written unless every field passes.
 */
exports.register = async (req, res) => {
    try {
        const payload = req.body || {};

        const errors = validateRegistration(payload);

        /*
         * Uniqueness is only worth checking once the
         * address is well formed, otherwise a malformed
         * value would produce two messages for one field.
         */
        if (!errors.email) {
            const taken = await User.emailExists(payload.email);

            if (taken) {
                errors.email =
                    'An account with this e-mail address already exists';
            }
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Registration could not be completed',
                errors
            });
        }

        const user = await User.create({
            email: payload.email,
            display_name: payload.display_name,
            institution: payload.institution,
            program: payload.program,
            password: payload.password,
            avatar_url: payload.avatar_url
        });

        /*
         * The account is created but no session is
         * issued: the acceptance criterion for PB-01 is
         * that a successful registration directs the
         * student to the sign-in view.
         */
        return res.status(201).json({
            success: true,
            message: 'Account created successfully. Please sign in.',
            data: user
        });

    } catch (error) {
        /*
         * The unique constraint is the authority on
         * duplicates. Two simultaneous registrations of
         * the same address both pass the emailExists
         * check; the database refuses the second, and it
         * is reported as the same field-level error
         * rather than as a server fault.
         */
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Registration could not be completed',
                errors: {
                    email:
                        'An account with this e-mail address already exists'
                }
            });
        }

        console.error('Error registering account:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to create the account. Please try again.'
        });
    }
};

/*
 * POST /api/auth/login — PB-02, FR-1.3
 *
 * A wrong address and a wrong password produce the same
 * message and the same status, so the response cannot be
 * used to discover which addresses are registered.
 */
const GENERIC_SIGN_IN_FAILURE =
    'E-mail address or password is incorrect';

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            email.trim() === '' ||
            password === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'E-mail address and password are required'
            });
        }

        const user = await User.findByEmailWithHash(email);

        if (!user) {
            /*
             * Verify against a throwaway value anyway so
             * an unknown address and a known one take a
             * comparable amount of time.
             */
            await User.verifyPassword(
                password,
                '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid'
            );

            return res.status(401).json({
                success: false,
                message: GENERIC_SIGN_IN_FAILURE
            });
        }

        const passwordMatches = await User.verifyPassword(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: GENERIC_SIGN_IN_FAILURE
            });
        }

        const { token } = issueToken(user);

        // password_hash came back from the model for the
        // comparison; it does not leave this function.
        const profile = {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            institution: user.institution,
            program: user.program,
            avatar_url: user.avatar_url,
            created_at: user.created_at,
            updated_at: user.updated_at
        };

        return res.status(200).json({
            success: true,
            message: 'Signed in successfully',
            data: {
                token,
                user: profile
            }
        });

    } catch (error) {
        console.error('Error signing in:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to sign in. Please try again.'
        });
    }
};

/*
 * POST /api/auth/logout — PB-02, T-02.3
 *
 * Revokes the presented token's identifier. The route is
 * behind requireAuth, so req.tokenId is always set here.
 */
exports.logout = async (req, res) => {
    try {
        revokeToken(req.tokenId);

        return res.status(200).json({
            success: true,
            message: 'Signed out successfully'
        });

    } catch (error) {
        console.error('Error signing out:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to sign out. Please try again.'
        });
    }
};

/*
 * GET /api/auth/me — PB-02, T-02.4
 *
 * Lets the React client restore a session after a page
 * reload: it presents the stored token and either gets
 * the profile back or a 401 telling it to discard the
 * token and return to the public view.
 */
exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'This session is no longer valid. Please sign in again.'
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Error restoring session:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to restore the session.'
        });
    }
};
