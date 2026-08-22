/*
 * Profile controller.
 *
 * PB-03 US-03 — FR-1.5, FR-1.6.
 *
 * Both routes act on the authenticated student only. The
 * identifier comes from the verified token, never from
 * the request body or the URL, so one student cannot
 * read or edit another student's profile through these
 * endpoints.
 */

const User = require('../models/User');

const {
    validateProfileUpdate,
    PROFILE_EDITABLE_FIELDS
} = require('../utils/validators');

// GET /api/users/me — read the caller's own profile.
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Error fetching profile:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to load your profile. Please try again.'
        });
    }
};

/*
 * PUT /api/users/me — update the caller's own profile.
 *
 * Only display name, institution, program, and avatar
 * can change. Anything else in the body is refused with
 * a message rather than ignored, so a student who tries
 * to change their e-mail address is told why nothing
 * happened instead of seeing a silent no-op.
 */
exports.updateMyProfile = async (req, res) => {
    try {
        const payload = req.body || {};

        const errors = validateProfileUpdate(payload);

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Your profile could not be saved',
                errors
            });
        }

        // Build the update from the allowlist, not from
        // the keys the caller sent.
        const updates = {};

        PROFILE_EDITABLE_FIELDS.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(payload, field)) {
                updates[field] = payload[field];
            }
        });

        const updated = await User.updateProfile(req.user.id, updates);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updated
        });

    } catch (error) {
        console.error('Error updating profile:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to save your profile. Please try again.'
        });
    }
};

/*
 * GET /api/users/:id — another student's public profile.
 *
 * FR-1.6: the e-mail address is not in the model's
 * select list for this query, so no response from this
 * route can contain one.
 */
exports.getPublicProfile = async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const profile = await User.findPublicProfileById(userId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: profile
        });

    } catch (error) {
        console.error('Error fetching public profile:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to load the profile. Please try again.'
        });
    }
};
