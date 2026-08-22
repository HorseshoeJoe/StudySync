/*
 * Application shell.
 *
 * Holds the current view and the search state, and
 * guards the views that need a session.
 *
 * Sprint 3 changes (PB-01, PB-02, PB-03):
 *   - the session lives in AuthContext, not here;
 *   - every request goes through the shared Axios client
 *     so the token is attached and errors arrive in one
 *     shape;
 *   - create and join require a session, and an
 *     anonymous attempt sends the student to sign-in
 *     rather than failing with a 401 alert.
 */

import React, { useState, useEffect } from 'react';

import {
    Container,
    Alert,
    Spinner,
    Button
} from 'react-bootstrap';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import client from './api/client';
import { useAuth } from './context/AuthContext';

import NavBar from './components/NavBar';
import SearchBar from './components/SearchBar';
import FilterOptions from './components/FilterOptions';
import GroupList from './components/GroupList';
import CreateGroupForm from './components/CreateGroupForm';

import RegisterForm from './components/auth/RegisterForm';
import LoginForm from './components/auth/LoginForm';
import ProfileForm from './components/auth/ProfileForm';

// Views that cannot be opened without a session.
const PROTECTED_VIEWS = ['profile', 'create'];

function App() {
    const {
        isSignedIn,
        restoring,
        sessionNotice,
        dismissSessionNotice
    } = useAuth();

    const [view, setView] = useState('search');

    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [joiningGroupId, setJoiningGroupId] = useState(null);

    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [filters, setFilters] = useState({});
    const [hasSearched, setHasSearched] = useState(false);

    // Carried from registration into the sign-in form.
    const [pendingEmail, setPendingEmail] = useState('');
    const [signInNotice, setSignInNotice] = useState(null);

    /*
     * View guarding (T-02.4).
     *
     * A student who signs out while on the profile page,
     * or whose session expires there, is returned to the
     * public search view instead of being left on a
     * screen that can no longer load its data.
     */
    useEffect(() => {
        if (!restoring && !isSignedIn && PROTECTED_VIEWS.includes(view)) {
            setView('signin');
        }
    }, [restoring, isSignedIn, view]);

    // A signed-in student has no use for these two.
    useEffect(() => {
        if (isSignedIn && (view === 'signin' || view === 'register')) {
            setView('search');
        }
    }, [isSignedIn, view]);

    const navigate = nextView => {
        setError(null);
        setSuccessMessage(null);

        // Opening a protected view without a session
        // sends the student to sign in first.
        if (PROTECTED_VIEWS.includes(nextView) && !isSignedIn) {
            setSignInNotice('Sign in to continue.');
            setView('signin');
            return;
        }

        setView(nextView);
    };

    // PB-04, PB-05 — unchanged behaviour, now through
    // the shared client.
    const searchGroups = async (searchFilters = {}) => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setHasSearched(true);

        try {
            const mergedFilters = { ...filters, ...searchFilters };

            setFilters(mergedFilters);

            const params = new URLSearchParams();

            Object.keys(mergedFilters).forEach(key => {
                if (mergedFilters[key]) {
                    params.append(key, mergedFilters[key]);
                }
            });

            const response = await client.get(
                `/api/groups/search?${params.toString()}`
            );

            if (response.data.success) {
                setGroups(response.data.data);
            } else {
                setError('Failed to fetch groups');
            }

        } catch (err) {
            setError(err.message);

        } finally {
            setLoading(false);
        }
    };

    // PB-06 — the creator is now the signed-in student;
    // the backend takes the identity from the token.
    const createGroup = async groupData => {
        setCreating(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await client.post('/api/groups', groupData);

            if (response.data.success) {
                const newGroup = response.data.data;

                setGroups(prevGroups => [
                    newGroup,
                    ...prevGroups.filter(group => group.id !== newGroup.id)
                ]);

                setHasSearched(true);

                setSuccessMessage(
                    `Study group "${newGroup.name}" created successfully!`
                );

                setView('search');

                return true;
            }

            setError('Failed to create study group');

            return false;

        } catch (err) {
            if (err.status === 401) {
                setSignInNotice('Sign in to create a study group.');
                setView('signin');
            } else {
                setError(err.message);
            }

            return false;

        } finally {
            setCreating(false);
        }
    };

    // PB-07A — joining now requires a session.
    const handleJoinGroup = async groupId => {
        if (!isSignedIn) {
            setSignInNotice('Sign in to join a study group.');
            setView('signin');
            return;
        }

        setJoiningGroupId(groupId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await client.post(
                `/api/groups/${groupId}/join`
            );

            if (response.data.success) {
                const updatedGroup = response.data.data.group;

                setGroups(prevGroups =>
                    prevGroups.map(group =>
                        group.id === updatedGroup.id
                            ? {
                                ...group,
                                current_members:
                                    updatedGroup.current_members
                            }
                            : group
                    )
                );

                setSuccessMessage(
                    `Successfully joined "${updatedGroup.name}"!`
                );
            }

        } catch (err) {
            if (err.status === 401) {
                setSignInNotice('Sign in to join a study group.');
                setView('signin');
            } else {
                setError(err.message);
            }

        } finally {
            setJoiningGroupId(null);
        }
    };

    const handleSearch = searchTerm => {
        searchGroups(searchTerm);
    };

    const handleFilterChange = newFilters => {
        const updatedFilters = { ...filters, ...newFilters };

        setFilters(updatedFilters);
        searchGroups(updatedFilters);
    };

    const handleRegistered = email => {
        setPendingEmail(email);
        setSignInNotice(
            'Your account has been created. Sign in to continue.'
        );
        setView('signin');
    };

    // Wait for the stored token to be checked before
    // deciding what to render, so a signed-in student
    // does not see the public view flash past on reload.
    if (restoring) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading StudySync...</p>
            </Container>
        );
    }

    return (
        <>
            <NavBar currentView={view} onNavigate={navigate} />

            <Container className="pb-5">
                {sessionNotice && (
                    <Alert
                        variant="warning"
                        dismissible
                        onClose={dismissSessionNotice}
                    >
                        {sessionNotice}
                    </Alert>
                )}

                {successMessage && (
                    <Alert
                        variant="success"
                        dismissible
                        onClose={() => setSuccessMessage(null)}
                    >
                        {successMessage}
                    </Alert>
                )}

                {error && (
                    <Alert
                        variant="danger"
                        dismissible
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                {view === 'register' && (
                    <RegisterForm
                        onRegistered={handleRegistered}
                        onShowSignIn={() => navigate('signin')}
                    />
                )}

                {view === 'signin' && (
                    <LoginForm
                        prefillEmail={pendingEmail}
                        notice={signInNotice}
                        onShowRegister={() => {
                            setSignInNotice(null);
                            navigate('register');
                        }}
                    />
                )}

                {view === 'profile' && isSignedIn && <ProfileForm />}

                {view === 'create' && isSignedIn && (
                    <CreateGroupForm
                        onCreateGroup={createGroup}
                        onCancel={() => navigate('search')}
                        creating={creating}
                    />
                )}

                {view === 'search' && (
                    <>
                        <header className="text-center mb-4">
                            <h1 className="display-5 text-primary">
                                Find your study group
                            </h1>

                            <p className="lead text-muted">
                                Search by course code, course title, or
                                keyword and collaborate with your peers.
                            </p>
                        </header>

                        <SearchBar onSearch={handleSearch} />

                        <FilterOptions
                            filters={filters}
                            onFilterChange={handleFilterChange}
                        />

                        {loading && (
                            <div className="text-center py-5">
                                <Spinner
                                    animation="border"
                                    variant="primary"
                                />

                                <p className="mt-2">
                                    Searching for groups...
                                </p>
                            </div>
                        )}

                        {!loading && hasSearched && (
                            <GroupList
                                groups={groups}
                                onJoinGroup={handleJoinGroup}
                                joiningGroupId={joiningGroupId}
                            />
                        )}

                        {!loading &&
                            hasSearched &&
                            groups.length === 0 &&
                            !error && (
                                <Alert
                                    variant="info"
                                    className="text-center"
                                >
                                    No study groups found. Try adjusting
                                    your search or create a new group!
                                </Alert>
                            )}

                        {!hasSearched && !loading && (
                            <div className="text-center py-5 text-muted">
                                <h3>🔍 Search for study groups</h3>

                                <p>
                                    Enter a course code, title, or keyword
                                    above to get started
                                </p>

                                {!isSignedIn && (
                                    <Button
                                        variant="outline-primary"
                                        onClick={() => navigate('register')}
                                    >
                                        Create an account to join a group
                                    </Button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </Container>
        </>
    );
}

export default App;
