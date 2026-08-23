import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Container, Navbar, Nav, Button, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import SearchBar from './components/SearchBar';
import FilterOptions from './components/FilterOptions';
import GroupList from './components/GroupList';
import Dashboard from './components/Dashboard';

function AppContent() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({});
    const [hasSearched, setHasSearched] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    const API_BASE = 'http://localhost:5000';
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsAuthenticated(true);
            axios.get(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(response => {
                if (response.data.success) {
                    setUser(response.data.data);
                    localStorage.setItem('displayName', response.data.data.display_name);
                }
            }).catch(() => {
                handleLogout();
            });
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('displayName');
        setIsAuthenticated(false);
        setUser(null);
        navigate('/');
    };

    const searchGroups = async (searchFilters = {}) => {
        setLoading(true);
        setError(null);
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

            const response = await axios.get(`${API_BASE}/api/groups/search?${params.toString()}`);
            
            if (response.data.success) {
                setGroups(response.data.data);
            } else {
                setError('Failed to fetch groups');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('An error occurred while searching for groups');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (searchTerm) => {
        searchGroups(searchTerm);
    };

    const handleFilterChange = (newFilters) => {
        const updatedFilters = { ...filters, ...newFilters };
        setFilters(updatedFilters);
        searchGroups(updatedFilters);
    };

    // Protected route wrapper
    const ProtectedRoute = ({ children }) => {
        if (!isAuthenticated) {
            return <Navigate to="/login" />;
        }
        return children;
    };

    return (
        <>
            <Navbar bg="primary" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand as={Link} to="/">📚 StudySync</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to="/">Search</Nav.Link>
                            {isAuthenticated && (
                                <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
                            )}
                        </Nav>
                        <Nav>
                            {isAuthenticated ? (
                                <>
                                    <Nav.Link as={Link} to="/profile">Profile</Nav.Link>
                                    <Button variant="outline-light" size="sm" onClick={handleLogout}>
                                        Logout
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Nav.Link as={Link} to="/login">Login</Nav.Link>
                                    <Nav.Link as={Link} to="/register">Register</Nav.Link>
                                </>
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="py-4">
                <Routes>
                    <Route path="/" element={
                        <>
                            <header className="text-center mb-4">
                                <h1 className="display-4 text-primary">📚 StudySync</h1>
                                <p className="lead">Find your study group and collaborate with peers</p>
                            </header>

                            <SearchBar onSearch={handleSearch} />
                            <FilterOptions filters={filters} onFilterChange={handleFilterChange} />

                            {loading && (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2">Searching for groups...</p>
                                </div>
                            )}

                            {error && <Alert variant="danger">{error}</Alert>}

                            {!loading && hasSearched && (
                                <GroupList groups={groups} />
                            )}

                            {!loading && hasSearched && groups.length === 0 && !error && (
                                <Alert variant="info" className="text-center">
                                    No study groups found. Try adjusting your search or create a new group!
                                </Alert>
                            )}

                            {!hasSearched && !loading && (
                                <div className="text-center py-5 text-muted">
                                    <h3>🔍 Search for study groups</h3>
                                    <p>Enter a course code, title, or keyword above to get started</p>
                                </div>
                            )}
                        </>
                    } />

                    <Route path="/dashboard" element={
                        <ProtectedRoute><Dashboard /></ProtectedRoute>
                    } />

                    <Route path="/login" element={<div>Login Page</div>} />
                    <Route path="/register" element={<div>Register Page</div>} />
                    <Route path="/profile" element={<div>Profile Page</div>} />
                    <Route path="/create-group" element={<div>Create Group Page</div>} />
                </Routes>
            </Container>
        </>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;