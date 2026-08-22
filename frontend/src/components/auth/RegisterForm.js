/*
 * Registration form.
 *
 * PB-01 US-01, T-01.4.
 *
 * The server is the authority on validity: its
 * field-level errors are shown against the input that
 * caused them. The client checks only what it can check
 * without a round trip — required fields and the
 * password confirmation — so the student is not sent to
 * the server to be told a box is empty.
 */

import React, { useState } from 'react';

import {
    Card,
    Form,
    Button,
    Alert,
    Row,
    Col,
    Spinner
} from 'react-bootstrap';

import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = {
    email: '',
    display_name: '',
    institution: '',
    program: '',
    password: '',
    confirm_password: ''
};

function RegisterForm({ onRegistered, onShowSignIn }) {
    const { register } = useAuth();

    const [form, setForm] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = event => {
        const { name, value } = event.target;

        setForm(previous => ({ ...previous, [name]: value }));

        // Clear this field's error as soon as the student
        // starts correcting it.
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

        const localErrors = {};

        if (!form.email.trim()) {
            localErrors.email = 'E-mail address is required';
        }

        if (!form.display_name.trim()) {
            localErrors.display_name = 'Display name is required';
        }

        if (!form.institution.trim()) {
            localErrors.institution = 'Institution is required';
        }

        if (!form.password) {
            localErrors.password = 'Password is required';
        }

        if (form.password !== form.confirm_password) {
            localErrors.confirm_password = 'The two passwords do not match';
        }

        if (Object.keys(localErrors).length > 0) {
            setFieldErrors(localErrors);
            return;
        }

        setSubmitting(true);
        setFieldErrors({});

        try {
            await register({
                email: form.email.trim(),
                display_name: form.display_name.trim(),
                institution: form.institution.trim(),
                program: form.program.trim() || undefined,
                password: form.password
            });

            setForm(EMPTY_FORM);

            // PB-01 acceptance criterion: a successful
            // registration returns to the sign-in view.
            if (onRegistered) {
                onRegistered(form.email.trim());
            }

        } catch (error) {
            if (error.errors && Object.keys(error.errors).length > 0) {
                setFieldErrors(error.errors);
            } else {
                setFormError(error.message);
            }

        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="shadow-sm mx-auto" style={{ maxWidth: '640px' }}>
            <Card.Body className="p-4">
                <h2 className="h4 mb-1">Create your StudySync account</h2>

                <p className="text-muted small mb-4">
                    Registration is free for students. You will sign in
                    after your account is created.
                </p>

                {formError && (
                    <Alert
                        variant="danger"
                        dismissible
                        onClose={() => setFormError(null)}
                    >
                        {formError}
                    </Alert>
                )}

                <Form noValidate onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="register-email">
                        <Form.Label>
                            E-mail address <span className="text-danger">*</span>
                        </Form.Label>

                        <Form.Control
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            isInvalid={Boolean(fieldErrors.email)}
                            placeholder="student@university.edu"
                            autoComplete="email"
                        />

                        <Form.Control.Feedback type="invalid">
                            {fieldErrors.email}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="register-display-name">
                        <Form.Label>
                            Display name <span className="text-danger">*</span>
                        </Form.Label>

                        <Form.Control
                            type="text"
                            name="display_name"
                            value={form.display_name}
                            onChange={handleChange}
                            isInvalid={Boolean(fieldErrors.display_name)}
                            placeholder="How your name appears to your groups"
                            autoComplete="name"
                        />

                        <Form.Control.Feedback type="invalid">
                            {fieldErrors.display_name}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group
                                className="mb-3"
                                controlId="register-institution"
                            >
                                <Form.Label>
                                    Institution{' '}
                                    <span className="text-danger">*</span>
                                </Form.Label>

                                <Form.Control
                                    type="text"
                                    name="institution"
                                    value={form.institution}
                                    onChange={handleChange}
                                    isInvalid={Boolean(fieldErrors.institution)}
                                    placeholder="University of Toronto"
                                />

                                <Form.Control.Feedback type="invalid">
                                    {fieldErrors.institution}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group
                                className="mb-3"
                                controlId="register-program"
                            >
                                <Form.Label>
                                    Program{' '}
                                    <span className="text-muted small">
                                        (optional)
                                    </span>
                                </Form.Label>

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

                    <Row>
                        <Col md={6}>
                            <Form.Group
                                className="mb-3"
                                controlId="register-password"
                            >
                                <Form.Label>
                                    Password <span className="text-danger">*</span>
                                </Form.Label>

                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    isInvalid={Boolean(fieldErrors.password)}
                                    autoComplete="new-password"
                                />

                                <Form.Control.Feedback type="invalid">
                                    {fieldErrors.password}
                                </Form.Control.Feedback>

                                <Form.Text className="text-muted">
                                    At least 8 characters with an uppercase
                                    letter, a lowercase letter, a digit, and a
                                    symbol.
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group
                                className="mb-3"
                                controlId="register-confirm-password"
                            >
                                <Form.Label>
                                    Confirm password{' '}
                                    <span className="text-danger">*</span>
                                </Form.Label>

                                <Form.Control
                                    type="password"
                                    name="confirm_password"
                                    value={form.confirm_password}
                                    onChange={handleChange}
                                    isInvalid={Boolean(
                                        fieldErrors.confirm_password
                                    )}
                                    autoComplete="new-password"
                                />

                                <Form.Control.Feedback type="invalid">
                                    {fieldErrors.confirm_password}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="d-grid mt-3">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        className="me-2"
                                    />
                                    Creating account...
                                </>
                            ) : (
                                'Create account'
                            )}
                        </Button>
                    </div>
                </Form>

                <p className="text-center text-muted small mt-3 mb-0">
                    Already have an account?{' '}
                    <Button
                        variant="link"
                        className="p-0 align-baseline"
                        onClick={onShowSignIn}
                    >
                        Sign in
                    </Button>
                </p>
            </Card.Body>
        </Card>
    );
}

export default RegisterForm;
