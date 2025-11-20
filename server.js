const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors());

// Serve static files from Document Preview directory
app.use(express.static(path.join(__dirname, 'Document Preview')));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Document Preview', 'playbook-preview.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error logging endpoint
app.post('/api/log-error', express.json(), (req, res) => {
    console.error('Client Error:', req.body);
    res.json({ status: 'logged' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Orchards Program Playbook Server running on http://localhost:${PORT}`);
    console.log(`📄 Preview: http://localhost:${PORT}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

