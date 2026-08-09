import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

const SearchBar = ({ onSearch }) => {
    const [keyword, setKeyword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (keyword.trim()) {
            onSearch({ keyword: keyword.trim() });
        }
    };

    return (
        <Form onSubmit={handleSubmit} className="mb-4">
            <Row>
                <Col md={9}>
                    <Form.Control
                        type="text"
                        placeholder="Search by course code, title, or keyword..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="search-input"
                    />
                </Col>
                <Col md={3}>
                    <Button type="submit" variant="primary" className="w-100">
                        <i className="bi bi-search"></i> Search
                    </Button>
                </Col>
            </Row>
        </Form>
    );
};

export default SearchBar;