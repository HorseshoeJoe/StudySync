/*
 * Sign-in form.
 *
 * PB-02 US-02, T-02.4.
 *
 * The server returns one message for a wrong address and
 * a wrong password alike, and the form shows it as it
 * came: highlighting one field over the other would give
 * away which half was wrong, which is exactly what the
 * generic message exists to prevent.
 */

import React, { useState, useEffect } from 'react';

import {
    Card,
    Form,
    Button,
    Alert,
    Spinner
} from 'react-bootstrap';

import { useAuth } from '../../context/AuthContext';

function LoginForm({ prefillEmail, notice, onShowRegister }) {
    const { signIn } = useAuth();

    const [email, setEmail] = useState(prefillEmail || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // A student who has just registered arrives with
    // their address already filled in.
    useEffect(() => {
        if (prefillEmail) {
            setEmail(prefillEmail);
        }
    }, [prefillEmail]);

    const handleSubmit = async event => {
        event.preventDefault();

        setError(null);

        if (!email.trim() || !password) {
            setError('Enter your e-mail address and password.');
            return;
        }

        setSubmitting(true);

        try {
            await signIn(email.trim(), password);

            // On success the shell swaps this view out;
            // clearing the password first means it is not
            // left in component state.
            setPassword('');

        } catch (signInError) {
            setError(signInError.message);
            setPassword('');

        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="shadow-sm mx-auto" style={{ maxWidth: '460px' }}>
            <Card.Body className="p-4">
                <h2 className="h4 mb-1">Sign in to StudySync</h2>

                <p className="text-muted small mb-4">
                    Sign in to create groups, join your peers, and manage
                    your profile.
                </p>

                {notice && (
                    <Alert variant="success" className="py-2">
                        {notice}
                    </Alert>
                )}

                {error && (
                    <Alert
                        variant="danger"
                        dismissible
                        onClose={() => setError(null)}
                        className="py-2"
                    >
                        {error}
                    </Alert>
                )}

                <Form noValidate onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="login-email">
                        <Form.Label>E-mail address</Form.Label>

                        <Form.Control
                            type="email"
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            placeholder="student@university.edu"
                            autoComplete="email"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="login-password">
                        <Form.Label>Password</Form.Label>

                        <Form.Control
                            type="password"
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            autoComplete="current-password"
                        />
                    </Form.Group>

                    <div className="d-grid">
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
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </Button>
                    </div>
                </Form>

                <p className="text-center text-muted small mt-3 mb-0">
                    New to StudySync?{' '}
                    <Button
                        variant="link"
                        className="p-0 align-baseline"
                        onClick={onShowRegister}
                    >
                        Create an account
                    </Button>
                </p>
            </Card.Body>
        </Card>
    );
}

export default LoginForm;
