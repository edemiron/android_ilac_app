/**
 * Ilac Hatirlatici Backend Server
 * Express + Composio Integration
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reminders', require('./routes/reminders'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Ilac Hatirlatici API',
    composio: process.env.COMPOSIO_API_KEY ? 'Connected' : 'Not Configured'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Composio: ${process.env.COMPOSIO_API_KEY ? '✅ Connected' : '❌ Not Configured'}`);
});
