import React, { useState } from 'react';
import {
    Container,
    Alert,
    Spinner,
    Button
} from 'react-bootstrap';

import axios from 'axios';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import SearchBar from './components/SearchBar';
import FilterOptions from './components/FilterOptions';
import GroupList from './components/GroupList';
import CreateGroupForm from './components/CreateGroupForm';

function App() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [joiningGroupId, setJoiningGroupId] =
    useState(null);

    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] =
        useState(null);

    const [filters, setFilters] = useState({});
    const [hasSearched, setHasSearched] =
        useState(false);

    const [showCreateForm, setShowCreateForm] =
        useState(false);

    // Base URL for API
    const API_BASE = 'http://localhost:5000';

    // Search for study groups
    const searchGroups = async (
        searchFilters = {}
    ) => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setHasSearched(true);

        try {
            const mergedFilters = {
                ...filters,
                ...searchFilters
            };

            setFilters(mergedFilters);

            const params = new URLSearchParams();

            Object.keys(mergedFilters).forEach(key => {
                if (mergedFilters[key]) {
                    params.append(
                        key,
                        mergedFilters[key]
                    );
                }
            });

            console.log(
                `Searching: ${API_BASE}/api/groups/search?${params.toString()}`
            );

            const response = await axios.get(
                `${API_BASE}/api/groups/search?${params.toString()}`
            );

            if (response.data.success) {
                setGroups(response.data.data);
            } else {
                setError(
                    'Failed to fetch groups'
                );
            }

        } catch (err) {
            console.error(
                'Search error:',
                err
            );

            if (err.code === 'ECONNREFUSED') {
                setError(
                    'Cannot connect to backend server. Please make sure the backend is running on port 5000.'
                );

            } else if (err.response) {
                setError(
                    `Server error: ${
                        err.response.data.message ||
                        'Unknown error'
                    }`
                );

            } else {
                setError(
                    'An error occurred while searching for groups'
                );
            }

        } finally {
            setLoading(false);
        }
    };

    // Create a new study group
    const createGroup = async (groupData) => {
        setCreating(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await axios.post(
                `${API_BASE}/api/groups`,
                groupData
            );

            if (response.data.success) {
                const newGroup =
                    response.data.data;

                // Show the newly created group
                // immediately in the group list
                setGroups(prevGroups => [
                    newGroup,
                    ...prevGroups.filter(
                        group =>
                            group.id !==
                            newGroup.id
                    )
                ]);

                setHasSearched(true);

                setSuccessMessage(
                    `Study group "${newGroup.name}" created successfully!`
                );

                setShowCreateForm(false);

                return true;
            }

            setError(
                'Failed to create study group'
            );

            return false;

        } catch (err) {
            console.error(
                'Create group error:',
                err
            );

            if (err.response) {
                setError(
                    err.response.data.message ||
                    'Failed to create study group'
                );

            } else {
                setError(
                    'Cannot connect to the backend server.'
                );
            }

            return false;

        } finally {
            setCreating(false);
        }
    };

    const handleSearch = (searchTerm) => {
        searchGroups(searchTerm);
    };

    const handleFilterChange = (
        newFilters
    ) => {
        const updatedFilters = {
            ...filters,
            ...newFilters
        };

        setFilters(updatedFilters);

        searchGroups(updatedFilters);
    };

    const handleJoinGroup = async (groupId) => {
        setJoiningGroupId(groupId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await axios.post(
                `${API_BASE}/api/groups/${groupId}/join`
            );

            if (response.data.success) {
                const updatedGroup =
                    response.data.data.group;

                // Update member count immediately
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
            console.error(
                'Join group error:',
                err
            );

            if (err.response) {
                setError(
                    err.response.data.message ||
                    'Failed to join study group'
                );
            } else {
                setError(
                    'Cannot connect to the backend server.'
                );
            }

        } finally {
            setJoiningGroupId(null);
        }
    };

    return (
        <Container className="py-4">
            <header className="text-center mb-4">
                <h1 className="display-4 text-primary">
                    📚 StudySync
                </h1>

                <p className="lead">
                    Find your study group and
                    collaborate with peers
                </p>

                <Button
                    variant={
                        showCreateForm
                            ? 'outline-secondary'
                            : 'primary'
                    }
                    onClick={() =>
                        setShowCreateForm(
                            !showCreateForm
                        )
                    }
                >
                    {showCreateForm
                        ? 'Close Create Form'
                        : '+ Create Study Group'}
                </Button>
            </header>

            {showCreateForm && (
                <CreateGroupForm
                    onCreateGroup={createGroup}
                    onCancel={() =>
                        setShowCreateForm(false)
                    }
                    creating={creating}
                />
            )}

            {successMessage && (
                <Alert
                    variant="success"
                    dismissible
                    onClose={() =>
                        setSuccessMessage(null)
                    }
                >
                    {successMessage}
                </Alert>
            )}

            {error && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={() =>
                        setError(null)
                    }
                >
                    {error}
                </Alert>
            )}

            <SearchBar
                onSearch={handleSearch}
            />

            <FilterOptions
                filters={filters}
                onFilterChange={
                    handleFilterChange
                }
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

            {!loading &&
                hasSearched && (
                    <GroupList
                        groups={groups}
                        onJoinGroup={
                            handleJoinGroup
                        }
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
                        No study groups found.
                        Try adjusting your
                        search or create a new
                        group!
                    </Alert>
                )}

            {!hasSearched &&
                !loading && (
                    <div className="text-center py-5 text-muted">
                        <h3>
                            🔍 Search for study
                            groups
                        </h3>

                        <p>
                            Enter a course code,
                            title, or keyword
                            above to get started
                        </p>
                    </div>
                )}
        </Container>
    );
}

export default App;