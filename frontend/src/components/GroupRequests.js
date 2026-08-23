import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import axios from 'axios';

const GroupRequests = ({ groupId, isOwner }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const API_BASE = 'http://localhost:5000';

    useEffect(() => {
        if (isOwner) {
            fetchRequests();
        }
    }, [groupId, isOwner]);

    const fetchRequests = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE}/api/groups/${groupId}/requests`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRequests(response.data.data || []);
        } catch (err) {
            console.error('Error fetching requests:', err);
            setError('Failed to load join requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE}/api/groups/requests/${requestId}/approve`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Join request approved!');
            fetchRequests();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error approving request:', err);
            setError('Failed to approve request');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleDecline = async (requestId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE}/api/groups/requests/${requestId}/decline`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Join request declined');
            fetchRequests();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error declining request:', err);
            setError('Failed to decline request');
            setTimeout(() => setError(null), 3000);
        }
    };

    if (!isOwner) return null;

    return (
        <Card className="mt-4">
            <Card.Header>
                <h5>Join Requests</h5>
                <Badge bg="warning" className="ms-2">{requests.length} pending</Badge>
            </Card.Header>
            <Card.Body>
                {loading && (
                    <div className="text-center py-3">
                        <Spinner animation="border" size="sm" />
                        <span className="ms-2">Loading requests...</span>
                    </div>
                )}

                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                {!loading && requests.length === 0 && (
                    <p className="text-muted text-center">No pending join requests</p>
                )}

                {!loading && requests.length > 0 && (
                    <Table striped hover responsive>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Institution</th>
                                <th>Program</th>
                                <th>Requested At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((request) => (
                                <tr key={request.id}>
                                    <td>{request.display_name}</td>
                                    <td>{request.institution}</td>
                                    <td>{request.program || 'N/A'}</td>
                                    <td>{new Date(request.requested_at).toLocaleDateString()}</td>
                                    <td>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            className="me-2"
                                            onClick={() => handleApprove(request.id)}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleDecline(request.id)}
                                        >
                                            Decline
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>
        </Card>
    );
};

export default GroupRequests;