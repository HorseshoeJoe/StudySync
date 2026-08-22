/*
 * Application navigation.
 *
 * PB-02 T-02.4, PB-03 T-03.2.
 *
 * The bar is the visible half of view guarding: the
 * profile and create-group entries only appear to a
 * signed-in student, and the sign-in and register
 * entries only appear to everybody else.
 */

import React from 'react';

import {
    Navbar,
    Nav,
    Container,
    Button,
    Dropdown,
    Image
} from 'react-bootstrap';

import { useAuth } from '../context/AuthContext';

function NavBar({ currentView, onNavigate }) {
    const { user, isSignedIn, signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
        onNavigate('search');
    };

    const initial = (user && user.display_name
        ? user.display_name.trim().charAt(0).toUpperCase()
        : '?');

    return (
        <Navbar bg="white" expand="md" className="border-bottom mb-4">
            <Container>
                <Navbar.Brand
                    role="button"
                    onClick={() => onNavigate('search')}
                    className="fw-semibold text-primary"
                >
                    📚 StudySync
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="studysync-nav" />

                <Navbar.Collapse id="studysync-nav">
                    <Nav className="me-auto">
                        <Nav.Link
                            active={currentView === 'search'}
                            onClick={() => onNavigate('search')}
                        >
                            Find groups
                        </Nav.Link>

                        {isSignedIn && (
                            <Nav.Link
                                active={currentView === 'create'}
                                onClick={() => onNavigate('create')}
                            >
                                Create a group
                            </Nav.Link>
                        )}
                    </Nav>

                    <Nav className="align-items-md-center gap-2">
                        {isSignedIn ? (
                            <Dropdown align="end">
                                <Dropdown.Toggle
                                    variant="light"
                                    id="account-menu"
                                    className="d-flex align-items-center gap-2 border"
                                >
                                    {user.avatar_url ? (
                                        <Image
                                            src={user.avatar_url}
                                            alt=""
                                            roundedCircle
                                            width={24}
                                            height={24}
                                            style={{ objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <span
                                            className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
                                            style={{
                                                width: 24,
                                                height: 24,
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            {initial}
                                        </span>
                                    )}

                                    <span className="d-none d-lg-inline">
                                        {user.display_name}
                                    </span>
                                </Dropdown.Toggle>

                                <Dropdown.Menu>
                                    <Dropdown.Header className="small text-muted">
                                        {user.email}
                                    </Dropdown.Header>

                                    <Dropdown.Item
                                        onClick={() => onNavigate('profile')}
                                    >
                                        My profile
                                    </Dropdown.Item>

                                    <Dropdown.Divider />

                                    <Dropdown.Item onClick={handleSignOut}>
                                        Sign out
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        ) : (
                            <>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => onNavigate('signin')}
                                >
                                    Sign in
                                </Button>

                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => onNavigate('register')}
                                >
                                    Create account
                                </Button>
                            </>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default NavBar;
