import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_BASE = 'http://localhost:5000';

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await axios.get(
                `${API_BASE}/api/dashboard`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setDashboardData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            } else {
                setError('Failed to load dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Loading your dashboard...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-4">
                <Alert variant="danger">{error}</Alert>
                <Button onClick={fetchDashboard}>Retry</Button>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h1 className="mb-4">Dashboard</h1>
            
            {/* Welcome Section */}
            <Card className="mb-4 bg-primary text-white">
                <Card.Body>
                    <h3>Welcome back, {localStorage.getItem('displayName') || 'Student'}!</h3>
                    <p className="mb-0">You are a member of {dashboardData?.totalGroups || 0} study groups.</p>
                </Card.Body>
            </Card>

            <Row>
                {/* My Groups */}
                <Col md={8}>
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">My Study Groups</h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData?.groups?.length === 0 ? (
                                <p className="text-muted">You haven't joined any groups yet.</p>
                            ) : (
                                dashboardData?.groups?.map((group) => (
                                    <div key={group.id} className="border-bottom py-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="mb-0">{group.name}</h6>
                                                <small className="text-muted">
                                                    {group.course_code} - {group.course_title}
                                                </small>
                                                <br />
                                                <small className="text-muted">
                                                    {group.institution} • {group.term}
                                                </small>
                                            </div>
                                            <div className="text-end">
                                                <Badge bg="secondary">{group.role}</Badge>
                                                <div>
                                                    <small>
                                                        {group.current_members}/{group.max_members} members
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </Card.Body>
                    </Card>

                    {/* Pending Requests (for users) */}
                    {dashboardData?.pendingRequests?.length > 0 && (
                        <Card className="mb-4 border-warning">
                            <Card.Header className="bg-warning">
                                <h5 className="mb-0">Pending Join Requests</h5>
                            </Card.Header>
                            <Card.Body>
                                {dashboardData.pendingRequests.map((request) => (
                                    <div key={request.id} className="border-bottom py-2">
                                        <div className="d-flex justify-content-between">
                                            <div>
                                                <h6 className="mb-0">{request.group_name}</h6>
                                                <small className="text-muted">{request.course_code}</small>
                                            </div>
                                            <Badge bg="warning">Awaiting Approval</Badge>
                                        </div>
                                    </div>
                                ))}
                            </Card.Body>
                        </Card>
                    )}

                    {/* Groups with Pending Requests (for owners) */}
                    {dashboardData?.groupsWithPending?.length > 0 && (
                        <Card className="mb-4 border-info">
                            <Card.Header className="bg-info text-white">
                                <h5 className="mb-0">Pending Join Requests (Your Groups)</h5>
                            </Card.Header>
                            <Card.Body>
                                {dashboardData.groupsWithPending.map((group) => (
                                    <div key={group.group_id} className="border-bottom py-2">
                                        <div className="d-flex justify-content-between">
                                            <div>
                                                <h6 className="mb-0">{group.group_name}</h6>
                                            </div>
                                            <div>
                                                <Badge bg="info">{group.pending_count} pending</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </Card.Body>
                        </Card>
                    )}
                </Col>

                {/* Sidebar */}
                <Col md={4}>
                    {/* Quick Actions */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">Quick Actions</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-grid gap-2">
                                <Button variant="primary" as={Link} to="/create-group">
                                    + Create New Group
                                </Button>
                                <Button variant="outline-primary" as={Link} to="/">
                                    🔍 Find Groups
                                </Button>
                                <Button variant="outline-secondary" as={Link} to="/profile">
                                    👤 Edit Profile
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Stats */}
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Quick Stats</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex justify-content-between">
                                <span>Groups Joined:</span>
                                <Badge bg="primary">{dashboardData?.totalGroups || 0}</Badge>
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                                <span>Pending Requests:</span>
                                <Badge bg="warning">{dashboardData?.totalPendingRequests || 0}</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Dashboard;