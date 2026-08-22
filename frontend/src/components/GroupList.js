import React from 'react';
import {
    Card,
    Row,
    Col,
    Badge,
    Button
} from 'react-bootstrap';

const GroupList = ({
    groups,
    onJoinGroup,
    joiningGroupId
}) => {
    if (!groups || groups.length === 0) {
        return (
            <Card className="text-center p-5">
                <h4>No groups found</h4>
                <p className="text-muted">
                    Try adjusting your search or filters
                </p>
            </Card>
        );
    }

    return (
        <Row>
            {groups.map((group) => {
                const isProcessing =
                    joiningGroupId === group.id;

                return (
                    <Col
                        md={6}
                        lg={4}
                        key={group.id}
                        className="mb-4"
                    >
                        <Card className="h-100 shadow-sm">
                            <Card.Body>
                                <Card.Title className="d-flex justify-content-between align-items-start">
                                    <span>
                                        {group.name}
                                    </span>

                                    <Badge
                                        bg={
                                            group.visibility ===
                                            'public'
                                                ? 'success'
                                                : 'warning'
                                        }
                                        className="ms-2"
                                    >
                                        {group.visibility ===
                                        'public'
                                            ? 'Public'
                                            : 'Request to Join'}
                                    </Badge>
                                </Card.Title>

                                <Card.Subtitle className="mb-2 text-muted">
                                    {group.course_code}
                                    {' - '}
                                    {group.course_title}
                                </Card.Subtitle>

                                <Card.Text>
                                    <small>
                                        {group.description}
                                    </small>
                                </Card.Text>

                                <div className="mb-2">
                                    <Badge
                                        bg="secondary"
                                        className="me-1"
                                    >
                                        {group.institution}
                                    </Badge>

                                    <Badge bg="info">
                                        {group.term}
                                    </Badge>
                                </div>

                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">
                                        <i className="bi bi-people"></i>
                                        {' '}
                                        {group.current_members}/
                                        {group.max_members}
                                    </span>

                                    <Button
                                        variant={
                                            group.visibility ===
                                            'public'
                                                ? 'primary'
                                                : 'outline-primary'
                                        }
                                        size="sm"
                                        disabled={isProcessing}
                                        onClick={() =>
                                            onJoinGroup(group.id)
                                        }
                                    >
                                        {isProcessing
                                            ? 'Processing...'
                                            : group.visibility ===
                                              'public'
                                                ? 'Join Group'
                                                : 'Request to Join'}
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );
};

export default GroupList;