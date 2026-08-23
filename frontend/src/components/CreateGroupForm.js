import React, { useState } from 'react';
import {
    Card,
    Form,
    Button,
    Row,
    Col
} from 'react-bootstrap';

function CreateGroupForm({
    onCreateGroup,
    onCancel,
    creating
}) {
    const [formData, setFormData] = useState({
        name: '',
        course_code: '',
        course_title: '',
        institution: '',
        term: '',
        description: '',
        visibility: 'public',
        max_members: 20
    });

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const success = await onCreateGroup({
            ...formData,
            max_members: Number(formData.max_members)
        });

        if (success) {
            setFormData({
                name: '',
                course_code: '',
                course_title: '',
                institution: '',
                term: '',
                description: '',
                visibility: 'public',
                max_members: 20
            });
        }
    };

    return (
        <Card className="mb-4 shadow-sm">
            <Card.Body>
                <Card.Title className="mb-3">
                    Create Study Group
                </Card.Title>

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Group Name</Form.Label>

                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter group name"
                            required
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Course Code
                                </Form.Label>

                                <Form.Control
                                    type="text"
                                    name="course_code"
                                    value={formData.course_code}
                                    onChange={handleChange}
                                    placeholder="e.g. CPAN359"
                                    required
                                />
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Course Title
                                </Form.Label>

                                <Form.Control
                                    type="text"
                                    name="course_title"
                                    value={formData.course_title}
                                    onChange={handleChange}
                                    placeholder="Enter course title"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Institution
                                </Form.Label>

                                <Form.Control
                                    type="text"
                                    name="institution"
                                    value={formData.institution}
                                    onChange={handleChange}
                                    placeholder="Enter institution"
                                    required
                                />
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Term</Form.Label>

                                <Form.Control
                                    type="text"
                                    name="term"
                                    value={formData.term}
                                    onChange={handleChange}
                                    placeholder="e.g. Summer 2026"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>

                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Describe the study group"
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Visibility
                                </Form.Label>

                                <Form.Select
                                    name="visibility"
                                    value={formData.visibility}
                                    onChange={handleChange}
                                >
                                    <option value="public">
                                        Public
                                    </option>

                                    <option value="request_to_join">
                                        Request to Join
                                    </option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Maximum Members
                                </Form.Label>

                                <Form.Control
                                    type="number"
                                    name="max_members"
                                    value={formData.max_members}
                                    onChange={handleChange}
                                    min="1"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="d-flex gap-2">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={creating}
                        >
                            {creating
                                ? 'Creating...'
                                : 'Create Group'}
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                            disabled={creating}
                        >
                            Cancel
                        </Button>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
}

export default CreateGroupForm;