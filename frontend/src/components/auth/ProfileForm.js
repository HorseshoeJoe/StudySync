/*
 * Profile view and edit form.
 *
 * PB-03 US-03, T-03.2.
 *
 * Four fields are editable: display name, institution,
 * program, and avatar. The e-mail address is shown but
 * rendered read-only, because the route refuses to
 * change it — the interface says so rather than offering
 * an input that would be rejected.
 */

import React, { useState, useEffect } from 'react';

import {
    Card,
    Form,
    Button,
    Alert,
    Row,
    Col,
    Image,
    Spinner
} from 'react-bootstrap';

import { useAuth } from '../../context/AuthContext';

function ProfileForm() {
    const { user, updateProfile } = useAuth();

    const [form, setForm] = useState({
        display_name: '',
        institution: '',
        program: '',
        avatar_url: ''
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [savedMessage, setSavedMessage] = useState(null);
    const [saving, setSaving] = useState(false);

    // Fill the form from the session's copy of the
    // student, and refill it whenever that changes.
    useEffect(() => {
        if (!user) {
            return;
        }

        setForm({
            display_name: user.display_name || '',
            institution: user.institution || '',
            program: user.program || '',
            avatar_url: user.avatar_url || ''
        });
    }, [user]);

    const handleChange = event => {
        const { name, value } = event.target;

        setForm(previous => ({ ...previous, [name]: value }));
        setSavedMessage(null);

        setFieldErrors(previous => {
            if (!previous[name]) {
                return previous;
            }

            const next = { ...previous };
            delete next[name];

            return next;
        });
    };

    const handleSubmit = async event => {
        event.preventDefault();

        setFormError(null);
        setSavedMessage(null);
        setFieldErrors({});
        setSaving(true);

        try {
            await updateProfile({
                display_name: form.display_name.trim(),
                institution: form.institution.trim(),
                program: form.program.trim(),
                avatar_url: form.avatar_url.trim()
            });

            setSavedMessage('Your profile has been saved.');

        } catch (error) {
            if (error.errors && Object.keys(error.errors).length > 0) {
                setFieldErrors(error.errors);
            } else {
                setFormError(error.message);
            }

        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (!user) {
            return;
        }

        setForm({
            display_name: user.display_name || '',
            institution: user.institution || '',
            program: user.program || '',
            avatar_url: user.avatar_url || ''
        });

        setFieldErrors({});
        setFormError(null);
        setSavedMessage(null);
    };

    if (!user) {
        return null;
    }

    return (
        <Card className="shadow-sm mx-auto" style={{ maxWidth: '640px' }}>
            <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-3 mb-4">
                    {form.avatar_url ? (
                        <Image
                            src={form.avatar_url}
                            alt=""
                            roundedCircle
                            width={64}
                            height={64}
                            style={{ objectFit: 'cover' }}
                            onError={event => {
                                event.target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div
                            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                            style={{ width: 64, height: 64, fontSize: '1.5rem' }}
                        >
                            {(user.display_name || '?')
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                    )}

                    <div>
                        <h2 className="h4 mb-0">My profile</h2>

                        <p className="text-muted small mb-0">
                            {user.email}
                        </p>
                    </div>
                </div>

                {savedMessage && (
                    <Alert
                        variant="success"
                        dismissible
                        onClose={() => setSavedMessage(null)}
                        className="py-2"
                    >
                        {savedMessage}
                    </Alert>
                )}

                {formError && (
                    <Alert
                        variant="danger"
                        dismissible
                        onClose={() => setFormError(null)}
                        className="py-2"
                    >
                        {formError}
                    </Alert>
                )}

                <Form noValidate onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="profile-email">
                        <Form.Label>E-mail address</Form.Label>

                        <Form.Control
                            type="email"
                            value={user.email}
                            readOnly
                            disabled
                        />

                        <Form.Text className="text-muted">
                            Your e-mail address identifies your account and
                            cannot be changed here.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group
                        className="mb-3"
                        controlId="profile-display-name"
                    >
                        <Form.Label>Display name</Form.Label>

                        <Form.Control
                            type="text"
                            name="display_name"
                            value={form.display_name}
                            onChange={handleChange}
                            isInvalid={Boolean(fieldErrors.display_name)}
                        />

                        <Form.Control.Feedback type="invalid">
                            {fieldErrors.display_name}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group
                                className="mb-3"
                                controlId="profile-institution"
                            >
                                <Form.Label>Institution</Form.Label>

                                <Form.Control
                                    type="text"
                                    name="institution"
                                    value={form.institution}
                                    onChange={handleChange}
                                    isInvalid={Boolean(fieldErrors.institution)}
                                />

                                <Form.Control.Feedback type="invalid">
                                    {fieldErrors.institution}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group
                                className="mb-3"
                                controlId="profile-program"
                            >
                                <Form.Label>Program</Form.Label>

                                <Form.Control
                                    type="text"
                                    name="program"
                                    value={form.program}
                                    onChange={handleChange}
                                    isInvalid={Boolean(fieldErrors.program)}
                                    placeholder="Computer Science"
                                />

                                <Form.Control.Feedback type="invalid">
                                    {fieldErrors.program}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3" controlId="profile-avatar">
                        <Form.Label>Avatar URL</Form.Label>

                        <Form.Control
                            type="url"
                            name="avatar_url"
                            value={form.avatar_url}
                            onChange={handleChange}
                            isInvalid={Boolean(fieldErrors.avatar_url)}
                            placeholder="https://example.com/photo.jpg"
                        />

                        <Form.Control.Feedback type="invalid">
                            {fieldErrors.avatar_url}
                        </Form.Control.Feedback>

                        <Form.Text className="text-muted">
                            Leave blank to use your initial instead.
                        </Form.Text>
                    </Form.Group>

                    <div className="d-flex gap-2 mt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        className="me-2"
                                    />
                                    Saving...
                                </>
                            ) : (
                                'Save changes'
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline-secondary"
                            onClick={handleReset}
                            disabled={saving}
                        >
                            Discard changes
                        </Button>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
}

export default ProfileForm;
