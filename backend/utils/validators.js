/*
 * Field-level validation rules.
 *
 * PB-01 US-01, PB-03 US-03.
 *
 * Every function returns either null (the value is
 * acceptable) or a short message naming what is wrong
 * with that one field. The controller collects the
 * messages into an "errors" object keyed by field name
 * so the React form can show each message next to the
 * input that caused it (FR-1.1, FR-1.2, NFR-08).
 */

// Deliberately conservative: one @, no whitespace,
// a dot-separated domain with a 2+ character TLD.
const EMAIL_PATTERN =
    /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const MAX_EMAIL_LENGTH = 255;
const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_INSTITUTION_LENGTH = 255;
const MAX_PROGRAM_LENGTH = 100;
const MAX_AVATAR_URL_LENGTH = 500;

const MIN_PASSWORD_LENGTH = 8;

// Treat anything that is not a non-empty string
// as missing.
function isBlank(value) {
    return (
        typeof value !== 'string' ||
        value.trim().length === 0
    );
}

function validateEmail(email) {
    if (isBlank(email)) {
        return 'E-mail address is required';
    }

    const trimmed = email.trim();

    if (trimmed.length > MAX_EMAIL_LENGTH) {
        return `E-mail address must be ${MAX_EMAIL_LENGTH} characters or fewer`;
    }

    if (!EMAIL_PATTERN.test(trimmed)) {
        return 'Enter a valid e-mail address, for example student@university.edu';
    }

    return null;
}

/*
 * Password policy (NFR-01 supporting rule):
 * at least eight characters with an uppercase letter,
 * a lowercase letter, a digit, and a symbol.
 *
 * The message lists every unmet rule at once so the
 * student is not forced to resubmit repeatedly to
 * discover the policy.
 */
function validatePassword(password) {
    if (typeof password !== 'string' || password.length === 0) {
        return 'Password is required';
    }

    const unmet = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
        unmet.push(`be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
        unmet.push('contain an uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        unmet.push('contain a lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        unmet.push('contain a digit');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        unmet.push('contain a symbol');
    }

    if (unmet.length === 0) {
        return null;
    }

    return `Password must ${unmet.join(', ')}`;
}

function validateDisplayName(displayName) {
    if (isBlank(displayName)) {
        return 'Display name is required';
    }

    const trimmed = displayName.trim();

    if (trimmed.length < 2) {
        return 'Display name must be at least 2 characters';
    }

    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
        return `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`;
    }

    return null;
}

function validateInstitution(institution) {
    if (isBlank(institution)) {
        return 'Institution is required';
    }

    if (institution.trim().length > MAX_INSTITUTION_LENGTH) {
        return `Institution must be ${MAX_INSTITUTION_LENGTH} characters or fewer`;
    }

    return null;
}

// Program is optional everywhere it appears.
function validateProgram(program) {
    if (
        program === undefined ||
        program === null ||
        program === ''
    ) {
        return null;
    }

    if (typeof program !== 'string') {
        return 'Program must be text';
    }

    if (program.trim().length > MAX_PROGRAM_LENGTH) {
        return `Program must be ${MAX_PROGRAM_LENGTH} characters or fewer`;
    }

    return null;
}

// Avatar is optional. Only http(s) URLs are stored so a
// javascript: or data: value cannot reach an <img src>.
function validateAvatarUrl(avatarUrl) {
    if (
        avatarUrl === undefined ||
        avatarUrl === null ||
        avatarUrl === ''
    ) {
        return null;
    }

    if (typeof avatarUrl !== 'string') {
        return 'Avatar URL must be text';
    }

    const trimmed = avatarUrl.trim();

    if (trimmed.length > MAX_AVATAR_URL_LENGTH) {
        return `Avatar URL must be ${MAX_AVATAR_URL_LENGTH} characters or fewer`;
    }

    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
        return 'Avatar URL must start with http:// or https://';
    }

    return null;
}

/*
 * PB-01 T-01.2 — validate a whole registration payload.
 * Returns an errors object; an empty object means the
 * payload is acceptable.
 */
function validateRegistration(payload = {}) {
    const errors = {};

    const emailError = validateEmail(payload.email);
    if (emailError) {
        errors.email = emailError;
    }

    const displayNameError = validateDisplayName(payload.display_name);
    if (displayNameError) {
        errors.display_name = displayNameError;
    }

    const institutionError = validateInstitution(payload.institution);
    if (institutionError) {
        errors.institution = institutionError;
    }

    const programError = validateProgram(payload.program);
    if (programError) {
        errors.program = programError;
    }

    const passwordError = validatePassword(payload.password);
    if (passwordError) {
        errors.password = passwordError;
    }

    return errors;
}

/*
 * PB-03 T-03.1 — validate a profile update.
 *
 * Only the four editable fields are considered. A field
 * that is absent from the payload is left unchanged, so
 * a partial update is valid; a field that is present
 * must still satisfy its rule.
 *
 * Attempts to change email, id, or password_hash through
 * this route are reported rather than silently dropped,
 * so the student is told why nothing happened.
 */
const PROFILE_EDITABLE_FIELDS = [
    'display_name',
    'institution',
    'program',
    'avatar_url'
];

const PROFILE_IMMUTABLE_FIELDS = [
    'id',
    'email',
    'password',
    'password_hash',
    'created_at'
];

function validateProfileUpdate(payload = {}) {
    const errors = {};

    PROFILE_IMMUTABLE_FIELDS.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(payload, field)) {
            errors[field] =
                `${field} cannot be changed from the profile page`;
        }
    });

    const provided = PROFILE_EDITABLE_FIELDS.filter(field =>
        Object.prototype.hasOwnProperty.call(payload, field)
    );

    if (provided.length === 0 && Object.keys(errors).length === 0) {
        errors.display_name =
            'Provide at least one of display name, institution, program, or avatar URL';

        return errors;
    }

    if (provided.includes('display_name')) {
        const error = validateDisplayName(payload.display_name);
        if (error) {
            errors.display_name = error;
        }
    }

    if (provided.includes('institution')) {
        const error = validateInstitution(payload.institution);
        if (error) {
            errors.institution = error;
        }
    }

    if (provided.includes('program')) {
        const error = validateProgram(payload.program);
        if (error) {
            errors.program = error;
        }
    }

    if (provided.includes('avatar_url')) {
        const error = validateAvatarUrl(payload.avatar_url);
        if (error) {
            errors.avatar_url = error;
        }
    }

    return errors;
}

module.exports = {
    validateEmail,
    validatePassword,
    validateDisplayName,
    validateInstitution,
    validateProgram,
    validateAvatarUrl,
    validateRegistration,
    validateProfileUpdate,
    PROFILE_EDITABLE_FIELDS,
    MIN_PASSWORD_LENGTH
};
