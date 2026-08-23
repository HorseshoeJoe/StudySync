const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);   // PB-01, PB-02
app.use('/api/users', userRoutes);  // PB-03
app.use('/api/groups', groupRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'StudySync API is running!' });
});

// Unknown route
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `No such endpoint: ${req.method} ${req.originalUrl}`
    });
});

/*
 * Error handling middleware.
 *
 * NFR-08: the caller gets a plain message; the stack and
 * the driver's error text are written to the server log
 * only, so a database error cannot leak schema details
 * to the browser.
 */
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);

    // Malformed JSON in the request body.
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'The request body is not valid JSON'
        });
    }

    res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.'
    });
});

// Start server, unless this file was required by a test.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log(`📚 StudySync API ready`);
    });
}

module.exports = app;
