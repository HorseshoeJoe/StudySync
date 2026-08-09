import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Card } from 'react-bootstrap';
import axios from 'axios';

const FilterOptions = ({ filters, onFilterChange }) => {
    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        terms: []
    });

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/groups/filter-options');
                if (response.data.success) {
                    setFilterOptions(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching filter options:', error);
            }
        };
        fetchFilterOptions();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        onFilterChange({ [name]: value });
    };

    return (
        <Card className="mb-4">
            <Card.Body>
                <h5 className="mb-3">Filter Options</h5>
                <Row>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Institution</Form.Label>
                            <Form.Select
                                name="institution"
                                value={filters.institution || ''}
                                onChange={handleChange}
                            >
                                <option value="">All Institutions</option>
                                {filterOptions.institutions.map((inst, index) => (
                                    <option key={index} value={inst}>{inst}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Term</Form.Label>
                            <Form.Select
                                name="term"
                                value={filters.term || ''}
                                onChange={handleChange}
                            >
                                <option value="">All Terms</option>
                                {filterOptions.terms.map((term, index) => (
                                    <option key={index} value={term}>{term}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Visibility</Form.Label>
                            <Form.Select
                                name="visibility"
                                value={filters.visibility || ''}
                                onChange={handleChange}
                            >
                                <option value="">All</option>
                                <option value="public">Public</option>
                                <option value="request_to_join">Request to Join</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Min Capacity</Form.Label>
                            <Form.Select
                                name="minCapacity"
                                value={filters.minCapacity || ''}
                                onChange={handleChange}
                            >
                                <option value="">Any</option>
                                <option value="10">10+ members</option>
                                <option value="20">20+ members</option>
                                <option value="30">30+ members</option>
                                <option value="40">40+ members</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Row className="mt-3">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Sort By</Form.Label>
                            <Form.Select
                                name="sortBy"
                                value={filters.sortBy || 'created_at'}
                                onChange={handleChange}
                            >
                                <option value="created_at">Newest First</option>
                                <option value="name">Name (A-Z)</option>
                                <option value="course_title">Course Title (A-Z)</option>
                                <option value="current_members">Most Members</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>&nbsp;</Form.Label>
                            <Form.Select
                                name="sortOrder"
                                value={filters.sortOrder || 'DESC'}
                                onChange={handleChange}
                            >
                                <option value="DESC">Descending</option>
                                <option value="ASC">Ascending</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

export default FilterOptions;